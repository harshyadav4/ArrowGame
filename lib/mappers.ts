import type { ConversationSummary, Database } from "@/lib/types";

type SummaryRow =
  Database["public"]["Functions"]["get_conversation_summaries"]["Returns"][number];

/** Map a get_conversation_summaries row to the UI ConversationSummary shape. */
export function toConversationSummary(row: SummaryRow): ConversationSummary {
  return {
    id: row.id,
    peer: {
      id: row.peer_id,
      username: row.peer_username,
      display_name: row.peer_display_name,
      avatar_url: row.peer_avatar_url,
    },
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
    unreadCount: Number(row.unread_count),
  };
}
