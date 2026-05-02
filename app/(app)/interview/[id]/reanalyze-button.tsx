"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReanalyzeButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function rerun() {
    if (!confirm("Re-run analysis on this transcript?")) return;
    setLoading(true);
    await fetch(`/api/interviews/${id}/reanalyze`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={rerun} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Re-analyze
    </Button>
  );
}
