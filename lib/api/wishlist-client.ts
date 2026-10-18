import type { SubmissionError } from "@/lib/survey/types";
import type { WishlistSubmissionInput } from "@/lib/validation/wishlist";

export type SubmitResult =
  | { ok: true; applicationId: string | null }
  | { ok: false; error: SubmissionError };

const GENERIC_MESSAGE =
  "We could not save your application right now. Your answers are still here — please try again.";

interface ApiErrorBody {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    fieldErrors?: Record<string, string>;
    retryAfterSeconds?: number;
    missing?: string[];
  };
}

interface ApiSuccessBody {
  ok: true;
  application?: { id?: string };
}

/**
 * Submit a completed wishlist application to `POST /api/wishlist`.
 *
 * Success is only ever reported when the server responds that the row was
 * persisted. Every failure mode returns a message that is safe to show to the
 * applicant, and the answers stay in component state so retrying never requires
 * starting over.
 */
export async function submitWishlist(
  payload: WishlistSubmissionInput,
  options: { timeoutMs?: number } = {},
): Promise<SubmitResult> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });

    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    if (response.ok && body?.ok === true) {
      const success = body as ApiSuccessBody;
      return { ok: true, applicationId: success.application?.id ?? null };
    }

    if (response.status === 422 && body?.error?.fieldErrors) {
      return {
        ok: false,
        error: {
          code: body.error.code ?? "validation_failed",
          message: body.error.message ?? "Some answers were rejected. Please review them.",
          fieldErrors: body.error.fieldErrors,
          requestId: body.error.requestId,
        },
      };
    }

    if (response.status === 429) {
      const retryAfter = body?.error?.retryAfterSeconds;
      return {
        ok: false,
        error: {
          code: "rate_limited",
          message: retryAfter
            ? `Too many submissions from this connection. Please try again in about ${Math.ceil(retryAfter / 60)} minute(s).`
            : "Too many submissions from this connection. Please try again later.",
        },
      };
    }

    if (response.status === 503) {
      return {
        ok: false,
        error: {
          code: body?.error?.code ?? "service_unconfigured",
          message:
            body?.error?.message ??
            "Wishlist storage is not configured on this deployment yet, so your application was not saved.",
          requestId: body?.error?.requestId,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: body?.error?.code ?? "server_error",
        message: body?.error?.message ?? GENERIC_MESSAGE,
        requestId: body?.error?.requestId,
      },
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? {
            code: "timeout",
            message:
              "The server took too long to respond. Your answers are still here — please try again.",
          }
        : {
            code: "network_error",
            message:
              "We could not reach the server. Check your connection and try again — your answers are still here.",
          },
    };
  } finally {
    clearTimeout(timeout);
  }
}
