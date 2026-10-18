import { brand } from "@/lib/config/brand";
import { contactHref, footerLinks } from "@/lib/config/navigation";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line/70 bg-surface/40">
      <div aria-hidden className="absolute inset-0 grid-backdrop opacity-[0.15]" />
      <div className="shell relative py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="relative grid h-7 w-7 place-items-center border border-primary/70">
                <span className="h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="font-display text-[1.05rem] font-semibold tracking-[0.14em] text-ink">
                {brand.nameParts.lead}
                <span className="text-primary">{brand.nameParts.trail}</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[0.9rem] leading-relaxed text-muted">
              {brand.tagline}. Currently validating demand through the early-access wishlist —
              no GPU capacity is being sold on this website.
            </p>
            <p className="mt-5 label-mono-sm text-primary">{brand.annotations.hero}</p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3">
            <p className="label-mono-sm text-muted">NAVIGATE</p>
            <ul className="mt-4 space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="link-underline font-mono text-[0.75rem] uppercase tracking-[0.14em] text-muted hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <p className="label-mono-sm text-muted">CONTACT</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={contactHref}
                  className="link-underline font-mono text-[0.75rem] tracking-[0.06em] text-muted hover:text-ink"
                >
                  {brand.contactEmail}
                </a>
              </li>
              <li className="font-mono text-[0.75rem] text-muted">{brand.location}</li>
            </ul>
            <p className="mt-6 max-w-sm text-[0.78rem] leading-relaxed text-muted/80">
              Write to us to have your wishlist information removed at any time.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.68rem] text-muted/80">
            © {year} {brand.name}. Wishlist registration is free and creates no obligation.
          </p>
          <p className="font-mono text-[0.68rem] text-muted/80">
            NO FABRICATED METRICS · NO LIVE PAYMENTS ON THIS SITE
          </p>
        </div>
      </div>
    </footer>
  );
}
