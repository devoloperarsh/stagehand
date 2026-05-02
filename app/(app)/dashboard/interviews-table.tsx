"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatDate, scoreColor } from "@/lib/utils";
import type { InterviewRow } from "@/lib/types";
import { useState } from "react";

interface AnalysisLite {
  interview_id: string;
  overall_communication_score: number | null;
  overall_content_score: number | null;
  overall_confidence_score: number | null;
}

export function InterviewsTable({
  interviews,
  analyses,
}: {
  interviews: InterviewRow[];
  analyses: AnalysisLite[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!interviews.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <p className="text-base font-medium">Your first analysis will appear here.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an interview to get started.
        </p>
        <Button asChild className="mt-4">
          <Link href="/upload">+ Analyze interview</Link>
        </Button>
      </div>
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this interview and its analysis? This cannot be undone.")) return;
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("interviews").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((iv) => {
            const a = analyses.find((x) => x.interview_id === iv.id);
            const avg = a
              ? (((a.overall_communication_score ?? 0) +
                  (a.overall_content_score ?? 0) +
                  (a.overall_confidence_score ?? 0)) /
                  3).toFixed(1)
              : null;
            return (
              <tr key={iv.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {iv.analysis_status === "completed" ? (
                    <Link href={`/interview/${iv.id}`} className="hover:underline">
                      {iv.title}
                    </Link>
                  ) : (
                    iv.title
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {iv.role_interviewed_for}
                  {iv.company_name ? ` · ${iv.company_name}` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(iv.created_at)}</td>
                <td className={`px-4 py-3 font-semibold ${scoreColor(avg ? Number(avg) : null)}`}>
                  {avg ? `${avg}/10` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={iv.analysis_status} txStatus={iv.transcription_status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {iv.analysis_status === "completed" && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/interview/${iv.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(iv.id)}
                      disabled={deletingId === iv.id}
                    >
                      {deletingId === iv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, txStatus }: { status: string; txStatus: string }) {
  if (status === "completed") return <Badge variant="success">Completed</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "processing" || txStatus === "processing") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  }
  return <Badge variant="outline">Pending</Badge>;
}
