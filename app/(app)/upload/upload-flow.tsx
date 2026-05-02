"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/lib/supabase/client";
import type { InterviewType } from "@/lib/types";

const ACCEPTED = {
  "audio/*": [".mp3", ".m4a", ".wav"],
  "video/*": [".mp4", ".mov"],
};

const INTERVIEW_TYPES: { id: InterviewType; label: string }[] = [
  { id: "behavioral", label: "Behavioral" },
  { id: "technical", label: "Technical" },
  { id: "system_design", label: "System Design" },
  { id: "hr", label: "HR" },
  { id: "other", label: "Other" },
];

type Step = "details" | "upload" | "processing";

export function UploadFlow({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<InterviewType>("behavioral");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Uploading file…");
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  });

  function detailsValid() {
    return title.trim().length > 1 && role.trim().length > 1;
  }

  async function startUpload() {
    if (!file) return;
    setStep("processing");
    setError(null);
    setStatusText("Uploading file…");
    setProgress(5);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("interviews")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setError(uploadError.message);
      setStep("upload");
      return;
    }

    setProgress(40);
    setStatusText("Creating interview…");

    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        role_interviewed_for: role,
        company_name: company || null,
        interview_type: type,
        storage_path: path,
        file_size_mb: Number((file.size / 1024 / 1024).toFixed(2)),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create interview");
      setStep("upload");
      return;
    }

    const { id } = (await res.json()) as { id: string };

    setProgress(60);
    setStatusText("Transcribing audio…");

    // Trigger background processing
    fetch(`/api/interviews/${id}/process`, { method: "POST" }).catch(() => {
      /* fire-and-forget; webhook/cron will retry */
    });

    // Poll for completion
    const start = Date.now();
    const poll = async () => {
      const { data } = await supabase
        .from("interviews")
        .select("transcription_status, analysis_status, error_message")
        .eq("id", id)
        .single();

      if (!data) return setTimeout(poll, 3000);
      if (data.transcription_status === "failed" || data.analysis_status === "failed") {
        setError(data.error_message ?? "Processing failed.");
        setStep("upload");
        return;
      }
      if (data.transcription_status === "completed") {
        setStatusText("Analyzing with Claude…");
        setProgress(80);
      }
      if (data.analysis_status === "completed") {
        setStatusText("Done!");
        setProgress(100);
        router.push(`/interview/${id}`);
        return;
      }
      // safety: fallback after 8 minutes
      if (Date.now() - start > 8 * 60 * 1000) {
        setError("This is taking longer than expected. We'll email you when it's done.");
        return;
      }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 4000);
  }

  if (step === "details") {
    return (
      <Card>
        <CardContent className="space-y-5 p-6">
          <Step n={1} label="Tell us about it" />
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Google SWE phone screen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="Software Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                placeholder="Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Interview type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as InterviewType)}
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {INTERVIEW_TYPES.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                    type === opt.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={opt.id} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="flex justify-end">
            <Button disabled={!detailsValid()} onClick={() => setStep("upload")}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "upload") {
    return (
      <Card>
        <CardContent className="space-y-5 p-6">
          <Step n={2} label="Upload your recording" />
          <div
            {...dropzone.getRootProps()}
            className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-secondary/20 p-6 text-center transition ${
              dropzone.isDragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <input {...dropzone.getInputProps()} />
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {file ? file.name : "Drop your file here or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              MP3 · MP4 · M4A · WAV · MOV — up to 500 MB / 90 minutes
            </p>
            {file && (
              <Badge>
                <CheckCircle2 className="h-3 w-3" /> {(file.size / 1024 / 1024).toFixed(1)} MB ready
              </Badge>
            )}
          </div>
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("details")}>
              ← Back
            </Button>
            <Button disabled={!file} onClick={startUpload}>
              Analyze interview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-10 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <div>
          <h2 className="text-xl font-semibold">{statusText}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Don&apos;t close this tab. We&apos;ll email you when it&apos;s done.
          </p>
        </div>
        <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </div>
      <h2 className="text-lg font-semibold">{label}</h2>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
      {children}
    </span>
  );
}
