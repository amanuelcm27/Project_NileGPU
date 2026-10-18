"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { WaveformCanvas } from "@/components/visuals/WaveformCanvas";
import { sectionIds } from "@/lib/config/navigation";

const journey = [
  {
    index: "01",
    title: "Define the workload",
    body: "Name what you are actually running — inference, fine-tuning, training, vision, image or video. The workload sets every requirement that follows.",
    annotation: "WORKLOAD PROFILE",
  },
  {
    index: "02",
    title: "Identify the required compute",
    body: "Memory capacity, expected runtime and how often you need it decide which class of accelerator fits — instead of buying the largest card you can find.",
    annotation: "CAPACITY MATCH",
  },
  {
    index: "03",
    title: "Access GPU resources",
    body: "Reach accelerator capacity that is not sitting in the room with you, with access and payment options designed around Ethiopian users and teams.",
    annotation: "ACCESS LAYER",
  },
  {
    index: "04",
    title: "Run the workload",
    body: "Run the job, iterate on results, and stop when you are done — so occasional heavy work no longer requires permanent hardware.",
    annotation: "EXECUTION",
  },
];

const lifecycle = ["REQUEST", "SCHEDULE", "COMPUTE", "MODEL EXECUTION", "OUTPUT"];

/**
 * How-it-works section: an editorial timeline with a scroll-linked progress
 * rail, plus the request lifecycle as an animated pipeline. Progress motion is
 * transform-only (no layout animation) and is skipped entirely under reduced
 * motion.
 */
export function HowItWorks() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 78%", "end 58%"],
  });
  const railProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.002 });
  const railScale = useTransform(railProgress, (value) => (reduceMotion ? 1 : value));

  return (
    <section
      id={sectionIds.howItWorks}
      className="section relative overflow-hidden border-t border-line/70 bg-surface/40"
    >
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-[0.22]" />
      <div
        aria-hidden
        className="absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(245,230,66,0.07),transparent_65%)]"
      />

      <div className="shell relative grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <Eyebrow>HOW IT WORKS / INTENDED</Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.04] text-ink">
                From lack of compute to running models.
              </h2>
              <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
                A deliberate path from the workload you have in mind to a job that actually runs.
                This is the intended experience we are validating — the final delivery model is not
                fixed yet.
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-line/70 pt-5">
                <span aria-hidden className="die-dot" />
                <span className="label-mono-sm text-muted">FOUR STEPS · NO HARDWARE TO BUY</span>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="relative">
            <span aria-hidden className="absolute bottom-4 left-[1.05rem] top-4 w-px bg-line/70" />
            <motion.span
              aria-hidden
              style={{ scaleY: railScale }}
              className="absolute bottom-4 left-[1.05rem] top-4 w-px origin-top bg-primary"
            />

            <ol ref={listRef} className="space-y-8 sm:space-y-10">
              {journey.map((step, index) => (
                <Reveal as="li" key={step.index} delay={index * 0.04} className="relative pl-12 sm:pl-16">
                  <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center border border-line bg-obsidian font-mono text-[0.7rem] tracking-[0.1em] text-primary sm:h-10 sm:w-10">
                    {step.index}
                  </span>
                  <div className="panel clip-corner-sm p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-[1.15rem] leading-tight text-ink sm:text-[1.3rem]">
                        {step.title}
                      </h3>
                      <span className="label-mono-sm text-muted">{step.annotation}</span>
                    </div>
                    <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

          {/* Request lifecycle */}
          <Reveal delay={0.08} className="mt-12">
            <div className="panel clip-corner">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="label-mono-sm text-muted">REQUEST LIFECYCLE</span>
                <span className="label-mono-sm text-muted">ILLUSTRATIVE · NOT A MEASUREMENT</span>
              </div>

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-2">
                {lifecycle.map((stage, index) => (
                  <div key={stage} className="flex flex-1 items-center gap-2">
                    <span
                      className={
                        index === lifecycle.length - 1
                          ? "label-mono-sm whitespace-nowrap border border-primary/60 px-3 py-2 text-primary"
                          : "label-mono-sm whitespace-nowrap border border-line px-3 py-2 text-ink"
                      }
                    >
                      {stage}
                    </span>
                    {index < lifecycle.length - 1 ? (
                      <span
                        aria-hidden
                        className="relative hidden h-px flex-1 overflow-hidden bg-line sm:block"
                      >
                        <span
                          className="animate-sweep absolute inset-y-0 w-1/4 bg-primary/80"
                          style={{ animationDelay: `${index * 0.55}s` }}
                        />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="border-t border-line px-5 py-4">
                <div className="h-20 w-full border border-line/70 bg-obsidian/60">
                  <WaveformCanvas />
                </div>
                <p className="mt-3 font-mono text-[0.68rem] leading-relaxed text-muted/80">
                  Decorative visualisation of a workload moving through the pipeline. It is not a
                  live metric and does not represent measured performance.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
