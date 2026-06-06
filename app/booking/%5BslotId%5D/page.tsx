import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intake-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto space-y-6">
      <Link href="/calendar" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm font-semibold mb-2">
        <ArrowLeft size={16} />
        Back to Calendar
      </Link>
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Apply for Appointment</h1>
        <p className="text-sm text-slate-500">
          Complete the multi-step intake below. Your request will be triaged and routed based on capacity.
        </p>
      </div>
      <IntakeForm slotId={slot.id} slotDetails={slot} />
    </main>
  );
}
