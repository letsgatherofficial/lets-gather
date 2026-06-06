import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { RealtimeChannel } from "@/components/realtime-channel";

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

  const orgId = profile.organization_id;
  let settings = null;
  let delegates = [];
  let leaders = [];
  let slots = [];
  let appointments = [];
  let followerAppointments = [];
  let organization = null;

  if (profile.role === "admin" && orgId) {
    const [settingsRes, delegatesRes, leadersRes, slotsRes, appointmentsRes, orgRes] = await Promise.all([
      adminClient.from("system_settings").select("*").eq("organization_id", orgId).single(),
      adminClient.from("profiles").select("*").eq("role", "delegate").eq("organization_id", orgId).order("created_at"),
      adminClient.from("profiles").select("*").eq("role", "leader").eq("organization_id", orgId).order("created_at"),
      adminClient.from("curated_slots").select("*").eq("organization_id", orgId).eq("is_active", true).order("start_time", { ascending: true }),
      adminClient.from("appointments").select("*, curated_slots(title, start_time)").eq("organization_id", orgId).order("created_at", { ascending: false }),
      adminClient.from("organizations").select("*").eq("id", orgId).single()
    ]);

    settings = settingsRes.data;
    delegates = delegatesRes.data ?? [];
    leaders = leadersRes.data ?? [];
    slots = slotsRes.data ?? [];
    appointments = appointmentsRes.data ?? [];
    organization = orgRes.data;
  } else if (profile.role === "leader" && orgId) {
    const [slotsRes, appointmentsRes, settingsRes] = await Promise.all([
      adminClient.from("curated_slots").select("*").eq("organization_id", orgId).eq("is_active", true).order("start_time", { ascending: true }),
      adminClient
        .from("appointments")
        .select("*, curated_slots(title, start_time)")
        .eq("organization_id", orgId)
        .in("status", ["scheduled_leader", "scheduled_delegate"])
        .order("created_at", { ascending: false }),
      adminClient.from("system_settings").select("*").eq("organization_id", orgId).single()
    ]);

    slots = slotsRes.data ?? [];
    appointments = appointmentsRes.data ?? [];
    settings = settingsRes.data;
  } else if (profile.role === "delegate" && orgId) {
    const [appointmentsRes, slotsRes] = await Promise.all([
      adminClient
        .from("appointments")
        .select("*, curated_slots(title, start_time)")
        .eq("organization_id", orgId)
        .eq("assigned_agent_id", user.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("curated_slots")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .eq("visibility", "appointment")
        .order("start_time", { ascending: true })
    ]);

    appointments = appointmentsRes.data ?? [];
    slots = slotsRes.data ?? [];
  } else if (profile.role === "follower") {
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
    const orgIds = [...new Set(followerAppointments.map((a: { organization_id?: string }) => a.organization_id).filter(Boolean))];
    if (orgIds.length) {
      const { data: orgEvents } = await adminClient
        .from("curated_slots")
        .select("*")
        .eq("is_active", true)
        .eq("visibility", "public_event")
        .in("organization_id", orgIds)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });
      slots = orgEvents ?? [];
    } else {
      slots = eventsRes.data ?? [];
    }
  }

  return {
    user,
    profile,
    settings,
    delegates,
    leaders,
    slots,
    appointments,
    followerAppointments,
    organization
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  if (!data.profile) {
    redirect("/signup");
  }

  return (
    <>
      <RealtimeChannel table="appointments" />
      <RealtimeChannel table="curated_slots" />
      <RealtimeChannel table="system_settings" />
      <DashboardClient
        profile={data.profile}
        settings={data.settings ?? null}
        delegates={data.delegates ?? []}
        leaders={data.leaders ?? []}
        slots={data.slots ?? []}
        appointments={data.appointments ?? []}
        followerAppointments={data.followerAppointments ?? []}
        organization={data.organization ?? null}
      />
    </>
  );
}
