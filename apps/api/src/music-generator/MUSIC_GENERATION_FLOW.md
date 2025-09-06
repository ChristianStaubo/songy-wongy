# Music Generation Flow Documentation

This document describes the complete end-to-end flow for generating music using the Songy Wongy API.

## 🎵 Overview

The music generation system uses an **asynchronous workflow** with worker queues to handle long-running ElevenLabs API calls without blocking HTTP requests. The system now includes a **credit-based payment system** with full transaction auditing.

The complete flow involves:

1. **Credit Validation** - Check user has sufficient credits
2. **Job Creation** - User requests music generation
3. **Credit Deduction** - Create transaction and deduct credits
4. **Background Processing** - Worker queue processes the request
5. **Status Polling** - User checks generation progress
6. **File Access** - User downloads the completed music file

---

## 🔄 Complete Workflow

### **Step 1: Request Music Generation**

**Endpoint**: `POST /api/music-generator/generate`

**Authentication**: Required (Clerk JWT token)

**Request Body**:

```json
{
  "name": "My Awesome Song",
  "prompt": "upbeat electronic dance music with synthesizers",
  "lengthMs": 30000,
  "outputFormat": "mp3_44100_128",
  "modelId": "music_v1"
}
```

**Response** (Immediate - ~100ms):

```json
{
  "success": true,
  "data": {
    "musicId": "cmf0abc123...",
    "name": "My Awesome Song",
    "prompt": "upbeat electronic dance music with synthesizers",
    "status": "GENERATING",
    "lengthMs": 30000,
    "createdAt": "2024-09-01T00:45:00.000Z"
  },
  "message": "Music generation job created successfully"
}
```

**What Happens Internally**:

1. Controller validates request (Zod schemas)
2. Service looks up user by `clerkId` → gets database `user.id`
3. **Credit validation and deduction** (see Credit Flow section below)
4. Service creates `Music` record in database (status: `GENERATING`)
5. Service emits `music.generation.requested` event
6. Returns `musicId` for polling

---

### **Step 2: Background Processing** (Worker Queue)

**Event Flow**:

```
Event Emitted → Listener → Bull Queue → Processor
```

**Components**:

- **Event**: `music.generation.requested`
- **Listener**: `MusicGenerationListener`
- **Queue**: `music-generation` (Bull MQ)
- **Processor**: `MusicGenerationProcessor`

**Processing Steps**:

1. **Processor picks up job** from queue
2. **Updates status** to `GENERATING` in database
3. **Calls ElevenLabs API** with the prompt and parameters
4. **Receives audio stream** from ElevenLabs
5. **Converts stream to buffer**
6. **Uploads to S3** with metadata and proper file naming
7. **Updates database** with S3 URL and status `COMPLETED`
8. **Emits completion event** for notifications

**Error Handling**:

- **Automatic retries** (2 attempts with exponential backoff)
- **Status updates** to `FAILED` on permanent failure
- **Failure events** emitted for error tracking

---

### **Step 3: Status Polling**

**Endpoint**: `GET /api/music-generator/status/:musicId`

**Authentication**: Required (Clerk JWT token)

**Response Examples**:

#### **While Generating**:

```json
{
  "success": true,
  "data": {
    "musicId": "cmf0abc123...",
    "name": "My Awesome Song",
    "status": "GENERATING",
    "lengthMs": 30000,
    "audioUrl": null,
    "createdAt": "2024-09-01T00:45:00.000Z",
    "updatedAt": "2024-09-01T00:45:30.000Z"
  }
}
```

#### **When Complete**:

```json
{
  "success": true,
  "data": {
    "musicId": "cmf0abc123...",
    "name": "My Awesome Song",
    "status": "COMPLETED",
    "lengthMs": 30000,
    "audioUrl": "https://bucket.s3.amazonaws.com/music/2024-09-01T00-45-30-123Z_My_Awesome_Song.mp3",
    "createdAt": "2024-09-01T00:45:00.000Z",
    "updatedAt": "2024-09-01T00:46:15.000Z"
  }
}
```

