import { CalendarDays, ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar-view";
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

async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function PublicCalendarPage() {
  const slots = await getCalendarSlots();
  const user = await getSessionUser();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-12 border-b border-slate-100 pb-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm font-semibold">
          <ArrowLeft size={16} />
          {user ? "Back to Dashboard" : "Back to Home"}
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <ButtonLink href="/dashboard" variant="primary">
              Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">
                Login
              </ButtonLink>
              <ButtonLink href="/signup" variant="primary">
                Sign Up
              </ButtonLink>
            </>
          )}
        </div>
      </header>

      <section className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brass/10 text-brass">
          <CalendarDays size={24} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight sm:text-5xl">
          Curated Calendar Grid
        </h1>
        <p className="text-base text-slate-500 max-w-xl mx-auto">
          Browse the monthly calendar or switch to list view. Select a date to see event and appointment details.
        </p>
      </section>

      <CalendarView slots={slots} showBookingLinks={true} />
    </main>
  );
}
