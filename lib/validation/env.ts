import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * Nothing here throws at import time: a missing Supabase configuration must not
 * break the build or the landing page. Instead the submission endpoint reports
 * an honest "not configured" error instead of pretending it stored data.
 */
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url({ error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" })
    .max(2048),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(20).max(4096),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20).max(4096),
});

export type SupabaseEnv = z.output<typeof supabaseEnvSchema>;

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type SupabaseEnvStatus =
  | { configured: true; env: SupabaseEnv; warnings: string[] }
  | { configured: false; missing: string[]; invalid: string[]; warnings: string[] };

type EnvSource = Record<string, string | undefined>;

function pick(source: EnvSource, key: string): string | undefined {
  const raw = source[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validate Supabase configuration.
 *
 * @param source Defaults to `process.env`; injectable for tests.
 */
export function readSupabaseEnv(source: EnvSource = process.env): SupabaseEnvStatus {
  const warnings: string[] = [];
  const candidate: Record<string, string> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of REQUIRED_KEYS) {
    const value = pick(source, key);
    if (!value) {
      missing.push(key);
      continue;
    }
    candidate[key] = value;
  }

  if (missing.length > 0) {
    return { configured: false, missing, invalid, warnings };
  }

  const parsed = supabaseEnvSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!invalid.includes(key)) invalid.push(key);
    }
    return { configured: false, missing, invalid, warnings };
  }

  if (source.NODE_ENV === "production" && parsed.data.NEXT_PUBLIC_SUPABASE_URL.startsWith("http://")) {
    warnings.push(
      "NEXT_PUBLIC_SUPABASE_URL is not HTTPS. Serve the application over HTTPS in production.",
    );
  }

  return { configured: true, env: parsed.data, warnings };
}

/** Public site configuration (safe to read in the browser). */
export function readPublicEnv(source: EnvSource = process.env) {
  return {
    siteUrl: pick(source, "NEXT_PUBLIC_SITE_URL") ?? null,
    contactEmail: pick(source, "NEXT_PUBLIC_CONTACT_EMAIL") ?? null,
    analyticsEndpoint: pick(source, "NEXT_PUBLIC_ANALYTICS_ENDPOINT") ?? null,
  };
}
