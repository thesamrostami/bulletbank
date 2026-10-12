-- ============================================================
-- BulletBank — Consolidated Supabase schema
-- Run this on a fresh Supabase project: SQL Editor → New Query
-- Reflects the base schema + migrations 001 through 028
-- ============================================================

-- ── Section 1 — Extensions ────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Section 2 — Tables ────────────────────────────────────────

-- profiles (base + 001 + 002 + 003)
create table if not exists profiles (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  full_name              text,
  email                  text,
  phone                  text,
  location_city          text,
  location_country       text,
  linkedin_url           text,
  github_url             text,
  portfolio_url          text,
  website_url            text,
  -- migration 027: flexible labelled links; supersedes github_url for new writes
  additional_links       jsonb default '[]',
  job_search_locations   text[] default '{}',
  work_authorisation     text,
  willing_to_relocate    boolean default false,
  preferred_work_type    text default 'Hybrid'
                           check (preferred_work_type in ('Remote','Hybrid','On-site','Flexible')),
  bio                    text,
  positioning_headline   text,
  skills_core            text[] default '{}',
  skills_proficient      text[] default '{}',
  skills_familiar        text[] default '{}',
  languages              text[] default '{}',
  job_titles             text[] default '{}',
  seniority              text,
  years_experience       int,
  experience             text,
  onboarding_complete    boolean default false,
  bank_analysis          jsonb,
  conversation_history   jsonb,
  plan                   text not null default 'free' check (plan in ('free', 'paid')),
  credit_balance         int not null default 150,
  updated_at             timestamptz default now()
);

-- work_experiences (003)
create table if not exists work_experiences (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  company          text not null,
  title            text not null,
  employment_type  text default 'Full-time'
                     check (employment_type in (
                       'Full-time','Part-time','Contract',
                       'Freelance','Internship','Apprenticeship','Volunteer'
                     )),
  location         text,
  is_remote        boolean default false,
  start_date       date not null,
  end_date         date,
  is_current       boolean default false,
  description      text,
  order_index      int default 0,
  created_at       timestamptz default now()
);

-- education (003)
create table if not exists education (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  institution      text not null,
  degree           text,
  field_of_study   text,
  start_date       date,
  end_date         date,
  is_current       boolean default false,
  grade            text,
  description      text,
  order_index      int default 0,
  created_at       timestamptz default now()
);

-- certifications (003)
create table if not exists certifications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  issuing_organisation  text,
  issue_date            date,
  expiry_date           date,
  no_expiry             boolean default false,
  credential_id         text,
  credential_url        text,
  order_index           int default 0,
  created_at            timestamptz default now()
);

-- projects (003)
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  url           text,
  repo_url      text,
  tech_stack    text[] default '{}',
  start_date    date,
  end_date      date,
  is_ongoing    boolean default false,
  highlight     boolean default true,
  order_index   int default 0,
  created_at    timestamptz default now()
);

-- bullet_bank (base + 003 FKs + 004 is_finalised + 012 source)
create table if not exists bullet_bank (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  bullet_id           text not null,
  type                text not null check (type in ('summary','highlight','experience','project')),
  role_context        text,
  work_experience_id  uuid references work_experiences(id) on delete set null,
  project_id          uuid references projects(id) on delete set null,
  text                text not null,
  skill_tags          text[] default '{}',
  has_metric          boolean default false,
  metric_text         text,
  star_story          text,
  times_used          int default 0,
  last_defended_at    timestamptz,
  is_finalised        boolean default false,
  source              text default 'manual'
                        check (source in (
                          'onboarding','update','manual',
                          'micro_capture','cv_builder'
                        )),
  created_at          timestamptz default now(),
  unique (user_id, bullet_id)
);

-- jobs (base + 005 + 006 + 007 + 008 + 011 + 014)
create table if not exists jobs (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  url                         text,
  company                     text not null,
  role                        text not null,
  location                    text,
  raw_text                    text,
  requirements                text[] default '{}',
  status                      text not null default 'Applied'
                                check (status in (
                                  'Saved','Applied','Screening',
                                  'Interview Scheduled','Offer','Rejected','Withdrawn'
                                )),
  date_applied                date default current_date,
  interview_date              timestamptz,
  notes                       text,
  cover_letter                text,
  cover_letter_version        int default 1,
  cv_bullet_ids               text[] default '{}',
  cv_summary_id               text,
  cv_snapshot                 jsonb,
  cv_downloaded_at            timestamptz,
  cover_letter_downloaded_at  timestamptz,
  fit_score                   int,
  fit_analysis                jsonb,
  interview_prep              jsonb,
  interview_debrief           jsonb,
  own_cv_url                  text,
  own_cv_filename             text,
  own_cv_text                 text,
  own_cover_letter_url        text,
  own_cover_letter_filename   text,
  document_source             text default 'generated'
                                check (document_source in ('generated','uploaded','mixed')),
  ranking_cache               jsonb,
  ranking_cached_at           timestamptz,
  rewrite_snapshot            jsonb,
  cv_rewrite_source           text default 'manual'
                                check (cv_rewrite_source in ('manual', 'ai_tailored', 'uploaded', 'quick_apply')),
  -- migration 028: last-used CV template, saved by generate-cv and read by the editor
  preferred_cv_template       text default 'clean',
  created_at                  timestamptz default now()
);

