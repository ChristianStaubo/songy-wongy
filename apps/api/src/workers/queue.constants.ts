// Music Generation Queue
export const MUSIC_GENERATION_QUEUE = 'music-generation';
export const GENERATE_MUSIC_JOB = 'generate-music';

// Default job options
export const DEFAULT_INVOICE_PAID_JOB_OPTIONS = {
  removeOnComplete: { age: 15 * 60 * 1000 }, // 15 min - enough for polling window
  removeOnFail: { age: 6 * 60 * 60 * 1000 }, // 6 h - keep failures longer for debugging
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3 * 60 * 1000, // 3 minutes (we get rate limited by beds24 for 100 requests in 5 min. So if it fails, we wait 5 minutes before trying again)
  },
};

export const DEFAULT_MUSIC_GENERATION_JOB_OPTIONS = {
  removeOnComplete: { age: 2 * 60 * 60 * 1000 }, // 2 hours - keep successful jobs for polling
  removeOnFail: { age: 24 * 60 * 60 * 1000 }, // 24 hours - keep failures longer for debugging
  attempts: 2, // Only retry once for ElevenLabs API failures
  backoff: {
    type: 'exponential',
    delay: 30 * 1000, // 30 seconds - shorter delay for music generation
  },
};
