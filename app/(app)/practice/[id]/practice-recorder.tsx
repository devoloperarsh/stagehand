"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { QuestionCategory } from "@/lib/types";

interface Props {
  questionId: string;
  questionText: string;
  userId: string;
  category: QuestionCategory;
}

interface Feedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
}

type Mode = "audio" | "text";

export function PracticeRecorder({ questionId, questionText, userId, category }: Props) {
  // System design questions need diagrams — text-first by default. Other
  // categories default to audio (closer to a real interview).
  const defaultMode: Mode = category === "system_design" ? "text" : "audio";
  const [mode, setMode] = useState<Mode>(defaultMode);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function reset() {
    setFeedback(null);
    setTranscript(null);
    setSeconds(0);
    setTextAnswer("");
    setError(null);
  }

  async function startRecording() {
    setError(null);
    setFeedback(null);
    setTranscript(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStopRecording;
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic access denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  async function handleStopRecording() {
    setSubmitting(true);
    try {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? "audio/webm" });
      const ext = (blob.type.split("/")[1] ?? "webm").split(";")[0];
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("practice")
        .upload(path, blob, { contentType: blob.type });
      if (upErr) throw upErr;

      await submit({ storage_path: path, duration_seconds: seconds, mode: "audio" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitText() {
    if (textAnswer.trim().length < 20) {
      setError("Write a bit more — at least a couple of sentences.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submit({ text_answer: textAnswer, duration_seconds: 0, mode: "text" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(payload: {
    storage_path?: string;
    text_answer?: string;
    duration_seconds: number;
    mode: Mode;
  }) {
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        question_text: questionText,
        ...payload,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error ?? "Grading failed");
    }
    setFeedback(json.feedback);
    setTranscript(json.transcript ?? null);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-8">
        {/* Mode toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              if (recording) return;
              reset();
              setMode("audio");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
              mode === "audio"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
          >
            <Mic className="h-3.5 w-3.5" /> Audio answer
          </button>
          <button
            onClick={() => {
              if (recording) return;
              reset();
              setMode("text");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
              mode === "text"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
          >
            <Type className="h-3.5 w-3.5" /> Type answer
          </button>
        </div>
        {category === "system_design" && (
          <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-1">
              Tip
            </Badge>
            System design questions involve diagrams. Use{" "}
            <strong className="text-foreground">type mode</strong> to lay out your design (you can
            describe boxes/arrows in text, e.g. <em>&quot;Client → CDN → API gateway → ...&quot;</em>).
          </div>
        )}

        {/* AUDIO MODE */}
        {mode === "audio" && (
          <div className="mt-6 text-center">
            <div className="text-sm text-muted-foreground">Aim for 60-120 seconds.</div>
            <div className="mt-2 font-mono text-3xl tabular-nums">{formatSeconds(seconds)}</div>
            <div className="mt-6 flex justify-center">
              {!recording && !submitting && !feedback && (
                <Button size="lg" onClick={startRecording} className="h-16 w-16 rounded-full">
                  <Mic className="h-6 w-6" />
                </Button>
              )}
              {recording && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="h-16 w-16 rounded-full"
                >
                  <Square className="h-5 w-5" />
                </Button>
              )}
              {submitting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Transcribing & grading…
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEXT MODE */}
        {mode === "text" && (
          <div className="mt-6">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Sketch your answer here. For system design, describe components, data flow, scaling decisions, and tradeoffs."
              className="min-h-[260px] w-full rounded-xl border border-input bg-background p-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={submitting || !!feedback}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={submitText} disabled={submitting || !!feedback}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for grading
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* FEEDBACK */}
        {feedback && (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border bg-secondary/30 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Score</div>
              <div className="mt-1 text-3xl font-bold">{feedback.score}/10</div>
              <p className="mt-3 text-sm">{feedback.suggestion}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-success">
                  Strengths
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-warning">
                  Weaknesses
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {feedback.weaknesses.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            {transcript && (
              <details className="rounded-xl border p-4 text-sm">
                <summary className="cursor-pointer font-medium">Your transcript</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{transcript}</p>
              </details>
            )}
            <div>
              <Button onClick={reset}>Try again</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function pickMimeType(): string {
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of opts) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}
