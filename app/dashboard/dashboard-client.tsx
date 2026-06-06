"use client";

import { useActionState, useState, useEffect } from "react";
import { 
  Calendar, Users, Settings, Shield, Clock, Clipboard, UserCheck, 
  Power, LogOut, CheckCircle2, AlertTriangle, CalendarPlus, 
  Info, Copy, Check, CalendarDays, ExternalLink, RefreshCw 
} from "lucide-react";
import { 
  signOutAction, createSlotAction, deleteSlotAction, 
  updateSettingsAction, scheduleAppointmentAction, 
  toggleDelegateTier, updateAppointmentStatus 
} from "@/app/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn, formatDateTime } from "@/lib/utils";
import { CalendarView } from "@/components/calendar-view";

interface DashboardClientProps {
  profile: any;
  settings: any;
  delegates: any[];
  leaders: any[];
  slots: any[];
  appointments: any[];
  followerAppointments: any[];
  organization: { id: string; name: string; invite_token: string } | null;
}

export function DashboardClient({
  profile,
  settings,
  delegates,
  leaders,
  slots,
  appointments,
  followerAppointments,
  organization
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Client side copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // Forms states
  const [slotState, slotAction, slotPending] = useActionState(createSlotAction, { ok: false, message: "" });
  const [settingsState, settingsAction, settingsPending] = useActionState(updateSettingsAction, { ok: false, message: "" });

  // Calculate dynamic SLA text
  const getSlaInfo = (expiresAt: string) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const remainingMs = expiry - now;

    if (remainingMs <= 0) {
      return { text: "SLA Expired", isExpired: true };
    }

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return { text: `${hours}h ${minutes}m remaining`, isExpired: false };
    }
    return { text: `${minutes}m remaining`, isExpired: false };
  };

  // Nav Header Shared Across Dashboard
  const headerNode = (
    <header className="glass rounded-2xl p-6 border border-slate-100/80 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brass/10 text-brass shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Leader Firewall Platform</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Logged in as <span className="font-bold text-slate-700">{profile.full_name}</span> ({profile.role.toUpperCase()})
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ButtonLink href="/calendar" variant="ghost" className="h-9 px-4 text-xs">
          <CalendarDays size={14} />
          View Calendar Grid
        </ButtonLink>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" className="h-9 px-4 text-xs hover:text-ember active:scale-[0.98]">
            <LogOut size={14} />
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  );

  // Render follower view
  if (profile.role === "follower") {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        {headerNode}
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left panel: Bookings timeline */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clipboard size={18} className="text-brass" />
              Your Appointment Requests
            </h2>
            <div className="space-y-4">
              {followerAppointments.length ? (
                followerAppointments.map((ticket) => {
                  const statusColors: Record<string, string> = {
                    pending_review: "bg-amber-50 text-amber-600 border-amber-100",
                    assigned_to_delegate: "bg-blue-50 text-blue-600 border-blue-100",
                    scheduled_delegate: "bg-brass/5 text-brass border-brass/15",
                    scheduled_leader: "bg-jade-50 text-jade/90 border-jade-100",
                    sla_expired: "bg-rose-50 text-rose-500 border-rose-100",
                    resolved: "bg-slate-50 text-slate-500 border-slate-100"
                  };

                  return (
                    <article key={ticket.id} className="glass rounded-2xl p-6 border border-slate-100/60 shadow-sm relative overflow-hidden">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            Ref: {ticket.tracking_reference}
                          </span>
                          <h3 className="text-base font-bold text-slate-800 mt-0.5">{ticket.category}</h3>
                        </div>
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold border",
                          statusColors[ticket.status] || "bg-slate-50 text-slate-500"
                        )}>
                          {ticket.status.replaceAll("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-4 border-t border-slate-50 pt-4 space-y-2.5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement of Business</p>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.statement_of_business}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Desired Outcome</p>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.desired_outcome}</p>
                        </div>
                        {ticket.curated_slots && (
                          <div className="bg-brass/5 border border-brass/10 rounded-xl p-3 mt-2">
                            <p className="text-xs font-bold text-brass flex items-center gap-1.5">
                              <Calendar size={13} />
                              Meeting Scheduled
                            </p>
                            <p className="text-xs text-slate-800 font-bold mt-1">{ticket.curated_slots.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Time: {formatDateTime(ticket.curated_slots.start_time)}
                            </p>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="glass rounded-2xl p-8 text-center border border-slate-100/60">
                  <p className="text-slate-400 text-sm">You haven't requested any appointments yet.</p>
                  <ButtonLink href="/calendar" className="mt-4 inline-flex h-9 text-xs">
                    Book an Appointment
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Upcoming Events */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays size={18} className="text-jade" />
              Community Events
            </h2>
            <div className="space-y-3">
              {slots.length ? (
                slots.map((event) => (
                  <article key={event.id} className="glass rounded-xl p-4 border border-slate-100/60 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-jade">
                      {formatDateTime(event.start_time)}
                    </p>
                    <h3 className="text-sm font-bold text-slate-800 mt-1">{event.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Seats Reserved: {event.current_occupancy} / {event.max_capacity}
                    </p>
                  </article>
                ))
              ) : (
                <p className="glass rounded-xl p-4 text-xs text-slate-400 border border-slate-100 text-center">
                  No upcoming community events scheduled.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Render delegate view
  if (profile.role === "delegate") {
    const activeTickets = appointments.filter(a => a.status === "assigned_to_delegate" || a.status === "scheduled_delegate");

    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        {headerNode}

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-brass" />
              Assigned Triage Queue ({activeTickets.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">Auto-assigned tickets via round-robin</span>
          </div>

          <div className="space-y-4">
            {activeTickets.length ? (
              activeTickets.map((ticket) => {
                const sla = getSlaInfo(ticket.sla_expires_at);

                return (
                  <article key={ticket.id} className="glass rounded-2xl p-6 border border-slate-100/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brass" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            {ticket.tracking_reference}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {ticket.category}
                          </span>
                          {ticket.is_time_sensitive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-500 border border-rose-100">
                              Time-Sensitive
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-800 mt-1.5">{ticket.guest_full_name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{ticket.guest_phone} {ticket.guest_email ? `| ${ticket.guest_email}` : ""}</p>
                      </div>

                      {/* SLA Timer */}
                      {sla && (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border",
                          sla.isExpired 
                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          <Clock size={13} />
                          SLA: {sla.text}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement of Business</p>
                        <p className="text-xs text-slate-700 leading-relaxed mt-1">{ticket.statement_of_business}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Desired Outcome</p>
                        <p className="text-xs text-slate-700 leading-relaxed mt-1">{ticket.desired_outcome}</p>
                      </div>
                    </div>

                    {/* Schedule Triage Action */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Slot picker form */}
                      <form action={async (formData) => {
                        const slotId = formData.get("slotId") as string;
                        const status = formData.get("status") as any;
                        const res = await scheduleAppointmentAction(ticket.id, slotId, status);
                        if (!res.ok) alert(res.message);
                      }} className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <select 
                          name="slotId" 
                          required 
                          className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold shadow-sm focus:border-brass/30"
                        >
                          <option value="">-- Lock Curated Slot --</option>
                          {slots.map((s) => (
                            <option key={s.id} value={s.id} disabled={s.current_occupancy >= s.max_capacity}>
                              {s.title} ({s.current_occupancy}/{s.max_capacity})
                            </option>
                          ))}
                        </select>
                        <select 
                          name="status" 
                          required 
                          className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold shadow-sm focus:border-brass/30"
                        >
                          <option value="scheduled_delegate">Delegate Meeting</option>
                          <option value="scheduled_leader">Promote to Leader</option>
                        </select>
                        <Button type="submit" className="h-9 px-4 text-xs font-bold">
                          Approve & Schedule
                        </Button>
                      </form>

                      {/* Direct Resolve */}
                      <form action={async () => {
                        const res = await updateAppointmentStatus(ticket.id, "resolved");
                        if (!res.ok) alert(res.message);
                      }}>
                        <Button type="submit" variant="secondary" className="h-9 px-4 text-xs font-bold text-slate-500 hover:text-rose-500 active:scale-[0.98]">
                          <CheckCircle2 size={13} />
                          Archive / Reject
                        </Button>
                      </form>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="glass rounded-2xl p-8 text-center border border-slate-100/60">
                <p className="text-slate-400 text-sm">No tickets currently assigned to you for triage.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Render leader view
  if (profile.role === "leader") {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        {headerNode}

        <CalendarView slots={slots} showBookingLinks={false} />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Daily Schedule Observer */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="text-brass" size={20} />
              <h2 className="text-lg font-bold text-slate-800">Your Scheduled Meetings Agenda</h2>
            </div>
            <div className="space-y-4">
              {appointments.length ? (
                appointments.map((ticket) => (
                  <article key={ticket.id} className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brass" />
                    
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Scheduled Booking ({ticket.tracking_reference})
                        </span>
                        <h3 className="text-base font-bold text-slate-800 mt-0.5">{ticket.guest_full_name}</h3>
                      </div>
                      {ticket.curated_slots && (
                        <div className="text-right text-xs">
                          <span className="font-bold text-brass">{ticket.curated_slots.title}</span>
                          <p className="text-slate-400 font-semibold mt-0.5">{formatDateTime(ticket.curated_slots.start_time)}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 bg-slate-50/50 rounded-xl p-3.5 border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement of Business</p>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.statement_of_business}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Desired Outcome</p>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.desired_outcome}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="glass rounded-2xl p-8 text-center border border-slate-100/60">
                  <p className="text-slate-400 text-sm">No upcoming appointments scheduled on your agenda.</p>
                </div>
              )}
            </div>
          </div>

          {/* Settings & Active slots read-only */}
          <div className="space-y-6">
            {/* Delegate Tier Status Info */}
            <div className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={16} className="text-jade" />
                Firewall Settings
              </h3>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-semibold">
                <span className="text-slate-500">Delegate Firewall:</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  settings?.delegate_tier_active ? "bg-jade/10 text-jade" : "bg-ember/10 text-ember"
                )}>
                  {settings?.delegate_tier_active ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>

            {/* Read-only slots list */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={16} className="text-brass" />
                Curated Slots Grid
              </h3>
              <div className="space-y-3">
                {slots.map((s) => (
                  <div key={s.id} className="glass rounded-xl p-3 border border-slate-100/50 shadow-sm text-xs relative overflow-hidden">
                    <p className="font-bold text-slate-800">{s.title}</p>
                    <p className="text-slate-400 font-semibold mt-0.5">{formatDateTime(s.start_time)}</p>
                    <div className="flex justify-between mt-2 font-bold text-[10px] text-slate-500 border-t border-slate-50 pt-2">
                      <span>TYPE: {s.visibility.toUpperCase()}</span>
                      <span className="text-brass">{s.current_occupancy}/{s.max_capacity} seats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Render admin view
  if (profile.role === "admin") {
    const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
    const orgToken = organization?.invite_token ?? "";
    const leaderSchedule = appointments.filter((a) => a.status === "scheduled_leader");

    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {headerNode}

        {/* Admin Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-px flex-wrap">
          {[
            { id: "overview", label: "Control Room", icon: Settings },
            { id: "calendar", label: "Calendar Curation", icon: CalendarPlus },
            { id: "triage", label: "Triage Center", icon: Clipboard }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all duration-200 -mb-px rounded-t-xl",
                  activeTab === tab.id
                    ? "border-brass text-brass bg-brass/[0.02]"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content panels */}
        <div className="mt-4">
          {/* PANEL 1: CONTROL ROOM */}
          {activeTab === "overview" && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Settings Form */}
              <div className="md:col-span-2 space-y-6">
                <form action={settingsAction} className="glass rounded-2xl p-6 border border-slate-100/80 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Shield size={18} className="text-brass" />
                    <h2 className="text-base font-bold text-slate-800">Global System Rules</h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="minBusiness">Statement of Business Min Characters</Label>
                      <Input 
                        id="minBusiness" 
                        name="minBusiness" 
                        type="number" 
                        required 
                        defaultValue={settings?.min_character_count_business ?? 150} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="minOutcome">Desired Outcome Min Characters</Label>
                      <Input 
                        id="minOutcome" 
                        name="minOutcome" 
                        type="number" 
                        required 
                        defaultValue={settings?.min_character_count_outcome ?? 100} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slaHours">Delegate SLA Limit (Hours)</Label>
                    <Input 
                      id="slaHours" 
                      name="slaHours" 
                      type="number" 
                      required 
                      defaultValue={settings?.sla_hours_threshold ?? 24} 
                    />
                  </div>

                  {settingsState?.message && (
                    <p className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs font-semibold text-slate-700">
                      {settingsState.message}
                    </p>
                  )}

                  <Button type="submit" disabled={settingsPending} className="w-full">
                    {settingsPending ? "Saving configuration..." : "Save Configuration"}
                  </Button>
                </form>

                {/* Delegate firewall master toggler */}
                <div className="glass rounded-2xl p-6 border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Power size={18} className="text-brass" />
                      <h3 className="font-bold text-slate-800">Delegate Triage Firewall</h3>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${settings?.delegate_tier_active ? "bg-jade animate-pulse" : "bg-ember"}`} />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When active, standard appointment requests route round-robin to delegates. Disabling routes requests directly to leaders.
                  </p>
                  
                  <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Status: {settings?.delegate_tier_active ? "ACTIVE" : "INACTIVE"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{delegates.length} delegates enrolled</p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={async () => {
                        const res = await toggleDelegateTier(!settings?.delegate_tier_active);
                        if (!res.ok) alert(res.message);
                      }}
                      variant={settings?.delegate_tier_active ? "secondary" : "primary"}
                      className="h-9 text-xs px-4"
                    >
                      {settings?.delegate_tier_active ? "Disable Firewall" : "Enable Firewall"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Members Invite Panel */}
              <div className="space-y-6">
                <div className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Users size={16} className="text-brass" />
                    Invite Staff Members
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate and share links to create accounts with automatically pre-assigned administrative permissions.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    {/* Leader invite */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Leader Invite Link</span>
                        <button 
                          onClick={() => copyToClipboard(`${hostUrl}/signup?role=leader&org=${orgToken}`, "leader")}
                          className="text-brass hover:underline flex items-center gap-1"
                        >
                          {copyStatus === "leader" ? <Check size={11} /> : <Copy size={11} />}
                          {copyStatus === "leader" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] font-medium text-slate-500 truncate select-all">
                        {hostUrl}/signup?role=leader&org={orgToken}
                      </div>
                    </div>

                    {/* Delegate invite */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Delegate Invite Link</span>
                        <button 
                          onClick={() => copyToClipboard(`${hostUrl}/signup?role=delegate&org=${orgToken}`, "delegate")}
                          className="text-brass hover:underline flex items-center gap-1"
                        >
                          {copyStatus === "delegate" ? <Check size={11} /> : <Copy size={11} />}
                          {copyStatus === "delegate" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] font-medium text-slate-500 truncate select-all">
                        {hostUrl}/signup?role=delegate&org={orgToken}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Roster */}
                <div className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-jade" />
                    Enrolled Leaders ({leaders.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {leaders.map((l) => (
                      <div key={l.id} className="p-2.5 rounded-xl border border-slate-100/50 bg-slate-50/50 text-xs">
                        <p className="font-bold text-slate-800 truncate">{l.full_name}</p>
                        <p className="text-slate-400 mt-0.5 truncate text-[10px]">{l.email}</p>
                      </div>
                    ))}
                    {!leaders.length && (
                      <p className="text-xs text-slate-400 text-center py-4">No leaders enrolled. Share the invite link above.</p>
                    )}
                  </div>
                </div>

                <div className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-brass" />
                    Enrolled Delegates ({delegates.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {delegates.map((d) => (
                      <div key={d.id} className="p-2.5 rounded-xl border border-slate-100/50 bg-slate-50/50 text-xs">
                        <p className="font-bold text-slate-800 truncate">{d.full_name}</p>
                        <p className="text-slate-400 mt-0.5 truncate text-[10px]">{d.email}</p>
                      </div>
                    ))}
                    {!delegates.length && (
                      <p className="text-xs text-slate-400 text-center py-4">No delegates enrolled.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Leader Schedule Observer */}
              <div className="md:col-span-3 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Calendar size={18} className="text-brass" />
                  <h2 className="text-base font-bold text-slate-800">Leader Schedule ({leaderSchedule.length})</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {leaderSchedule.length ? (
                    leaderSchedule.map((ticket) => (
                      <article key={ticket.id} className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            {ticket.tracking_reference}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 mt-1">{ticket.guest_full_name}</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ticket.category}</p>
                        </div>
                        {ticket.curated_slots && (
                          <div className="bg-brass/5 border border-brass/10 rounded-xl p-3 text-xs">
                            <p className="font-bold text-brass">{ticket.curated_slots.title}</p>
                            <p className="text-slate-500 mt-0.5">{formatDateTime(ticket.curated_slots.start_time)}</p>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 line-clamp-2">{ticket.statement_of_business}</p>
                      </article>
                    ))
                  ) : (
                    <p className="glass rounded-2xl p-6 text-sm text-slate-400 text-center border border-slate-100/60 col-span-full">
                      No appointments scheduled to the leader yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PANEL 2: CALENDAR CURATION */}
          {activeTab === "calendar" && (
            <div className="space-y-8">
            <CalendarView slots={slots} showBookingLinks={true} />

            <div className="grid gap-6 md:grid-cols-3">
              {/* Slot creation form */}
              <div className="glass rounded-2xl p-6 border border-slate-100/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CalendarPlus size={18} className="text-brass" />
                  <h2 className="text-base font-bold text-slate-800">Create Calendar Slot</h2>
                </div>

                <form action={slotAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Slot Title</Label>
                    <Input id="title" name="title" required placeholder="e.g. Afternoon appointment block" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="visibility">Visibility / Booking Type</Label>
                    <select 
                      id="visibility" 
                      name="visibility" 
                      required 
                      className="focus-ring h-12 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm text-slate-800 shadow-sm focus:border-brass/30"
                    >
                      <option value="appointment">Private Appointment Slot</option>
                      <option value="public_event">Mass Community Event</option>
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="startTime">Start Date/Time</Label>
                      <Input id="startTime" name="startTime" type="datetime-local" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endTime">End Date/Time</Label>
                      <Input id="endTime" name="endTime" type="datetime-local" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="maxCapacity">Max Capacity / Attendance Limit</Label>
                    <Input id="maxCapacity" name="maxCapacity" type="number" min="1" required defaultValue="8" />
                  </div>

                  {slotState?.message && (
                    <p className="rounded-xl bg-ember/5 border border-ember/15 px-4 py-2.5 text-xs font-semibold text-ember animate-pulse">
                      {slotState.message}
                    </p>
                  )}

                  <Button type="submit" disabled={slotPending} className="w-full">
                    {slotPending ? "Creating calendar slot..." : "Create Calendar Slot"}
                  </Button>
                </form>
              </div>

              {/* Slots curation list */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={18} className="text-jade" />
                  Curated Slots Grid ({slots.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {slots.map((s) => {
                    const isPublic = s.visibility === "public_event";
                    return (
                      <article key={s.id} className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200" />
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                              isPublic ? "bg-jade/5 text-jade border-jade/10" : "bg-brass/5 text-brass border-brass/10"
                            )}>
                              {s.visibility.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {s.current_occupancy} / {s.max_capacity} filled
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 mt-2">{s.title}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            {formatDateTime(s.start_time)} - {formatDateTime(s.end_time)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
                          <button
                            onClick={() => copyToClipboard(`${hostUrl}/booking/${s.id}`, s.id)}
                            className="text-[10px] font-semibold text-brass flex items-center gap-1 hover:underline"
                          >
                            {copyStatus === s.id ? <Check size={11} /> : <ExternalLink size={11} />}
                            {copyStatus === s.id ? "Copied Link" : "Share Direct Link"}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Archive this slot?")) {
                                const res = await deleteSlotAction(s.id);
                                if (!res.ok) alert(res.message);
                              }
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!slots.length && (
                    <p className="glass rounded-2xl p-6 text-sm text-slate-400 text-center border border-slate-100/60 col-span-2">
                      No active calendar slots curated yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* PANEL 3: TRIAGE CENTER */}
          {activeTab === "triage" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clipboard size={18} className="text-brass" />
                  All Inflow Appointments ({appointments.length})
                </h2>
                <span className="text-xs text-slate-500">Triage bookings, assign delegates, verify character gates</span>
              </div>

              <div className="space-y-4">
                {appointments.map((ticket) => {
                  const sla = getSlaInfo(ticket.sla_expires_at);
                  const isScheduled = ticket.status === "scheduled_leader" || ticket.status === "scheduled_delegate";

                  return (
                    <article key={ticket.id} className="glass rounded-2xl p-6 border border-slate-100/60 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold uppercase">
                            <span className="text-slate-400">{ticket.tracking_reference}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {ticket.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-brass/5 text-brass border border-brass/10">
                              {ticket.status.replaceAll("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mt-2">{ticket.guest_full_name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{ticket.guest_phone} {ticket.guest_email ? `| ${ticket.guest_email}` : ""}</p>
                        </div>

                        {/* SLA timer */}
                        {sla && !isScheduled && (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border",
                            sla.isExpired 
                              ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" 
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            <Clock size={13} />
                            SLA: {sla.text}
                          </div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="grid gap-4 sm:grid-cols-2 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement of Business</p>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.statement_of_business}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Desired Outcome</p>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">{ticket.desired_outcome}</p>
                        </div>
                      </div>

                      {/* Scheduled slot details */}
                      {ticket.curated_slots && (
                        <div className="bg-jade/5 rounded-xl p-3 border border-jade/10 text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <CheckCircle2 className="text-jade" size={15} />
                          Scheduled: <span className="font-bold text-slate-800">{ticket.curated_slots.title}</span> on {formatDateTime(ticket.curated_slots.start_time)}
                        </div>
                      )}

                      {/* Triage controls (only show if not resolved) */}
                      {ticket.status !== "resolved" && (
                        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <form action={async (formData) => {
                            const slotId = formData.get("slotId") as string;
                            const status = formData.get("status") as any;
                            const res = await scheduleAppointmentAction(ticket.id, slotId, status);
                            if (!res.ok) alert(res.message);
                          }} className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            <select 
                              name="slotId" 
                              required 
                              defaultValue={ticket.slot_id || ""}
                              className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold shadow-sm focus:border-brass/30"
                            >
                              <option value="">-- Lock Curated Slot --</option>
                              {slots.filter(s => s.visibility === "appointment").map((s) => (
                                <option key={s.id} value={s.id} disabled={s.current_occupancy >= s.max_capacity && s.id !== ticket.slot_id}>
                                  {s.title} ({s.current_occupancy}/{s.max_capacity})
                                </option>
                              ))}
                            </select>
                            <select 
                              name="status" 
                              required 
                              defaultValue={ticket.status.startsWith("scheduled_") ? ticket.status : "scheduled_leader"}
                              className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold shadow-sm focus:border-brass/30"
                            >
                              <option value="scheduled_leader">Schedule to Leader</option>
                              <option value="scheduled_delegate">Schedule to Delegate</option>
                            </select>
                            <Button type="submit" className="h-9 px-4 text-xs font-bold">
                              Lock & Approve
                            </Button>
                          </form>

                          <form action={async () => {
                            const res = await updateAppointmentStatus(ticket.id, "resolved");
                            if (!res.ok) alert(res.message);
                          }}>
                            <Button type="submit" variant="secondary" className="h-9 px-4 text-xs font-bold text-slate-500 hover:text-rose-500 active:scale-[0.98]">
                              Archive / Reject
                            </Button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })}
                {!appointments.length && (
                  <p className="glass rounded-2xl p-6 text-slate-400 text-sm text-center border border-slate-100">
                    No appointments exist in the triage inflow.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return null;
}
