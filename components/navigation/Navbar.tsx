"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TrackedCtaLink } from "@/components/ui/TrackedCtaLink";
import { brand } from "@/lib/config/brand";
import { navLinks, sectionIds } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "border-line bg-obsidian/88 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="shell flex h-[var(--nav-height)] items-center justify-between gap-6">
        <a
          href="#top"
          className="group flex items-center gap-2.5"
          aria-label={`${brand.name} — home`}
        >
          <span aria-hidden className="relative grid h-7 w-7 place-items-center border border-primary/70">
            <span className="h-2.5 w-2.5 bg-primary" />
            <span className="absolute inset-0 die-texture opacity-60" />
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-[0.14em] text-ink">
            {brand.nameParts.lead}
            <span className="text-primary">{brand.nameParts.trail}</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="link-underline font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <TrackedCtaLink
            href={`#${sectionIds.earlyAccess}`}
            source="nav"
            size="md"
            className="hidden md:inline-flex"
          >
            Join Wishlist
          </TrackedCtaLink>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "mobile-navigation" : undefined}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center border border-line text-ink transition-colors hover:border-primary hover:text-primary md:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="h-4 w-4" />
            ) : (
              <Menu aria-hidden className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Scroll progress */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="h-px origin-left bg-primary/70"
      />

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-navigation"
            key="mobile-navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-line bg-obsidian/97 backdrop-blur-md md:hidden"
          >
            <nav aria-label="Mobile" className="shell flex flex-col py-4">
              {navLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-line/70 py-4 text-lg text-ink"
                >
                  <span className="font-display">{link.label}</span>
                  <span className="label-mono-sm text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </a>
              ))}
              <TrackedCtaLink
                href={`#${sectionIds.earlyAccess}`}
                source="nav"
                size="lg"
                className="mt-5 w-full"
                onClick={() => setMenuOpen(false)}
              >
                Join Wishlist
              </TrackedCtaLink>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
