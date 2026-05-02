import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeInterview } from "@/lib/llm";
import type { InterviewRow, TranscriptRow } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: interview } = await admin
    .from("interviews")
    .select("*")
    .eq("id", params.id)
    .single<InterviewRow>();
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (interview.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: tx } = await admin
    .from("transcripts")
    .select("*")
    .eq("interview_id", interview.id)
    .single<TranscriptRow>();
  if (!tx) return NextResponse.json({ error: "No transcript yet" }, { status: 400 });

  await admin
    .from("interviews")
    .update({ analysis_status: "processing" })
    .eq("id", interview.id);

  const analysis = await analyzeInterview({
    role: interview.role_interviewed_for,
    company: interview.company_name,
    interviewType: interview.interview_type,
    durationSeconds: interview.duration_seconds ?? 0,
    segments: tx.segments,
    fullText: tx.full_text,
  });

  await admin.from("analyses").upsert(
    {
      interview_id: interview.id,
      overall_communication_score: analysis.communication_score,
      overall_content_score: analysis.content_score,
      overall_confidence_score: analysis.confidence_score,
      hire_recommendation: analysis.hire_recommendation,
      filler_word_count: analysis.filler_word_count,
      filler_word_breakdown: analysis.filler_word_breakdown,
      words_per_minute: analysis.words_per_minute,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      improvement_drills: analysis.improvement_drills,
      summary: analysis.summary,
    },
    { onConflict: "interview_id" },
  );

  await admin
    .from("interviews")
    .update({ analysis_status: "completed", completed_at: new Date().toISOString() })
    .eq("id", interview.id);

  return NextResponse.json({ ok: true });
}