-- usage_logs (010)
create table if not exists usage_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  created_at  timestamptz default now()
);

-- cv_variants (013)
create table if not exists cv_variants (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  summary_bullet_id   text,
  bullet_ids          text[] default '{}',
  deselected_skills   text[] default '{}',
  created_at          timestamptz default now(),
  last_used_at        timestamptz
);

-- credit_transactions (018)
create table if not exists credit_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          int not null,
  balance_after   int not null,
  type            text not null check (type in ('signup_grant', 'purchase', 'usage', 'refund', 'admin_grant')),
  action          text,
  reference_id    text,
  description     text,
  created_at      timestamptz default now()
);

-- debrief_insights (015)
create table if not exists debrief_insights (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid not null references jobs(id) on delete cascade,
  question        text not null,
  question_type   text,
  role_archetype  text,
  bullet_ids_used text[] default '{}',
  outcome         text,
  user_notes      text,
  created_at      timestamptz default now()
);

-- ── Section 3 — Indexes ───────────────────────────────────────
create index if not exists jobs_user_id_idx            on jobs(user_id);
create index if not exists jobs_status_idx             on jobs(status);
create index if not exists bullets_user_id_idx         on bullet_bank(user_id);
create index if not exists bullets_type_idx            on bullet_bank(type);
create index if not exists bullets_exp_idx             on bullet_bank(work_experience_id);
create index if not exists bullets_proj_idx            on bullet_bank(project_id);
create index if not exists work_exp_user_idx           on work_experiences(user_id);
create index if not exists work_exp_order_idx          on work_experiences(user_id, order_index);
create index if not exists education_user_idx          on education(user_id);
create index if not exists certs_user_idx              on certifications(user_id);
create index if not exists projects_user_idx           on projects(user_id);
create index if not exists usage_logs_user_action_idx  on usage_logs(user_id, action, created_at);
create index if not exists debrief_insights_user_idx   on debrief_insights(user_id);
create index if not exists debrief_insights_arch_idx   on debrief_insights(user_id, role_archetype);
create index if not exists credit_tx_user_idx          on credit_transactions(user_id, created_at desc);

-- ── Section 4 — Row Level Security ───────────────────────────
alter table profiles          enable row level security;
alter table jobs              enable row level security;
alter table bullet_bank       enable row level security;
alter table work_experiences  enable row level security;
alter table education         enable row level security;
alter table certifications    enable row level security;
alter table projects          enable row level security;
alter table usage_logs        enable row level security;
alter table cv_variants       enable row level security;
alter table debrief_insights  enable row level security;
alter table credit_transactions enable row level security;

drop policy if exists "profiles: own row only"        on profiles;
drop policy if exists "jobs: own rows only"           on jobs;
drop policy if exists "bullets: own rows only"        on bullet_bank;
drop policy if exists "work_exp: own rows"            on work_experiences;
drop policy if exists "education: own rows"           on education;
drop policy if exists "certs: own rows"               on certifications;
drop policy if exists "projects: own rows"            on projects;
drop policy if exists "usage_logs: own rows only"     on usage_logs;
drop policy if exists "cv_variants: own rows"         on cv_variants;
drop policy if exists "debrief_insights: own rows"    on debrief_insights;
drop policy if exists "credit_tx: own rows"           on credit_transactions;

create policy "profiles: own row only"        on profiles         for all using (auth.uid() = user_id);
create policy "jobs: own rows only"           on jobs             for all using (auth.uid() = user_id);
create policy "bullets: own rows only"        on bullet_bank      for all using (auth.uid() = user_id);
create policy "work_exp: own rows"            on work_experiences for all using (auth.uid() = user_id);
create policy "education: own rows"           on education        for all using (auth.uid() = user_id);
create policy "certs: own rows"               on certifications   for all using (auth.uid() = user_id);
create policy "projects: own rows"            on projects         for all using (auth.uid() = user_id);
create policy "usage_logs: own rows only"     on usage_logs       for all using (auth.uid() = user_id);
create policy "cv_variants: own rows"         on cv_variants      for all using (auth.uid() = user_id);
create policy "debrief_insights: own rows"    on debrief_insights    for all using (auth.uid() = user_id);
create policy "credit_tx: own rows"           on credit_transactions for all using (auth.uid() = user_id);

