"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, UserPlus, Mail, Phone, User, Lock } from "lucide-react";
import { signupAction } from "@/app/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const initialState = { ok: false, message: "" };

function SignupForm() {
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("follower");
  const [state, action, pending] = useActionState(signupAction, initialState);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    const nameParam = searchParams.get("fullName");
    const roleParam = searchParams.get("role");

    if (emailParam) setEmail(emailParam);
    if (phoneParam) setPhone(phoneParam);
    if (nameParam) setFullName(nameParam);
    if (roleParam) setRole(roleParam);
  }, [searchParams]);

  return (
    <section className="glass max-w-xl w-full rounded-2xl p-8 border border-slate-100/85 shadow-xl space-y-6 relative overflow-hidden">
      {/* Decorative corner blur */}
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-brass/10 blur-xl pointer-events-none" />

      <ButtonLink href="/" variant="ghost" className="px-0 -ml-2 text-xs text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} />
        Back to Booking
      </ButtonLink>

      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/10 text-brass">
          <UserPlus size={22} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Create Host or Guest Account</h1>
        <p className="text-sm text-slate-500">
          Enter your profile details below. If you previously requested an appointment as a guest, use the same contact info to sync your bookings.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <User size={16} />
              </span>
              <Input 
                id="fullName" 
                name="fullName" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Grace Njeri" 
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone / WhatsApp</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Phone size={16} />
              </span>
              <Input 
                id="phone" 
                name="phone" 
                placeholder="+254..." 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        {/* Custom Role Selection for testing/onboarding */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <Label>Account Purpose (User Role)</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "follower", label: "Follower / Guest", desc: "Track appointment status" },
              { id: "delegate", label: "Delegate / Agent", desc: "Triage & schedule tickets" },
              { id: "leader", label: "Leader (Observer)", desc: "Observe daily agenda" },
              { id: "admin", label: "Administrator", desc: "System settings & calendars" }
            ].map((r) => (
              <label 
                key={r.id} 
                className={cn(
                  "flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all duration-200",
                  role === r.id 
                    ? "border-brass bg-brass/5 shadow-sm" 
                    : "border-slate-200/60 bg-white/70 hover:border-slate-300"
                )}
              >
                <input 
                  type="radio" 
                  name="role" 
                  value={r.id} 
                  checked={role === r.id}
                  onChange={() => setRole(r.id)}
                  className="sr-only" 
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {role === r.id && <span className="h-1.5 w-1.5 rounded-full bg-brass shrink-0" />}
                  {r.label}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{r.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {state?.message && (
          <p className="rounded-xl bg-ember/5 border border-ember/15 px-4 py-2.5 text-xs font-semibold text-ember">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full mt-2">
          {pending ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="border-t border-slate-100 pt-5 text-center">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-brass hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </section>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={
        <div className="glass max-w-xl w-full rounded-2xl p-8 border border-slate-100/85 shadow-xl text-center text-slate-400">
          Loading onboarding form...
        </div>
      }>
        <SignupForm />
      </Suspense>
    </main>
  );
}
