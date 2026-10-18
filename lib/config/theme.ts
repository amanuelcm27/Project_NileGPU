/**
 * Design tokens.
 *
 * The Tailwind theme in `app/globals.css` is generated from these values, so
 * this file is the canonical description of the palette. `tokens` is also used
 * by non-Tailwind consumers (SVG fills, Three.js materials, canvas drawing)
 * where a CSS class cannot be applied.
 */

export const tokens = {
  color: {
    /** Primary brand colour — cyberpunk yellow. */
    primary: "#F5E642",
    /** Bright highlight for gradients, edges and hover states. */
    primaryBright: "#FFF27A",
    /** Obsidian background. */
    background: "#090A09",
    /** Elevated surface (cards, panels). */
    surface: "#121412",
    /** Secondary surface (nested panels, option rows). */
    surfaceAlt: "#191C18",
    /** Main text. */
    text: "#F4F4EF",
    /** Secondary text. */
    textMuted: "#A4A79D",
    /** Hairline borders. */
    border: "#30342A",
    /** Semantic error colour, kept close to the palette. */
    danger: "#FF6B5A",
    /** Semantic success colour. */
    success: "#9BE86B",
  },
  /** Motion tokens — kept short and consistent across the product. */
  motion: {
    fast: 0.16,
    base: 0.32,
    slow: 0.6,
    /** Easing curve used for most interface transitions. */
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
  /** Vertical rhythm between major sections. */
  spacing: {
    sectionY: "clamp(4.5rem, 9vw, 9rem)",
    gutter: "clamp(1.25rem, 4vw, 4rem)",
  },
} as const;

export type Tokens = typeof tokens;
