"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteAll() {
    const confirmText = prompt(
      'Type "delete my account" to permanently remove all your data:',
    );
    if (confirmText !== "delete my account") return;
    setLoading(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not delete account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="destructive" onClick={deleteAll} disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Delete my account
    </Button>
  );
}
