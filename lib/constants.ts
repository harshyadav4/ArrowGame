/** Shared constants. Keep magic numbers and bucket names here. */

export const CHAT_MEDIA_BUCKET = "chat-media";

export const MAX_MESSAGE_LENGTH = 2000;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

/** Max length of a voice recording. */
export const MAX_VOICE_SECONDS = 120;

/** Lifetime of a signed media URL. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Typing indicator timings. */
export const TYPING_BROADCAST_THROTTLE_MS = 1500;
export const TYPING_CLEAR_MS = 3000;

/** Best-effort send rate limit (per user, per server instance). */
export const RATE_LIMIT_MAX_MESSAGES = 20;
export const RATE_LIMIT_WINDOW_MS = 10_000;

/** Debounce for the user search box. */
export const SEARCH_DEBOUNCE_MS = 300;
