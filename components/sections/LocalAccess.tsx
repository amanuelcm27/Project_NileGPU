import { Banknote, Globe, Server, Zap } from "lucide-react";
import { Corners } from "@/components/ui/Primitives";
import { Reveal } from "@/components/ui/Reveal";
import { sectionIds } from "@/lib/config/navigation";

const benefits = [
  {
    index: "01",
    title: "Access beyond local hardware",
    body: "Run work that does not fit your laptop, desktop or department workstation, without waiting for a new machine to arrive.",
    Icon: Server,
  },
  {
    index: "02",
    title: "An alternative to buying hardware",
    body: "Rent GPUS for the days or weeks you need it instead of buying expensive gpu you use occasionally",
    Icon: Banknote,
  },
  {
    index: "03",
    title: "Less struggle reaching infrastructure",
    body: "Reduced hustle to find GPU access designed for users in Ethiopia from the start",
    Icon: Globe,
  },
  {
    index: "04",
    title: "A shorter path to running it",
    body: "Fewer steps between an AI project and a job that executes",
    Icon: Zap,
  },
];

/**
 * Ethiopia value proposition.
 *
 * Visually inverted (a yellow technical panel) so this section reads as a
 * distinct chapter of the page.
 */
export function LocalAccess() {
  return (
    <section id={sectionIds.localAccess} className="section relative border-t border-line/70">
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-20" />

      <div className="shell relative">
        <div className="relative clip-corner bg-primary text-obsidian">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/25 px-5 py-3 sm:px-8">
            <span className="label-mono-sm text-obsidian/80">ETHIOPIA / LOCAL ACCESS</span>
            <span className="label-mono-sm text-obsidian/80">ETB PAYMENTS</span>
          </div>

          <div className="grid gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <p className="label-mono flex items-center gap-3 text-obsidian/70">
                <span aria-hidden className="h-px w-6 bg-current opacity-70" />
                WHY LOCAL
              </p>
              <h2 className="mt-6 font-display text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.03] text-obsidian">
                Powerful GPUs for Local access.
              </h2>
              <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-obsidian/80">
                We are exploring simpler GPU access for Ethiopian users, including paying in
                Ethiopian birr, so that compute stops being the reason a project stalls.
              </p>
            </div>

            <div className="lg:col-span-7">
              <ul className="grid gap-px bg-obsidian/20 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <Reveal as="li" key={benefit.index} className="bg-primary p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[0.7rem] tracking-[0.14em] text-obsidian/60">
                        {benefit.index}
                      </span>
                      <benefit.Icon aria-hidden className="h-5 w-5 text-obsidian/70" />
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
      </div>
    </section>
  );
}
