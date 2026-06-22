/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in the process, so it is per-instance only. It is a guard
 * against accidental floods, not a security boundary. For multi-instance
 * production use, back this with Redis/Upstash instead.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}
