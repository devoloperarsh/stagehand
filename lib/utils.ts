import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-warning";
  return "text-destructive";
}

export function hireBadge(rec: string | null | undefined): {
  label: string;
  className: string;
} {
  switch (rec) {
    case "strong_yes":
      return { label: "Strong Yes", className: "bg-success/15 text-success border-success/30" };
    case "yes":
      return { label: "Yes", className: "bg-success/10 text-success border-success/20" };
    case "maybe":
      return { label: "Maybe", className: "bg-warning/15 text-warning border-warning/30" };
    case "no":
      return { label: "No", className: "bg-destructive/15 text-destructive border-destructive/30" };
    default:
      return { label: "Pending", className: "bg-muted text-muted-foreground border-border" };
  }
}
