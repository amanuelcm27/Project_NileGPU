import {
  checkRateLimit,
  clientIpFrom,
  defaultRateLimit,
  rateLimitKeyFor,
} from "@/lib/rate-limit";
import { WISHLIST_TABLE, getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  limits,
  readAbuseSignals,
  toFieldErrors,
  wishlistSubmissionSchema,
} from "@/lib/validation/wishlist";

/**
 * Framework-agnostic implementation of `POST /api/wishlist`.
 *
 * Kept separate from the route file so the whole defence chain can be exercised
 * in tests with standard `Request`/`Response` objects.
 *
 * Order of defences:
 *   1. method, content type and request-size limits,
 *   2. distributed/per-instance rate limiting,
 *   3. honeypot and implausibly-fast-submission checks,
 *   4. full Zod validation (types, lengths, enum membership, conditional logic),
 *   5. insert with the server-only service-role client.
 *
 * Success is reported *only* after the database confirms the insert. When the
 * deployment is not configured, the endpoint reports that honestly instead of
 * pretending the application was stored.
 */

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function failure(
  code: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return json({ ok: false, error: { code, message, ...extra } }, status, headers);
}

const DUPLICATE_EMAIL_MESSAGE =
  "An application with this email address has already been submitted. Use a different email address, or contact us if you need to update your application.";
const DUPLICATE_EMAIL_FIELD_MESSAGE = "This email address has already been submitted.";

function duplicateEmailFailure(requestId: string) {
  return failure("duplicate_email", DUPLICATE_EMAIL_MESSAGE, 409, {
    fieldErrors: { email: DUPLICATE_EMAIL_FIELD_MESSAGE },
    requestId,
  });
}

export async function handleWishlistPost(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  // --- 1. Request shape and size -------------------------------------------
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return failure("unsupported_media_type", "Send this request as JSON.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > limits.maxPayloadBytes) {
    return failure("payload_too_large", "That request is too large.", 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return failure("invalid_body", "We could not read that request.", 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > limits.maxPayloadBytes) {
    return failure("payload_too_large", "That request is too large.", 413);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return failure("invalid_json", "We could not read that request.", 400);
  }

  // --- 2. Rate limiting ----------------------------------------------------
  const ip = clientIpFrom(request.headers);
  const rateKey = await safeRateLimitKey(ip);
  const rate = await checkRateLimit(rateKey, defaultRateLimit);

  if (!rate.allowed) {
    return failure(
      "rate_limited",
      "You have submitted several applications already. Please try again later.",
      429,
      { retryAfterSeconds: rate.retryAfterSeconds },
      { "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  // --- 3. Abuse signals ----------------------------------------------------
  const abuse = readAbuseSignals(parsedBody);

  if (abuse.honeypot && abuse.honeypot.trim().length > 0) {
    console.warn(`[waliagpu] wishlist: honeypot triggered (request ${requestId})`);
    return failure("rejected", "We could not process that submission.", 400, { requestId });
  }

  if (typeof abuse.elapsedMs === "number" && abuse.elapsedMs < limits.minElapsedMs) {
    console.warn(`[waliagpu] wishlist: implausibly fast submission (request ${requestId})`);
    return failure("rejected", "We could not process that submission.", 400, { requestId });
  }

  // --- 4. Validation -------------------------------------------------------
  const parsed = wishlistSubmissionSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return failure(
      "validation_failed",
      "Please check the highlighted answers and try again.",
      422,
      { fieldErrors: toFieldErrors(parsed.error), requestId },
    );
  }

  // The schema transform strips honeypot/elapsedMs, so this is exactly the row.
  const row = parsed.data;

  // --- 5. Persistence ------------------------------------------------------
  const supabase = getSupabaseAdmin();
  if (!supabase.available) {
    return failure("service_unconfigured", supabase.message, 503, { requestId });
  }

  // Give repeat applicants a clear, field-level message before attempting the
  // insert. The unique index is still the authoritative guard against races.
  const { data: existing, error: lookupError } = await supabase.client
    .from(WISHLIST_TABLE)
    .select("id")
    .eq("email", row.email)
    .maybeSingle();

  if (lookupError) {
    console.error(
      `[waliagpu] wishlist email lookup failed (request ${requestId}): code=${lookupError.code ?? "unknown"} message=${lookupError.message}`,
    );
    return failure(
      "storage_error",
      "We could not save your application right now. Your answers are still here — please try again.",
      500,
      { requestId },
    );
  }

  if (existing) {
    console.warn(`[waliagpu] wishlist duplicate email rejected (request ${requestId})`);
    return duplicateEmailFailure(requestId);
  }

  const { data, error } = await supabase.client
    .from(WISHLIST_TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error(
      `[waliagpu] wishlist insert failed (request ${requestId}): code=${error.code ?? "unknown"} message=${error.message}`,
    );

    // Another request inserted the same address between the lookup and insert.
    if (error.code === "23505") {
      return duplicateEmailFailure(requestId);
    }

    const schemaNotReady = error.code === "42P01" || error.code === "PGRST205";
    return failure(
      "storage_error",
      schemaNotReady
        ? "Wishlist storage is not ready on this deployment yet, so your application was not saved."
        : "We could not save your application right now. Your answers are still here — please try again.",
      500,
      { requestId },
    );
  }

  if (!data || typeof data.id !== "string") {
    console.error(`[waliagpu] wishlist insert returned no id (request ${requestId})`);
    return failure(
      "storage_error",
      "We could not confirm that your application was saved. Please try again.",
      500,
      { requestId },
    );
  }

  return json({ ok: true, application: { id: data.id } }, 201);
}

async function safeRateLimitKey(ip: string): Promise<string> {
  try {
    return await rateLimitKeyFor(ip);
  } catch {
    return "wishlist:fallback";
  }
}
