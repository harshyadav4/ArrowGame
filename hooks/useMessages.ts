"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signAttachmentUrl } from "@/lib/storage";
import type { Message, MessageWithUrl } from "@/lib/types";

function sortByTime(list: MessageWithUrl[]): MessageWithUrl[] {
  return [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export interface UseMessages {
  messages: MessageWithUrl[];
  addOptimistic: (message: MessageWithUrl) => void;
  removeMessage: (id: string) => void;
}

/**
 * Live message state for a conversation: seeded from server-rendered initial
 * data, then kept in sync via Supabase realtime (inserts + read-receipt
 * updates). Attachment signed URLs are resolved lazily and cached.
 */
export function useMessages(
  conversationId: string,
  initial: MessageWithUrl[],
): UseMessages {
  const [messages, setMessages] = useState<MessageWithUrl[]>(() =>
    sortByTime(initial),
  );
  const signedPaths = useRef<Set<string>>(
    new Set(
      initial
        .filter((m) => m.attachmentUrl && m.attachment_path)
        .map((m) => m.attachment_path as string),
    ),
  );

  const signIfNeeded = useCallback((message: MessageWithUrl) => {
    const path = message.attachment_path;
    if (!path || message.attachmentUrl || signedPaths.current.has(path)) return;
    signedPaths.current.add(path);
    signAttachmentUrl(createClient(), path).then((url) => {
      if (!url) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, attachmentUrl: url } : m)),
      );
    });
  }, []);

  const upsert = useCallback(
    (incoming: MessageWithUrl) => {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === incoming.id);
        const merged: MessageWithUrl = existing
          ? {
              ...incoming,
              attachmentUrl: incoming.attachmentUrl ?? existing.attachmentUrl,
            }
          : incoming;
        const next = existing
          ? prev.map((m) => (m.id === incoming.id ? merged : m))
          : [...prev, merged];
        return sortByTime(next);
      });
      signIfNeeded(incoming);
    },
    [signIfNeeded],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          upsert({ ...m, attachmentUrl: null });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, upsert]);

  const addOptimistic = useCallback((message: MessageWithUrl) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id)
        ? prev
        : sortByTime([...prev, message]),
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, addOptimistic, removeMessage };
}
