"use client";

import type { ReactNode } from "react";
import { ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

type Source = "nav" | "hero_primary" | "hero_secondary" | "final_cta";

/**
 * Anchor that records a `hero_cta_clicked` event before navigating.
 * Only the CTA source is reported — never anything about the visitor.
 */
export function TrackedCtaLink({
  href,
  source,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
}: {
  href: string;
  source: Source;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <ButtonLink
      href={href}
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => {
        track("hero_cta_clicked", { source });
        onClick?.();
      }}
    >
      {children}
    </ButtonLink>
  );
}
