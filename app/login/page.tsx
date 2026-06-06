"use client";

import { useActionState } from "react";
import { ArrowLeft, LogIn, Mail, Lock } from "lucide-react";
import { loginAction } from "@/app/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const initialState = { ok: false, message: "" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <section className="glass max-w-md w-full rounded-2xl p-8 border border-slate-100/85 shadow-xl space-y-6 relative overflow-hidden">
        {/* Decorative corner blur */}
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-brass/10 blur-xl pointer-events-none" />

        <ButtonLink href="/" variant="ghost" className="px-0 -ml-2 text-xs text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} />
          Back to Booking
        </ButtonLink>

        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/10 text-brass">
            <LogIn size={22} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Sign In to Dashboard</h1>
          <p className="text-sm text-slate-500">
            Enter your email and password to access your control panel or booking status.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Mail size={16} />
              </span>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                required 
                placeholder="you@example.com" 
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Lock size={16} />
              </span>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••" 
                className="pl-10"
              />
            </div>
          </div>

          {state?.message && (
            <p className="rounded-xl bg-ember/5 border border-ember/15 px-4 py-2.5 text-xs font-semibold text-ember">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full mt-2">
            {pending ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-5 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <a href="/signup" className="font-semibold text-brass hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