#### **If Failed**:

```json
{
  "success": true,
  "data": {
    "musicId": "cmf0abc123...",
    "status": "FAILED",
    "audioUrl": null,
    "updatedAt": "2024-09-01T00:45:45.000Z"
  }
}
```

**Client Polling Pattern**:

```javascript
// Poll every 2-5 seconds until status changes
const pollStatus = async (musicId) => {
  const response = await fetch(`/api/music-generator/status/${musicId}`);
  const { data } = await response.json();

  if (data.status === 'COMPLETED') {
    // Music is ready! Use data.audioUrl
    return data.audioUrl;
  } else if (data.status === 'FAILED') {
    // Handle error
    throw new Error('Music generation failed');
  }

  // Still generating, poll again in 3 seconds
  setTimeout(() => pollStatus(musicId), 3000);
};
```

---

### **Step 4: File Access & Download**

**Option A: Direct S3 URL** (Current Implementation)

```javascript
// Use the audioUrl directly from the status response
const audioUrl = statusResponse.data.audioUrl;
// This is a direct S3 URL that can be used for:
// - Audio player src
// - Download link
// - Streaming
```

**Option B: Presigned Download URLs** (Future Enhancement)

```
GET /api/music-generator/download/:musicId
→ Returns temporary signed URL for secure access
```

---

## 💳 Credit System Integration

### **Credit Validation & Deduction Flow**

Before any music generation begins, the system validates and deducts credits:

```typescript
// Step 1: Calculate required credits
const estimatedCredits = Math.ceil(lengthMs / 60000); // 1 credit per minute, rounded up

// Step 2: Get current pricing for provider
const pricingTier = await prisma.pricingTier.findFirst({
  where: { provider: 'ELEVENLABS', isDefault: true },
});

const actualCreditsNeeded =
  Math.ceil(lengthMs / 60000) * pricingTier.creditsPerMinute;

// Step 3: Atomic credit deduction transaction
await prisma.$transaction(async (tx) => {
  // Check user has sufficient credits
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (user.creditBalance < actualCreditsNeeded) {
    throw new Error('Insufficient credits');
  }

  // Create deduction transaction
  const transaction = await tx.transaction.create({
    data: {
      userId,
      type: 'DEDUCTION',
      amount: -actualCreditsNeeded,
      description: `Music generation: ${name}`,
      status: 'COMPLETED',
    },
  });

  // Create music record linked to transaction
  const music = await tx.music.create({
    data: {
      name,
      prompt,
      lengthMs,
      userId,
      creditsUsed: actualCreditsNeeded,
      provider: 'ELEVENLABS',
      transactionId: transaction.id,
      status: 'GENERATING',
    },
  });

  // Update cached credit balance
  await tx.user.update({
    where: { id: userId },
    data: { creditBalance: { decrement: actualCreditsNeeded } },
  });

  return music;
});
```

### **Credit Refund on Failure**

If music generation fails, credits are automatically refunded:

```typescript
// In MusicGenerationProcessor on failure
await prisma.$transaction(async (tx) => {
  // Create refund transaction
  const refundTransaction = await tx.transaction.create({
    data: {
      userId,
      type: 'REFUND',
      amount: originalCreditsUsed,
      description: `Refund for failed generation: ${musicId}`,
      status: 'COMPLETED',
    },
  });

  // Update music record
  await tx.music.update({
    where: { id: musicId },
    data: {
      status: 'FAILED',
      creditsUsed: 0, // Reset to 0 since refunded
    },
  });

  // Update cached balance
  await tx.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: originalCreditsUsed } },
  });
});
```

### **Pricing Flexibility**

The system supports dynamic pricing per AI provider:

```sql
-- Current pricing (1.0 credits per minute for ElevenLabs)
SELECT * FROM "PricingTier" WHERE provider = 'ELEVENLABS' AND "isDefault" = true;

-- Future: Add cheaper self-hosted option
INSERT INTO "PricingTier" (provider, name, "creditsPerMinute", "isDefault")
VALUES ('SELFHOSTED', 'Slow Generation', 0.5, true);
```

