import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

const Body = z.object({ plan: z.enum(["pro", "sprint"]) });

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const isSprint = parsed.data.plan === "sprint";
  const priceId = isSprint ? STRIPE_PRICE_IDS.sprint : STRIPE_PRICE_IDS.pro_monthly;
  if (!priceId) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: isSprint ? "payment" : "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: isSprint
      ? undefined
      : { trial_period_days: 7, metadata: { user_id: user.id, plan: "pro" } },
    metadata: { user_id: user.id, plan: parsed.data.plan },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
