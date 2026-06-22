"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ConversationListItem } from "@/components/conversations/ConversationListItem";
import { NewConversationDialog } from "@/components/conversations/NewConversationDialog";
import { useConversations } from "@/hooks/useConversations";
import { useOnlineUsers } from "@/components/PresenceProvider";
import type { ConversationSummary, Profile, PeerProfile } from "@/lib/types";

interface SidebarProps {
  currentUser: Profile;
  initialSummaries: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string, person?: PeerProfile) => void;
}

export function Sidebar({
  currentUser,
  initialSummaries,
  activeConversationId,
  onSelectConversation,
}: SidebarProps) {
  const summaries = useConversations(initialSummaries);
  const online = useOnlineUsers();
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return summaries;
    return summaries.filter(
      (s) =>
        s.peer.display_name.toLowerCase().includes(term) ||
        s.peer.username.toLowerCase().includes(term)
    );
  }, [summaries, filter]);

  return (
    <aside className="relative h-full w-full shrink-0 flex flex-col border-r border-white/10 bg-[#120f2b] dark:bg-[#120f2b]">
      {/* Sidebar Header */}
      <header className="flex items-center gap-3 border-b border-white/5 px-4 pb-3 pt-3">
        <Avatar
          name={currentUser.display_name}
          seed={currentUser.id}
          src={currentUser.avatar_url}
          size={38}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white text-sm">
            {currentUser.display_name}
          </p>
          <p className="truncate text-[10px] text-slate-400">
            @{currentUser.username}
          </p>
        </div>

        {/* Start New Chat Button */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          title="New chat"
          aria-label="New chat"
          className="rounded-full p-2.5 text-violet-400 hover:bg-violet-500/10 transition duration-200 cursor-pointer"
        >
          <ComposeIcon />
        </button>
      </header>

      {/* Filter search box */}
      <div className="p-2 border-b border-white/5">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search chats..."
          className="w-full rounded-xl bg-white/3 border border-white/5 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none px-3.5 py-2 text-xs text-white placeholder-slate-500 transition duration-200"
        />
      </div>

      {/* Conversations Scrollable List */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin">
        {summaries.length === 0 && (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            No conversations yet.
            <br />
            Tap the compose button to start one.
          </div>
        )}
        {summaries.length > 0 && filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            No matches for “{filter}”.
          </div>
        )}
        {filtered.map((summary) => (
          <ConversationListItem
            key={summary.id}
            summary={summary}
            active={activeConversationId === summary.id}
            online={online.has(summary.peer.id)}
            onClick={() => onSelectConversation(summary.id)}
          />
        ))}
      </nav>

      {/* Floating New Chat Compose trigger (mobile) */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label="New chat"
        className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition hover:bg-violet-500 cursor-pointer md:hidden"
      >
        <ComposeIcon />
      </button>

      {/* Start chat dialog overlay */}
      {dialogOpen && (
        <NewConversationDialog
          onClose={() => setDialogOpen(false)}
          currentUserId={currentUser.id}
          onSelectConversation={(id, person) => {
            onSelectConversation(id, person);
            setDialogOpen(false);
          }}
        />
      )}
    </aside>
  );
}

function ComposeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
