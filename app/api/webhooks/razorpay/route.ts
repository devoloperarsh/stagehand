import { NextResponse } from "next/server";
import { verifyRazorpayWebhook } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PaymentEntity {
  id: string;
  status: string;
  amount: number;
  notes?: { user_id?: string; plan?: string };
  customer_id?: string;
  order_id?: string;
}

interface SubscriptionEntity {
  id: string;
  status: string;
  customer_id?: string;
  current_end?: number;
  charge_at?: number;
  notes?: { user_id?: string; plan?: string };
}

export async function POST(req: Request) {
  const sig = req.headers.get("x-razorpay-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  if (!verifyRazorpayWebhook(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as { event: string; payload: Record<string, { entity: unknown }> };
  const admin = createAdminClient();

  switch (event.event) {
    case "payment.captured": {
      const payment = event.payload.payment.entity as PaymentEntity;
      const userId = payment.notes?.user_id;
      const plan = payment.notes?.plan;
      if (userId && plan === "sprint") {
        await admin
          .from("users")
          .update({
            subscription_tier: "sprint",
            subscription_status: "active",
            sprint_analyses_remaining: 5,
            sprint_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            razorpay_customer_id: payment.customer_id ?? null,
          })
          .eq("id", userId);

        await admin.from("subscriptions").insert({
          user_id: userId,
          tier: "sprint",
          provider: "razorpay",
          provider_subscription_id: payment.id,
          provider_customer_id: payment.customer_id ?? null,
          raw: payment as unknown as Record<string, unknown>,
        });
      }
      break;
    }

    case "subscription.activated":
    case "subscription.charged": {
      const sub = event.payload.subscription.entity as SubscriptionEntity;
      const userId = sub.notes?.user_id;
      if (!userId) break;
      await admin
        .from("users")
        .update({
          subscription_tier: "pro",
          subscription_status: "active",
          razorpay_customer_id: sub.customer_id ?? null,
        })
        .eq("id", userId);
      await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            tier: "pro",
            provider: "razorpay",
            provider_subscription_id: sub.id,
            provider_customer_id: sub.customer_id ?? null,
            current_period_end: sub.current_end
              ? new Date(sub.current_end * 1000).toISOString()
              : null,
            raw: sub as unknown as Record<string, unknown>,
          },
          { onConflict: "provider,provider_subscription_id" },
        );
      break;
    }

    case "subscription.cancelled":
    case "subscription.completed": {
      const sub = event.payload.subscription.entity as SubscriptionEntity;
      const userId = sub.notes?.user_id;
      if (!userId) break;
      await admin
        .from("users")
        .update({ subscription_tier: "free", subscription_status: "cancelled" })
        .eq("id", userId);
      await admin
        .from("subscriptions")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("provider_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
