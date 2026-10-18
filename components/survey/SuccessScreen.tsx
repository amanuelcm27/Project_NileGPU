"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { brand } from "@/lib/config/brand";

/**
 * Confirmation screen.
 *
 * Shown only after `POST /api/wishlist` reports that the row was persisted.
 * There are no fabricated queue positions or applicant counts — just the real
 * application reference returned by the server.
 */
export function SuccessScreen({ applicationId }: { applicationId: string | null }) {
  const reduceMotion = useReducedMotion();
  const reference = applicationId ? applicationId.slice(0, 8).toUpperCase() : null;

  return (
    <div className="flex flex-col items-center px-2 py-8 text-center sm:py-12">
      <div className="relative grid h-28 w-28 place-items-center">
        <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#30342A" strokeWidth="2" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#F5E642"
            strokeWidth="2"
            strokeLinecap="square"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <circle cx="60" cy="60" r="40" fill="none" stroke="#30342A" strokeWidth="1" strokeDasharray="3 7" />
        </svg>
        <motion.span
          initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute grid h-12 w-12 place-items-center bg-primary text-obsidian"
        >
          <Check aria-hidden className="h-6 w-6" />
        </motion.span>
      </div>

      <span className="label-mono-sm mt-8 text-primary">APPLICATION RECEIVED</span>
      <h3 className="mt-4 font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-tight text-ink">
        You&apos;re on the list.
      </h3>
      <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-muted">
        Your wishlist application has been received. We&apos;ll use your answers to understand your
        needs and contact you about early access.
      </p>

      {reference ? (
        <div className="mt-7 border border-line px-5 py-3">
          <p className="label-mono-sm text-muted">REFERENCE</p>
          <p className="mt-1 font-mono text-[0.95rem] text-ink">{reference}</p>
          <p className="mt-1 font-mono text-[0.66rem] text-muted/80">
            Keep this if you follow up with us. It is not a queue position.
          </p>
        </div>
      ) : null}

      <ul className="mt-8 w-full max-w-xl space-y-3 border-t border-line pt-6 text-left">
        {[
          "Your answers are stored in our wishlist database so we can analyse demand.",
          `We will contact you at the email address you provided about early-access trials for ${brand.name}.`,
          "This registration is free and does not guarantee access or capacity.",
        ].map((item) => (
          <li key={item} className="flex gap-3 text-[0.88rem] leading-relaxed text-muted">
            <span aria-hidden className="die-dot mt-1.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <ButtonLink href="#top" variant="secondary" size="lg" className="mt-9">
        Return to the landing page
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </ButtonLink>
    </div>
  );
}
