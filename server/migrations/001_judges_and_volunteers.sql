-- =====================================================================
-- Pedagogy — judges and volunteers
--
-- Run this once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- It is idempotent: running it twice is harmless.
--
-- Nothing here alters or drops an existing table's data. The only
-- change to an existing table is widening the allowed values of
-- users.role and adding two nullable columns to events.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Allow the two new roles.
--
-- The existing CHECK constraint on users.role is found by looking it
-- up rather than by guessing its name, because Postgres auto-names
-- these and the name differs between projects.
-- ---------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'users'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%role%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.users drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.users
  add constraint users_role_check
  check (role in ('student', 'faculty', 'admin', 'judge', 'volunteer'));

-- ---------------------------------------------------------------------
-- 2. Which judges are assigned to which event.
--
-- A judge only ever sees an event they appear in here. The unique
-- constraint makes assigning the same judge twice a no-op rather than
-- a duplicate row.
-- ---------------------------------------------------------------------
create table if not exists public.event_judges (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  judge_id     uuid not null references public.users(id)  on delete cascade,
  assigned_by  uuid          references public.users(id)  on delete set null,
  assigned_at  timestamptz not null default now(),
  unique (event_id, judge_id)
);

create index if not exists event_judges_event_idx on public.event_judges(event_id);
create index if not exists event_judges_judge_idx on public.event_judges(judge_id);

-- ---------------------------------------------------------------------
-- 3. Which volunteers are assigned to which event.
-- ---------------------------------------------------------------------
create table if not exists public.event_volunteers (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  volunteer_id  uuid not null references public.users(id)  on delete cascade,
  assigned_by   uuid          references public.users(id)  on delete set null,
  assigned_at   timestamptz not null default now(),
  unique (event_id, volunteer_id)
);

create index if not exists event_volunteers_event_idx     on public.event_volunteers(event_id);
create index if not exists event_volunteers_volunteer_idx on public.event_volunteers(volunteer_id);

-- ---------------------------------------------------------------------
-- 4. The criteria a judge scores against, defined per event.
--
-- weight lets faculty say that Execution counts for more than
-- Presentation. A judge's total is the weighted average of their
-- per-criterion scores, normalised to max_score.
-- ---------------------------------------------------------------------
create table if not exists public.evaluation_criteria (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  name          text not null,
  description   text,
  max_score     numeric(6,2) not null default 10 check (max_score > 0),
  weight        numeric(6,2) not null default 1  check (weight    > 0),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists evaluation_criteria_event_idx
  on public.evaluation_criteria(event_id, display_order);

-- ---------------------------------------------------------------------
-- 5. One row per (judge, participant) — the evaluation header.
--
-- The unique constraint is what actually prevents the same judge
-- scoring the same participant twice. The API checks first for a
-- friendly error, but the database is what guarantees it: two
-- requests racing each other cannot both insert.
-- ---------------------------------------------------------------------
create table if not exists public.judge_evaluations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id)        on delete cascade,
  judge_id        uuid not null references public.users(id)         on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  student_id      uuid not null references public.users(id)         on delete cascade,
  total_score     numeric(8,3) not null default 0,
  max_total       numeric(8,3) not null default 0,
  remarks         text,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, judge_id, registration_id)
);

create index if not exists judge_evaluations_event_idx on public.judge_evaluations(event_id);
create index if not exists judge_evaluations_judge_idx on public.judge_evaluations(event_id, judge_id);
create index if not exists judge_evaluations_reg_idx   on public.judge_evaluations(registration_id);

-- ---------------------------------------------------------------------
-- 6. The per-criterion breakdown behind each evaluation.
--
-- Kept in its own table rather than a JSON blob so faculty can see
-- exactly where a judge marked someone down, and so a criterion's
-- scores can be queried directly.
-- ---------------------------------------------------------------------
create table if not exists public.judge_evaluation_scores (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.judge_evaluations(id)   on delete cascade,
  criterion_id  uuid not null references public.evaluation_criteria(id) on delete cascade,
  score         numeric(6,2) not null check (score >= 0),
  unique (evaluation_id, criterion_id)
);

create index if not exists judge_evaluation_scores_eval_idx
  on public.judge_evaluation_scores(evaluation_id);

-- ---------------------------------------------------------------------
-- 7. Mark on the event when judging is closed.
--
-- Once results are finalised, judges can no longer edit. Both columns
-- are nullable, so every existing event row stays valid.
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists results_finalized_at timestamptz;

alter table public.events
  add column if not exists results_finalized_by uuid references public.users(id) on delete set null;

-- ---------------------------------------------------------------------
-- 8. Row level security.
--
-- The API connects with the service role key, which bypasses RLS
-- entirely, so these policies do not affect the app. They exist so
-- that if the anon key is ever pointed at this database, these tables
-- are closed by default rather than world-readable.
-- ---------------------------------------------------------------------
alter table public.event_judges            enable row level security;
alter table public.event_volunteers        enable row level security;
alter table public.evaluation_criteria     enable row level security;
alter table public.judge_evaluations       enable row level security;
alter table public.judge_evaluation_scores enable row level security;

commit;

-- =====================================================================
-- Verify — should return 5 rows, then 5 roles.
-- =====================================================================
-- select table_name from information_schema.tables
--  where table_schema = 'public'
--    and table_name in ('event_judges','event_volunteers',
--                       'evaluation_criteria','judge_evaluations',
--                       'judge_evaluation_scores');
--
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname = 'users_role_check';
