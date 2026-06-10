import { CalendarDays, ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar-view";
import { RealtimeChannel } from "@/components/realtime-channel";
import Link from "next/link";

async function getCalendarSlots(orgToken?: string) {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("curated_slots")
    .select("*")
    .eq("is_active", true)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  // If org token is provided, filter by organization
  if (orgToken) {
    // First get the organization ID from the invite token
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("invite_token", orgToken)
      .single();

    if (org) {
      query = query.eq("organization_id", org.id);
    } else {
      // If org not found, return empty array
      return [];
    }
  }

  const { data } = await query;
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

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: { org?: string };
}) {
  const orgToken = searchParams.org;
  const slots = await getCalendarSlots(orgToken);
  const user = await getSessionUser();

  return (
    <>
      <RealtimeChannel table="curated_slots" />
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
            Public Calendar
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            View all upcoming community events and appointment slots. Select an appointment slot to request a booking.
          </p>
        </section>

        <CalendarView slots={slots} showBookingLinks={true} />
      </main>
    </>
  );
}
