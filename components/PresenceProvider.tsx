"use client";

import { createContext, useContext } from "react";
import { usePresence } from "@/hooks/usePresence";

const OnlineUsersContext = createContext<Set<string>>(new Set());

/**
 * Subscribes to presence once for the whole app shell and shares the set of
 * online user ids via context (avoids duplicate presence channels).
 */
export function PresenceProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const online = usePresence(userId);
  return (
    <OnlineUsersContext.Provider value={online}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export function useOnlineUsers(): Set<string> {
  return useContext(OnlineUsersContext);
}
