# Music Generation Flow Documentation

This document describes the complete end-to-end flow for generating music using the Songy Wongy API.

## 🎵 Overview

The music generation system uses an **asynchronous workflow** with worker queues to handle long-running ElevenLabs API calls without blocking HTTP requests. The complete flow involves:

1. **Job Creation** - User requests music generation
2. **Background Processing** - Worker queue processes the request
3. **Status Polling** - User checks generation progress
4. **File Access** - User downloads the completed music file

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
3. Service creates `Music` record in database (status: `GENERATING`)
4. Service emits `music.generation.requested` event
5. Returns `musicId` for polling

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

## 🏗️ Architecture Components

### **Database Schema**

```prisma
model Music {
  id       String      @id @default(cuid())
  name     String      // User-provided name
  prompt   String      // Generation prompt
  audioUrl String      // S3 URL to the MP3 file
  lengthMs Int         // Length in milliseconds
  status   MusicStatus @default(GENERATING)
  userId   String      // References User.id (not clerkId!)
  user     User        @relation(fields: [userId], references: [id])
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

enum MusicStatus {
  GENERATING  // Currently being generated
  COMPLETED   // Successfully generated and uploaded
  FAILED      // Generation or upload failed
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

- [ ] User credit/permission validation
- [ ] Batch music generation
- [ ] Music file expiration/cleanup
- [ ] Webhook notifications for completion
- [ ] Real-time status updates via WebSocket
- [ ] Music file transcoding/format conversion
- [ ] Playlist management integration

---

_Last Updated: September 1, 2024_
