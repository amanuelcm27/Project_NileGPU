/**
 * Single source of truth for brand-level configuration.
 * Change the brand name here and it propagates across metadata, UI, emails
 * and documentation-facing copy.
 */

export const brand = {
  /** Primary wordmark. Rendered as-is (uppercase styling is applied in CSS). */
  name: "WaliaGPU",
  /** Split used by the navigation wordmark for two-tone treatment. */
  nameParts: { lead: "WALIA", trail: "GPU" } as const,
  /** Short one-line positioning statement. */
  tagline: "Ethiopia's GPU cloud for AI workloads",
  /** Market framing. Intentionally not a registered address. */
  location: "Ethiopia",
  /** Optional contact channel. Configure NEXT_PUBLIC_CONTACT_EMAIL in production. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "wishlist@waliagpu.com",
} as const;

export type Brand = typeof brand;
