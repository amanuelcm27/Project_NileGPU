"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { WorkloadGlyph } from "@/components/visuals/WorkloadGlyph";
import { sectionIds } from "@/lib/config/navigation";
import { workloadDisclaimer, workloads } from "@/lib/config/workloads";
import { cn } from "@/lib/utils/cn";

/**
 * Stable id for the single detail panel.
 *
 * Only one tabpanel is ever mounted, so every tab points `aria-controls` at
 * this one element. Referencing per-workload panel ids would leave inactive
 * tabs pointing at elements that are not in the document, which is an
 * invalid ARIA reference.
 */
const PANEL_ID = "workload-panel";

/**
 * Workload section: a technical workload selector rather than a card grid.
 * The rail is a real tablist (roving arrow-key navigation, aria-selected) and
 * the detail panel crossfades without moving the surrounding layout.
 */
export function Workloads() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const active = workloads[activeIndex] ?? workloads[0];

  if (!active) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = workloads.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id={sectionIds.workloads} className="section relative border-t border-line/70">
      <div aria-hidden className="absolute inset-0 trace-backdrop opacity-[0.35]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="shell relative grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Heading + rail */}
        <div className="lg:col-span-5">
          <Reveal>
            <Eyebrow>WORKLOADS / 01—06</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.02] text-ink">
              Compute for what you&apos;re building.
            </h2>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted">
              The service targets the GPU-heavy work Ethiopian developers, researchers and teams
              already do — or are currently blocked from doing.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div
              role="tablist"
              aria-label="GPU workloads"
              onKeyDown={handleKeyDown}
              className="mt-8 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:mt-10 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0"
            >
              {workloads.map((workload, index) => {
                const selected = index === activeIndex;
                return (
                  <button
                    key={workload.id}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`workload-tab-${workload.id}`}
                    aria-selected={selected}
                    aria-controls={PANEL_ID}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "group flex shrink-0 snap-start items-center gap-3 border px-4 py-3 text-left transition-colors lg:w-full lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-4",
                      selected
                        ? "border-primary/60 text-ink lg:border-b-line"
                        : "border-line text-muted hover:text-ink lg:border-b-line",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[0.7rem] tracking-[0.14em]",
                        selected ? "text-primary" : "text-muted/70",
                      )}
                    >
                      {workload.index}
                    </span>
                    <span className="font-display text-[0.95rem] leading-none sm:text-base">
                      {workload.railLabel}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "ml-auto hidden h-px flex-1 transition-colors lg:block",
                        selected ? "bg-primary/60" : "bg-line group-hover:bg-line-strong",
                      )}
                    />
                    <ArrowRight
                      aria-hidden
                      className={cn(
                        "h-3.5 w-3.5 transition-transform lg:block",
                        selected ? "text-primary lg:translate-x-0" : "text-muted/60",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-7">
          <Reveal from="right" distance={18}>
            <div className="panel clip-corner relative">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="label-mono-sm text-muted">
                  WORKLOAD {active.index} / {String(workloads.length).padStart(2, "0")}
                </span>
                <span className="label-mono-sm text-primary">GPU-ACCELERATED</span>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  id={PANEL_ID}
                  role="tabpanel"
                  aria-labelledby={`workload-tab-${active.id}`}
                  tabIndex={0}
                  initial={reduceMotion ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="p-5 sm:p-7"
                >
                  <div className="relative aspect-16/9 w-full overflow-hidden border border-line/80 bg-obsidian/60">
                    <div aria-hidden className="grid-backdrop-fine absolute inset-0 opacity-30" />
                    <div className="absolute inset-0 p-4">
                      <WorkloadGlyph kind={active.id} />
                    </div>
                  </div>

                  <h3 className="mt-6 font-display text-[clamp(1.35rem,3vw,1.9rem)] leading-tight text-ink">
                    {active.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
                    {active.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/70 pt-4">
                    {active.annotations.map((annotation) => (
                      <span key={annotation} className="label-mono-sm flex items-center gap-2 text-primary">
                        <span aria-hidden className="die-dot" />
                        {annotation}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 font-mono text-[0.72rem] leading-relaxed text-muted/90">
                    {active.note}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl font-mono text-[0.68rem] leading-relaxed text-muted/80">
                  {workloadDisclaimer}
                </p>
                <a
                  href={`#${sectionIds.earlyAccess}`}
                  className="label-mono-sm shrink-0 text-primary underline-offset-4 hover:underline"
                >
                  Tell us your workload →
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
