"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Post-submission confirmation.
 *
 * Rendered only after the API confirms the row was persisted. It is deliberately
 * short: the applicant does not need a reference number, a queue position or a
 * second copy of the privacy notice. Closing it reloads the page so the survey
 * cannot be resubmitted accidentally.
 */
export function SuccessDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        // The dialog has a single focusable control; keep focus inside it.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-obsidian/85 backdrop-blur-sm"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        aria-describedby="success-description"
        className="panel clip-corner relative z-10 w-full max-w-lg border border-line bg-surface p-6 text-center shadow-2xl sm:p-10"
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center bg-primary text-obsidian">
          <Check aria-hidden className="h-7 w-7" />
        </div>

        <span className="label-mono-sm mt-6 block text-primary">APPLICATION RECEIVED</span>
        <h2
          id="success-title"
          className="mt-3 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-tight text-ink"
        >
          You&apos;re in.
        </h2>

        <div
          id="success-description"
          className="mx-auto mt-4 max-w-md space-y-2 text-[0.95rem] leading-relaxed text-muted"
        >
          <p>Your wishlist application has been received.</p>
          <p>We will contact you at the email address you provided about early-access.</p>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={buttonClasses({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
        >
          Close
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
