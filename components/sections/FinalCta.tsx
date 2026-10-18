import { ArrowRight } from "lucide-react";
import { DrawRule } from "@/components/ui/DrawRule";
import { Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { TrackedCtaLink } from "@/components/ui/TrackedCtaLink";
import { sectionIds } from "@/lib/config/navigation";

const gpuNames = [
  "NVIDIA RTX 5090",
  "NVIDIA H100",
  "NVIDIA A100",
  "NVIDIA RTX 4090",
  "NVIDIA L40S",
  "NVIDIA A6000",
];

/**
 * Closing call to action.
 *
 * A different composition from the hero: centred, typographic, almost no
 * imagery — the closing statement rather than another sales panel.
 */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line/70 py-24 sm:py-32">
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-[0.18]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[420px] -translate-y-1/2 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(245,230,66,0.10),transparent_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-display text-[22vw] font-bold leading-none text-ink/[0.03]"
      >
        NILEGPU
      </span>

      <div className="shell relative">
        <DrawRule className="mx-auto max-w-3xl" />

        <div className="mx-auto mt-12 max-w-3xl text-center">
          <Reveal>
            <Eyebrow className="justify-center">EARLY ACCESS</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-[clamp(2rem,6vw,4rem)] leading-[1.02] tracking-[-0.02em] text-ink">
              Your workload is <span className="text-primary">the roadmap.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-[1rem] leading-relaxed text-muted">
              Every application shapes what we build first. Registration takes about two minutes and
              tells us which workloads, memory sizes and payment paths matter most.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedCtaLink
                href={`#${sectionIds.earlyAccess}`}
                source="final_cta"
                size="lg"
                className="w-full sm:w-auto"
              >
                Get Early Access
                <ArrowRight aria-hidden className="h-4 w-4" />
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="stack-mask mx-auto mt-16 hidden max-w-4xl overflow-hidden lg:flex">
            <div className="animate-marquee-fast flex w-max shrink-0 items-center gap-8 pr-8">
              {[...gpuNames, ...gpuNames].map((item, index) => (
                <span key={`${item}-${index}`} className="label-mono-sm flex items-center gap-3 text-muted">
                  <span aria-hidden className="die-dot" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-12 grid gap-2 text-center lg:hidden">
            {gpuNames.map((item) => (
              <li key={item} className="label-mono-sm text-muted">
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
