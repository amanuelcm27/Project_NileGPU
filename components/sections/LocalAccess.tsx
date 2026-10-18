import { Corners, Eyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { sectionIds } from "@/lib/config/navigation";

const benefits = [
  {
    index: "01",
    title: "Access beyond local hardware",
    body: "Run work that does not fit your laptop, desktop or department workstation — without waiting for a new machine to arrive.",
    annotation: "HARDWARE CEILING",
  },
  {
    index: "02",
    title: "An alternative to buying hardware",
    body: "Rent capacity for the weeks you need it instead of capitalising a GPU you use occasionally.",
    annotation: "CAPEX → USAGE",
  },
  {
    index: "03",
    title: "Less friction reaching infrastructure",
    body: "Reduced friction around international GPU providers: access designed for users in Ethiopia from the start.",
    annotation: "ACCESS LAYER",
  },
  {
    index: "04",
    title: "A shorter path to running it",
    body: "Fewer steps between an AI project and a job that executes, with local support for the parts that usually stall.",
    annotation: "TIME TO RUN",
  },
];

const paymentPath = ["ETB DEPOSIT", "LOCAL PAYMENT RAIL", "COMPUTE BALANCE", "GPU HOURS"];

/**
 * Ethiopia value proposition.
 *
 * Visually inverted — a yellow technical panel — so this section reads as a
 * distinct chapter of the page. Everything here is framed as what the service
 * is *exploring*, and the payment path is explicitly labelled as proposed.
 */
export function LocalAccess() {
  return (
    <section id={sectionIds.localAccess} className="section relative border-t border-line/70">
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-20" />

      <div className="shell relative">
        <div className="relative clip-corner bg-primary text-obsidian">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/25 px-5 py-3 sm:px-8">
            <span className="label-mono-sm text-obsidian/80">
              ETHIOPIA / LOCAL ACCESS — TECHNICAL PANEL
            </span>
            <span className="label-mono-sm text-obsidian/80">ETB PAYMENTS · EXPLORING</span>
          </div>

          <div className="grid gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <Eyebrow tone="muted" className="!text-obsidian/70">
                WHY LOCAL
              </Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.03] text-obsidian">
                Powerful GPUs for Local access.
              </h2>
              <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-obsidian/80">
                We are exploring simpler GPU access for Ethiopian users — including paying in
                Ethiopian birr — so that compute stops being the reason a project stalls.
              </p>
              <div className="mt-8 inline-flex items-center gap-3 border border-obsidian/25 px-4 py-3">
                <span aria-hidden className="die-dot !bg-obsidian" />
                <span className="label-mono-sm text-obsidian/80">
                  DEMAND VALIDATION STAGE
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ul className="grid gap-px bg-obsidian/20 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <Reveal as="li" key={benefit.index} className="bg-primary p-5 sm:p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[0.7rem] tracking-[0.14em] text-obsidian/60">
                        {benefit.index}
                      </span>
                      <span className="label-mono-sm text-obsidian/60">{benefit.annotation}</span>
                    </div>
                    <h3 className="mt-3 font-display text-[1.05rem] leading-snug text-obsidian sm:text-[1.15rem]">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-[0.88rem] leading-relaxed text-obsidian/80">
                      {benefit.body}
                    </p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
          <Corners className="opacity-45 mix-blend-multiply" />
        </div>

        {/* Proposed payment path */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <div className="panel clip-corner h-full">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="label-mono-sm text-muted">PAYMENT PATH</span>
                <span className="label-mono-sm text-primary">PROPOSED · NOT LIVE</span>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                  {paymentPath.map((step, index) => (
                    <div key={step} className="flex flex-1 items-center gap-2">
                      <span className="label-mono-sm whitespace-nowrap border border-line px-3 py-2 text-ink">
                        {step}
                      </span>
                      {index < paymentPath.length - 1 ? (
                        <span
                          aria-hidden
                          className="relative hidden h-px flex-1 overflow-hidden bg-line sm:block"
                        >
                          <span
                            className="animate-sweep absolute inset-y-0 w-1/4 bg-primary/70"
                            style={{ animationDelay: `${index * 0.5}s` }}
                          />
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-5 max-w-2xl font-mono text-[0.7rem] leading-relaxed text-muted/85">
                  There is no live checkout, payment integration or pricing on this website. This
                  diagram shows the flow we are investigating: paying in birr locally, holding a
                  compute balance, and spending it on GPU hours. Nothing here is a quote or a
                  commitment.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06} className="lg:col-span-4">
            <div className="panel-alt clip-corner h-full p-5">
              <span className="label-mono-sm text-muted">WHY IT MATTERS</span>
              <ul className="mt-4 space-y-4">
                {[
                  "Hardware that is unavailable locally stops projects before they start.",
                  "International providers assume payment methods many Ethiopian users do not hold.",
                  "Occasional heavy workloads do not justify permanent hardware.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[0.88rem] leading-relaxed text-muted">
                    <span aria-hidden className="die-dot mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
