import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Monospace section label with a leading hairline tick. */
export function Eyebrow({
  children,
  className,
  tone = "primary",
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "muted";
}) {
  return (
    <p
      className={cn(
        "label-mono flex items-center gap-3",
        tone === "primary" ? "text-primary" : "text-muted",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-current opacity-70" />
      {children}
    </p>
  );
}

/** Decorative bracket frame used to make panels read as hardware interfaces. */
export function Corners({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute left-0 top-0 h-3.5 w-3.5 border-l border-t border-primary/50" />
      <span className="absolute right-0 top-0 h-3.5 w-3.5 border-r border-t border-primary/50" />
      <span className="absolute bottom-0 left-0 h-3.5 w-3.5 border-b border-l border-primary/50" />
      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 border-b border-r border-primary/50" />
    </span>
  );
}

/** Small monospace specification chip. */
export function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-line pl-3">
      <span className="label-mono-sm text-muted">{label}</span>
      <span className="font-mono text-[0.8rem] text-ink">{value}</span>
    </div>
  );
}
