"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  TYPING_BROADCAST_THROTTLE_MS,
  TYPING_CLEAR_MS,
} from "@/lib/constants";

export interface UseTyping {
  isPeerTyping: boolean;
  broadcastTyping: () => void;
}

/**
 * Ephemeral typing indicator over a per-conversation Broadcast channel.
 * Sending is throttled; the peer-typing flag auto-clears after a short delay.
 */
export function useTyping(
  conversationId: string,
  currentUserId: string,
): UseTyping {
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === currentUserId) return;
        setIsPeerTyping(true);
        if (clearTimer.current) clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(
          () => setIsPeerTyping(false),
          TYPING_CLEAR_MS,
        );
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < TYPING_BROADCAST_THROTTLE_MS) return;
    lastSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  return { isPeerTyping, broadcastTyping };
}
