import { Avatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import type { PeerProfile } from "@/lib/types";

interface ChatHeaderProps {
  peer: PeerProfile;
  online: boolean;
  isPeerTyping: boolean;
  onBack?: () => void;
}

export function ChatHeader({ peer, online, isPeerTyping, onBack }: ChatHeaderProps) {
  const status = isPeerTyping
    ? "typing…"
    : online
      ? "online"
      : "last seen recently";

  return (
    <header className="flex items-center gap-3 border-b border-white/10 bg-[#120f2b] px-3 py-2.5 dark:border-white/10 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-full p-1 text-slate-400 hover:text-white transition hover:bg-white/5 cursor-pointer"
        >
          <BackIcon />
        </button>
      )}

      <div className="relative">
        <Avatar
          name={peer.display_name}
          seed={peer.id}
          src={peer.avatar_url}
          size={42}
        />
        {online && (
          <PresenceDot online className="absolute bottom-0 right-0 h-3 w-3" />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">
          {peer.display_name}
        </p>
        <p
          className={`truncate text-xs leading-tight ${
            isPeerTyping || online ? "text-[#3390ec]" : "text-neutral-500"
          }`}
        >
          {status}
        </p>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
