import Razorpay from "razorpay";
import crypto from "node:crypto";

let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (_client) return _client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials not configured");
  }
  _client = new Razorpay({ key_id, key_secret });
  return _client;
}

export const RAZORPAY_PLANS = {
  pro_monthly: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID ?? "",
  sprint_amount_inr: Number(process.env.RAZORPAY_SPRINT_AMOUNT_INR ?? 99900),
} as const;

export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyRazorpayPaymentSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  if (expected.length !== args.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(args.signature));
}
