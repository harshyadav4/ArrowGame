import { Avatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { formatListTime } from "@/lib/format";
import type { ConversationSummary } from "@/lib/types";

interface ConversationListItemProps {
  summary: ConversationSummary;
  active: boolean;
  online: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  summary,
  active,
  online,
  onClick,
}: ConversationListItemProps) {
  const { peer, lastMessageBody, lastMessageAt, unreadCount } = summary;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition cursor-pointer ${
        active
          ? "bg-[#3390ec] text-white"
          : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <div className="relative">
        <Avatar
          name={peer.display_name}
          seed={peer.id}
          src={peer.avatar_url}
          size={48}
        />
        {online && (
          <PresenceDot
            online
            className="absolute bottom-0 right-0 h-3 w-3"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{peer.display_name}</p>
          <span
            className={`shrink-0 text-xs ${
              active ? "text-white/80" : "text-neutral-400"
            }`}
          >
            {formatListTime(lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              active ? "text-white/90" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {lastMessageBody ?? "No messages yet"}
          </p>
          {unreadCount > 0 && !active && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3390ec] px-1.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
