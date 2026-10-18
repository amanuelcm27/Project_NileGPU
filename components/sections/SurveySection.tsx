import { Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { SurveyApp } from "@/components/survey/SurveyApp";
import { brand } from "@/lib/config/brand";
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

            <Reveal delay={0.06}>
              <ul className="mt-8 space-y-4 border-t border-line/70 pt-6">
                {[
                  "Registration is free. It is not a purchase and does not guarantee access.",
                  "We will invite a limited number of applicants to early-access trials.",
                  "Your answers are used to prioritise which workloads we support first.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[0.86rem] leading-relaxed text-muted">
                    <span aria-hidden className="die-dot mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-7 border border-line/80 bg-obsidian/60 p-4">
                <p className="label-mono-sm text-primary">PRIVACY</p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">
                  We collect your name, email and technical survey answers only. Nothing is displayed
                  publicly, nothing is sold, and you can ask us to delete your record at any time.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <a
                    href="/privacy"
                    className="label-mono-sm text-ink underline decoration-primary/70 underline-offset-4 hover:text-primary"
                  >
                    Read the privacy notice
                  </a>
                  <a
                    href={`mailto:${brand.contactEmail}`}
                    className="label-mono-sm text-muted hover:text-primary"
                  >
                    {brand.contactEmail}
                  </a>
                </div>
              </div>
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
