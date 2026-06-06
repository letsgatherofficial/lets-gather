import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slotId: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { slotId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: slot } = await supabase
    .from("curated_slots")
    .select("*")
    .eq("id", slotId)
    .eq("is_active", true)
    .single();

  if (!slot) {
    notFound();
  }

  const isFull = slot.current_occupancy >= slot.max_capacity;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm font-semibold"
      >
        <ArrowLeft size={15} />
        Back to Calendar
      </Link>

      {/* Slot header card */}
      <div className="glass rounded-2xl border border-slate-100/60 p-6 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/10 text-brass shrink-0">
              <CalendarDays size={22} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-brass">Appointment Slot</p>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{slot.title}</h1>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border
            ${isFull ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-jade/5 text-jade border-jade/10"}`}>
            <Users size={12} />
            {slot.current_occupancy} / {slot.max_capacity} filled
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-400">Starts</p>
            <p className="font-semibold text-slate-700 mt-1">{formatDateTime(slot.start_time)}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-400">Ends</p>
            <p className="font-semibold text-slate-700 mt-1">{formatDateTime(slot.end_time)}</p>
          </div>
        </div>
      </div>

      {/* Guard: slot full */}
      {isFull ? (
        <div className="glass rounded-2xl border border-rose-100 bg-rose-50/40 p-8 text-center space-y-2">
          <p className="text-base font-bold text-rose-500">This slot is fully booked</p>
          <p className="text-sm text-slate-500">
            Check the{" "}
            <Link href="/calendar" className="text-brass font-semibold hover:underline">
              public calendar
            </Link>{" "}
            for other available slots.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-800">Apply for this Appointment</h2>
            <p className="text-sm text-slate-500">
              Complete the multi-step intake form below. Your request will be triaged and confirmed via SMS/WhatsApp.
            </p>
          </div>
          <IntakeForm slotId={slot.id} slotDetails={slot} />
        </>
      )}
    </main>
  );
}
