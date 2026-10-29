import { describe, expect, it, vi } from "vitest";
import {
  buildApplicationConfirmationEmail,
  sendApplicationConfirmation,
  type ApplicationConfirmation,
  type MailTransport,
} from "@/lib/email/application-confirmation";
import { readEmailConfig, type EmailConfig } from "@/lib/email/config";

const application: ApplicationConfirmation = {
  id: "application-123",
  fullName: "Hanna Bekele",
  email: "hanna@example.com",
  requestId: "request-123",
};

const config: EmailConfig = {
  user: "contact@redfoxgpu.com",
  appPassword: "abcdefghijklmnop",
  from: "RedfoxGPU <contact@redfoxgpu.com>",
  replyTo: "contact@redfoxgpu.com",
};

const siteUrl = new URL("https://redfoxgpu.com");

function smtpError(code: string): Error {
  return Object.assign(new Error(`SMTP ${code}`), { code });
}

describe("application confirmation email", () => {
  it("reads Gmail credentials and normalises app-password spacing", () => {
    const status = readEmailConfig({
      GMAIL_USER: "contact@redfoxgpu.com",
      GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
    });

    expect(status).toEqual({
      configured: true,
      config: {
        user: "contact@redfoxgpu.com",
        appPassword: "abcdefghijklmnop",
        from: "RedfoxGPU <contact@redfoxgpu.com>",
        replyTo: null,
      },
    });
  });

  it("builds a branded HTML and text email with the inline logo", () => {
    const email = buildApplicationConfirmationEmail(application, siteUrl);

    expect(email.subject).toBe("Your RedfoxGPU early-access application is in");
    expect(email.html).toContain("You&rsquo;re on the list, Hanna.");
    expect(email.html).toContain("cid:redfoxgpu-logo");
    expect(email.html).toContain("REDFOX");
    expect(email.html).toContain("early-access application has been submitted");
    expect(email.html).toContain("We&rsquo;ll notify you at this email address");
    expect(email.text).toContain("Hi Hanna,");
    expect(email.text).toContain("contact@redfoxgpu.com");
    expect(email.text).not.toContain("<");
  });

  it("escapes applicant-controlled text in the HTML body", () => {
    const email = buildApplicationConfirmationEmail(
      { ...application, fullName: "<Hanna> Bekele" },
      siteUrl,
    );

    expect(email.html).toContain("&lt;Hanna&gt;");
    expect(email.html).not.toContain("list, <Hanna>");
  });

  it("skips delivery when email is not configured", async () => {
    const sendMail = vi.fn();
    const result = await sendApplicationConfirmation(application, {
      config: null,
      transport: { sendMail },
      siteUrl,
    });

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends the confirmation through Gmail SMTP", async () => {
    const transport: MailTransport = {
      sendMail: vi.fn(async () => ({ messageId: "<email_123@gmail.com>" })),
    };

    const result = await sendApplicationConfirmation(application, {
      config,
      transport,
      siteUrl,
    });

    expect(result).toEqual({ sent: true, id: "<email_123@gmail.com>" });
    expect(transport.sendMail).toHaveBeenCalledTimes(1);

    const message = vi.mocked(transport.sendMail).mock.calls[0]?.[0];
    expect(message).toMatchObject({
      from: "RedfoxGPU <contact@redfoxgpu.com>",
      to: "hanna@example.com",
      replyTo: "contact@redfoxgpu.com",
      subject: "Your RedfoxGPU early-access application is in",
    });
    expect(message?.html).toContain("cid:redfoxgpu-logo");
    expect(message?.text).toContain("Hi Hanna,");
    expect(message?.attachments).toEqual([
      expect.objectContaining({
        filename: "redfoxgpu-logo.png",
        contentType: "image/png",
        cid: "redfoxgpu-logo",
        contentDisposition: "inline",
      }),
    ]);
  });

  it("reports auth, network, timeout and provider failures without throwing", async () => {
    const cases = [
      { code: "EAUTH", reason: "auth_error" },
      { code: "ECONNECTION", reason: "network_error" },
      { code: "ETIMEDOUT", reason: "timeout" },
      { code: "EUNKNOWN", reason: "provider_error" },
    ] as const;

    for (const testCase of cases) {
      const transport: MailTransport = {
        sendMail: vi.fn(async () => {
          throw smtpError(testCase.code);
        }),
      };

      await expect(
        sendApplicationConfirmation(application, { config, transport, siteUrl }),
      ).resolves.toEqual({ sent: false, reason: testCase.reason });
    }
  });
});