---

## 🏗️ Architecture Components

### **Database Schema**

```prisma
model User {
  id              String    @id @default(cuid())
  clerkId         String    @unique
  email           String?   @unique
  name            String?
  creditBalance   Decimal   @default(0) @db.Decimal(10, 4) // CACHED credit balance
  freeTrialUsedAt DateTime? // When free trial was used (null = not used yet)
  deletedAt       DateTime? // Soft delete timestamp
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  music        Music[]
  transactions Transaction[]
}

model Music {
  id           String      @id @default(cuid())
  name         String      // User-provided name
  prompt       String      // Generation prompt
  audioUrl     String?     // S3 URL to the MP3 file (nullable until generation completes)
  thumbnailUrl String?     // S3 URL to thumbnail (MVP2)
  lengthMs     Int?        // Length in milliseconds (nullable until generation completes)
  status       MusicStatus @default(GENERATING)
  creditsUsed  Decimal     @db.Decimal(10, 4) // Credits deducted for this generation
  provider     AIProvider  @default(ELEVENLABS) // Which AI provider was used

  // User relationship
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Transaction relationship (for auditing) - 1:1 for MVP1
  transactionId String? @unique
  transaction   Transaction? @relation(fields: [transactionId], references: [id])

  // Metadata for debugging (API responses, error details, etc.)
  metadata Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transaction {
  id          String            @id @default(cuid())
  type        TransactionType
  amount      Decimal @db.Decimal(10, 4) // Credits involved (positive for purchases/refunds, negative for deductions)
  description String            // Human-readable description
  status      TransactionStatus @default(PENDING)

  // User relationship - DON'T cascade delete transactions (preserve audit trail)
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Restrict)

  // Related entities
  music     Music? // For deduction transactions (1:1 for MVP1)
  productId String? // For purchase transactions
  product   Product? @relation(fields: [productId], references: [id])

  // Payment details (for purchases)
  stripePaymentIntentId String? // Stripe payment intent ID
  stripeWebhookId       String? // For webhook deduplication
  amountPaidCents       Int?    // Amount paid in cents (USD)

  // Metadata
  metadata  Json? // Additional data (Stripe responses, error details, etc.)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id          String  @id @default(cuid())
  name        String  // e.g., "Starter Pack"
  description String? // Optional description
  credits     Decimal @db.Decimal(10, 4) // Number of credits in this package
  priceUsd    Int     // Price in USD cents
  isActive    Boolean @default(true)
  sortOrder   Int     @default(0) // For display ordering

  // Stripe integration
  stripePriceId   String? @unique // Stripe price ID
  stripeProductId String? @unique // Stripe product ID

  // Relations
  transactions Transaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PricingTier {
  id          String     @id @default(cuid())
  provider    AIProvider
  name        String     // e.g., "Fast Generation", "Slow Generation"
  description String?    // Optional description

  // Pricing structure - used for runtime cost calculation
  creditsPerMinute Decimal @db.Decimal(10, 4) // How many credits per minute of audio
  isActive         Boolean @default(true)
  isDefault        Boolean @default(false) // Default option for this provider

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([provider, isDefault]) // Only one default per provider
}

enum MusicStatus {
  GENERATING  // Currently being generated
  COMPLETED   // Successfully generated and uploaded
  FAILED      // Generation or upload failed
}

enum AIProvider {
  ELEVENLABS  // ElevenLabs API (fast, higher cost)
  SELFHOSTED  // Self-hosted model (slow, lower cost) - MVP2
}

enum TransactionType {
  PURCHASE    // Credit purchase
  DEDUCTION   // Credit deduction for music generation
  REFUND      // Credit refund (failed generation, etc.)
  TRIAL       // Free trial credit
}

enum TransactionStatus {
  PENDING     // Transaction initiated but not confirmed
  COMPLETED   // Transaction completed successfully
  FAILED      // Transaction failed
  CANCELLED   // Transaction cancelled
}
```

