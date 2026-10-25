import { beforeEach, describe, expect, it } from "vitest";
import { handleWishlistPost } from "@/lib/api/wishlist-handler";
import { resetMemoryRateLimiter } from "@/lib/rate-limit";
import { limits } from "@/lib/validation/wishlist";
import { validNoPayload, validYesPayload } from "./fixtures";

/**
 * These tests exercise the real defence chain of the submission endpoint.
 *
 * Supabase credentials are deliberately absent in the test environment, so the
 * final assertion proves the endpoint reports an honest failure (503) instead of
 * returning a fabricated success.
 */

function postRequest(body: unknown, init: { raw?: string; contentType?: string; headers?: Record<string, string> } = {}) {
  const payload = init.raw ?? JSON.stringify(body);
  return new Request("http://localhost:3000/api/wishlist", {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      "x-forwarded-for": "203.0.113.7",
      ...init.headers,
    },
    body: payload,
  });
}

beforeEach(() => {
  resetMemoryRateLimiter();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("POST /api/wishlist", () => {
  it("rejects non-JSON content types", async () => {
    const response = await handleWishlistPost(
      postRequest(validYesPayload(), { contentType: "application/x-www-form-urlencoded" }),
    );
    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "unsupported_media_type" },
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await handleWishlistPost(postRequest(null, { raw: "{not json" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_json" } });
  });

  it("rejects oversized payloads", async () => {
    const response = await handleWishlistPost(
      postRequest(validYesPayload(), { headers: { "content-length": String(limits.maxPayloadBytes * 4) } }),
    );
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "payload_too_large" } });
  });

  it("rejects submissions that fill the honeypot field", async () => {
    const response = await handleWishlistPost(
      postRequest({ ...validYesPayload(), honeypot: "http://spam.example" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("rejected");
  });

  it("rejects implausibly fast submissions", async () => {
    const response = await handleWishlistPost(
      postRequest({ ...validYesPayload(), elapsedMs: 10 }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "rejected" } });
  });

  it("rejects invalid payloads with field-level errors", async () => {
    const response = await handleWishlistPost(
      postRequest({ ...validYesPayload(), fullName: "", gpuWorkloads: ["unknown_value"] }),
    );
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fieldErrors.fullName).toBeTruthy();
    expect(body.error.fieldErrors.gpuWorkloads).toBeTruthy();
  });

  it("rejects conditional-logic violations coming from a hand-crafted client", async () => {
    const response = await handleWishlistPost(
      postRequest({ ...validNoPayload(), providersUsed: ["runpod"] }),
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.fieldErrors.providersUsed).toBeTruthy();
  });

  it("never reports success when persistence is not configured", async () => {
    const response = await handleWishlistPost(postRequest(validYesPayload()));
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("service_unconfigured");
    expect(typeof body.error.message).toBe("string");
    // The message must not leak key names or connection details.
    expect(body.error.message).not.toMatch(/SUPABASE|key|postgres|https:\/\//i);
  });

  it("rate limits repeated submissions from the same caller", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await handleWishlistPost(postRequest(validYesPayload()));
      statuses.push(response.status);
    }

    expect(statuses.filter((status) => status === 503)).toHaveLength(5);
    expect(statuses.at(-1)).toBe(429);

    const limited = await handleWishlistPost(postRequest(validYesPayload()));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not leak database or environment details in error bodies", async () => {
    const response = await handleWishlistPost(postRequest(validYesPayload()));
    const text = await response.text();
    expect(text).not.toContain("SUPABASE");
    expect(text).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "\u0000unset");
  });
});