-- ── Section 4b — Explicit grants (required for new Supabase projects from May 30 2026) ──

-- anon role: no access to any application table
-- (anon users only interact with auth — they cannot read or write data)

-- authenticated role: full CRUD on all application tables
-- RLS policies above enforce row-level ownership — these grants just open the door
grant select, insert, update, delete on public.profiles          to authenticated;
grant select, insert, update, delete on public.jobs              to authenticated;
grant select, insert, update, delete on public.bullet_bank       to authenticated;
grant select, insert, update, delete on public.work_experiences  to authenticated;
grant select, insert, update, delete on public.education         to authenticated;
grant select, insert, update, delete on public.certifications    to authenticated;
grant select, insert, update, delete on public.projects          to authenticated;
grant select, insert, update, delete on public.usage_logs        to authenticated;
grant select, insert, update, delete on public.cv_variants       to authenticated;
grant select, insert, update, delete on public.debrief_insights  to authenticated;
-- INSERT intentionally omitted — only SECURITY DEFINER functions write to this table (see migration 025)
grant select on public.credit_transactions              to authenticated;

-- service_role: full access (used by your server-side admin operations)
grant select, insert, update, delete on public.profiles          to service_role;
grant select, insert, update, delete on public.jobs              to service_role;
grant select, insert, update, delete on public.bullet_bank       to service_role;
grant select, insert, update, delete on public.work_experiences  to service_role;
grant select, insert, update, delete on public.education         to service_role;
grant select, insert, update, delete on public.certifications    to service_role;
grant select, insert, update, delete on public.projects          to service_role;
grant select, insert, update, delete on public.usage_logs        to service_role;
grant select, insert, update, delete on public.cv_variants       to service_role;
grant select, insert, update, delete on public.debrief_insights  to service_role;
grant select, insert, update, delete on public.credit_transactions to service_role;

-- sequences: allow authenticated users to generate UUIDs via gen_random_uuid()
-- (only needed if you use serial/sequence columns — your schema uses gen_random_uuid() 
--  which is a function not a sequence, so no sequence grants needed)

-- ── Section 5 — Storage bucket ───────────────────────────────
insert into storage.buckets (id, name, public)
values ('job-documents', 'job-documents', false)
on conflict (id) do nothing;

