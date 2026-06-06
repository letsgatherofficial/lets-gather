import { CalendarDays, ArrowLeft, Users, CalendarCheck, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

async function getCalendarSlots() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("curated_slots")
    .select("*")
    .eq("is_active", true)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return data ?? [];
}

export default async function PublicCalendarPage() {
  const slots = await getCalendarSlots();
  const publicEvents = slots.filter((s) => s.visibility === "public_event");
  const appointmentSlots = slots.filter((s) => s.visibility === "appointment");

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Navigation Header */}
      <header className="flex items-center justify-between mb-12 border-b border-slate-100 pb-6">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm font-semibold">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <ButtonLink href="/login" variant="ghost">
            Login
          </ButtonLink>
          <ButtonLink href="/signup" variant="primary">
            Sign Up
          </ButtonLink>
        </div>
      </header>

      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brass/10 text-brass">
          <CalendarDays size={24} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight sm:text-5xl">
          Curated Calendar Grid
        </h1>
        <p className="text-base text-slate-500 max-w-xl mx-auto">
          View public congregation gatherings or select a curated appointment block below to book a private slot.
        </p>
      </section>

      {/* Grid containing Events and Appointment blocks */}
      <div className="grid gap-10 lg:grid-cols-12">
        {/* Left column: Public Events */}
        <section className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-jade" size={22} />
            <h2 className="text-xl font-bold text-slate-800">Mass Community Events</h2>
          </div>
          <div className="space-y-4">
            {publicEvents.length ? (
              publicEvents.map((event) => (
                <article key={event.id} className="glass rounded-2xl p-6 border border-slate-100/60 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-jade" />
                  <p className="text-xs font-bold uppercase tracking-wider text-jade mb-1.5">
                    {formatDateTime(event.start_time)}
                  </p>
                  <h3 className="text-base font-bold text-slate-800">{event.title}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {event.current_occupancy} / {event.max_capacity} seats reserved
                  </p>
                </article>
              ))
            ) : (
              <p className="glass rounded-2xl p-6 text-sm text-slate-400 border border-slate-100 text-center">
                No upcoming public community events are scheduled.
              </p>
            )}
          </div>
        </section>

        {/* Right column: Private Appointment Blocks */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <CalendarCheck className="text-brass" size={22} />
            <h2 className="text-xl font-bold text-slate-800">Private Appointment Blocks</h2>
          </div>
          <div className="space-y-4">
            {appointmentSlots.length ? (
              appointmentSlots.map((slot) => {
                const isFull = slot.current_occupancy >= slot.max_capacity;
                return (
                  <article key={slot.id} className="glass rounded-2xl p-6 border border-slate-100/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brass" />
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{slot.title}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        {formatDateTime(slot.start_time)} - {formatDateTime(slot.end_time)}
                      </p>
                      <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                        Capacity: {slot.current_occupancy} / {slot.max_capacity} filled
                      </p>
                    </div>
                    <div>
                      {isFull ? (
                        <button disabled className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed">
                          <Lock size={13} />
                          Full
                        </button>
                      ) : (
                        <ButtonLink href={`/booking/${slot.id}`} className="h-10 text-xs px-4">
                          Book Appointment
                        </ButtonLink>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="glass rounded-2xl p-6 text-sm text-slate-400 border border-slate-100 text-center">
                No private appointment slots are currently available.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
