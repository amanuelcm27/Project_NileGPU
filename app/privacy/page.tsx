import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/sections/Footer";
import { Eyebrow } from "@/components/ui/Primitives";
import { brand } from "@/lib/config/brand";
import { contactHref } from "@/lib/config/navigation";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${brand.name} handles the information you submit through the GPU wishlist and early-access survey.`,
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    heading: "What we collect",
    body: [
      "When you complete the wishlist survey we store: your full name, your email address, and the answers you give about your intended workload — user type, GPU workload, required memory capacity, usage frequency, prior GPU cloud experience (including providers used or barriers to adoption), your current workaround for compute needs, whether paying in Ethiopian birr would help, your realistic monthly budget, and whether you would try the service.",
      "We do not ask for phone numbers, company revenue figures, payment details, national identifiers or any other unrelated personal information.",
    ],
  },
  {
    heading: "Why we collect it",
    body: [
      "Contact information (name and email) is used to manage your wishlist registration and to contact you about early access to the service.",
      "Survey answers are used to understand demand: which workloads, memory sizes, frequencies and payment paths matter most. That analysis decides what we build first.",
    ],
  },
  {
    heading: "Early-access contact is not marketing consent",
    body: [
      "We use your email for wishlist administration and early-access communication about the service you registered interest in. We do not add you to unrelated promotional mailing lists, and we do not pre-select any marketing consent option anywhere in this product.",
      "If we ever introduce separate promotional marketing, it will be an explicit, optional choice, recorded separately from this registration.",
    ],
  },
  {
    heading: "What we do not do",
    body: [
      "Your information is never displayed publicly. There is no public list of applicants, no public dashboard, and no public endpoint that exposes wishlist records.",
      "We do not sell or rent your information.",
      "We do not send personally identifiable information to analytics tools. The analytics hooks in this site record anonymous product events only — for example that a call to action was clicked, or that a survey was started or abandoned, and how far the applicant got. Answers, names and email addresses are never included.",
      "This website has no third-party analytics provider, advertising pixel or social media tracker enabled by default.",
    ],
  },
  {
    heading: "Where your information is stored",
    body: [
      "Applications are stored in a managed PostgreSQL database (Supabase). Access is restricted: the database denies anonymous access entirely, and records are only readable by the private server credentials and the project owner.",
      "The site is served over HTTPS in production, and the credentials that can write to the database are never included in the browser code.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep wishlist applications for as long as they are needed to plan early access and understand demand. You can ask us to delete your record at any time and we will do so.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      `Write to ${brand.contactEmail} to request access to the information you submitted, to correct it, or to have it deleted. Include the email address you used and we will match it to your record.`,
      "Registering is free and voluntary. It does not create a purchase, an invoice, or any obligation on either side.",
    ],
  },
  {
    heading: "Changes to this notice",
    body: [
      "If this notice changes materially — for example when early access becomes a paid service — we will update this page and, where appropriate, contact registered applicants by email.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <main id="main" className="relative pb-24 pt-32 sm:pt-36">
        <div aria-hidden className="absolute inset-0 grid-backdrop opacity-[0.18]" />
        <div className="shell relative max-w-3xl">
          <Link
            href="/"
            className="label-mono-sm inline-flex items-center gap-2 text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Back to {brand.name}
          </Link>

          <Eyebrow className="mt-10">PRIVACY / WISHLIST</Eyebrow>
          <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3.2rem)] leading-[1.04] text-ink">
            Privacy notice
          </h1>
          <p className="mt-5 text-[0.98rem] leading-relaxed text-muted">
            This notice explains what {brand.name} collects through the GPU wishlist and
            early-access survey, why we collect it, and the choices you have. It describes how this
            website behaves today.
          </p>

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.heading} className="border-t border-line/70 pt-8">
                <h2 className="font-display text-[1.25rem] text-ink">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[0.92rem] leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className="border-t border-line/70 pt-8">
              <h2 className="font-display text-[1.25rem] text-ink">Contact</h2>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
                Questions about this notice, or a request to remove your information, can be sent to{" "}
                <a href={contactHref} className="text-ink underline decoration-primary/70 underline-offset-2">
                  {brand.contactEmail}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
