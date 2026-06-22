"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PRESENCE_CHANNEL = "online-users";

/**
 * Tracks which users are currently online using Supabase Presence. Joins a
 * shared channel keyed by the current user's id and returns the set of online
 * user ids (including the current user).
 */
export function usePresence(currentUserId: string): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return online;
}
