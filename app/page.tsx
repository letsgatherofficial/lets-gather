import {
  CalendarDays,
  ShieldCheck,
  Users,
  Sparkles,
  ArrowRight,
  Route,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Lock,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

async function getPublicEvents() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("curated_slots")
    .select("*")
    .eq("visibility", "public_event")
    .eq("is_active", true)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(3);
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

const features = [
  {
    icon: ShieldCheck,
    title: "Seriousness Firewall",
    desc: "Every request passes through character-count gates — no surface-level inquiries reach the leader's schedule.",
    color: "text-brass bg-brass/8",
  },
  {
    icon: Route,
    title: "Smart Round-Robin Routing",
    desc: "Requests are automatically distributed to the least-loaded delegate, with direct escalation to leaders when no delegates are active.",
    color: "text-jade bg-jade/8",
  },
  {
    icon: Clock,
    title: "SLA Countdown Firewall",
    desc: "Every assigned ticket has a 24-hour delegate deadline. Expired tickets reset automatically — nothing slips through.",
    color: "text-amber-500 bg-amber-50",
  },
  {
    icon: CalendarCheck,
    title: "Curated Calendar Grid",
    desc: "Leaders curate clean time blocks. Followers book against real availability — not a cluttered personal calendar.",
    color: "text-violet-500 bg-violet-50",
  },
  {
    icon: Users,
    title: "Progressive Guest Upgrade",
    desc: "Guests submit with zero friction. After confirmation, they can claim an account with the same contact info to track live status.",
    color: "text-rose-500 bg-rose-50",
  },
  {
    icon: Lock,
    title: "Role-Based Access Control",
    desc: "Admin, Leader, Delegate, and Follower roles each get a tailored dashboard. Leaders observe; delegates triage; admins configure.",
    color: "text-slate-500 bg-slate-100",
  },
];

const steps = [
  {
    num: "01",
    role: "Admin",
    title: "Configure the System",
    desc: "Set character limits, toggle the delegate firewall, generate invite links for leaders and delegates.",
  },
  {
    num: "02",
    role: "Admin",
    title: "Curate the Calendar Grid",
    desc: "Draw clean time blocks with max capacities. Share the public booking link on social media or WhatsApp.",
  },
  {
    num: "03",
    role: "Follower",
    title: "Request an Appointment",
    desc: "No login wall. Fill the seriousness intake form, pass the character gates, and receive a tracking reference instantly.",
  },
  {
    num: "04",
    role: "Delegate",
    title: "Triage the Queue",
    desc: "Delegates review assigned tickets within the SLA window and lock them into curated calendar slots.",
  },
  {
    num: "05",
    role: "Leader",
    title: "Walk In Prepared",
    desc: "Leaders see a clean daily agenda with business statements and desired outcomes pre-loaded for every appointment.",
  },
];

export default async function LandingPage() {
  const events = await getPublicEvents();
  const user = await getSessionUser();

  return (
    <div className="min-h-screen">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold tracking-tight text-slate-800">
              Gather
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <ButtonLink href="/dashboard" variant="primary" className="h-9 px-4 text-xs">
                Dashboard
                <ArrowRight size={13} />
              </ButtonLink>
            ) : (
              <ButtonLink href="/login" variant="primary" className="h-9 px-4 text-xs">
                Get Started
                <ArrowRight size={13} />
              </ButtonLink>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        {/* Background decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brass/6 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brass/20 bg-brass/8 px-4 py-1.5 text-xs font-bold text-brass">
            <Sparkles size={12} className="animate-pulse" />
            Appointment Management for High-Demand Leaders
          </span>

          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-800 sm:text-6xl lg:text-7xl leading-[1.02]">
            Serious requests reach{" "}
            <span className="bg-gradient-to-r from-brass to-violet-500 bg-clip-text text-transparent">
              the right human
            </span>{" "}
            first.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 leading-relaxed">
            Gather is a scheduling and triage platform built for leaders with massive followings. It filters noise, manages delegate capacity, and protects the leader's agenda from bottlenecks — all without making followers jump through sign-up hoops.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {!user && (
              <ButtonLink href="/signup" variant="secondary" className="gap-2 px-6 py-3 text-sm">
                Set Up Your Platform
                <ArrowRight size={16} />
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              Every layer of the system works together
            </h2>
            <p className="mt-3 text-base text-slate-500 max-w-xl mx-auto">
              From first contact to a scheduled meeting — controlled, calm, and protected at every stage.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="glass rounded-2xl border border-slate-100/80 p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-slate-50/60">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-base text-slate-500">
              A five-step journey from system setup to a prepared meeting room.
            </p>
          </div>

          <div className="relative space-y-0">
            {/* Connecting vertical line */}
            <div className="absolute left-8 top-10 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-brass/30 via-violet-300/30 to-transparent lg:left-11" />

            {steps.map((step, i) => (
              <div key={step.num} className="relative flex gap-6 pb-10 last:pb-0">
                <div className="relative z-10 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{step.num}</span>
                  <span className="text-[9px] font-bold text-brass mt-0.5">{step.role}</span>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-base font-extrabold text-slate-800">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS PREVIEW ── */}
      {events.length > 0 && (
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">
                  Upcoming Community Events
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Open gatherings you can attend without an appointment.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="glass rounded-2xl border border-slate-100/60 p-6 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 h-full w-1 bg-jade" />
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-jade">
                    {formatDateTime(event.start_time)}
                  </p>
                  <h3 className="mt-2 text-sm font-bold text-slate-800">{event.title}</h3>
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {event.current_occupancy} / {event.max_capacity} seats reserved
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BAND ── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="dark-glass rounded-3xl p-12 text-center text-white relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brass/20 blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to protect your leader's agenda?
              </h2>
              <p className="mt-4 text-base text-white/60 max-w-xl mx-auto leading-relaxed">
                Set up the system in minutes. Invite delegates, curate your calendar grid, and share the booking link with your following.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {!user && (
                  <ButtonLink href="/signup?role=admin" className="bg-white text-slate-800 hover:bg-slate-100 px-6 py-3 text-sm gap-2 shadow-xl">
                    <CheckCircle2 size={16} />
                    Get Started as Admin
                  </ButtonLink>
                )}
                {user && (
                  <ButtonLink href="/dashboard" variant="ghost" className="text-white hover:bg-white/10 px-6 py-3 text-sm gap-2">
                    Go to Dashboard
                  </ButtonLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles size={14} className="text-brass" />
            <span className="text-xs font-bold">Gather</span>
            <span className="text-xs">— Appointment triage for high-demand leaders</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            {user ? (
              <a href="/dashboard" className="hover:text-slate-600 transition">Dashboard</a>
            ) : (
              <>
                <a href="/login" className="hover:text-slate-600 transition">Login</a>
                <a href="/signup" className="hover:text-slate-600 transition">Sign Up</a>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
