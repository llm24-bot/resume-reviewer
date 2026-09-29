import { createHash, timingSafeEqual } from "node:crypto";
import { MAX_REQUEST_BYTES } from "./review";

export function matchesAccessCode(expected: string, received: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(expected), hash(received));
}

// A bounded, per-process backstop, not a distributed rate limiter.
// Production additionally requires a private access code.
export function createLimiter(limit = 6, windowMs = 60_000) {
  const buckets = new Map<string, { count: number; until: number }>();
  return (key: string, now = Date.now()) => {
    for (const [id, bucket] of buckets) {
      if (bucket.until <= now) buckets.delete(id);
    }
    const current = buckets.get(key);
    if (current && current.count >= limit) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((current.until - now) / 1000)),
      };
    }
    if (current) current.count += 1;
    else {
      if (buckets.size >= 10_000) return { allowed: false, retryAfter: 60 };
      buckets.set(key, { count: 1, until: now + windowMs });
    }
    return { allowed: true, retryAfter: 0 };
  };
}

export class BodyTooLargeError extends Error {}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_REQUEST_BYTES) throw new BodyTooLargeError();
  if (!request.body) throw new SyntaxError("Missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    reader.releaseLock();
  }
}
