"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "behavioral", label: "Behavioral" },
  { id: "technical", label: "Technical" },
  { id: "system_design", label: "System Design" },
  { id: "hr", label: "HR" },
];

const DIFFICULTIES = [
  { id: "", label: "Any" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export function PracticeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  const cat = search.get("category") ?? "";
  const diff = search.get("difficulty") ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Type
        </span>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setParam("category", c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Difficulty
        </span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            onClick={() => setParam("difficulty", d.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              diff === d.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
