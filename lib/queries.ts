import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signAttachmentUrls } from "@/lib/storage";
import { toConversationSummary } from "@/lib/mappers";
import type {
  ConversationSummary,
  MessageWithUrl,
  PeerProfile,
  Profile,
} from "@/lib/types";

/** The signed-in user's own profile, or null if not authenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

/** Conversation list for the sidebar, newest first. */
export async function getConversationSummaries(): Promise<
  ConversationSummary[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_conversation_summaries");
  if (error || !data) return [];

  return data.map(toConversationSummary);
}

export interface ConversationContext {
  conversationId: string;
  currentUserId: string;
  peer: PeerProfile;
}

/** Resolve a conversation + the other participant, or null if inaccessible. */
export async function getConversationContext(
  conversationId: string,
): Promise<ConversationContext | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user1_id, user2_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const peerId =
    conversation.user1_id === userId
      ? conversation.user2_id
      : conversation.user1_id;

  const { data: peer } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", peerId)
    .single();
  if (!peer) return null;

  return { conversationId, currentUserId: userId, peer };
}

/** All messages for a conversation with signed URLs resolved for attachments. */
export async function getMessagesWithUrls(
  conversationId: string,
): Promise<MessageWithUrl[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages = data ?? [];
  const paths = messages
    .map((m) => m.attachment_path)
    .filter((p): p is string => Boolean(p));
  const urls = await signAttachmentUrls(supabase, paths);

  return messages.map((m) => ({
    ...m,
    attachmentUrl: m.attachment_path
      ? (urls.get(m.attachment_path) ?? null)
      : null,
  }));
}
