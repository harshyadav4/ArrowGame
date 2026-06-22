"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { useTyping } from "@/hooks/useTyping";
import { useOnlineUsers } from "@/components/PresenceProvider";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { uploadAttachment, type UploadedAttachment } from "@/lib/storage";
import { markConversationRead, sendMessage } from "@/app/actions/messages";
import type { MessageWithUrl, PeerProfile } from "@/lib/types";

interface ChatPanelProps {
  conversationId: string;
  currentUserId: string;
  peer: PeerProfile;
  initialMessages: MessageWithUrl[];
  onBack?: () => void;
}

const ERROR_TIMEOUT_MS = 4000;

export function ChatPanel({
  conversationId,
  currentUserId,
  peer,
  initialMessages,
  onBack,
}: ChatPanelProps) {
  const { messages, addOptimistic, removeMessage } = useMessages(
    conversationId,
    initialMessages,
  );
  const { isPeerTyping, broadcastTyping } = useTyping(
    conversationId,
    currentUserId,
  );
  const online = useOnlineUsers();
  const [error, setError] = useState<string | null>(null);

  // Mark received messages as read whenever there is something unread.
  useEffect(() => {
    const hasUnread = messages.some(
      (m) => m.sender_id !== currentUserId && !m.read_at,
    );
    if (hasUnread) void markConversationRead(conversationId);
  }, [messages, conversationId, currentUserId]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleSend({
    body,
    file,
  }: {
    body: string;
    file: File | null;
  }): Promise<boolean> {
    const supabase = createClient();
    const id = crypto.randomUUID();
    let attachment: UploadedAttachment | null = null;
    let objectUrl: string | null = null;

    if (file) {
      objectUrl = URL.createObjectURL(file);
      try {
        attachment = await uploadAttachment(supabase, conversationId, file);
      } catch {
        setError("Could not upload image. Please try again.");
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return false;
      }
    }

    addOptimistic({
      id,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
      attachment_path: attachment?.path ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_width: attachment?.width ?? null,
      attachment_height: attachment?.height ?? null,
      delivered_at: null,
      read_at: null,
      created_at: new Date().toISOString(),
      attachmentUrl: objectUrl,
    });

    const result = await sendMessage({ id, conversationId, body, attachment });
    if (!result.ok) {
      removeMessage(id);
      setError(result.error);
      return false;
    }
    return true;
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        peer={peer}
        online={online.has(peer.id)}
        isPeerTyping={isPeerTyping}
        onBack={onBack}
      />

      <div className="chat-wallpaper relative flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isPeerTyping={isPeerTyping}
        />
        {error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <p className="pointer-events-auto rounded-full bg-red-600 px-4 py-1.5 text-sm text-white shadow-lg">
              {error}
            </p>
          </div>
        )}
      </div>

      <MessageComposer onSend={handleSend} onTyping={broadcastTyping} />
    </div>
  );
}
