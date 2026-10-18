import { brand } from "@/lib/config/brand";

/** Section anchors used by the navigation, footer and CTAs. */
export const sectionIds = {
  workloads: "workloads",
  howItWorks: "how-it-works",
  localAccess: "local-access",
  earlyAccess: "early-access",
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
  { label: "Workloads", href: `#${sectionIds.workloads}` },
  { label: "How It Works", href: `#${sectionIds.howItWorks}` },
  { label: "Early Access", href: `#${sectionIds.earlyAccess}` },
];

export const footerLinks: NavLink[] = [
  { label: "Workloads", href: `#${sectionIds.workloads}` },
  { label: "How It Works", href: `#${sectionIds.howItWorks}` },
  { label: "GPU Wishlist", href: `#${sectionIds.earlyAccess}` },
  { label: "Privacy", href: "/privacy" },
];

export const contactHref = `mailto:${brand.contactEmail}`;
