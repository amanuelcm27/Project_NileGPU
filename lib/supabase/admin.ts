import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "@/lib/validation/env";

/**
 * Server-only Supabase client.
 *
 * IMPORTANT: this module uses SUPABASE_SERVICE_ROLE_KEY and must therefore never
 * be imported from a client component. It is only imported by the
 * `POST /api/wishlist` route handler.
 */

let cached: SupabaseClient | null = null;

export interface SupabaseAdminUnavailable {
  available: false;
  code: "service_unconfigured";
  message: string;
  missing: string[];
  invalid: string[];
}

export type SupabaseAdmin =
  | { available: true; client: SupabaseClient; warnings: string[] }
  | SupabaseAdminUnavailable;

export function getSupabaseAdmin(): SupabaseAdmin {
  if (typeof window !== "undefined") {
    // Defensive: a bundler mistake must fail loudly instead of shipping the key.
    throw new Error(
      "getSupabaseAdmin() was called in the browser. The service-role key must never reach the client.",
    );
  }

  const status = readSupabaseEnv();
  if (!status.configured) {
    console.warn(
      `[waliagpu] Supabase is not configured. Missing: ${status.missing.join(", ") || "none"}; invalid: ${status.invalid.join(", ") || "none"}. Wishlist submissions will be rejected rather than silently dropped.`,
    );
    return {
      available: false,
      code: "service_unconfigured",
      message:
        "Wishlist storage is not configured on this deployment yet, so your application cannot be saved.",
      missing: status.missing,
      invalid: status.invalid,
    };
  }

  for (const warning of status.warnings) {
    console.warn(`[waliagpu] ${warning}`);
  }

  if (!cached) {
    cached = createClient(status.env.NEXT_PUBLIC_SUPABASE_URL, status.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-application-name": "waliagpu-wishlist" } },
    });
  }

  return { available: true, client: cached, warnings: status.warnings };
}

/** Table name for wishlist applications — kept in one place. */
export const WISHLIST_TABLE = "wishlist_applications";
