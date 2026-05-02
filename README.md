# Stagehand

> Stop guessing why you didn't get the job. Upload your interview recording. Get brutally honest AI feedback in 60 seconds.

V1 architecture scaffold. Built with Next.js 14 (App Router), Supabase, Anthropic Claude, Deepgram, Stripe, and Razorpay.

## Architecture

```
User browser ── Next.js (Vercel)
                  │
        ┌─────────┼──────────────┐
        ▼         ▼              ▼
   Supabase   Deepgram       Anthropic
  (DB, Auth,  (transcript)   (analysis)
   Storage)
        │
        ▼
  Stripe + Razorpay (billing)
```

Pipeline:

1. User uploads file → Supabase Storage (`interviews` bucket, scoped to `<user_id>/`)
2. `POST /api/interviews` creates the row + signed URL
3. `POST /api/interviews/:id/process` fans out:
   - Deepgram (`nova-2`, diarization, utterances) → `transcripts` table
   - Anthropic (`claude-sonnet-4-6`) → `analyses` table (strict JSON schema)
   - Resend → "Your report is ready" email
4. Frontend polls Supabase for status; redirects to `/interview/:id`

## Project layout

```
app/
  (marketing)/      # public site: landing, pricing, privacy, terms
  (auth)/           # signup, login, magic link
  (app)/            # authenticated app: dashboard, upload, interview/[id], practice, settings
  auth/callback     # Supabase OAuth/magic-link callback
  api/
    interviews/             # CRUD + per-interview processing
    practice/               # practice answer grading
    billing/{stripe,razorpay}/   # checkout + portal
    webhooks/{stripe,razorpay}/  # subscription state sync
    cron/subscriptions/     # nightly trial expiry + 90-day audio purge
    account/delete          # GDPR-style hard delete
components/
  ui/               # shadcn-style primitives (Button, Card, Tabs, etc.)
  site/             # MarketingNav, MarketingFooter, AppNav, Logo
lib/
  supabase/         # browser, server, middleware, admin clients
  anthropic.ts      # analyzeInterview() + gradePracticeAnswer()
  deepgram.ts       # transcribeFromUrl()
  stripe.ts | razorpay.ts | email.ts | billing.ts
  types.ts | utils.ts
supabase/
  migrations/0001_initial_schema.sql   # tables + RLS + auth trigger + storage policies
  seed/practice_questions.sql           # 50+ seeded questions
middleware.ts      # protects /dashboard, /upload, /interview, /practice, /settings
```

## Local setup

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# Fill in Supabase, Anthropic, Deepgram, Stripe, Razorpay, Resend keys

# 3. Provision Supabase
#    a) Run supabase/migrations/0001_initial_schema.sql in the SQL editor
#    b) Run supabase/seed/practice_questions.sql to populate the question bank
#    c) Enable Google OAuth in Authentication → Providers (optional)

# 4. Configure Stripe
#    Create three prices in test mode and put the IDs in .env.local:
#      - NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
#      - NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID (V1.1)
#      - NEXT_PUBLIC_STRIPE_SPRINT_PRICE_ID (one-time payment price)
#    Add a webhook endpoint pointing to /api/webhooks/stripe and copy the
#    signing secret into STRIPE_WEBHOOK_SECRET.

# 5. Configure Razorpay (Indian users)
#    Create a Pro monthly plan and put RAZORPAY_PRO_MONTHLY_PLAN_ID in env.
#    Add a webhook endpoint pointing to /api/webhooks/razorpay.

# 6. Run
npm run dev
```

## Environment variables

See `.env.example` for the full list. Required for any meaningful local run:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPGRAM_API_KEY`
- `JOBS_SECRET` (for the cron endpoint)

Billing and email keys are only required if you exercise those flows.

## Deployment

Designed for Vercel. The `vercel.json` registers a daily cron (06:00 UTC) that
calls `/api/cron/subscriptions` to expire trials and purge audio older than 90
days. Set `JOBS_SECRET` in the Vercel project environment.

`maxDuration` is set to 300s on the processing endpoints — requires Vercel Pro
or higher. On Hobby, move processing into a Supabase Edge Function or queue.

## Subscription tiers

| Tier   | Limit                                     | Source of truth            |
|--------|-------------------------------------------|----------------------------|
| Free   | `free_analyses_used < 1`                  | `users.free_analyses_used` |
| Pro    | unlimited while `subscription_status` ∈ {active, trial} | Stripe / Razorpay webhook  |
| Sprint | `sprint_analyses_remaining > 0` AND `sprint_expires_at > now` | Webhook on payment captured |

Quota is decremented in `POST /api/interviews` *before* the pipeline starts to
avoid races. Failed analyses do not refund — that's a deliberate V1 simplification.

## Security notes

- RLS is enabled on every table. Public reads only on `practice_questions`.
- Storage policies restrict each user to their own folder (`<bucket>/<user_id>/...`).
- Webhooks verify signatures (`stripe.webhooks.constructEvent`, HMAC-SHA256 for Razorpay).
- `SUPABASE_SERVICE_ROLE_KEY` is only imported from `lib/supabase/admin.ts`,
  which is server-only.
- Cron endpoint requires `x-jobs-secret` header.

## What's intentionally not in V1

- Real-time interview recording (Stagehand is post-hoc by design).
- Annual Pro pricing UI (price ID is wired up but no toggle yet).
- Public sharing links for reports (added easily via signed URLs).
- True PDF generation — currently returns a print-ready HTML page.
- Practice streaming transcription (the recorder uploads then transcribes).
- API keys for users.
