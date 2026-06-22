"use client";

import { Fragment, useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { formatDayLabel } from "@/lib/format";
import type { MessageWithUrl } from "@/lib/types";

interface MessageListProps {
  messages: MessageWithUrl[];
  currentUserId: string;
  isPeerTyping: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  isPeerTyping,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isPeerTyping]);

  if (messages.length === 0 && !isPeerTyping) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="rounded-full bg-black/10 px-4 py-2 text-center text-sm text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
          No messages yet. Say hi 👋
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto scroll-slim px-3 py-4 md:px-6">
      {messages.map((message, index) => {
        const day = formatDayLabel(message.created_at);
        const prevDay =
          index > 0 ? formatDayLabel(messages[index - 1]!.created_at) : null;
        const showDay = day !== prevDay;

        return (
          <Fragment key={message.id}>
            {showDay && <DaySeparator label={day} />}
            <MessageBubble
              message={message}
              isOwn={message.sender_id === currentUserId}
            />
          </Fragment>
        );
      })}

      {isPeerTyping && (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-black/20 px-3 py-0.5 text-xs font-medium text-white backdrop-blur dark:bg-white/15">
        {label}
      </span>
    </div>
  );
}
