"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, ShieldCheck, Calendar } from "lucide-react";
import { useMemo, useState, useActionState } from "react";
import { submitAppointment, type IntakeState } from "@/app/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn, formatDateTime } from "@/lib/utils";

const initialState: IntakeState = { ok: false };

interface IntakeFormProps {
  slotId?: string;
  slotDetails?: {
    title: string;
    start_time: string;
    end_time: string;
  };
}

export function IntakeForm({ slotId, slotDetails }: IntakeFormProps) {
  const [step, setStep] = useState(0);
  const [fullNameVal, setFullNameVal] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [business, setBusiness] = useState("");
  const [outcome, setOutcome] = useState("");

  const [state, action, pending] = useActionState(submitAppointment, initialState);

  const businessReady = business.trim().length >= 150;
  const outcomeReady = outcome.trim().length >= 100;
  const canContinue = useMemo(() => {
    if (step === 0) return fullNameVal.trim() !== "" && phoneVal.trim() !== "";
    return businessReady && outcomeReady;
  }, [step, fullNameVal, phoneVal, businessReady, outcomeReady]);


  if (state.ok && state.reference) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border border-slate-100/80 shadow-xl"
      >
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-jade/10 text-jade">
          <Check size={28} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-jade">Request received</p>
        <h2 className="mt-2 text-3xl font-extrabold text-slate-800 tracking-tight">{state.reference}</h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          Your request is in the triage queue. A confirmation has been placed in the notification outbox for SMS or WhatsApp delivery.
        </p>
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400 font-medium">Progressive Account Upgrade</p>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Want to see your live appointment progress or view member-only community updates? Create a secure account.
          </p>
          <ButtonLink
            href={`/signup?email=${encodeURIComponent(emailVal)}&phone=${encodeURIComponent(phoneVal)}&fullName=${encodeURIComponent(fullNameVal)}`}
            className="w-full text-center"
            variant="primary"
          >
            Create secure tracking account
            <ArrowRight size={16} />
          </ButtonLink>
        </div>
      </motion.div>
    );
  }

  return (
    <form action={action} className="glass rounded-2xl p-6 sm:p-8 border border-slate-100/80 shadow-xl space-y-6">
      <input type="hidden" name="slotId" value={slotId || ""} />
      {/* Persist all fields across steps so submit includes values from unmounted steps */}
      <input type="hidden" name="fullName" value={fullNameVal} />
      <input type="hidden" name="phone" value={phoneVal} />
      <input type="hidden" name="email" value={emailVal} />
      <input type="hidden" name="statement" value={business} />
      <input type="hidden" name="outcome" value={outcome} />

      {slotDetails && (
        <div className="flex items-start gap-3.5 bg-brass/5 rounded-xl p-4 border border-brass/10 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/10 text-brass shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brass">Booking Appointment for:</span>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{slotDetails.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatDateTime(slotDetails.start_time)} - {formatDateTime(slotDetails.end_time)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
        {["Contact", "Details"].map((item, index) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              if (index === 0) setStep(0);
              if (index === 1 && fullNameVal && phoneVal) setStep(1);
            }}
            className={cn(
              "py-2 px-1 flex-1 text-center border-b-2 text-xs font-bold transition-all duration-200",
              index === step
                ? "border-brass text-brass"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="contact"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  placeholder="Grace Njeri"
                  value={fullNameVal}
                  onChange={(e) => setFullNameVal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone / WhatsApp</Label>
                <Input
                  id="phone"
                  required
                  placeholder="+254..."
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com (Optional)"
                value={emailVal}
                onChange={(e) => setEmailVal(e.target.value)}
              />
            </div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="details"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="statement">Statement of business</Label>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", businessReady ? "bg-jade/10 text-jade" : "bg-ember/10 text-ember")}>
                  {business.trim().length} / 150 min
                </span>
              </div>
              <Textarea
                id="statement"
                required
                placeholder="Explain the background and details of your request. Provide sufficient detail..."
                minLength={150}
                value={business}
                onChange={(event) => setBusiness(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="outcome">Desired outcome</Label>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", outcomeReady ? "bg-jade/10 text-jade" : "bg-ember/10 text-ember")}>
                  {outcome.trim().length} / 100 min
                </span>
              </div>
              <Textarea
                id="outcome"
                required
                placeholder="What is the exact outcome or response you need from this appointment..."
                minLength={100}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              />
            </div>
          </motion.section>
        )}

      </AnimatePresence>

      {state.message && (
        <p className="rounded-xl bg-ember/5 border border-ember/15 px-4 py-3 text-sm font-semibold text-ember">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        {step < 1 ? (
          <Button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((value) => Math.min(1, value + 1))}
          >
            Next step
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button type="submit" disabled={pending || !canContinue}>
            {pending ? (
              <>
                <Clock size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Submit appointment request
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
