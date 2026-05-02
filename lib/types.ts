export type SubscriptionTier = "free" | "pro" | "sprint";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";
export type InterviewType = "behavioral" | "technical" | "system_design" | "hr" | "other";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type HireRecommendation = "strong_yes" | "yes" | "maybe" | "no";
export type QuestionCategory = "behavioral" | "technical" | "system_design" | "hr";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type BillingProvider = "stripe" | "razorpay";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  free_analyses_used: number;
  sprint_analyses_remaining: number;
  sprint_expires_at: string | null;
  stripe_customer_id: string | null;
  razorpay_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewRow {
  id: string;
  user_id: string;
  title: string;
  role_interviewed_for: string;
  company_name: string | null;
  interview_type: InterviewType;
  file_url: string;
  file_size_mb: number | null;
  duration_seconds: number | null;
  transcription_status: JobStatus;
  analysis_status: JobStatus;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TranscriptSegment {
  speaker: number | string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptRow {
  id: string;
  interview_id: string;
  full_text: string;
  segments: TranscriptSegment[];
  word_count: number | null;
  created_at: string;
}

export interface StrengthItem {
  observation: string;
  timestamp: string;
  quote: string;
}

export interface WeaknessItem {
  observation: string;
  timestamp: string;
  quote: string;
  fix_suggestion: string;
}

export interface AnalysisRow {
  id: string;
  interview_id: string;
  overall_communication_score: number | null;
  overall_content_score: number | null;
  overall_confidence_score: number | null;
  hire_recommendation: HireRecommendation | null;
  filler_word_count: number | null;
  filler_word_breakdown: Record<string, number>;
  words_per_minute: number | null;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  improvement_drills: string[];
  summary: string | null;
  full_feedback_md: string | null;
  created_at: string;
}

export interface PracticeQuestion {
  id: string;
  question_text: string;
  category: QuestionCategory;
  role_tags: string[];
  ideal_answer_structure: string | null;
  difficulty: QuestionDifficulty;
}

export interface PracticeSessionRow {
  id: string;
  user_id: string;
  question_id: string;
  audio_url: string | null;
  transcript: string | null;
  feedback: { strengths?: string[]; weaknesses?: string[]; suggestion?: string } | null;
  score: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface AnalysisJSON {
  communication_score: number;
  content_score: number;
  confidence_score: number;
  hire_recommendation: HireRecommendation;
  filler_word_count: number;
  filler_word_breakdown: Record<string, number>;
  words_per_minute: number;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  improvement_drills: string[];
  summary: string;
}
