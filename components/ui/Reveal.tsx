"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds. */
  delay?: number;
  /** Distance travelled, in pixels. */
  distance?: number;
  /** Direction of travel. */
  from?: "bottom" | "left" | "right" | "none";
  /** Render as a different element (defaults to div). */
  as?: "div" | "li" | "section" | "article" | "header";
  duration?: number;
}

/**
 * Scroll-triggered entrance used across sections.
 *
 * Content is always present in the DOM: when the visitor prefers reduced
 * motion the plain element is rendered with no animation at all, and the
 * animation itself only animates opacity/transform so it cannot shift layout.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 18,
  from = "bottom",
  as = "div",
  duration = 0.6,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const offset =
    from === "left"
      ? { x: -distance, y: 0 }
      : from === "right"
        ? { x: distance, y: 0 }
        : from === "none"
          ? { x: 0, y: 0 }
          : { x: 0, y: distance };

  return (
    <Component
      className={cn(className)}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -8% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
