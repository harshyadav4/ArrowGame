/**
 * Database types.
 *
 * Hand-written to match supabase/migrations. After running the local stack you
 * can regenerate with:
 *   npx supabase gen types typescript --local > lib/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          user_id: string;
          campaign_index: number;
          hints_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          campaign_index?: number;
          hints_count?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          campaign_index?: number;
          hints_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          last_message_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_path: string | null;
          attachment_type: string | null;
          attachment_name: string | null;
          attachment_width: number | null;
          attachment_height: number | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string;
          attachment_path?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_width?: number | null;
          attachment_height?: number | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          attachment_path?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_width?: number | null;
          attachment_height?: number | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      start_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
      is_conversation_participant: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      get_conversation_summaries: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          peer_id: string;
          peer_username: string;
          peer_display_name: string;
          peer_avatar_url: string | null;
          last_message_at: string;
          last_message_body: string | null;
          unread_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// --- Convenience row aliases ---------------------------------------------------
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];


// --- Domain/composite types used across the UI --------------------------------

/** Lightweight profile shape used for peers in lists and headers. */
export type PeerProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url"
>;

/** A conversation paired with the other participant and a preview/unread count. */
export interface ConversationSummary {
  id: string;
  peer: PeerProfile;
  lastMessageAt: string;
  lastMessageBody: string | null;
  unreadCount: number;
}

/** A message plus a resolved signed URL for its attachment (if any). */
export type MessageWithUrl = Message & { attachmentUrl: string | null };
