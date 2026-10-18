import { Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { SurveyApp } from "@/components/survey/SurveyApp";
import { sectionIds } from "@/lib/config/navigation";

/**
 * Survey section — deliberately reads like a separate application interface
 * rather than another landing-page block: its own backdrop, its own header and
 * a focused single-column panel.
 */
export function SurveySection() {
  return (
    <section id={sectionIds.earlyAccess} className="section relative border-t border-line/70">
      <div aria-hidden className="absolute inset-0 bg-surface/30" />
      <div aria-hidden className="absolute inset-0 trace-backdrop opacity-[0.4]" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(80%_60%_at_70%_0%,rgba(245,230,66,0.09),transparent_70%)]"
      />
      <div aria-hidden className="absolute inset-y-0 left-0 w-px bg-line/50" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-px bg-line/50" />

      <div className="shell relative grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <Eyebrow>EARLY ACCESS / WISHLIST</Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(1.9rem,4.4vw,3rem)] leading-[1.02] text-ink">
                Get on the GPU wishlist.
              </h2>
              <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
                Tell us what you&apos;re building and what compute you need. Your answers help
                determine which workloads and capabilities the service will give you.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Reveal from="right" distance={16}>
            <SurveyApp />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
