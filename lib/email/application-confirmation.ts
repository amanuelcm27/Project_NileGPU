import nodemailer from "nodemailer";
import { brand } from "@/lib/config/brand";
import { resolveSiteUrl } from "@/lib/config/metadata";
import { readEmailConfig, type EmailConfig } from "./config";
import { EMAIL_LOGO_BASE64, EMAIL_LOGO_CID } from "./logo";

/** Everything needed to send an applicant their confirmation. */
export interface ApplicationConfirmation {
  id: string;
  fullName: string;
  email: string;
  requestId: string;
}

export type EmailSendResult =
  | { sent: true; id: string | null }
  | {
      sent: false;
      reason: "not_configured" | "auth_error" | "network_error" | "timeout" | "provider_error";
    };

export interface MailAttachment {
  filename: string;
  content: string;
  encoding: "base64";
  contentType: string;
  cid: string;
  contentDisposition: "inline";
}

export interface MailMessage {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments: MailAttachment[];
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<{ messageId?: string }>;
}

export interface SendApplicationConfirmationOptions {
  /** Injectable for tests. Omit to read the server environment. */
  config?: EmailConfig | null;
  /** Injectable for tests. Omit to use Gmail SMTP. */
  transport?: MailTransport;
  siteUrl?: URL;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function firstNameFrom(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Build the confirmation email.
 *
 * Table-based layout with inline styles keeps it readable in clients that strip
 * modern CSS. The logo mark is a hosted PNG, with a real-text wordmark beside it,
 * so the brand still appears when remote images are blocked.
 */
export function buildApplicationConfirmationEmail(
  application: ApplicationConfirmation,
  siteUrl: URL = resolveSiteUrl(),
): { subject: string; html: string; text: string } {
  const firstName = firstNameFrom(application.fullName);
  const safeFirstName = escapeHtml(firstName);
  const safeContactEmail = escapeHtml(brand.contactEmail);
  const contactHref = escapeHtml(`mailto:${brand.contactEmail}`);
  const siteHref = escapeHtml(siteUrl.origin);
  const subject = "Your RedfoxGPU early-access application is in";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ECEAE0;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your early-access application is in. We&rsquo;ll let you know when access opens.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ECEAE0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#FCFBF6;border:1px solid #D8D5C8;">
            <tr>
              <td style="background:#090A09;padding:22px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="48" valign="middle">
                      <img src="cid:${EMAIL_LOGO_CID}" width="48" height="48" alt="RedfoxGPU" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;">
                    </td>
                    <td valign="middle" style="padding-left:14px;font-family:Helvetica,Arial,sans-serif;font-size:18px;line-height:1;font-weight:700;letter-spacing:3px;color:#F4F4EF;">
                      REDFOX<span style="color:#F5E642;">GPU</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:#F5E642;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 28px 10px;">
                <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;letter-spacing:2px;text-transform:uppercase;color:#6B6E64;">
                  Wishlist application received
                </p>
                <h1 style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;color:#090A09;">
                  You&rsquo;re on the list, ${safeFirstName}.
                </h1>
                <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#3E4238;">
                  Your early-access application has been submitted. Thank you for telling us what you need to run.
                </p>
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#3E4238;">
                  We&rsquo;ll notify you at this email address as soon as early access opens.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F0E7;border-left:3px solid #F5E642;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 7px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;letter-spacing:1.8px;text-transform:uppercase;color:#6B6E64;">
                        What happens next
                      </p>
                      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#30342A;">
                        We review applications in batches. When your batch opens, you&rsquo;ll receive an email with the next step. No action is needed right now.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 30px;">
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3E4238;">
                  Questions? Reply to this email or write to
                  <a href="${contactHref}" style="color:#090A09;text-decoration:underline;">${safeContactEmail}</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#F7F5EE;border-top:1px solid #E2DFD2;">
                <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B6E64;">
                  You received this email because you submitted an early-access application at
                  <a href="${siteHref}" style="color:#6B6E64;text-decoration:underline;">RedfoxGPU</a>.
                </p>
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B6E64;">
                  ${escapeHtml(brand.tagline)}.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;letter-spacing:1.4px;text-transform:uppercase;color:#7A7D72;">
            RedfoxGPU &middot; GPU compute for Ethiopia
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `REDFOXGPU
Wishlist application received

Hi ${firstName},

Your early-access application has been submitted. Thank you for telling us what you need to run.

We'll notify you at this email address as soon as early access opens.

What happens next
We review applications in batches. When your batch opens, you'll receive an email with the next step. No action is needed right now.

Questions? Reply to this email or write to ${brand.contactEmail}.

You received this email because you submitted an early-access application at ${siteUrl.origin}.
${brand.tagline}.`;

  return { subject, html, text };
}

/**
 * Create a Gmail SMTP transport.
 *
 * Gmail App Passwords are 16 characters and may be pasted in groups of four;
 * the config normalises whitespace before it reaches here.
 */
function createGmailTransport(config: EmailConfig): MailTransport {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
    connectionTimeout: DEFAULT_TIMEOUT_MS,
    greetingTimeout: DEFAULT_TIMEOUT_MS,
    socketTimeout: DEFAULT_TIMEOUT_MS,
  });

  return {
    async sendMail(message) {
      const info = await transporter.sendMail(message);
      return {
        messageId: typeof info.messageId === "string" ? info.messageId : undefined,
      };
    },
  };
}

function smtpErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    return typeof error.code === "string" ? error.code : null;
  }
  return null;
}

function classifySmtpError(error: unknown): EmailSendResult {
  const code = smtpErrorCode(error);
  if (code === "EAUTH" || code === "EACCES") {
    return { sent: false, reason: "auth_error" };
  }
  if (code === "ETIMEDOUT" || code === "ETIMEOUT") {
    return { sent: false, reason: "timeout" };
  }
  if (
    code === "ECONNECTION" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ESOCKET"
  ) {
    return { sent: false, reason: "network_error" };
  }
  return { sent: false, reason: "provider_error" };
}

/**
 * Send the confirmation after a successful insert.
 *
 * This function never throws for delivery problems. Callers schedule it after
 * the response and ignore the result, so a Gmail outage or bad app password
 * cannot affect the applicant's submission.
 */
export async function sendApplicationConfirmation(
  application: ApplicationConfirmation,
  options: SendApplicationConfirmationOptions = {},
): Promise<EmailSendResult> {
  let config: EmailConfig | null;
  if (options.config === undefined) {
    const status = readEmailConfig();
    config = status.configured ? status.config : null;
  } else {
    config = options.config;
  }

  if (!config) {
    return { sent: false, reason: "not_configured" };
  }

  const siteUrl = options.siteUrl ?? resolveSiteUrl();
  const email = buildApplicationConfirmationEmail(application, siteUrl);
  const transport = options.transport ?? createGmailTransport(config);
  const replyTo = config.replyTo ?? brand.contactEmail.trim();

  try {
    const info = await transport.sendMail({
      from: config.from,
      to: application.email,
      ...(replyTo.length > 0 ? { replyTo } : {}),
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: "redfoxgpu-logo.png",
          content: EMAIL_LOGO_BASE64,
          encoding: "base64",
          contentType: "image/png",
          cid: EMAIL_LOGO_CID,
          contentDisposition: "inline",
        },
      ],
    });
    return { sent: true, id: info.messageId ?? null };
  } catch (error) {
    return classifySmtpError(error);
  }
}
