import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests mock the Supabase admin client so the duplicate-email branches
 * can be exercised without touching a real database. The migration still owns
 * the authoritative unique index; the pre-check is the friendly fast path.
 */

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  insertSingle: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  WISHLIST_TABLE: "wishlist_applications",
  getSupabaseAdmin: () => ({
    available: true,
    warnings: [],
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
        insert: (row: unknown) => {
          mocks.insert(row);
          return { select: () => ({ single: mocks.insertSingle }) };
        },
      }),
    },
  }),
}));

import { handleWishlistPost } from "@/lib/api/wishlist-handler";
import { resetMemoryRateLimiter } from "@/lib/rate-limit";
import { validYesPayload } from "./fixtures";

function post(payload = validYesPayload()) {
  return new Request("http://localhost:3000/api/wishlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.9",
    },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  resetMemoryRateLimiter();
  mocks.maybeSingle.mockReset();
  mocks.insertSingle.mockReset();
  mocks.insert.mockReset();
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.insertSingle.mockResolvedValue({ data: { id: "new-application" }, error: null });
});

describe("duplicate email protection", () => {
  it("rejects an email that already has an application", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "existing" }, error: null });
    const onStored = vi.fn();

    const response = await handleWishlistPost(post(), { onStored });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("duplicate_email");
    expect(body.error.fieldErrors.email).toMatch(/already been submitted/i);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(onStored).not.toHaveBeenCalled();
  });

  it("maps a unique-violation race to the same friendly 409", async () => {
    mocks.insertSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "wishlist_email_unique_idx"',
      },
    });

    const response = await handleWishlistPost(post());
    expect(response.status).toBe(409);

    const text = await response.text();
    expect(text).not.toMatch(/23505|duplicate key|constraint|wishlist_email_unique_idx/i);

    const body = JSON.parse(text);
    expect(body.error.code).toBe("duplicate_email");
    expect(body.error.fieldErrors.email).toMatch(/already been submitted/i);
  });

  it("persists a new email address", async () => {
    const response = await handleWishlistPost(post());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      application: { id: "new-application" },
    });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("hands the stored application to the post-insert hook", async () => {
    const onStored = vi.fn();

    const response = await handleWishlistPost(post(), { onStored });

    expect(response.status).toBe(201);
    expect(onStored).toHaveBeenCalledWith({
      id: "new-application",
      fullName: "Hanna Bekele",
      email: "hanna@example.com",
      requestId: expect.any(String),
    });
  });

  it("keeps the successful response when the post-insert hook fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const response = await handleWishlistPost(post(), {
        onStored: () => {
          throw new Error("background hook failed");
        },
      });
      expect(response.status).toBe(201);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
