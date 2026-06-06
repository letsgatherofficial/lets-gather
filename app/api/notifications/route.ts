import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: pending, error } = await supabase
    .from("notification_outbox")
    .select("*")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const sentIds: string[] = [];

  for (const item of pending ?? []) {
    // Replace this block with Twilio, Africa's Talking, or WhatsApp Business API delivery.
    console.info("notification.dispatch", {
      channel: item.channel,
      recipient: item.recipient,
      payload: item.payload
    });
    sentIds.push(item.id);
  }

  if (sentIds.length) {
    await supabase.from("notification_outbox").update({ sent_at: new Date().toISOString() }).in("id", sentIds);
  }

  return NextResponse.json({ ok: true, dispatched: sentIds.length });
}
