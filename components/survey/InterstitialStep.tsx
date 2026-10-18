"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { InterstitialDef } from "@/lib/survey/types";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Short encouragement state between question groups.
 *
 * It advances on its own after ~3 seconds (with a visible countdown) and can be
 * skipped immediately with the button. The callback is held in a ref so the
 * countdown is never restarted by a parent re-render.
 */
export function InterstitialStep({
  definition,
  onContinue,
}: {
  definition: InterstitialDef;
  onContinue: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(definition.autoAdvanceMs);
  const continueRef = useRef(onContinue);

  useEffect(() => {
    continueRef.current = onContinue;
  }, [onContinue]);

  useEffect(() => {
    const total = definition.autoAdvanceMs;
    const startedAt = Date.now();
    let finished = false;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, total - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0 && !finished) {
        finished = true;
        window.clearInterval(timer);
        continueRef.current();
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [definition.autoAdvanceMs]);

  const progress = 1 - remainingMs / definition.autoAdvanceMs;
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div className="flex flex-col items-center px-2 py-6 text-center sm:py-10">
      <div className="relative grid h-20 w-20 place-items-center">
        <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#30342A" strokeWidth="2" />
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke="#F5E642"
            strokeWidth="2"
            strokeLinecap="square"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <span className="absolute font-mono text-[0.72rem] text-primary">{secondsLeft}s</span>
      </div>

      <span className="label-mono-sm mt-7 text-muted">TRANSITION</span>
      <h3 className="mt-4 max-w-xl font-display text-[clamp(1.3rem,3.2vw,1.8rem)] leading-tight text-ink">
        {definition.headline}
      </h3>
      {definition.supporting ? (
        <p className="mt-3 max-w-lg text-[0.92rem] leading-relaxed text-muted">
          {definition.supporting}
        </p>
      ) : null}

      <Button onClick={onContinue} size="lg" className="mt-8">
        Continue
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Button>
      <p aria-live="polite" className="mt-3 font-mono text-[0.68rem] text-muted/70">
        Continuing automatically in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}
      </p>
    </div>
  );
}
