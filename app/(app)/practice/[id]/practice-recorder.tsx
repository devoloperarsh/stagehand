"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Props {
  questionId: string;
  questionText: string;
  userId: string;
}

interface Feedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
}

export function PracticeRecorder({ questionId, questionText, userId }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
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

  async function start() {
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
      recorder.onstop = handleStop;
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic access denied.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  async function handleStop() {
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

      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          question_text: questionText,
          storage_path: path,
          duration_seconds: seconds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Grading failed");
      }
      const json = await res.json();
      setFeedback(json.feedback);
      setTranscript(json.transcript);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="text-sm text-muted-foreground">Aim for 60-120 seconds.</div>
        <div className="mt-2 font-mono text-3xl tabular-nums">{formatSeconds(seconds)}</div>
        <div className="mt-6 flex justify-center">
          {!recording && !submitting && (
            <Button size="lg" onClick={start} className="h-16 w-16 rounded-full">
              <Mic className="h-6 w-6" />
            </Button>
          )}
          {recording && (
            <Button size="lg" variant="destructive" onClick={stop} className="h-16 w-16 rounded-full">
              <Square className="h-5 w-5" />
            </Button>
          )}
          {submitting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Transcribing & grading…
            </div>
          )}
        </div>
        {error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {feedback && (
          <div className="mt-8 space-y-4 text-left">
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
              <Button
                onClick={() => {
                  setFeedback(null);
                  setTranscript(null);
                  setSeconds(0);
                }}
              >
                Try again
              </Button>
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
