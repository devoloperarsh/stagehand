"use client";

import { useMemo } from "react";
import type { TranscriptSegment, StrengthItem, WeaknessItem } from "@/lib/types";

interface Props {
  segments: TranscriptSegment[];
  fullText: string;
  fillerBreakdown: Record<string, number>;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
}

const WEAK_PHRASES = [
  "basically",
  "kind of",
  "sort of",
  "actually",
  "honestly",
  "literally",
  "i mean",
  "you know",
];

export function AnnotatedTranscript({
  segments,
  fullText,
  fillerBreakdown,
  strengths,
  weaknesses,
}: Props) {
  const fillers = useMemo(
    () => Object.keys(fillerBreakdown ?? {}).map((w) => w.toLowerCase()),
    [fillerBreakdown],
  );

  const strongQuotes = useMemo(
    () => strengths.map((s) => s.quote.toLowerCase()).filter(Boolean),
    [strengths],
  );
  const weakQuotes = useMemo(
    () => weaknesses.map((w) => w.quote.toLowerCase()).filter(Boolean),
    [weaknesses],
  );

  if (!segments?.length) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {annotateText(fullText, fillers, strongQuotes, weakQuotes)}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {segments.map((seg, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-20 shrink-0 text-xs text-muted-foreground">
            [{formatTs(seg.start_time)}]
            <div className="mt-0.5">Speaker {seg.speaker}</div>
          </div>
          <div className="flex-1">{annotateText(seg.text, fillers, strongQuotes, weakQuotes)}</div>
        </div>
      ))}
    </div>
  );
}

function annotateText(
  text: string,
  fillers: string[],
  strongQuotes: string[],
  weakQuotes: string[],
): React.ReactNode {
  const lower = text.toLowerCase();

  // Strong/weak quote highlighting wins over filler highlighting.
  for (const q of strongQuotes) {
    const idx = lower.indexOf(q);
    if (idx !== -1) {
      return (
        <>
          {text.slice(0, idx)}
          <span className="transcript-strong">{text.slice(idx, idx + q.length)}</span>
          {annotateText(text.slice(idx + q.length), fillers, strongQuotes, weakQuotes)}
        </>
      );
    }
  }
  for (const q of weakQuotes) {
    const idx = lower.indexOf(q);
    if (idx !== -1) {
      return (
        <>
          {text.slice(0, idx)}
          <span className="transcript-weak">{text.slice(idx, idx + q.length)}</span>
          {annotateText(text.slice(idx + q.length), fillers, strongQuotes, weakQuotes)}
        </>
      );
    }
  }

  // Word-level filler/weak-phrase highlighting
  const tokens = text.split(/(\s+|[,.;!?])/);
  return tokens.map((tok, i) => {
    const word = tok.toLowerCase().replace(/[^a-z']/g, "");
    if (!word) return <span key={i}>{tok}</span>;
    if (fillers.includes(word)) {
      return (
        <span key={i} className="transcript-filler">
          {tok}
        </span>
      );
    }
    if (WEAK_PHRASES.some((p) => p === word)) {
      return (
        <span key={i} className="transcript-weak">
          {tok}
        </span>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
