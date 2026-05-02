-- Stagehand V1 schema
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "uuid-ossp";

-- ENUMS -----------------------------------------------------------------
create type subscription_tier as enum ('free', 'pro', 'sprint');
create type subscription_status as enum ('active', 'cancelled', 'expired', 'trial');
create type interview_type as enum ('behavioral', 'technical', 'system_design', 'hr', 'other');
create type job_status as enum ('pending', 'processing', 'completed', 'failed');
create type hire_recommendation as enum ('strong_yes', 'yes', 'maybe', 'no');
create type question_category as enum ('behavioral', 'technical', 'system_design', 'hr');
create type question_difficulty as enum ('easy', 'medium', 'hard');
create type billing_provider as enum ('stripe', 'razorpay');

-- USERS -----------------------------------------------------------------
-- Extends auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  country text,
  subscription_tier subscription_tier not null default 'free',
  subscription_status subscription_status not null default 'active',
  trial_ends_at timestamptz,
  free_analyses_used int not null default 0,
  sprint_analyses_remaining int not null default 0,
  sprint_expires_at timestamptz,
  stripe_customer_id text,
  razorpay_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_email_idx on public.users(email);

-- INTERVIEWS ------------------------------------------------------------
create table public.interviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  role_interviewed_for text not null,
  company_name text,
  interview_type interview_type not null default 'behavioral',
  file_url text not null,
  file_size_mb numeric,
  duration_seconds int,
  transcription_status job_status not null default 'pending',
  analysis_status job_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index interviews_user_id_idx on public.interviews(user_id, created_at desc);

-- TRANSCRIPTS -----------------------------------------------------------
create table public.transcripts (
  id uuid primary key default uuid_generate_v4(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  full_text text not null,
  segments jsonb not null default '[]'::jsonb,
  word_count int,
  created_at timestamptz not null default now()
);

-- ANALYSES --------------------------------------------------------------
create table public.analyses (
  id uuid primary key default uuid_generate_v4(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  overall_communication_score int check (overall_communication_score between 0 and 10),
  overall_content_score int check (overall_content_score between 0 and 10),
  overall_confidence_score int check (overall_confidence_score between 0 and 10),
  hire_recommendation hire_recommendation,
  filler_word_count int,
  filler_word_breakdown jsonb default '{}'::jsonb,
  words_per_minute int,
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  improvement_drills jsonb default '[]'::jsonb,
  summary text,
  full_feedback_md text,
  created_at timestamptz not null default now()
);

-- PRACTICE QUESTIONS ----------------------------------------------------
create table public.practice_questions (
  id uuid primary key default uuid_generate_v4(),
  question_text text not null,
  category question_category not null,
  role_tags text[] not null default '{}',
  ideal_answer_structure text,
  difficulty question_difficulty not null default 'medium',
  created_at timestamptz not null default now()
);

create index practice_questions_category_idx on public.practice_questions(category, difficulty);

-- PRACTICE SESSIONS -----------------------------------------------------
create table public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  audio_url text,
  transcript text,
  feedback jsonb,
  score int check (score between 0 and 10),
  duration_seconds int,
  created_at timestamptz not null default now()
);

create index practice_sessions_user_id_idx on public.practice_sessions(user_id, created_at desc);

-- SUBSCRIPTIONS ---------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier subscription_tier not null,
  provider billing_provider not null,
  provider_subscription_id text not null,
  provider_customer_id text,
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  raw jsonb,
  unique (provider, provider_subscription_id)
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);

-- TRIGGERS --------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- RLS -------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.interviews enable row level security;
alter table public.transcripts enable row level security;
alter table public.analyses enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.subscriptions enable row level security;

-- Users can read/update only their own row
create policy "users_self_read" on public.users for select using (auth.uid() = id);
create policy "users_self_update" on public.users for update using (auth.uid() = id);

-- Interviews
create policy "interviews_owner_select" on public.interviews for select using (auth.uid() = user_id);
create policy "interviews_owner_insert" on public.interviews for insert with check (auth.uid() = user_id);
create policy "interviews_owner_update" on public.interviews for update using (auth.uid() = user_id);
create policy "interviews_owner_delete" on public.interviews for delete using (auth.uid() = user_id);

-- Transcripts and analyses readable if user owns the parent interview
create policy "transcripts_owner_select" on public.transcripts for select using (
  exists (select 1 from public.interviews i where i.id = interview_id and i.user_id = auth.uid())
);
create policy "analyses_owner_select" on public.analyses for select using (
  exists (select 1 from public.interviews i where i.id = interview_id and i.user_id = auth.uid())
);

-- Practice questions are public read
create policy "practice_questions_public_read" on public.practice_questions for select using (true);

-- Practice sessions
create policy "practice_sessions_owner_select" on public.practice_sessions for select using (auth.uid() = user_id);
create policy "practice_sessions_owner_insert" on public.practice_sessions for insert with check (auth.uid() = user_id);
create policy "practice_sessions_owner_delete" on public.practice_sessions for delete using (auth.uid() = user_id);

-- Subscriptions read-only by owner; writes via service role
create policy "subscriptions_owner_select" on public.subscriptions for select using (auth.uid() = user_id);

-- STORAGE BUCKETS -------------------------------------------------------
insert into storage.buckets (id, name, public) values ('interviews', 'interviews', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('practice', 'practice', false)
  on conflict (id) do nothing;

-- Each user can upload/read files in their own folder: <bucket>/<user_id>/...
create policy "interviews_upload" on storage.objects for insert
  with check (bucket_id = 'interviews' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "interviews_read" on storage.objects for select
  using (bucket_id = 'interviews' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "interviews_delete" on storage.objects for delete
  using (bucket_id = 'interviews' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "practice_upload" on storage.objects for insert
  with check (bucket_id = 'practice' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "practice_read" on storage.objects for select
  using (bucket_id = 'practice' and auth.uid()::text = (storage.foldername(name))[1]);
