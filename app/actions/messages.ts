"use server";

import { createClient } from "@/lib/supabase/server";
import { firstIssue, sendMessageSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  RATE_LIMIT_MAX_MESSAGES,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";
import type { Message } from "@/lib/types";
import type { SendMessageInput } from "@/lib/validations";

export type SendResult =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export async function sendMessage(
  input: SendMessageInput,
): Promise<SendResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "Not authenticated" };

  if (
    !checkRateLimit(
      `msg:${userId}`,
      RATE_LIMIT_MAX_MESSAGES,
      RATE_LIMIT_WINDOW_MS,
    )
  ) {
    return { ok: false, error: "You're sending messages too quickly" };
  }

  const { id, conversationId, body, attachment } = parsed.data;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      ...(id ? { id } : {}),
      conversation_id: conversationId,
      sender_id: userId,
      body,
      attachment_path: attachment?.path ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_width: attachment?.width ?? null,
      attachment_height: attachment?.height ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "Could not send message" };
  return { ok: true, message: data };
}

/**
 * Mark all messages the current user has received (across every conversation)
 * as delivered. Called while the user is online — the WhatsApp "double tick".
 * RLS scopes the update to the user's own conversations.
 */
export async function markIncomingDelivered(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return;

  await supabase
    .from("messages")
    .update({ delivered_at: new Date().toISOString() })
    .neq("sender_id", userId)
    .is("delivered_at", null);
}

/** Mark every message the current user received in a conversation as read. */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}
