import type { Metadata } from "next";
import { brand } from "@/lib/config/brand";

/**
 * Site metadata. `metadataBase` is resolved from the deployment URL so that
 * Open Graph images and canonical links are absolute in production.
 */
export function resolveSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";

  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${brand.name} — GPU Compute for Ethiopia`,
    template: `%s · ${brand.name}`,
  },
  description:
    "RedfoxGPU is building GPU cloud compute for Ethiopia: run inference, fine-tune open-source models, and train machine-learning workloads with locally accessible access and ETB payment options. Join the early-access wishlist.",
  applicationName: brand.name,
  keywords: [
    "GPU cloud Ethiopia",
    "Ethiopian GPU compute",
    "AI infrastructure Ethiopia",
    "LLM inference",
    "fine-tuning",
    "machine learning compute",
    "ETB GPU payments",
    "RedfoxGPU",
  ],
  authors: [{ name: brand.name }],
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} — GPU Compute for Ethiopia`,
    description:
      "Access the compute you need to run models, fine-tune open-source AI, and build what comes next — with a service designed around Ethiopian developers and teams.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — GPU Compute for Ethiopia`,
    description:
      "Early-access registration is open. Tell us what you are building and what compute you need.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    "format-detection": "telephone=no",
  },
};
