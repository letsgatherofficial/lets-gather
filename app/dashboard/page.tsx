import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

// Get current user and role
async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { user, profile: null };
  }

  // Fetch relevant data based on role
  let settings = null;
  let delegates = [];
  let leaders = [];
  let slots = [];
  let appointments = [];
  let followerAppointments = [];

  if (profile.role === "admin") {
    // Admin needs access to everything
    const [settingsRes, delegatesRes, leadersRes, slotsRes, appointmentsRes] = await Promise.all([
      adminClient.from("system_settings").select("*").eq("id", 1).single(),
      adminClient.from("profiles").select("*").eq("role", "delegate").order("created_at"),
      adminClient.from("profiles").select("*").eq("role", "leader").order("created_at"),
      adminClient.from("curated_slots").select("*").eq("is_active", true).order("start_time", { ascending: true }),
      adminClient.from("appointments").select("*, curated_slots(title, start_time)").order("created_at", { ascending: false })
    ]);

    settings = settingsRes.data;
    delegates = delegatesRes.data ?? [];
    leaders = leadersRes.data ?? [];
    slots = slotsRes.data ?? [];
    appointments = appointmentsRes.data ?? [];
  } else if (profile.role === "leader") {
    // Leader needs observational schedule agenda and settings
    const [slotsRes, appointmentsRes, settingsRes] = await Promise.all([
      adminClient.from("curated_slots").select("*").eq("is_active", true).order("start_time", { ascending: true }),
      adminClient
        .from("appointments")
        .select("*, curated_slots(title, start_time)")
        .in("status", ["scheduled_leader", "scheduled_delegate"])
        .order("created_at", { ascending: false }),
      adminClient.from("system_settings").select("*").eq("id", 1).single()
    ]);

    slots = slotsRes.data ?? [];
    appointments = appointmentsRes.data ?? [];
    settings = settingsRes.data;
  } else if (profile.role === "delegate") {
    // Delegate needs assigned tickets and active slots to schedule
    const [appointmentsRes, slotsRes] = await Promise.all([
      adminClient
        .from("appointments")
        .select("*, curated_slots(title, start_time)")
        .eq("assigned_agent_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("curated_slots")
        .select("*")
        .eq("is_active", true)
        .eq("visibility", "appointment")
        .order("start_time", { ascending: true })
    ]);

    appointments = appointmentsRes.data ?? [];
    slots = slotsRes.data ?? [];
  } else if (profile.role === "follower") {
    // Follower needs their own bookings and recommended events
    const [appointmentsRes, eventsRes] = await Promise.all([
      adminClient
        .from("appointments")
        .select("*, curated_slots(title, start_time, end_time)")
        .eq("registered_follower_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("curated_slots")
        .select("*")
        .eq("is_active", true)
        .eq("visibility", "public_event")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
    ]);

    followerAppointments = appointmentsRes.data ?? [];
    slots = eventsRes.data ?? [];
  }

  return {
    user,
    profile,
    settings,
    delegates,
    leaders,
    slots,
    appointments,
    followerAppointments
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  if (!data.profile) {
    // Profile is missing, redirect to signup
    redirect("/signup");
  }

  return (
    <DashboardClient 
      profile={data.profile}
      settings={data.settings ?? null}
      delegates={data.delegates ?? []}
      leaders={data.leaders ?? []}
      slots={data.slots ?? []}
      appointments={data.appointments ?? []}
      followerAppointments={data.followerAppointments ?? []}
    />
  );
}
