export interface MusicGenerationRequestedEventData {
  musicId: string; // Database record ID
  userId: string; // Clerk user ID
  name: string;
  prompt: string;
  lengthMs?: number;
  outputFormat?: string;
  modelId?: string;
}

export interface MusicGenerationRequestedEvent {
  data: MusicGenerationRequestedEventData;
}

export interface MusicGenerationCompletedEventData {
  musicId: string;
  userId: string;
  s3Url: string;
  s3Key: string;
  s3Bucket: string;
  metadata: {
    name: string;
    prompt: string;
    lengthMs?: number;
    outputFormat: string;
    modelId: string;
    generatedAt: string;
  };
  completedAt: string;
}

export interface MusicGenerationCompletedEvent {
  data: MusicGenerationCompletedEventData;
}

export interface MusicGenerationFailedEventData {
  musicId: string;
  userId: string;
  error: string;
  failedAt: string;
}

export interface MusicGenerationFailedEvent {
  data: MusicGenerationFailedEventData;
}
