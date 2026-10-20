import { afterEach, describe, expect, it, vi } from "vitest";
import { submitWishlist } from "@/lib/api/wishlist-client";
import { validYesPayload } from "./fixtures";

/**
 * The submission client is the last line of defence for copy shown to an
 * applicant. These tests prove that success requires explicit confirmation and
 * that infrastructure details can never leak into the error UI.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitWishlist", () => {
  it("reports success only when the server confirms the row was stored", async () => {
    stubFetch(jsonResponse(201, { ok: true, application: { id: "0a7c2c1e" } }));

    await expect(submitWishlist(validYesPayload())).resolves.toEqual({
      ok: true,
      applicationId: "0a7c2c1e",
    });
  });

  it("does not treat a 2xx response without ok:true as success", async () => {
    stubFetch(jsonResponse(200, { application: { id: "unconfirmed" } }));

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("server_error");
  });

  it("replaces internal database errors with a safe message", async () => {
    stubFetch(
      jsonResponse(500, {
        ok: false,
        error: {
          code: "storage_error",
          message:
            'duplicate key value violates unique constraint "wishlist_applications_pkey"',
          requestId: "f3046e54-d2b6-4564-9602-e8656f5fc16c",
        },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.message).toContain("could not save your application");
    expect(result.error.message).not.toMatch(/duplicate|constraint|pkey|sql|postgres/i);
    expect(result.error.requestId).toBe("f3046e54-d2b6-4564-9602-e8656f5fc16c");
  });

  it("describes an unconfigured backend as temporarily unavailable", async () => {
    stubFetch(
      jsonResponse(503, {
        ok: false,
        error: {
          code: "service_unconfigured",
          message:
            "Wishlist storage is not configured on this deployment yet, so your application cannot be saved.",
          requestId: "req-12345678",
        },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("service_unavailable");
    expect(result.error.message).toMatch(/temporarily unavailable/i);
    expect(result.error.message).not.toMatch(/configured|deployment|supabase|env/i);
  });

  it("keeps field errors for a validation failure", async () => {
    stubFetch(
      jsonResponse(422, {
        ok: false,
        error: {
          code: "validation_failed",
          message: "Please check the highlighted answers and try again.",
          fieldErrors: { email: "Enter a valid email address." },
        },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("validation_failed");
    expect(result.error.fieldErrors).toEqual({ email: "Enter a valid email address." });
    expect(result.error.message).toMatch(/review the highlighted questions/i);
  });

  it("returns a field-level duplicate email error", async () => {
    stubFetch(
      jsonResponse(409, {
        ok: false,
        error: {
          code: "duplicate_email",
          message: "An application with this email address has already been submitted.",
          fieldErrors: { email: "This email address has already been submitted." },
          requestId: "dup-12345678",
        },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("duplicate_email");
    expect(result.error.fieldErrors?.email).toMatch(/already been submitted/i);
    expect(result.error.message).toMatch(/already been submitted/i);
  });

  it("adds a duplicate-email field error even if the server omits one", async () => {
    stubFetch(
      jsonResponse(409, {
        ok: false,
        error: { code: "duplicate_email", message: "Conflict" },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.fieldErrors?.email).toMatch(/already been submitted/i);
  });

  it("ignores malformed field-error payloads instead of rendering them", async () => {
    stubFetch(
      jsonResponse(422, {
        ok: false,
        error: {
          code: "validation_failed",
          message: "SQLSTATE 23505 duplicate key",
          fieldErrors: "duplicate key value violates unique constraint",
          requestId: "../../etc/passwd",
        },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("server_error");
    expect(result.error.fieldErrors).toBeUndefined();
    expect(result.error.requestId).toBeUndefined();
    expect(result.error.message).toContain("could not save your application");
  });

  it("explains how long to wait when rate limited", async () => {
    stubFetch(
      jsonResponse(429, {
        ok: false,
        error: { code: "rate_limited", message: "Too many requests", retryAfterSeconds: 600 },
      }),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("rate_limited");
    expect(result.error.message).toContain("10 minute(s)");
  });

  it("shows a connection message when the request cannot be sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("network_error");
    expect(result.error.message).toMatch(/could not reach the server/i);
  });

  it("shows a timeout message when the request is aborted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError")),
    );

    const result = await submitWishlist(validYesPayload());
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("timeout");
    expect(result.error.message).toMatch(/took too long/i);
  });
});
