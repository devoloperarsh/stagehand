import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLANS, isIndianUser } from "@/lib/billing";
import { CheckoutButton } from "./checkout-button";
import { createClient } from "@/lib/supabase/server";

const FAQ = [
  {
    q: "Do you charge in INR or USD?",
    a: "Indian users are charged in INR via Razorpay. International users in USD via Stripe. We auto-detect from your IP.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click from Settings. Your access continues until the end of the billing period.",
  },
  {
    q: "How does the 7-day Pro trial work?",
    a: "You'll be asked for payment details, but you won't be charged for 7 days. Cancel before then and you pay $0.",
  },
  {
    q: "What's the refund policy?",
    a: "7-day money-back guarantee on every plan. Email hello@stagehand.app and we'll refund, no questions asked.",
  },
];

export default async function PricingPage() {
  // Country detection: Vercel sets x-vercel-ip-country. Fallback = "US".
  const country = headers().get("x-vercel-ip-country") ?? "US";
  const india = isIndianUser(country);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <section className="container py-20 text-center">
        {user && (
          <div className="mb-6 flex justify-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" /> Back to dashboard
              </Link>
            </Button>
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Simple pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Land your dream job. Free to try, cancel anytime.
        </p>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.highlight ? "relative border-primary shadow-xl ring-2 ring-primary" : ""
              }
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most popular</Badge>
                </div>
              )}
              <CardContent className="p-8 text-left">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    {india ? plan.price.inr : plan.price.usd}
                  </span>
                  <span className="text-muted-foreground">/ {plan.cadence}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {plan.id === "free" ? (
                    user ? (
                      <Button asChild className="w-full" variant="outline" disabled>
                        <span>Current plan</span>
                      </Button>
                    ) : (
                      <Button asChild className="w-full" variant="outline">
                        <Link href="/signup">{plan.cta}</Link>
                      </Button>
                    )
                  ) : (
                    <CheckoutButton
                      plan={plan.id}
                      india={india}
                      label={plan.cta}
                      highlight={plan.highlight ?? false}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          7-day refund guarantee. No retention dark patterns.
        </div>
      </section>

      <section className="container max-w-2xl pb-20">
        <h2 className="text-2xl font-bold">Billing FAQ</h2>
        <Accordion type="single" collapsible className="mt-4">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
