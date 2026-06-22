interface PresenceDotProps {
  online: boolean;
  className?: string;
}

/** Small status dot used on avatars and in the chat header. */
export function PresenceDot({ online, className }: PresenceDotProps) {
  return (
    <span
      aria-label={online ? "online" : "offline"}
      className={`inline-block rounded-full ring-2 ring-white dark:ring-[#17212b] ${
        online ? "bg-green-500" : "bg-neutral-400"
      } ${className ?? ""}`}
    />
  );
}
