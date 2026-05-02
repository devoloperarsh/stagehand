import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisJSON, InterviewType, TranscriptSegment } from "./types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  _client = new Anthropic({ apiKey });
  return _client;
}

const ANALYSIS_MODEL = "claude-sonnet-4-6";
const PRACTICE_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an expert interview coach analyzing a real job interview transcript.
Be brutally honest but constructive. Score rigorously: most candidates land between 5 and 7.
Always cite specific quotes from the transcript with timestamps so the candidate can verify.
Return ONLY valid JSON in the exact schema requested. No prose outside the JSON.`;

function segmentsToText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const t = formatTimestamp(s.start_time);
      return `[${t}] Speaker ${s.speaker}: ${s.text}`;
    })
    .join("\n");
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface AnalyzeInput {
  role: string;
  company?: string | null;
  interviewType: InterviewType;
  durationSeconds: number;
  segments: TranscriptSegment[];
  fullText: string;
}

export async function analyzeInterview(input: AnalyzeInput): Promise<AnalysisJSON> {
  const transcript = input.segments.length
    ? segmentsToText(input.segments)
    : input.fullText;

  const userPrompt = `Context:
- Role: ${input.role}
- Company: ${input.company ?? "Not specified"}
- Interview type: ${input.interviewType}
- Duration: ${input.durationSeconds} seconds

Transcript:
${transcript}

Analyze this interview rigorously. Return ONLY valid JSON in this exact schema:
{
  "communication_score": 0-10 integer,
  "content_score": 0-10 integer,
  "confidence_score": 0-10 integer,
  "hire_recommendation": "strong_yes" | "yes" | "maybe" | "no",
  "filler_word_count": integer,
  "filler_word_breakdown": { "um": integer, "uh": integer, "like": integer, ... },
  "words_per_minute": integer,
  "strengths": [ { "observation": "...", "timestamp": "MM:SS", "quote": "..." } ],
  "weaknesses": [ { "observation": "...", "timestamp": "MM:SS", "quote": "...", "fix_suggestion": "..." } ],
  "improvement_drills": [ "...", "...", "..." ],
  "summary": "One-paragraph honest assessment."
}`;

  const response = await getClient().messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");

  return parseJsonResponse<AnalysisJSON>(text);
}

export interface PracticeFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
}

export async function gradePracticeAnswer(args: {
  question: string;
  idealAnswerStructure: string | null;
  transcript: string;
  durationSeconds: number;
}): Promise<PracticeFeedback> {
  const prompt = `You are grading a practice interview answer.

Question: ${args.question}
Ideal answer structure: ${args.idealAnswerStructure ?? "Use your best judgement."}
Duration: ${args.durationSeconds} seconds.

Candidate transcript:
"""
${args.transcript}
"""

Return ONLY valid JSON:
{
  "score": 0-10 integer,
  "strengths": [ "short bullet", ... up to 3 ],
  "weaknesses": [ "short bullet", ... up to 3 ],
  "suggestion": "One concrete next-iteration improvement."
}`;

  const response = await getClient().messages.create({
    model: PRACTICE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");

  return parseJsonResponse<PracticeFeedback>(text);
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Claude response did not contain JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
