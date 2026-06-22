import { formatTime } from "@/lib/format";
import type { MessageWithUrl } from "@/lib/types";

interface MessageBubbleProps {
  message: MessageWithUrl;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const hasAttachment = Boolean(
    message.attachmentUrl || message.attachment_path,
  );
  const isImage = message.attachment_type === "image" && hasAttachment;
  const isAudio = message.attachment_type === "audio" && hasAttachment;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] overflow-hidden rounded-2xl shadow-sm md:max-w-[70%] ${
          isOwn
            ? "rounded-br-md bg-[#3390ec] text-white"
            : "rounded-bl-md bg-white text-neutral-900 dark:bg-[#182533] dark:text-neutral-100"
        }`}
      >
        {isImage && (
          <a
            href={message.attachmentUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            {message.attachmentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.attachmentUrl}
                alt={message.attachment_name ?? "image"}
                className="max-h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 w-60 animate-pulse items-center justify-center bg-black/10 text-sm dark:bg-white/10">
                Loading image…
              </div>
            )}
          </a>
        )}

        {isAudio && (
          <div className="px-2 pt-2">
            {message.attachmentUrl ? (
              <audio
                controls
                src={message.attachmentUrl}
                className="h-10 w-56 max-w-full"
                aria-label="voice message"
              />
            ) : (
              <div className="flex h-10 w-56 animate-pulse items-center justify-center rounded bg-black/10 text-sm dark:bg-white/10">
                Loading audio…
              </div>
            )}
          </div>
        )}

        {message.body && (
          <p className="whitespace-pre-wrap break-words px-3 pt-2 text-[15px] leading-snug">
            {message.body}
          </p>
        )}

        <div
          className={`flex items-center justify-end gap-1 px-3 pb-1.5 text-[11px] ${
            message.body ? "pt-0.5" : "pt-1.5"
          } ${isOwn ? "text-white/80" : "text-neutral-400"}`}
        >
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <DeliveryTicks
              delivered={Boolean(message.delivered_at)}
              read={Boolean(message.read_at)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * WhatsApp-style ticks:
 *   single grey  = sent (recipient offline / not yet delivered)
 *   double grey  = delivered (recipient online)
 *   double green = read (recipient opened the chat)
 */
function DeliveryTicks({
  delivered,
  read,
}: {
  delivered: boolean;
  read: boolean;
}) {
  const isDouble = delivered || read;
  const label = read ? "read" : delivered ? "delivered" : "sent";

  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={label}
      className={read ? "text-green-400" : "text-white/70"}
    >
      <polyline points="2,7 6,11 12,3" />
      {isDouble && <polyline points="8,11 9,10 16,2" />}
    </svg>
  );
}
