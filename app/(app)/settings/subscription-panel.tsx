"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRow } from "@/lib/types";

export function SubscriptionPanel({ profile }: { profile: UserRow }) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/billing/stripe/portal", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Could not open portal");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Current plan</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold capitalize">{profile.subscription_tier}</span>
            <Badge
              variant={
                profile.subscription_status === "active"
                  ? "success"
                  : profile.subscription_status === "trial"
                    ? "warning"
                    : "outline"
              }
            >
              {profile.subscription_status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          {profile.subscription_tier === "free" && (
            <Button asChild>
              <Link href="/pricing">Upgrade</Link>
            </Button>
          )}
          {profile.subscription_tier === "pro" && (
            <Button variant="outline" onClick={openPortal} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Manage in Stripe Portal
            </Button>
          )}
          {profile.subscription_tier === "sprint" && (
            <Button asChild variant="outline">
              <Link href="/pricing">Buy another sprint</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {profile.trial_ends_at && (
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Trial ends
            </div>
            <div className="mt-1">{new Date(profile.trial_ends_at).toLocaleDateString()}</div>
          </div>
        )}
        {profile.subscription_tier === "sprint" && (
          <>
            <div className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Analyses left
              </div>
              <div className="mt-1">{profile.sprint_analyses_remaining}</div>
            </div>
            {profile.sprint_expires_at && (
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sprint expires
                </div>
                <div className="mt-1">
                  {new Date(profile.sprint_expires_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </>
        )}
        {profile.subscription_tier === "free" && (
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Free analyses used
            </div>
            <div className="mt-1">{profile.free_analyses_used} / 1</div>
          </div>
        )}
      </div>
    </div>
  );
}
