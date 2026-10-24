/**
 * Basic abuse protection for the public wishlist endpoint.
 *
 * Two layers:
 *  1. In-memory fixed-window counter. Zero infrastructure, but it is per
 *     serverless instance and therefore only a *partial* defence in production.
 *     It is intentionally not presented as production-safe.
 *  2. Optional distributed limiter over the Upstash Redis REST API. Enabled only
 *     when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are present, so
 *     no paid infrastructure is required to run the project.
 *
 * The endpoint also applies request-size limits, a honeypot field, a minimum
 * completion time, and full Zod validation. See README for production notes.
 */

export interface RateLimitOptions {
  /** Maximum number of requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  backend: "memory" | "upstash";
}

export const defaultRateLimit: RateLimitOptions = { limit: 5, windowSeconds: 600 };

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5000;

function memoryLimit(key: string, { limit, windowSeconds }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Opportunistic cleanup keeps the map bounded in long-lived instances.
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: windowSeconds,
      backend: "memory",
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds, backend: "memory" };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
    backend: "memory",
  };
}

function readUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

async function upstashLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions,
  config: { url: string; token: string },
): Promise<RateLimitResult> {
  const response = await fetch(`${config.url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Upstash responded with ${response.status}`);
  }

  const data = (await response.json()) as Array<{ result?: number | string }>;
  const count = Number(data[0]?.result ?? 0);
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("Upstash returned an unexpected counter value");
  }

  const allowed = count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: allowed ? windowSeconds : windowSeconds,
    backend: "upstash",
  };
}

/**
 * Check whether a caller may submit.
 *
 * Fails open (allowing the request) if the distributed limiter is unreachable:
 * a Redis outage should not take wishlist registration down, and validation
 * still protects the database.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = defaultRateLimit,
): Promise<RateLimitResult> {
  const config = readUpstashConfig();
  if (!config) return memoryLimit(key, options);

  try {
    return await upstashLimit(`redfoxgpu:rl:${key}`, options, config);
  } catch (error) {
    console.warn(
      `[redfoxgpu] Distributed rate limiter unavailable, falling back to per-instance limit: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return memoryLimit(key, options);
  }
}

/**
 * Derive a stable, non-reversible bucket key for a caller.
 *
 * We intentionally do not log or store raw IP addresses: only a short hash is
 * used, and only in the limiter's key space.
 */
export async function rateLimitKeyFor(ip: string, scope = "wishlist"): Promise<string> {
  const data = new TextEncoder().encode(`${scope}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${scope}:${hex.slice(0, 32)}`;
}

/** Extracts the caller address from proxy headers without trusting the whole chain. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test helper — clears the in-memory buckets. */
export function resetMemoryRateLimiter(): void {
  buckets.clear();
}
