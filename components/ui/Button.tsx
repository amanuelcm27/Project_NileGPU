import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.16em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-55";

const variants: Record<ButtonVariant, string> = {
  primary: "clip-corner-sm bg-primary text-obsidian hover:bg-primary-bright",
  secondary: "clip-corner-sm border border-line bg-transparent text-ink hover:border-primary hover:text-primary",
  quiet: "text-muted hover:text-primary",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-12 px-6",
  lg: "h-14 px-7 text-[0.8rem]",
};

const quietSizes: Record<ButtonSize, string> = {
  md: "h-10 px-0",
  lg: "h-12 px-0",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cn(base, variants[variant], variant === "quiet" ? quietSizes[size] : sizes[size], className);
}

export type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };

export function Button({ variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={buttonClasses({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; className?: string };

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...rest}>
      {children}
    </a>
  );
}

/** Secondary text action with the shared underline hover treatment. */
export function TextLink({ className, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      className={cn(
        "link-underline font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted hover:text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
