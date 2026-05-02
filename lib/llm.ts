import type { AnalysisJSON, InterviewType, TranscriptSegment } from "./types";

// OpenRouter — OpenAI-compatible API.
// We pick free models that are reliable for structured JSON output.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free, high-quality model with good JSON adherence. Fall back to a second
// free model on rate limit / unavailability.
const ANALYSIS_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

const PRACTICE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemini-2.0-flash-exp:free",
];

const SYSTEM_PROMPT = `You are an expert interview coach analyzing a real job interview transcript.
Be brutally honest but constructive. Score rigorously: most candidates land between 5 and 7.
Always cite specific quotes from the transcript with timestamps so the candidate can verify.
Return ONLY valid JSON in the exact schema requested. No prose outside the JSON. Do not wrap in markdown fences.`;

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

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(args: {
  models: string[];
  messages: ChatMessage[];
  maxTokens: number;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  let lastError: unknown = null;
  for (const model of args.models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "Stagehand",
        },
        body: JSON.stringify({
          model,
          messages: args.messages,
          max_tokens: args.maxTokens,
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`OpenRouter ${model} ${res.status}: ${body.slice(0, 300)}`);
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (data.error) {
        lastError = new Error(`OpenRouter ${model}: ${data.error.message}`);
        continue;
      }
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) {
        lastError = new Error(`OpenRouter ${model}: empty response`);
        continue;
      }
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("OpenRouter: all models failed");
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
  "filler_word_breakdown": { "um": integer, "uh": integer, "like": integer },
  "words_per_minute": integer,
  "strengths": [ { "observation": "...", "timestamp": "MM:SS", "quote": "..." } ],
  "weaknesses": [ { "observation": "...", "timestamp": "MM:SS", "quote": "...", "fix_suggestion": "..." } ],
  "improvement_drills": [ "...", "...", "..." ],
  "summary": "One-paragraph honest assessment."
}`;

  const text = await callOpenRouter({
    models: ANALYSIS_MODELS,
    maxTokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

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
  answer: string;
  durationSeconds: number;
  isText?: boolean;
}): Promise<PracticeFeedback> {
  const prompt = `You are grading a practice interview answer.

Question: ${args.question}
Ideal answer structure: ${args.idealAnswerStructure ?? "Use your best judgement."}
Mode: ${args.isText ? "typed answer" : "spoken answer"}
Duration: ${args.durationSeconds} seconds.

Candidate ${args.isText ? "answer" : "transcript"}:
"""
${args.answer}
"""

Return ONLY valid JSON:
{
  "score": 0-10 integer,
  "strengths": [ "short bullet" ],
  "weaknesses": [ "short bullet" ],
  "suggestion": "One concrete next-iteration improvement."
}`;

  const text = await callOpenRouter({
    models: PRACTICE_MODELS,
    maxTokens: 1024,
    messages: [
      {
        role: "system",
        content:
          "You are a strict, helpful interview coach. Return ONLY valid JSON. No prose, no fences.",
      },
      { role: "user", content: prompt },
    ],
  });

  return parseJsonResponse<PracticeFeedback>(text);
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("LLM response did not contain JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
