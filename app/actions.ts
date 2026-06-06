"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export type IntakeState = {
  ok: boolean;
  reference?: string;
  message?: string;
};

const categories = new Set(["Crisis", "Legal/Admin", "Guidance", "Counseling"]);
const windows = new Set(["Morning", "Afternoon", "Evening"]);

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

async function getOrganizationByInviteToken(token: string) {
  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient
    .from("organizations")
    .select("*")
    .eq("invite_token", token)
    .single();
  return data;
}

export async function loginAction(state: any, formData: FormData) {
  const email = textValue(formData, "email");
  const password = textValue(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
}

export async function signupAction(state: any, formData: FormData) {
  const fullName = textValue(formData, "fullName");
  const email = textValue(formData, "email");
  const phone = textValue(formData, "phone");
  const password = textValue(formData, "password");
  const role = textValue(formData, "role");
  const orgToken = textValue(formData, "orgToken");

  if (!fullName || !email || !password || !role) {
    return { ok: false, message: "Please fill out all required fields." };
  }

  if ((role === "leader" || role === "delegate") && !orgToken) {
    return { ok: false, message: "Leader and delegate accounts require a valid organization invite link." };
  }

  if (role === "admin" && orgToken) {
    return { ok: false, message: "Administrators create a new organization — do not use an invite link." };
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  let organizationId: string | null = null;

  if (role === "admin") {
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({ name: `${fullName}'s Organization` })
      .select("*")
      .single();

    if (orgError || !org) {
      return { ok: false, message: `Failed to create organization: ${orgError?.message}` };
    }

    organizationId = org.id;

    await adminClient.from("system_settings").insert({
      organization_id: org.id,
      delegate_tier_active: false,
      sla_hours_threshold: 24,
      min_character_count_business: 150,
      min_character_count_outcome: 100
    });

    await adminClient.from("organization_delegate_state").insert({
      organization_id: org.id
    });
  } else if (role === "leader" || role === "delegate") {
    const org = await getOrganizationByInviteToken(orgToken);
    if (!org) {
      return { ok: false, message: "Invalid organization invite link. Ask your administrator for a new link." };
    }
    organizationId = org.id;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || undefined,
        role: role
      }
    }
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const user = data.user;
  if (!user) {
    return { ok: false, message: "Signup failed. No user returned." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    email: email,
    phone: phone || null,
    role: role,
    organization_id: organizationId
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(user.id);
    return { ok: false, message: `Failed to create user profile: ${profileError.message}` };
  }

  if (role === "admin" && organizationId) {
    await adminClient
      .from("organizations")
      .update({ created_by: user.id })
      .eq("id", organizationId);
  }

  let query = adminClient.from("appointments").update({ registered_follower_id: user.id });
  if (phone) {
    query = query.or(`guest_email.eq.${email},guest_phone.eq.${phone}`);
  } else {
    query = query.eq("guest_email", email);
  }
  const { error: linkError } = await query;
  if (linkError) {
    console.error("Failed to link shadow appointments:", linkError);
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

export async function submitAppointment(_: IntakeState, formData: FormData): Promise<IntakeState> {
  const supabase = createSupabaseAdminClient();
  const fullName = textValue(formData, "fullName");
  const phone = textValue(formData, "phone");
  const email = textValue(formData, "email");
  const category = textValue(formData, "category");
  const statement = textValue(formData, "statement");
  const outcome = textValue(formData, "outcome");
  const slotIdRaw = textValue(formData, "slotId");
  const slotId = slotIdRaw && slotIdRaw !== "null" ? slotIdRaw : null;
  const preferredWindows = formData.getAll("preferredWindows").filter((value): value is string => typeof value === "string" && windows.has(value));
  const isTimeSensitive = formData.get("urgency") === "time-sensitive";

  if (!fullName || !phone || !categories.has(category)) {
    return { ok: false, message: "Please provide contact details and a supported request category." };
  }

  let organizationId: string | null = null;
  if (slotId) {
    const { data: slot } = await supabase.from("curated_slots").select("organization_id, current_occupancy, max_capacity").eq("id", slotId).single();
    if (slot) {
      if (slot.current_occupancy >= slot.max_capacity) {
        return { ok: false, message: "The selected appointment slot is already full." };
      }
      organizationId = slot.organization_id;
    }
  }

  const settingsQuery = organizationId
    ? supabase.from("system_settings").select("*").eq("organization_id", organizationId).single()
    : supabase.from("system_settings").select("*").is("organization_id", null).limit(1).maybeSingle();

  const { data: settings } = await settingsQuery;
  const minBusiness = settings?.min_character_count_business ?? 150;
  const minOutcome = settings?.min_character_count_outcome ?? 100;

  if (statement.length < minBusiness || outcome.length < minOutcome) {
    return { ok: false, message: "The seriousness filters need more detail before this can be submitted." };
  }

  if (preferredWindows.length === 0) {
    return { ok: false, message: "Select at least one preferred time window." };
  }

  const { data: reference, error: refError } = await supabase.rpc("generate_tracking_reference");
  if (refError || !reference) {
    return { ok: false, message: "Could not generate a tracking reference. Please try again." };
  }

  const { data: agentId } = await supabase.rpc("assign_next_agent", {
    p_is_time_sensitive: isTimeSensitive,
    p_organization_id: organizationId
  });
  const status = agentId ? "assigned_to_delegate" : "pending_review";
  const slaHours = settings?.sla_hours_threshold ?? 24;
  const slaDate = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  const { error } = await supabase.from("appointments").insert({
    tracking_reference: reference,
    guest_full_name: fullName,
    guest_phone: phone,
    guest_email: email || null,
    registered_follower_id: user?.id || null,
    slot_id: slotId,
    assigned_agent_id: agentId,
    organization_id: organizationId,
    category,
    statement_of_business: statement,
    desired_outcome: outcome,
    preferred_windows: preferredWindows,
    is_time_sensitive: isTimeSensitive,
    status,
    sla_expires_at: agentId ? slaDate : null
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  await supabase.from("notification_outbox").insert({
    channel: "sms",
    recipient: phone,
    payload: {
      type: "appointment_confirmation",
      tracking_reference: reference,
      body: `Your request was received. Track with ${reference}.`
    }
  });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, reference };
}

export async function toggleDelegateTier(active: boolean) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin" || !profile.organization_id) {
    return { ok: false, message: "Unauthorized." };
  }

  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "delegate")
    .eq("organization_id", profile.organization_id);

  if (active && !count) {
    return { ok: false, message: "Assign at least one delegate before activating the delegate tier." };
  }

  const { error } = await supabase
    .from("system_settings")
    .update({ delegate_tier_active: active, updated_at: new Date().toISOString() })
    .eq("organization_id", profile.organization_id);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: !error, message: error?.message };
}

export async function updateAppointmentStatus(id: string, status: "scheduled_delegate" | "scheduled_leader" | "sla_expired" | "resolved") {
  const profile = await getCurrentUserProfile();
  if (!profile?.organization_id) {
    return { ok: false, message: "Unauthorized." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: !error, message: error?.message };
}

export async function createSlotAction(state: any, formData: FormData) {
  const title = textValue(formData, "title") || "Appointment Slot";
  const visibility = textValue(formData, "visibility") as "public_event" | "appointment";
  const startTime = textValue(formData, "startTime");
  const endTime = textValue(formData, "endTime");
  const maxCapacity = parseInt(textValue(formData, "maxCapacity"), 10);

  if (!title || !visibility || !startTime || !endTime || isNaN(maxCapacity)) {
    return { ok: false, message: "Missing required slot details." };
  }

  const profile = await getCurrentUserProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader") || !profile.organization_id) {
    return { ok: false, message: "Unauthorized: Only admins and leaders can curate slots." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("curated_slots").insert({
    title,
    visibility,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    max_capacity: maxCapacity,
    current_occupancy: 0,
    is_active: true,
    organization_id: profile.organization_id
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Calendar slot created successfully." };
}

export async function deleteSlotAction(id: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader") || !profile.organization_id) {
    return { ok: false, message: "Unauthorized." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("curated_slots")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Slot deleted." };
}

export async function updateSettingsAction(state: any, formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin" || !profile.organization_id) {
    return { ok: false, message: "Unauthorized: Only administrators can modify global rules." };
  }

  const minBusiness = parseInt(textValue(formData, "minBusiness"), 10);
  const minOutcome = parseInt(textValue(formData, "minOutcome"), 10);
  const slaHours = parseInt(textValue(formData, "slaHours"), 10);

  if (isNaN(minBusiness) || isNaN(minOutcome) || isNaN(slaHours)) {
    return { ok: false, message: "Invalid settings inputs." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("system_settings")
    .update({
      min_character_count_business: minBusiness,
      min_character_count_outcome: minOutcome,
      sla_hours_threshold: slaHours,
      updated_at: new Date().toISOString()
    })
    .eq("organization_id", profile.organization_id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "System settings updated successfully." };
}

export async function scheduleAppointmentAction(appointmentId: string, slotId: string, status: "scheduled_delegate" | "scheduled_leader") {
  const profile = await getCurrentUserProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "delegate") || !profile.organization_id) {
    return { ok: false, message: "Unauthorized." };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: slot } = await adminClient
    .from("curated_slots")
    .select("*")
    .eq("id", slotId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!slot) {
    return { ok: false, message: "Selected calendar slot does not exist." };
  }
  if (slot.current_occupancy >= slot.max_capacity) {
    return { ok: false, message: "This slot is already full." };
  }

  const { error } = await adminClient
    .from("appointments")
    .update({
      slot_id: slotId,
      status: status,
      assigned_agent_id: profile.role === "delegate" ? profile.id : undefined
    })
    .eq("id", appointmentId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    return { ok: false, message: error.message };
  }

  const { data: ticket } = await adminClient.from("appointments").select("*").eq("id", appointmentId).single();
  if (ticket) {
    await adminClient.from("notification_outbox").insert({
      channel: "sms",
      recipient: ticket.guest_phone,
      payload: {
        type: "appointment_scheduled",
        tracking_reference: ticket.tracking_reference,
        body: `Your appointment is scheduled! Slot: ${slot.title}. Time: ${formatDateTime(slot.start_time)}.`
      }
    });
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Appointment approved and scheduled successfully!" };
}
