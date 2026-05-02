import Link from "next/link";
import {
  Upload,
  Sparkles,
  TrendingUp,
  Check,
  Star,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLANS } from "@/lib/billing";

const FAQ = [
  {
    q: "Is my interview data private?",
    a: "Yes. Recordings are encrypted at rest, deleted after 90 days, and never shared with third parties or used to train models.",
  },
  {
    q: "What file formats work?",
    a: "MP3, M4A, WAV, MP4, MOV — up to 90 minutes or 500 MB. You can also paste a Zoom Cloud, Loom, or Drive link.",
  },
  {
    q: "Does it record live interviews?",
    a: "No. You upload your recording after the interview. Stagehand is a coaching tool, not a real-time assistant.",
  },
  {
    q: "Will the company know I used this?",
    a: "No. Everything is private to you. We never contact employers.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click from your dashboard. No questions asked, no retention dark patterns.",
  },
  {
    q: "What if the AI feedback is wrong?",
    a: "You can flag any insight. Most users report 95%+ accuracy on filler words, structure, and content gaps.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="container flex flex-col items-center justify-center py-20 text-center md:py-32">
        <Badge variant="secondary" className="mb-6">
          AI-powered interview coaching
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
          Stop guessing why you didn&apos;t get the job.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          Upload your interview recording. Get brutally honest AI feedback in 60 seconds. Land the
          next one.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">Try free — no credit card</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#how">See how it works</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          ✓ Free analysis on signup &nbsp; ✓ Cancel anytime
        </p>

        {/* Hero mockup */}
        <div className="relative mt-16 w-full max-w-4xl">
          <div className="rounded-3xl border bg-card p-2 shadow-2xl">
            <div className="rounded-2xl bg-gradient-to-br from-secondary to-background p-8">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Communication", value: "7.2", color: "text-warning" },
                  { label: "Content", value: "6.8", color: "text-warning" },
                  { label: "Confidence", value: "8.1", color: "text-success" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border bg-background p-4 text-left">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </div>
                    <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}/10</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border bg-background p-4 text-left">
                <div className="text-sm font-semibold">Verdict</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  You communicated well but missed key technical depth on system design questions.
                  Drop &ldquo;basically&rdquo; (used 14×) and quantify outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Upload,
              title: "Upload",
              body: "Drop in any interview recording — Zoom, Meet, Teams, or audio file.",
            },
            {
              icon: Sparkles,
              title: "Analyze",
              body: "AI breaks down your speech, structure, and content in 60 seconds.",
            },
            {
              icon: TrendingUp,
              title: "Improve",
              body: "Get specific drills and tips for your next interview.",
            },
          ].map((step, i) => (
            <Card key={step.title}>
              <CardContent className="p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mb-2 text-sm font-medium text-muted-foreground">Step {i + 1}</div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHAT YOU LEARN */}
      <section className="bg-secondary/40 py-20">
        <div className="container grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              What you&apos;ll learn about yourself
            </h2>
            <ul className="mt-6 space-y-3 text-base">
              {[
                "Exact filler word count and where they happened",
                "Whether your STAR answers actually had a Result",
                "Speech pace and confidence indicators",
                "Specific phrases to drop and stronger alternatives",
                "Hire-recommendation likelihood score",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Annotated transcript
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed">
                <p>
                  <span className="text-muted-foreground">[02:14]</span> So{" "}
                  <span className="transcript-filler">um</span>, when I joined the team, we were{" "}
                  <span className="transcript-weak">basically</span> shipping bugs every week. I,{" "}
                  <span className="transcript-filler">like</span>, set up a code review process and{" "}
                  <span className="transcript-strong">cut production incidents by 64% in 8 weeks</span>.
                </p>
                <p>
                  <span className="text-muted-foreground">[03:01]</span> The team was{" "}
                  <span className="transcript-weak">kind of</span> resistant at first but{" "}
                  <span className="transcript-strong">I ran a workshop and got 7 of 9 engineers bought in</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="container py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          Job seekers love it
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Join 500+ early users sharpening their interviews.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              quote:
                "Landed Amazon SDE-2 after 3 weeks of practice with Stagehand. The filler-word audit alone was worth it.",
              name: "Priya R.",
              role: "Software Engineer, Amazon",
            },
            {
              quote:
                "I thought I was a great interviewer. Stagehand showed me I rambled for 6 minutes on a 90-second question. Game changer.",
              name: "Marcus T.",
              role: "Product Manager, Stripe",
            },
            {
              quote:
                "The annotated transcripts are gold. I can see exactly where I lost the interviewer and what to say instead.",
              name: "Hana K.",
              role: "Designer, Figma",
            },
          ].map((t) => (
            <Card key={t.name}>
              <CardContent className="p-6">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <div className="mt-4">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-secondary/40 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Start free. Upgrade when you&apos;re ready.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.highlight
                    ? "relative border-primary shadow-xl ring-2 ring-primary"
                    : ""
                }
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most popular</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price.inr}</span>
                    <span className="text-muted-foreground">/ {plan.cadence}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.price.usd} for international users
                  </p>
                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-8 w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link href={plan.id === "free" ? "/signup" : `/pricing?plan=${plan.id}`}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            7-day refund, no questions asked.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          Frequently asked
        </h2>
        <div className="mx-auto mt-10 max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link href="/signup">Try Stagehand free</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
