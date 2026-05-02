import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, Clock, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReanalyzeButton } from "./reanalyze-button";
import { AnnotatedTranscript } from "./annotated-transcript";
import { formatDate, formatDuration, hireBadge, scoreColor } from "@/lib/utils";
import type {
  AnalysisRow,
  InterviewRow,
  TranscriptRow,
  StrengthItem,
  WeaknessItem,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: interview } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", params.id)
    .single<InterviewRow>();
  if (!interview) notFound();

  if (interview.analysis_status !== "completed") {
    return <ProcessingState interview={interview} />;
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("interview_id", interview.id)
    .single<AnalysisRow>();
  const { data: transcript } = await supabase
    .from("transcripts")
    .select("*")
    .eq("interview_id", interview.id)
    .single<TranscriptRow>();

  if (!analysis || !transcript) notFound();

  const hire = hireBadge(analysis.hire_recommendation);
  const strengths = (analysis.strengths ?? []) as StrengthItem[];
  const weaknesses = (analysis.weaknesses ?? []) as WeaknessItem[];

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{interview.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{interview.role_interviewed_for}</Badge>
            {interview.company_name && <Badge variant="outline">{interview.company_name}</Badge>}
            <Badge variant="outline">{labelForType(interview.interview_type)}</Badge>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(interview.duration_seconds ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(interview.created_at)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ReanalyzeButton id={interview.id} />
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Score cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <ScoreCard label="Communication" value={analysis.overall_communication_score} />
        <ScoreCard label="Content" value={analysis.overall_content_score} />
        <ScoreCard label="Confidence" value={analysis.overall_confidence_score} />
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Hire likelihood
            </div>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-base font-semibold ${hire.className}`}
              >
                {hire.label}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verdict */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Verdict
          </div>
          <p className="mt-3 text-balance text-xl font-semibold leading-snug">
            {analysis.summary ?? "No summary available."}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <Stat label="Filler words" value={analysis.filler_word_count?.toString() ?? "—"} />
            <Stat label="Words / min" value={analysis.words_per_minute?.toString() ?? "—"} />
            <Stat label="Word count" value={transcript.word_count?.toString() ?? "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="strengths" className="mt-8">
        <TabsList>
          <TabsTrigger value="strengths">Strengths ({strengths.length})</TabsTrigger>
          <TabsTrigger value="weaknesses">Weaknesses ({weaknesses.length})</TabsTrigger>
          <TabsTrigger value="transcript">Annotated transcript</TabsTrigger>
          <TabsTrigger value="drills">Practice drills</TabsTrigger>
        </TabsList>

        <TabsContent value="strengths" className="space-y-4">
          {strengths.length === 0 && (
            <p className="text-sm text-muted-foreground">No strengths captured.</p>
          )}
          {strengths.map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-semibold text-success">
                  ✓ {s.observation}
                </div>
                <blockquote className="mt-3 border-l-2 border-success/40 pl-3 text-sm italic text-muted-foreground">
                  &ldquo;{s.quote}&rdquo;{" "}
                  <span className="not-italic text-xs">[{s.timestamp}]</span>
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="weaknesses" className="space-y-4">
          {weaknesses.length === 0 && (
            <p className="text-sm text-muted-foreground">No weaknesses captured.</p>
          )}
          {weaknesses.map((w, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-semibold text-warning">
                  ⚠ {w.observation}
                </div>
                <blockquote className="mt-3 border-l-2 border-warning/40 pl-3 text-sm italic text-muted-foreground">
                  &ldquo;{w.quote}&rdquo;{" "}
                  <span className="not-italic text-xs">[{w.timestamp}]</span>
                </blockquote>
                <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
                  <span className="font-semibold">✏ Fix:</span> {w.fix_suggestion}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="transcript-filler">filler</span> Filler word
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="transcript-weak">vague</span> Weak phrase
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="transcript-strong">strong</span> Strong moment
                </span>
              </div>
              <AnnotatedTranscript
                segments={transcript.segments}
                fullText={transcript.full_text}
                fillerBreakdown={analysis.filler_word_breakdown ?? {}}
                strengths={strengths}
                weaknesses={weaknesses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drills">
          <div className="grid gap-4 md:grid-cols-2">
            {(analysis.improvement_drills ?? []).map((drill, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Drill {i + 1}
                  </div>
                  <p className="mt-2 text-sm">{drill}</p>
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link href="/practice">Try it →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!analysis.improvement_drills || analysis.improvement_drills.length === 0) && (
              <p className="text-sm text-muted-foreground">No drills suggested.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-10 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/upload">+ Analyze another interview</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/api/interviews/${interview.id}/pdf`} target="_blank">
            <FileText className="h-4 w-4" /> Download PDF
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-2 text-3xl font-bold ${scoreColor(value)}`}>
          {value != null ? `${value}/10` : "—"}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ProcessingState({ interview }: { interview: InterviewRow }) {
  if (interview.analysis_status === "failed") {
    return (
      <div className="container max-w-xl py-20 text-center">
        <h1 className="text-2xl font-bold">Analysis failed</h1>
        <p className="mt-2 text-muted-foreground">
          {interview.error_message ?? "Something went wrong. Try re-analyzing or contact support."}
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="container max-w-xl py-20 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
      <h1 className="mt-6 text-2xl font-bold">Working on your report…</h1>
      <p className="mt-2 text-muted-foreground">
        {interview.transcription_status === "completed"
          ? "Claude is analyzing your transcript."
          : "Transcribing your audio."}{" "}
        Refresh in a minute or check back from the dashboard.
      </p>
    </div>
  );
}

function labelForType(t: string) {
  switch (t) {
    case "behavioral":
      return "Behavioral";
    case "technical":
      return "Technical";
    case "system_design":
      return "System Design";
    case "hr":
      return "HR";
    default:
      return "Other";
  }
}