### **Worker Queue Configuration**

- **Queue Name**: `music-generation`
- **Job Type**: `generate-music`
- **Retry Policy**: 2 attempts, 30-second exponential backoff
- **Cleanup**: Keep completed jobs for 2 hours, failed jobs for 24 hours

### **S3 Storage Structure**

```
bucket: songy-wongy-music/
├── music/
│   ├── 2024-09-01T00-45-30-123Z_My_Awesome_Song.mp3
│   ├── 2024-09-01T00-46-15-456Z_Another_Song.mp3
│   └── ...
└── diag/ (for diagnostic tests)
```

**File Naming Convention**: `music/{timestamp}_{sanitized_name}.{extension}`

---

## 🔧 Key Implementation Details

### **User Security**

- **JWT Authentication**: All endpoints require valid Clerk token
- **User Isolation**: Users can only access their own music records
- **Database Lookup**: `clerkId` (from JWT) → `User.id` (for foreign keys)

### **Error Handling**

- **Validation**: Zod schemas validate all input parameters
- **User Not Found**: Returns appropriate error if user doesn't exist
- **Music Not Found**: Returns 404 if music record doesn't exist or belongs to different user
- **Generation Failures**: Automatic retries, then status set to `FAILED`

### **Performance Considerations**

- **Immediate Response**: `/generate` returns instantly with job ID
- **Non-blocking**: Long ElevenLabs calls don't block HTTP threads
- **Concurrent Processing**: Multiple music generations can run simultaneously
- **Resource Management**: Bull queue handles job scheduling and resource limits

---

## 🚀 Usage Examples

### **Frontend Integration**

```javascript
// 1. Start music generation
const generateResponse = await fetch('/api/music-generator/generate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${clerkToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Song',
    prompt: 'upbeat electronic music',
    lengthMs: 30000,
  }),
});

const {
  data: { musicId },
} = await generateResponse.json();

// 2. Poll for completion
const pollForCompletion = async (musicId) => {
  while (true) {
    const statusResponse = await fetch(
      `/api/music-generator/status/${musicId}`,
      {
        headers: { Authorization: `Bearer ${clerkToken}` },
      },
    );

    const { data } = await statusResponse.json();

    if (data.status === 'COMPLETED') {
      return data.audioUrl; // Ready to play/download!
    } else if (data.status === 'FAILED') {
      throw new Error('Music generation failed');
    }

    // Wait 3 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

// 3. Use the music
const audioUrl = await pollForCompletion(musicId);
document.getElementById('audio-player').src = audioUrl;
```

### **cURL Examples**

```bash
# 1. Generate music
curl -X POST http://localhost:8000/api/music-generator/generate \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Song",
    "prompt": "upbeat electronic music",
    "lengthMs": 30000
  }'

# 2. Check status
curl -H "Authorization: Bearer YOUR_CLERK_JWT" \
  http://localhost:8000/api/music-generator/status/MUSIC_ID_FROM_STEP_1
```

---

## 🔍 Troubleshooting

### **Common Issues**

#### **"User not found for clerkId"**

- **Cause**: User hasn't been created in database via Clerk webhook
- **Solution**: Ensure Clerk webhooks are configured and user creation webhook has fired

#### **"Access Denied" S3 Errors**

- **Cause**: AWS credentials don't have S3 permissions for the bucket
- **Solution**: Verify AWS credentials and bucket permissions

#### **"Music record not found"**

- **Cause**: User trying to access music that doesn't exist or belongs to another user
- **Solution**: Check musicId and ensure user owns the record

#### **Jobs Stuck in "GENERATING"**

- **Cause**: Worker queue not processing jobs (Redis connection issues)
- **Solution**: Check Redis connection and restart worker processes

### **Monitoring & Debugging**

#### **Database Queries**

