import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="2" y="6" width="24" height="16" rx="3" fill="currentColor" />
        <path d="M9 14h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 6V4M14 24v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-bold tracking-tight">Stagehand</span>
    </Link>
  );
}
