import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, TrendingDown, Mic, FileAudio } from "lucide-react";
import { ScoreTrendChart } from "./score-trend-chart";
import { InterviewsTable } from "./interviews-table";
import { userCanAnalyze } from "@/lib/billing";
import type { UserRow, InterviewRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<UserRow>();

  const { data: interviews } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: analyses } = await supabase
    .from("analyses")
    .select("interview_id, overall_communication_score, overall_content_score, overall_confidence_score, filler_word_count, created_at")
    .in(
      "interview_id",
      (interviews ?? []).map((i) => i.id),
    );

  const completed = (interviews ?? []).filter((i) => i.analysis_status === "completed");
  const totalAnalyses = completed.length;
  const avgScore =
    analyses && analyses.length
      ? (
          analyses.reduce(
            (sum, a) =>
              sum +
              ((a.overall_communication_score ?? 0) +
                (a.overall_content_score ?? 0) +
                (a.overall_confidence_score ?? 0)) /
                3,
            0,
          ) / analyses.length
        ).toFixed(1)
      : "—";

  const fillerTrend = computeFillerTrend(analyses ?? []);

  const { count: practiceCount } = await supabase
    .from("practice_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const can = profile ? userCanAnalyze(profile) : { allowed: false, reason: "Not loaded" };

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Interviews analyzed" value={totalAnalyses.toString()} icon={FileAudio} />
        <Stat label="Average score" value={`${avgScore}/10`} icon={TrendingDown} />
        <Stat
          label="Filler word trend"
          value={fillerTrend.label}
          tone={fillerTrend.tone}
          icon={TrendingDown}
        />
        <Stat label="Practice sessions" value={(practiceCount ?? 0).toString()} icon={Mic} />
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <h2 className="text-xl font-semibold">Ready for the next one?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Upload an interview recording and get brutally honest AI feedback in 60 seconds.
          </p>
          {can.allowed ? (
            <Button asChild size="lg" className="mt-2">
              <Link href="/upload">
                <Plus className="h-4 w-4" /> Analyze new interview
              </Link>
            </Button>
          ) : (
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-sm text-warning">{can.reason}</p>
              <Button asChild size="lg">
                <Link href="/pricing">Upgrade to analyze more</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Recent interviews</h2>
        <div className="mt-4">
          <InterviewsTable
            interviews={(interviews as InterviewRow[]) ?? []}
            analyses={analyses ?? []}
          />
        </div>
      </section>

      {analyses && analyses.length >= 2 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your scores over time</h2>
          <Card className="mt-4">
            <CardContent className="p-6">
              <ScoreTrendChart data={analyses} />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function computeFillerTrend(
  analyses: { filler_word_count: number | null; created_at: string }[],
): { label: string; tone: "good" | "bad" | "neutral" } {
  if (analyses.length < 2) return { label: "—", tone: "neutral" };
  const sorted = [...analyses].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const half = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, half);
  const last = sorted.slice(half);
  const avg = (xs: typeof analyses) =>
    xs.reduce((s, x) => s + (x.filler_word_count ?? 0), 0) / Math.max(xs.length, 1);
  const a = avg(first);
  const b = avg(last);
  if (a === 0) return { label: "—", tone: "neutral" };
  const pct = Math.round(((b - a) / a) * 100);
  if (pct < 0) return { label: `↓ ${Math.abs(pct)}%`, tone: "good" };
  if (pct > 0) return { label: `↑ ${pct}%`, tone: "bad" };
  return { label: "Stable", tone: "neutral" };
}
