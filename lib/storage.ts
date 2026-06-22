import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  CHAT_MEDIA_BUCKET,
  MAX_ATTACHMENT_BYTES,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/constants";

type Client = SupabaseClient<Database>;

export interface UploadedAttachment {
  path: string;
  type: "image" | "audio";
  name: string;
  width: number | null;
  height: number | null;
}

/** Validate a chosen image file before upload. Returns an error message, or null. */
export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Only PNG, JPEG, GIF, or WebP images are supported";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "Image is too large (max 10 MB)";
  }
  return null;
}

/** Validate a recorded audio file before upload. Returns an error message, or null. */
export function validateAudioFile(file: File): string | null {
  // Some browsers append codecs (e.g. "audio/webm;codecs=opus").
  const base = file.type.split(";")[0]!.trim();
  if (!(ALLOWED_AUDIO_TYPES as readonly string[]).includes(base)) {
    return "Unsupported audio format";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "Recording is too large (max 10 MB)";
  }
  return null;
}

function readImageDimensions(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Upload a media file into the conversation's folder. The path is prefixed with
 * the conversation id so storage RLS can scope access to participants. The type
 * (image vs audio) is inferred from the file's MIME type.
 */
export async function uploadAttachment(
  supabase: Client,
  conversationId: string,
  file: File,
): Promise<UploadedAttachment> {
  const isAudio = file.type.startsWith("audio/");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error("Upload failed. Please try again.");
  }

  if (isAudio) {
    return { path, type: "audio", name: file.name, width: null, height: null };
  }

  const { width, height } = await readImageDimensions(file);
  return { path, type: "image", name: file.name, width, height };
}

/** Batch-sign attachment paths. Returns a path -> signed URL map. */
export async function signAttachmentUrls(
  supabase: Client,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const { data } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/** Sign a single attachment path. */
export async function signAttachmentUrl(
  supabase: Client,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
