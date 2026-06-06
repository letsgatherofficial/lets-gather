import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-gradient-to-r from-brass to-brass/90 text-white shadow-md shadow-brass/10 hover:shadow-lg hover:shadow-brass/18 active:scale-[0.98]",
  secondary: "bg-white text-ink border border-slate-200/80 shadow-sm hover:bg-slate-50/80 active:scale-[0.98]",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-50 active:scale-[0.98]",
  danger: "bg-ember text-white shadow-md shadow-ember/10 hover:bg-ember/95 active:scale-[0.98]"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  children,
  href,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; variant?: ButtonProps["variant"]; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