```sql
-- Check music generation status
SELECT id, name, status, "createdAt", "updatedAt" FROM "Music"
WHERE "userId" = 'USER_DATABASE_ID'
ORDER BY "createdAt" DESC;

-- Check user records
SELECT id, "clerkId", email, name FROM "User";
```

#### **S3 Bucket Contents**

```bash
# List generated music files
aws s3 ls s3://songy-wongy-music/music/ --recursive

# Check specific file
aws s3 ls s3://songy-wongy-music/music/FILENAME.mp3
```

#### **Bull Queue Dashboard**

- **Queue Status**: Monitor job counts, processing times, failures
- **Job Details**: Inspect individual job data and error messages
- **Retry Status**: Track retry attempts and backoff timing

---

## 📝 Development Notes

### **Environment Configuration**

- **Local Development**: Uses `localhost` for database/Redis
- **Docker Development**: Uses container hostnames (`postgres`, `redis`)
- **AWS Credentials**: Shared between local and Docker environments

### **Testing Strategy**

- **Unit Tests**: Mock S3Service and test business logic
- **Integration Tests**: Real S3, PostgreSQL, Redis services
- **E2E Tests**: Complete workflow testing with real services

### **Future Enhancements**

#### **MVP2 Features**

- [ ] **Self-hosted AI Provider**: Add cheaper, slower music generation option
- [ ] **Auto-generated Thumbnails**: Visual representations of music
- [ ] **Finer Credit Increments**: 1 credit = 30s instead of 1 minute
- [ ] **Subscription Plans**: Monthly bundles at discounted rates

#### **Technical Improvements**

- [ ] **Batch Music Generation**: Generate multiple songs in one request
- [ ] **Music File Expiration**: Automatic cleanup of old files
- [ ] **Real-time Status Updates**: WebSocket notifications for completion
- [ ] **Webhook Notifications**: External system integration
- [ ] **Music File Transcoding**: Multiple format support
- [ ] **Playlist Management**: User-created playlists

#### **Credit System Enhancements**

- [ ] **Credit Purchase API**: Stripe integration for buying credits
- [ ] **Free Trial Implementation**: Automatic 1 credit on signup
- [ ] **Credit History**: Transaction audit trail for users
- [ ] **Usage Analytics**: Track credit consumption patterns
- [ ] **Promotional Credits**: Marketing campaigns and referrals

## 🚧 Current Implementation Status

### **✅ Completed (MVP1 Foundation)**

- [x] **Database Schema**: Complete credit system schema implemented
- [x] **Music Generation**: Async workflow with worker queues
- [x] **User Authentication**: Clerk integration with user lookup
- [x] **S3 Storage**: Audio file upload and management
- [x] **Status Polling**: Real-time generation progress tracking
- [x] **Error Handling**: Automatic retries and failure management

### **🔄 In Progress**

- [ ] **Credit Validation**: Implement credit checking before generation
- [ ] **Transaction Creation**: Link music generation to credit deductions
- [ ] **Credit Refunds**: Automatic refunds on generation failure

### **📋 Next Implementation Steps**

#### **Phase 1: Credit Integration**

1. **Update `requestMusicGeneration`** to validate credits and create transactions
2. **Modify `MusicGenerationProcessor`** to handle credit refunds on failure
3. **Add credit balance checks** to prevent insufficient credit requests

#### **Phase 2: Credit Purchase System**

1. **Create Products Controller**: Manage credit bundles
2. **Implement Stripe Integration**: Checkout and webhook handling
3. **Add Transaction History**: User-facing credit audit trail

#### **Phase 3: User Experience**

1. **Frontend Credit Display**: Show balance and transaction history
2. **Purchase Flow UI**: Credit bundle selection and checkout
3. **Free Trial Implementation**: Automatic credit on signup

### **🔧 Implementation Reference**

When implementing credit features, use the code examples in the **Credit System Integration** section above as the foundation. The database schema is already in place and ready for the credit system implementation.

---

_Last Updated: September 5, 2024_
