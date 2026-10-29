import { z } from "zod";

/**
 * Server-only transactional-email configuration.
 *
 * Gmail SMTP requires 2-Step Verification plus an App Password — never the
 * account's normal password. Email is intentionally optional: if either value is
 * missing or invalid, confirmation delivery is skipped without affecting the
 * wishlist submission.
 */
const emailEnvSchema = z.object({
  GMAIL_USER: z.email().trim().max(320),
  GMAIL_APP_PASSWORD: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .transform((value) => value.replace(/\s+/g, "")),
  EMAIL_FROM: z
    .string()
    .trim()
    .min(5)
    .max(320)
    .refine((value) => value.includes("@"), {
      error: "EMAIL_FROM must contain an email address",
    })
    .optional(),
  EMAIL_REPLY_TO: z.email().trim().max(320).optional(),
});

export interface EmailConfig {
  user: string;
  appPassword: string;
  from: string;
  replyTo: string | null;
}

export type EmailConfigStatus =
  | { configured: true; config: EmailConfig }
  | { configured: false };

type EnvSource = Record<string, string | undefined>;

function pick(source: EnvSource, key: string): string | undefined {
  const raw = source[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Read the Gmail SMTP configuration.
 *
 * This deliberately returns a simple status instead of throwing: missing email
 * credentials must never prevent an application from being stored.
 */
export function readEmailConfig(source: EnvSource = process.env): EmailConfigStatus {
  const user = pick(source, "GMAIL_USER");
  const appPassword = pick(source, "GMAIL_APP_PASSWORD");
  const from = pick(source, "EMAIL_FROM");
  const replyTo = pick(source, "EMAIL_REPLY_TO");

  if (!user || !appPassword) {
    return { configured: false };
  }

  const parsed = emailEnvSchema.safeParse({
    GMAIL_USER: user,
    GMAIL_APP_PASSWORD: appPassword,
    ...(from ? { EMAIL_FROM: from } : {}),
    ...(replyTo ? { EMAIL_REPLY_TO: replyTo } : {}),
  });

  if (!parsed.success) {
    return { configured: false };
  }

  return {
    configured: true,
    config: {
      user: parsed.data.GMAIL_USER,
      appPassword: parsed.data.GMAIL_APP_PASSWORD,
      from: parsed.data.EMAIL_FROM ?? `RedfoxGPU <${parsed.data.GMAIL_USER}>`,
      replyTo: parsed.data.EMAIL_REPLY_TO ?? null,
    },
  };
}
