import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily cron via Vercel cron or Supabase Edge Function.
// Auth: header `x-jobs-secret` must match JOBS_SECRET.
export async function POST(req: Request) {
  if (req.headers.get("x-jobs-secret") !== process.env.JOBS_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Trial -> expired (Stripe webhook is the source of truth, but this is a safety net).
  await admin
    .from("users")
    .update({ subscription_tier: "free", subscription_status: "expired" })
    .eq("subscription_status", "trial")
    .lt("trial_ends_at", now);

  // 2. Sprint expired
  await admin
    .from("users")
    .update({
      subscription_tier: "free",
      subscription_status: "expired",
      sprint_analyses_remaining: 0,
    })
    .eq("subscription_tier", "sprint")
    .lt("sprint_expires_at", now);

  // 3. Hard-delete interview audio older than 90 days (keep transcripts/analyses).
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: old } = await admin
    .from("interviews")
    .select("id, file_url")
    .lt("created_at", cutoff)
    .neq("file_url", "");
  for (const row of old ?? []) {
    // file_url is a signed URL; we don't store the storage path. Skip storage cleanup here;
    // a future migration should persist the storage path to enable cleanup.
    await admin.from("interviews").update({ file_url: "" }).eq("id", row.id);
  }

  return NextResponse.json({ ok: true, expired_old: old?.length ?? 0 });
}
