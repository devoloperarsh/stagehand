import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeFromUrl } from "@/lib/deepgram";
import { gradePracticeAnswer } from "@/lib/anthropic";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const Body = z.object({
  question_id: z.string().uuid(),
  question_text: z.string().min(1),
  storage_path: z.string().min(1),
  duration_seconds: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from("practice")
    .createSignedUrl(parsed.data.storage_path, 60 * 30);
  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message ?? "Sign failed" }, { status: 500 });
  }

  const { data: question } = await admin
    .from("practice_questions")
    .select("ideal_answer_structure")
    .eq("id", parsed.data.question_id)
    .single();

  const tx = await transcribeFromUrl(signed.signedUrl);
  const feedback = await gradePracticeAnswer({
    question: parsed.data.question_text,
    idealAnswerStructure: question?.ideal_answer_structure ?? null,
    transcript: tx.fullText,
    durationSeconds: parsed.data.duration_seconds,
  });

  await admin.from("practice_sessions").insert({
    user_id: user.id,
    question_id: parsed.data.question_id,
    audio_url: signed.signedUrl,
    transcript: tx.fullText,
    feedback,
    score: feedback.score,
    duration_seconds: parsed.data.duration_seconds,
  });

  return NextResponse.json({ feedback, transcript: tx.fullText });
}
