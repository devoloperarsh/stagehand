"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionTier } from "@/lib/types";

interface Props {
  email: string;
  fullName: string | null;
  tier: SubscriptionTier;
}

export function AppNav({ email, fullName, tier }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/practice", label: "Practice" },
    { href: "/settings", label: "Settings" },
  ];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  pathname?.startsWith(link.href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={tier === "pro" ? "success" : tier === "sprint" ? "warning" : "outline"}>
            {tier === "pro" ? "Pro" : tier === "sprint" ? "Sprint" : "Free"}
          </Badge>
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
              aria-label="User menu"
            >
              {(fullName?.[0] ?? email[0] ?? "U").toUpperCase()}
            </button>
            {open && (
              <div className="absolute right-0 top-11 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
                <div className="px-3 py-2 text-xs text-muted-foreground">{email}</div>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  Settings
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  Billing
                </Link>
                <button
                  onClick={signOut}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <Button asChild className="hidden sm:inline-flex" size="sm">
            <Link href="/upload">+ New analysis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
