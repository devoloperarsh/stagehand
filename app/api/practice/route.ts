import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeFromUrl } from "@/lib/deepgram";
import { gradePracticeAnswer } from "@/lib/llm";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const Body = z
  .object({
    question_id: z.string().uuid(),
    question_text: z.string().min(1),
    storage_path: z.string().min(1).optional(),
    text_answer: z.string().min(1).optional(),
    duration_seconds: z.number().int().nonnegative(),
    mode: z.enum(["audio", "text"]),
  })
  .refine(
    (v) =>
      (v.mode === "audio" && !!v.storage_path) ||
      (v.mode === "text" && !!v.text_answer),
    { message: "audio mode needs storage_path; text mode needs text_answer" },
  );

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

    const admin = createAdminClient();
    const { data: question } = await admin
      .from("practice_questions")
      .select("ideal_answer_structure")
      .eq("id", parsed.data.question_id)
      .single();

    let answerText: string;
    let audioUrl: string | null = null;
    let durationSeconds = parsed.data.duration_seconds;

    if (parsed.data.mode === "audio") {
      const { data: signed, error: signErr } = await admin.storage
        .from("practice")
        .createSignedUrl(parsed.data.storage_path!, 60 * 30);
      if (signErr || !signed) {
        return NextResponse.json(
          { error: signErr?.message ?? "Could not sign audio URL" },
          { status: 500 },
        );
      }
      const tx = await transcribeFromUrl(signed.signedUrl);
      answerText = tx.fullText;
      audioUrl = signed.signedUrl;
      if (!durationSeconds) durationSeconds = tx.durationSeconds;
    } else {
      answerText = parsed.data.text_answer!;
    }

    const feedback = await gradePracticeAnswer({
      question: parsed.data.question_text,
      idealAnswerStructure: question?.ideal_answer_structure ?? null,
      answer: answerText,
      durationSeconds,
      isText: parsed.data.mode === "text",
    });

    await admin.from("practice_sessions").insert({
      user_id: user.id,
      question_id: parsed.data.question_id,
      audio_url: audioUrl,
      transcript: answerText,
      feedback,
      score: feedback.score,
      duration_seconds: durationSeconds,
    });

    return NextResponse.json({
      feedback,
      transcript: parsed.data.mode === "audio" ? answerText : null,
    });
  } catch (err) {
    console.error("[/api/practice]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Grading failed" },
      { status: 500 },
    );
  }
}
