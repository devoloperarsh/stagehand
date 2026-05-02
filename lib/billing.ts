import type { UserRow } from "./types";

export interface PlanCopy {
  id: "free" | "pro" | "sprint";
  name: string;
  price: { inr: string; usd: string };
  cadence: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export const PLANS: PlanCopy[] = [
  {
    id: "free",
    name: "Free",
    price: { inr: "₹0", usd: "$0" },
    cadence: "forever",
    features: [
      "1 interview analysis",
      "Filler word breakdown",
      "Basic strengths & weaknesses",
      "Read-only practice library",
    ],
    cta: "Sign up free",
  },
  {
    id: "pro",
    name: "Pro",
    price: { inr: "₹399", usd: "$19" },
    cadence: "per month",
    features: [
      "Unlimited interview analyses",
      "Full annotated transcripts",
      "Practice mode with AI grading",
      "Progress tracking & trends",
      "PDF reports",
      "7-day free trial",
    ],
    cta: "Start 7-day trial",
    highlight: true,
  },
  {
    id: "sprint",
    name: "Sprint",
    price: { inr: "₹999", usd: "$49" },
    cadence: "one-time",
    features: [
      "5 interview analyses",
      "25 practice questions",
      "60-day access",
      "Perfect for an active job hunt",
    ],
    cta: "Get Sprint",
  },
];

export function userCanAnalyze(user: UserRow): { allowed: boolean; reason?: string } {
  if (user.subscription_tier === "pro" && user.subscription_status !== "expired") {
    return { allowed: true };
  }
  if (
    user.subscription_tier === "sprint" &&
    user.sprint_analyses_remaining > 0 &&
    (!user.sprint_expires_at || new Date(user.sprint_expires_at) > new Date())
  ) {
    return { allowed: true };
  }
  if (user.subscription_tier === "free" && user.free_analyses_used < 1) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason:
      user.subscription_tier === "free"
        ? "You've used your free analysis. Upgrade to Pro for unlimited."
        : "Your plan has no analyses remaining.",
  };
}

export function isIndianUser(country?: string | null): boolean {
  return (country ?? "").toUpperCase() === "IN";
}
