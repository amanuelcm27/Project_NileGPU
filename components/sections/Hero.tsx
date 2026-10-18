import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Corners } from "@/components/ui/Primitives";
import { TrackedCtaLink } from "@/components/ui/TrackedCtaLink";
import { GpuVisual } from "@/components/visuals/GpuVisual";
import { sectionIds } from "@/lib/config/navigation";

const heroTicker = [
  "LLM INFERENCE",
  "FINE-TUNING",
  "MODEL TRAINING",
  "COMPUTER VISION",
  "IMAGE GENERATION",
  "VIDEO GENERATION",
];

/**
 * Hero: left-aligned editorial headline, technical annotations and a GPU
 * visual on the right. The visual degrades to an original SVG schematic when
 * WebGL or motion is unavailable, so the section is complete without 3D.
 */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-16 sm:pt-40 lg:pt-44">
      {/* Backdrop */}
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-30" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-obsidian"
      />
      <div aria-hidden className="absolute inset-y-0 left-0 w-px bg-line/60" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-px bg-line/60" />

      <div className="shell relative">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* Copy */}
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal from="bottom" distance={12}>
              <h1 className="font-display text-[clamp(2.6rem,7.4vw,5.2rem)] font-semibold leading-[0.94] tracking-[-0.03em]">
                <span className="block text-ink">GPU COMPUTE</span>
                <span className="block">
                  <span className="text-primary">For</span>{" "}
                  <span className="text-ink">ETHIOPIA</span>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-7 max-w-xl text-[1.02rem] leading-relaxed text-muted">
                Access the world&apos;s top tier GPUs to run your models, designed around Ethiopian
                developers and teams.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <TrackedCtaLink
                  href={`#${sectionIds.earlyAccess}`}
                  source="hero_primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Get Early Access
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </TrackedCtaLink>
                <TrackedCtaLink
                  href={`#${sectionIds.workloads}`}
                  source="hero_secondary"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Explore Workloads
                </TrackedCtaLink>
              </div>
            </Reveal>
          </div>

          {/* Visual */}
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal from="right" distance={24}>
              <GpuVisual />
            </Reveal>
          </div>
        </div>

        {/* Workload ticker */}
        <div className="relative mt-16 border-y border-line/70 py-4 lg:mt-20">
          <div className="stack-mask flex overflow-hidden">
            <div className="animate-marquee flex w-max shrink-0 items-center gap-10 pr-10">
              {[...heroTicker, ...heroTicker].map((item, index) => (
                <span key={`${item}-${index}`} className="label-mono-sm flex items-center gap-4 text-muted">
                  <span aria-hidden className="die-dot" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Corners className="pointer-events-none absolute inset-x-4 bottom-6 top-24 hidden opacity-40 lg:block" />
    </section>
  );
}