drop policy if exists "job-documents: own files only" on storage.objects;
create policy "job-documents: own files only"
  on storage.objects for all
  using (
    bucket_id = 'job-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Section 6 — Functions and triggers ───────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Revoke direct RPC execution — only the auth trigger should call this
revoke execute on function handle_new_user() from public;
revoke execute on function handle_new_user() from anon;
revoke execute on function handle_new_user() from authenticated;
grant execute on function handle_new_user() to supabase_auth_admin;

-- ── Section 6b — Rate limit log (migration 023) ──────────────
-- rate_limit_log: Supabase-backed sliding-window rate limiter.
-- Cleanup: rows older than 1 hour are pruned opportunistically on each RPC call.
-- For high-traffic deployments, consider adding a pg_cron job:
--   SELECT cron.schedule('rate-limit-cleanup', '*/15 * * * *',
--     $$DELETE FROM rate_limit_log WHERE created_at < now() - INTERVAL '1 hour'$$);
-- RLS is intentionally DISABLED — this table is only accessed via the SECURITY DEFINER RPC below.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_key_created_idx
  ON rate_limit_log (key, created_at);

-- Atomic check-and-record. Counts rows for the key inside the window; if under
-- the limit, records a new row and allows the request. Opportunistically prunes
-- rows older than 1 hour so the table stays small without a separate cron job.
CREATE OR REPLACE FUNCTION check_and_record_rate_limit(
  p_key       TEXT,
  p_limit     INT,
  p_window_ms BIGINT
) RETURNS TABLE(allowed BOOLEAN, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INT;
  v_oldest       TIMESTAMPTZ;
BEGIN
  v_window_start := now() - make_interval(secs => p_window_ms / 1000.0);

  -- Cleanup: drop anything older than an hour (well past any sane window).
  DELETE FROM rate_limit_log WHERE created_at < now() - INTERVAL '1 hour';

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest
    FROM rate_limit_log
   WHERE key = p_key AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, v_oldest + make_interval(secs => p_window_ms / 1000.0);
  ELSE
    INSERT INTO rate_limit_log (key) VALUES (p_key);
    RETURN QUERY SELECT true, now() + make_interval(secs => p_window_ms / 1000.0);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_record_rate_limit TO authenticated, service_role;

-- ── Section 6c — Credit functions (migrations 019, 020, 024, 026) ─────────

-- NOTE: Run this on the production DB manually before deploying the code that calls it.
-- Atomic credit refund (mirrors deduct_credits_atomic for consistency).
-- Uses SECURITY DEFINER so authenticated users can insert into credit_transactions,
-- which has INSERT revoked from the authenticated role (see migration 025).
CREATE OR REPLACE FUNCTION refund_credits_atomic(
  p_user_id      UUID,
  p_cost         INT,
  p_action       TEXT,
  p_description  TEXT,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE(success BOOL, balance INT) AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE profiles
  SET credit_balance = credit_balance + p_cost
  WHERE user_id = p_user_id
  RETURNING credit_balance INTO v_new_balance;

  IF v_new_balance IS NOT NULL THEN
    INSERT INTO credit_transactions (user_id, amount, balance_after, type, action, reference_id, description)
    VALUES (p_user_id, p_cost, v_new_balance, 'refund', p_action, p_reference_id, p_description);

    RETURN QUERY SELECT true, v_new_balance;
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refund_credits_atomic TO authenticated, service_role;

-- Atomic credit deduction (migration 019)
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id      UUID,
  p_cost         INT,
  p_action       TEXT,
  p_description  TEXT,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE(success BOOL, balance INT) AS $$
DECLARE
  v_new_balance     INT;
  v_current_balance INT;
BEGIN
  UPDATE profiles
  SET credit_balance = credit_balance - p_cost
  WHERE user_id = p_user_id AND credit_balance >= p_cost
  RETURNING credit_balance INTO v_new_balance;

  IF v_new_balance IS NOT NULL THEN
    INSERT INTO credit_transactions (user_id, amount, balance_after, type, action, reference_id, description)
    VALUES (p_user_id, -p_cost, v_new_balance, 'usage', p_action, p_reference_id, p_description);

    INSERT INTO usage_logs (user_id, action) VALUES (p_user_id, p_action);

    RETURN QUERY SELECT true, v_new_balance;
  ELSE
    SELECT credit_balance INTO v_current_balance FROM profiles WHERE user_id = p_user_id;
    RETURN QUERY SELECT false, COALESCE(v_current_balance, 0);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deduct_credits_atomic TO authenticated, service_role;

-- Idempotency index: one purchase per order ID (migration 020)
CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_purchase_ref_uniq
  ON credit_transactions (reference_id)
  WHERE type = 'purchase' AND reference_id IS NOT NULL;

-- One signup grant per user, ever (migration 024)
CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_signup_grant_uniq
  ON credit_transactions (user_id)
  WHERE type = 'signup_grant';

-- Atomic, idempotent purchase credit grant (migration 024)
CREATE OR REPLACE FUNCTION record_purchase_credits(
  p_user_id     UUID,
  p_amount      INT,
  p_order_id    TEXT,
  p_description TEXT
) RETURNS TABLE(processed BOOLEAN, balance INT) AS $$
DECLARE
  v_balance INT;
BEGIN
  UPDATE profiles
     SET credit_balance = credit_balance + p_amount,
         plan = 'paid'
   WHERE user_id = p_user_id
  RETURNING credit_balance INTO v_balance;

  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES (p_user_id, p_amount, v_balance, 'purchase', p_order_id, p_description);

  RETURN QUERY SELECT true, v_balance;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT false, (SELECT credit_balance FROM profiles WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_purchase_credits TO service_role;

-- Atomic, idempotent signup grant (migration 026 — latest version)
-- Only tops up and records if the balance is actually zero.
CREATE OR REPLACE FUNCTION grant_signup_credits(
  p_user_id UUID,
  p_amount  INT
) RETURNS void AS $$
DECLARE
  v_balance INT;
BEGIN
  SELECT credit_balance INTO v_balance FROM profiles WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN
    RETURN;
  END IF;

  IF v_balance = 0 THEN
    UPDATE profiles SET credit_balance = p_amount WHERE user_id = p_user_id;
    v_balance := p_amount;

    INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, p_amount, v_balance, 'signup_grant', 'Welcome credits');
  END IF;
EXCEPTION WHEN unique_violation THEN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_signup_credits TO authenticated, service_role;

-- ── Section 7 — Views ─────────────────────────────────────────

-- user_daily_usage: per-user action counts for today (security_invoker respects RLS)
create or replace view user_daily_usage
with (security_invoker = true)
as
select
  user_id,
  action,
  count(*) as used_today,
  current_date as date
from usage_logs
where created_at >= current_date
group by user_id, action;

grant select on user_daily_usage to authenticated;
grant select on user_daily_usage to service_role;
