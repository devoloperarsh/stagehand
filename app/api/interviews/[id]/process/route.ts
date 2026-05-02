import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeFromUrl } from "@/lib/deepgram";
import { analyzeInterview } from "@/lib/llm";
import { sendAnalysisReadyEmail } from "@/lib/email";
import type { InterviewRow } from "@/lib/types";

export const maxDuration = 300; // 5 minutes (Vercel hobby cap is 60s; pro=300s)
export const dynamic = "force-dynamic";

// Triggered after upload. Authenticated as the owning user, but uses the
// admin client to update job status (so RLS doesn't get in the way of writes
// to transcripts / analyses tables that lack owner-scoped insert policies).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: interview, error } = await admin
    .from("interviews")
    .select("*")
    .eq("id", params.id)
    .single<InterviewRow>();
  if (error || !interview) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }
  if (interview.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (interview.analysis_status === "completed") {
    return NextResponse.json({ status: "already_completed" });
  }

  // Run the pipeline asynchronously so the request returns fast.
  runPipeline(interview, user.email ?? "").catch(async (err) => {
    console.error("pipeline failed", err);
    await admin
      .from("interviews")
      .update({
        transcription_status: "failed",
        analysis_status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", interview.id);
  });

  return NextResponse.json({ status: "started" });
}

async function runPipeline(interview: InterviewRow, userEmail: string) {
  const admin = createAdminClient();

  await admin
    .from("interviews")
    .update({ transcription_status: "processing" })
    .eq("id", interview.id);

  const tx = await transcribeFromUrl(interview.file_url);

  await admin.from("transcripts").upsert(
    {
      interview_id: interview.id,
      full_text: tx.fullText,
      segments: tx.segments,
      word_count: tx.wordCount,
    },
    { onConflict: "interview_id" },
  );

  await admin
    .from("interviews")
    .update({
      transcription_status: "completed",
      analysis_status: "processing",
      duration_seconds: tx.durationSeconds,
    })
    .eq("id", interview.id);

  const analysis = await analyzeInterview({
    role: interview.role_interviewed_for,
    company: interview.company_name,
    interviewType: interview.interview_type,
    durationSeconds: tx.durationSeconds,
    segments: tx.segments,
    fullText: tx.fullText,
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

  if (userEmail) {
    await sendAnalysisReadyEmail({
      to: userEmail,
      interviewTitle: interview.title,
      reportUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/interview/${interview.id}`,
    }).catch(() => {});
  }
}
