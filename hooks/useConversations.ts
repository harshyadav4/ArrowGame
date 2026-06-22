"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toConversationSummary } from "@/lib/mappers";
import { markIncomingDelivered } from "@/app/actions/messages";
import type { ConversationSummary } from "@/lib/types";

const REFETCH_DEBOUNCE_MS = 250;

/**
 * Conversation list state for the sidebar. Seeded from the server, then
 * refetched (debounced) whenever a message or conversation the user can see
 * changes, so previews, ordering and unread counts stay live.
 */
export function useConversations(
  initial: ConversationSummary[],
): ConversationSummary[] {
  const [summaries, setSummaries] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await createClient().rpc("get_conversation_summaries");
    if (data) setSummaries(data.map(toConversationSummary));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // We're online: mark already-received messages as delivered.
    void markIncomingDelivered();

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      // A change arrived while online → mark delivered, then refresh the list.
      void markIncomingDelivered();
      timer.current = setTimeout(refetch, REFETCH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("conversation-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        schedule,
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return summaries;
}
