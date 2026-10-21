"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { InterstitialDef } from "@/lib/survey/types";

/**
 * Short encouragement state between question groups.
 *
 * It never advances on its own: the applicant decides when to move on, and can
 * step back to the previous question from here.
 */
export function InterstitialStep({
  definition,
  showBack,
  onContinue,
  onBack,
}: {
  definition: InterstitialDef;
  showBack: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center px-2 py-6 text-center sm:py-10">
      <div className="relative grid h-20 w-20 place-items-center">
        <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={26} fill="none" stroke="#30342A" strokeWidth="2" />
          <motion.circle
            cx="32"
            cy="32"
            r={26}
            fill="none"
            stroke="#F5E642"
            strokeWidth="2"
            strokeLinecap="square"
            initial={reduceMotion ? { pathLength: 0.68 } : { pathLength: 0 }}
            animate={{ pathLength: 0.68 }}
            transition={{
              duration: reduceMotion ? 0 : 1.1,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </svg>
        <motion.span
          aria-hidden
          className="h-2.5 w-2.5 bg-primary"
          initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.4,
            delay: reduceMotion ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>

      <h3 className="mt-7 max-w-xl font-display text-[clamp(1.3rem,3.2vw,1.8rem)] leading-tight text-ink">
        {definition.headline}
      </h3>
      {definition.supporting ? (
        <p className="mt-3 max-w-lg text-[0.92rem] leading-relaxed text-muted">
          {definition.supporting}
        </p>
      ) : null}

      <div className="mt-8 flex w-full flex-col-reverse items-center justify-center gap-3 sm:flex-row">
        {showBack ? (
          <Button variant="secondary" onClick={onBack} size="lg" className="w-full sm:w-auto">
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Back
          </Button>
        ) : null}
        <Button onClick={onContinue} size="lg" className="w-full sm:w-auto">
          Continue
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
