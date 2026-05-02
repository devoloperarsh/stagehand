import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : ""}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;
      if (!userId) break;

      if (plan === "sprint") {
        await admin
          .from("users")
          .update({
            subscription_tier: "sprint",
            subscription_status: "active",
            sprint_analyses_remaining: 5,
            sprint_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", userId);

        await admin.from("subscriptions").insert({
          user_id: userId,
          tier: "sprint",
          provider: "stripe",
          provider_subscription_id: session.id,
          provider_customer_id: typeof session.customer === "string" ? session.customer : null,
          raw: session as unknown as Record<string, unknown>,
        });
      } else if (plan === "pro" && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        await admin
          .from("users")
          .update({
            subscription_tier: "pro",
            subscription_status: sub.status === "trialing" ? "trial" : "active",
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          })
          .eq("id", userId);

        await admin.from("subscriptions").insert({
          user_id: userId,
          tier: "pro",
          provider: "stripe",
          provider_subscription_id: sub.id,
          provider_customer_id: sub.customer as string,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          raw: sub as unknown as Record<string, unknown>,
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (!userId) break;
      const status =
        sub.status === "active" || sub.status === "trialing"
          ? sub.status === "trialing"
            ? "trial"
            : "active"
          : sub.status === "canceled"
            ? "cancelled"
            : "expired";
      await admin
        .from("users")
        .update({
          subscription_status: status,
          subscription_tier: status === "expired" || status === "cancelled" ? "free" : "pro",
        })
        .eq("id", userId);
      await admin
        .from("subscriptions")
        .update({
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          raw: sub as unknown as Record<string, unknown>,
        })
        .eq("provider_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const userId = invoice.subscription_details?.metadata?.user_id;
      if (userId) {
        await admin.from("users").update({ subscription_status: "expired" }).eq("id", userId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
