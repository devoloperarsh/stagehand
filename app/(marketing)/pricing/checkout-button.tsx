"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  plan: "pro" | "sprint";
  india: boolean;
  label: string;
  highlight: boolean;
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function CheckoutButton({ plan, india, label, highlight }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    setLoading(true);
    try {
      if (india) {
        const res = await fetch("/api/billing/razorpay/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (res.status === 401) return router.push(`/login?next=/pricing`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout failed");

        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          ...(plan === "sprint"
            ? { order_id: data.order_id, amount: data.amount, currency: "INR" }
            : { subscription_id: data.subscription_id }),
          name: "Stagehand",
          description: plan === "pro" ? "Pro monthly" : "Sprint pack",
          handler: () => router.push("/dashboard?upgraded=1"),
          prefill: { email: data.email },
          theme: { color: "#0a0a0a" },
        });
        rzp.open();
      } else {
        const res = await fetch("/api/billing/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        if (res.status === 401) return router.push(`/login?next=/pricing`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout failed");
        window.location.href = data.url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {india && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      <Button
        className="w-full"
        variant={highlight ? "default" : "outline"}
        onClick={start}
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </>
  );
}
