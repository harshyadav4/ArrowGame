"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/conversations/Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PresenceProvider } from "@/components/PresenceProvider";
import { supabase } from "@/utils/supabase";
import { toConversationSummary } from "@/lib/mappers";
import type { ConversationSummary, MessageWithUrl, Profile, PeerProfile } from "@/lib/types";

interface ChatScreenProps {
  onBack: () => void;
  user: {
    id: string;
    email?: string;
    display_name?: string;
    username?: string;
    avatar_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onBack, user }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [initialSummaries, setInitialSummaries] = useState<ConversationSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  
  const [initialMessages, setInitialMessages] = useState<MessageWithUrl[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<PeerProfile | null>(null);

  // Fetch summaries on mount
  useEffect(() => {
    async function loadSummaries() {
      try {
        const { data, error } = await supabase.rpc("get_conversation_summaries");
        if (error) throw error;
        setInitialSummaries((data || []).map(toConversationSummary));
      } catch (err) {
        console.error("Failed to load conversation summaries:", err);
      } finally {
        setLoadingSummaries(false);
      }
    }
    loadSummaries();
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setInitialMessages([]);
      return;
    }
    const conversationId = activeConversationId;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) throw error;

        const msgs = (data || []).map((m) => ({
          ...m,
          attachmentUrl: null,
        })) as MessageWithUrl[];

        setInitialMessages(msgs);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [activeConversationId]);

  const handleSelectConversation = (id: string, peer?: PeerProfile) => {
    if (peer) {
      setSelectedPeer(peer);
    } else {
      const summary = initialSummaries.find((s) => s.id === id);
      if (summary) setSelectedPeer(summary.peer);
    }
    setActiveConversationId(id);
  };

  // Construct currentUser Profile object
  const currentUser: Profile = {
    id: user.id,
    display_name: user.display_name || "Player",
    username: user.username || "player",
    avatar_url: user.avatar_url || null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };

  // Find active peer profile
  const activeSummary = initialSummaries.find((s) => s.id === activeConversationId);
  const activePeer: PeerProfile | undefined = activeSummary?.peer || selectedPeer || undefined;

  return (
    <PresenceProvider userId={user.id}>
      <div className="w-full h-full flex flex-col overflow-hidden text-[#f8fafc]">
        {/* Back navigation button (only visible when not in active chat) */}
        {!activeConversationId && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#120f2b] shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all duration-200 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Game
            </button>
            <span className="text-xs text-slate-500 font-bold bg-white/2 border border-white/10 rounded-full px-2.5 py-1">
              Chat Lobby
            </span>
          </div>
        )}

        {/* Chat Area Container */}
        <div className="flex-1 bg-[#120f2b] flex flex-col overflow-hidden">
          {loadingSummaries ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="text-xs text-slate-400 font-medium">Loading inbox...</span>
            </div>
          ) : activeConversationId && activePeer ? (
            loadingMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                <span className="text-xs text-slate-400 font-medium">Loading messages...</span>
              </div>
            ) : (
              <ChatPanel
                conversationId={activeConversationId}
                currentUserId={user.id}
                peer={activePeer}
                initialMessages={initialMessages}
                onBack={() => setActiveConversationId(null)}
              />
            )
          ) : (
            <Sidebar
              currentUser={currentUser}
              initialSummaries={initialSummaries}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
            />
          )}
        </div>
      </div>
    </PresenceProvider>
  );
};
