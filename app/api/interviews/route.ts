import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userCanAnalyze } from "@/lib/billing";
import type { UserRow } from "@/lib/types";

const Body = z.object({
  title: z.string().min(2).max(200),
  role_interviewed_for: z.string().min(1).max(120),
  company_name: z.string().max(120).nullable(),
  interview_type: z.enum(["behavioral", "technical", "system_design", "hr", "other"]),
  storage_path: z.string().min(1),
  file_size_mb: z.number().nonnegative(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single<UserRow>();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const can = userCanAnalyze(profile);
    if (!can.allowed) {
      return NextResponse.json({ error: can.reason ?? "Quota exceeded" }, { status: 402 });
    }

    const admin = createAdminClient();
    const { data: signed, error: signErr } = await admin.storage
      .from("interviews")
      .createSignedUrl(parsed.data.storage_path, 60 * 60 * 6);
    if (signErr || !signed) {
      return NextResponse.json(
        { error: signErr?.message ?? "Could not sign storage URL" },
        { status: 500 },
      );
    }

    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        role_interviewed_for: parsed.data.role_interviewed_for,
        company_name: parsed.data.company_name,
        interview_type: parsed.data.interview_type,
        file_url: signed.signedUrl,
        file_size_mb: parsed.data.file_size_mb,
        transcription_status: "pending",
        analysis_status: "pending",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Decrement quota immediately to avoid races
    if (profile.subscription_tier === "free") {
      await admin
        .from("users")
        .update({ free_analyses_used: profile.free_analyses_used + 1 })
        .eq("id", user.id);
    } else if (profile.subscription_tier === "sprint") {
      await admin
        .from("users")
        .update({
          sprint_analyses_remaining: Math.max(0, profile.sprint_analyses_remaining - 1),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({ id: interview.id });
  } catch (err) {
    console.error("[/api/interviews]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create interview" },
      { status: 500 },
    );
  }
}
