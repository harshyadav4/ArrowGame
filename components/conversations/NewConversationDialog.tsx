"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import type { PeerProfile } from "@/lib/types";

interface NewConversationDialogProps {
  onClose: () => void;
  currentUserId: string;
  onSelectConversation: (id: string, person: PeerProfile) => void;
}

export function NewConversationDialog({
  onClose,
  currentUserId,
  onSelectConversation,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PeerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = query.trim();
    const handle = setTimeout(async () => {
      if (term.length < 1) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", currentUserId)
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(20);
        
      setResults((data as PeerProfile[]) ?? []);
      setLoading(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query, currentUserId]);

  const onPick = async (person: PeerProfile) => {
    setError(null);
    setActionPending(true);
    try {
      const { data, error } = await supabase.rpc("start_conversation", {
        other_user_id: person.id,
      });

      if (error || !data) {
        throw new Error(error?.message || "Could not start conversation");
      }

      onSelectConversation(data, person);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start conversation");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Start a new conversation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-[#120f2b] border border-white/10 shadow-2xl p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div className="border-b border-white/5 p-3 flex items-center justify-between">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                onPick(results[0]);
              }
            }}
            placeholder="Search people by name or @username"
            className="w-full rounded-xl bg-white/3 border border-white/5 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-all duration-200"
          />
        </div>

        {error && (
          <p className="px-4 py-2 text-xs font-semibold text-red-400 text-center animate-slide-down" role="alert">
            {error}
          </p>
        )}

        {/* Results List */}
        <ul className="max-h-[40vh] overflow-y-auto scrollbar-thin divide-y divide-white/5">
          {loading && (
            <li className="px-4 py-3 text-xs text-slate-400 text-center">Searching…</li>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <li className="px-4 py-3 text-xs text-slate-400 text-center">
              No people found
            </li>
          )}
          {results.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                disabled={actionPending}
                onClick={() => onPick(person)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 text-white transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                <Avatar
                  name={person.display_name}
                  seed={person.id}
                  src={person.avatar_url}
                  size={36}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-xs text-white">{person.display_name}</p>
                  <p className="truncate text-[10px] text-slate-400">
                    @{person.username}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
