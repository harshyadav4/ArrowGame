import { avatarColor, initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  seed: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Round avatar: image if available, otherwise coloured initials. */
export function Avatar({ name, seed, src, size = 48, className }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={dimension}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      style={{ ...dimension, backgroundColor: avatarColor(seed) }}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white ${className ?? ""}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(name)}</span>
    </div>
  );
}
