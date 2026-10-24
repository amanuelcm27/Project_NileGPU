import type { SubmissionError } from "@/lib/survey/types";
import type { WishlistSubmissionInput } from "@/lib/validation/wishlist";

export type SubmitResult =
  | { ok: true; applicationId: string | null }
  | { ok: false; error: SubmissionError };

const GENERIC_MESSAGE =
  "We could not save your application right now. Your answers are still here — please try again.";
const UNAVAILABLE_MESSAGE =
  "Wishlist applications are temporarily unavailable. Your answers are still here, so please try again later.";

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
 * Field errors come from our own Zod schema, but the response could in theory be
 * produced by a proxy or hosting layer. Accept only a plain object of short
 * strings so nothing unusual can reach the UI.
 */
function readFieldErrors(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([field, message]) => {
    if (typeof message !== "string") return [];
    const trimmed = message.trim();
    if (field.length === 0 || field.length > 64 || trimmed.length === 0 || trimmed.length > 300) {
      return [];
    }
    return [[field, trimmed] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Only display a short, opaque support reference. */
function readRequestId(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : undefined;
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

    if (response.status === 409) {
      return {
        ok: false,
        error: {
          code: "duplicate_email",
          message:
            "An application with this email address has already been submitted. Use a different email address, or contact us if you need to update your application.",
          fieldErrors: readFieldErrors(body?.error?.fieldErrors) ?? {
            email: "This email address has already been submitted.",
          },
          requestId: readRequestId(body?.error?.requestId),
        },
      };
    }

    if (response.status === 422) {
      const fieldErrors = readFieldErrors(body?.error?.fieldErrors);
      if (fieldErrors) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message:
              "Some answers need another look. Please review the highlighted questions and try again.",
            fieldErrors,
            requestId: readRequestId(body?.error?.requestId),
          },
        };
      }
    }

    if (response.status === 429) {
      const retryAfter = body?.error?.retryAfterSeconds;
      return {
        ok: false,
        error: {
          code: "rate_limited",
          message:
            typeof retryAfter === "number" && retryAfter > 0
              ? `Too many submissions . Please try again in about ${Math.ceil(retryAfter / 60)} minute(s).`
              : "Too many submissions . Please try again later.",
        },
      };
    }

    if (response.status === 503) {
      return {
        ok: false,
        error: {
          code: "service_unavailable",
          message: UNAVAILABLE_MESSAGE,
          requestId: readRequestId(body?.error?.requestId),
        },
      };
    }

    // Anything else is treated as an unspecified server failure. Deliberately do
    // not echo the response body or error code: a proxy, hosting platform or
    // database driver could put SQL, stack traces or infrastructure details in it.
    return {
      ok: false,
      error: {
        code: "server_error",
        message: GENERIC_MESSAGE,
        requestId: readRequestId(body?.error?.requestId),
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
              "Couldn't send your answers please try again.",
          }
        : {
            code: "network_error",
            message:
              "Check your connection and try again , your answers are still here.",
          },
    };
  } finally {
    clearTimeout(timeout);
  }
}
