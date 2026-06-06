import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-12 w-full rounded-xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-800 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-brass/30",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-32 w-full resize-y rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-brass/30",
        className
      )}
      {...props}
    />
  );
}
