import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, RAZORPAY_PLANS } from "@/lib/razorpay";

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
    .select("email, razorpay_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const razorpay = getRazorpay();

  if (parsed.data.plan === "sprint") {
    const order = await razorpay.orders.create({
      amount: RAZORPAY_PLANS.sprint_amount_inr,
      currency: "INR",
      receipt: `sprint_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, plan: "sprint" },
    });
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      email: profile.email,
    });
  }

  if (!RAZORPAY_PLANS.pro_monthly) {
    return NextResponse.json({ error: "Razorpay plan not configured" }, { status: 500 });
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: RAZORPAY_PLANS.pro_monthly,
    customer_notify: 1,
    total_count: 12,
    notes: { user_id: user.id, plan: "pro" },
  });

  return NextResponse.json({
    subscription_id: subscription.id,
    email: profile.email,
  });
}
