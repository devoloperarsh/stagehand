import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisRow, InterviewRow, StrengthItem, WeaknessItem } from "@/lib/types";

// Lightweight HTML-to-print fallback. A future iteration can swap in
// Puppeteer / @react-pdf for true PDF generation; for now the browser's
// print-to-PDF on this page is sufficient.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", _req.url));

  const { data: interview } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", params.id)
    .single<InterviewRow>();
  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("interview_id", params.id)
    .single<AnalysisRow>();
  if (!interview || !analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const strengths = (analysis.strengths ?? []) as StrengthItem[];
  const weaknesses = (analysis.weaknesses ?? []) as WeaknessItem[];

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escape(interview.title)} — Stagehand report</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 24px; color: #0a0a0a; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
  .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
  .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
  .label { font-size: 11px; text-transform: uppercase; color: #737373; letter-spacing: 0.05em; }
  .score { font-size: 24px; font-weight: 700; margin-top: 8px; }
  h2 { font-size: 18px; margin-top: 32px; }
  .item { border-left: 3px solid #d4d4d4; padding: 8px 12px; margin: 12px 0; }
  .item.good { border-color: #22c55e; }
  .item.bad { border-color: #f59e0b; }
  blockquote { color: #666; font-style: italic; margin: 6px 0; }
  .ts { color: #999; font-size: 12px; }
  @media print { body { margin: 0; } }
</style></head>
<body onload="window.print()">
  <h1>${escape(interview.title)}</h1>
  <div class="meta">
    ${escape(interview.role_interviewed_for)}${interview.company_name ? " · " + escape(interview.company_name) : ""} · ${escape(interview.interview_type)}
  </div>
  <div class="scores">
    <div class="card"><div class="label">Communication</div><div class="score">${analysis.overall_communication_score ?? "—"}/10</div></div>
    <div class="card"><div class="label">Content</div><div class="score">${analysis.overall_content_score ?? "—"}/10</div></div>
    <div class="card"><div class="label">Confidence</div><div class="score">${analysis.overall_confidence_score ?? "—"}/10</div></div>
    <div class="card"><div class="label">Hire</div><div class="score">${escape(analysis.hire_recommendation ?? "—")}</div></div>
  </div>
  <h2>Verdict</h2>
  <p>${escape(analysis.summary ?? "")}</p>
  <h2>Strengths</h2>
  ${strengths
    .map(
      (s) => `<div class="item good"><strong>✓ ${escape(s.observation)}</strong>
    <blockquote>“${escape(s.quote)}” <span class="ts">[${escape(s.timestamp)}]</span></blockquote></div>`,
    )
    .join("")}
  <h2>Weaknesses</h2>
  ${weaknesses
    .map(
      (w) => `<div class="item bad"><strong>⚠ ${escape(w.observation)}</strong>
    <blockquote>“${escape(w.quote)}” <span class="ts">[${escape(w.timestamp)}]</span></blockquote>
    <div><strong>Fix:</strong> ${escape(w.fix_suggestion)}</div></div>`,
    )
    .join("")}
  <h2>Practice drills</h2>
  <ul>${(analysis.improvement_drills ?? []).map((d) => `<li>${escape(d)}</li>`).join("")}</ul>
</body></html>`;

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
