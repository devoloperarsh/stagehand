import { createClient } from "@deepgram/sdk";
import type { TranscriptSegment } from "./types";

let _client: ReturnType<typeof createClient> | null = null;
function getDeepgram() {
  if (_client) return _client;
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY not configured");
  _client = createClient(key);
  return _client;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptSegment[];
  durationSeconds: number;
  wordCount: number;
}

export async function transcribeFromUrl(fileUrl: string): Promise<TranscriptionResult> {
  const { result, error } = await getDeepgram().listen.prerecorded.transcribeUrl(
    { url: fileUrl },
    {
      model: "nova-2",
      smart_format: true,
      diarize: true,
      utterances: true,
      punctuate: true,
      detect_language: true,
    },
  );

  if (error) throw error;
  if (!result) throw new Error("No result from Deepgram");

  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];
  const utterances = result.results.utterances ?? [];

  const segments: TranscriptSegment[] = utterances.map((u) => ({
    speaker: u.speaker ?? 0,
    text: u.transcript,
    start_time: u.start,
    end_time: u.end,
  }));

  const fullText = alternative.transcript;
  const durationSeconds = Math.round(result.metadata.duration);
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return { fullText, segments, durationSeconds, wordCount };
}
