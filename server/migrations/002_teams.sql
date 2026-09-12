-- =====================================================================
-- Pedagogy — team management
--
-- Run once in the Supabase SQL editor. Safe to run twice.
--
-- BACKWARD COMPATIBILITY
-- Every existing event becomes an individual event automatically,
-- because participation_type defaults to 'individual'. Every existing
-- registration, result, evaluation and certificate keeps working with
-- no data migration: the new columns are all nullable and default to
-- the individual behaviour.
--
-- The only destructive-looking steps are dropping NOT NULL and
-- dropping a unique constraint on judge_evaluations. Both widen what
-- is allowed rather than narrowing it, so no existing row can be
-- invalidated.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Events gain a participation type.
--
-- Existing rows get 'individual' and sizes of 1, which is exactly how
-- they behave today.
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists participation_type text not null default 'individual';

alter table public.events
  add column if not exists min_team_size integer not null default 1;

alter table public.events
  add column if not exists max_team_size integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_participation_type_check'
  ) then
    alter table public.events
      add constraint events_participation_type_check
      check (participation_type in ('individual', 'team'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'events_team_size_check'
  ) then
    alter table public.events
      add constraint events_team_size_check
      check (
        min_team_size >= 1
        and max_team_size >= min_team_size
        and (
          participation_type = 'team'
          or (min_team_size = 1 and max_team_size = 1)
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Teams.
--
-- team_code is the short human code a student types to join, so it is
-- unique across the whole system rather than per event — a student
-- entering a code should never land in the wrong event's team.
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  team_code  text not null unique,
  leader_id  uuid not null references public.users(id) on delete cascade,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_status_check check (status in ('active', 'cancelled')),
  constraint teams_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists teams_event_idx  on public.teams(event_id);
create index if not exists teams_leader_idx on public.teams(leader_id);
create index if not exists teams_code_idx   on public.teams(team_code);

/*
 * One active team per leader per event. A partial index so that a
 * cancelled team does not block the leader from starting a new one.
 */
create unique index if not exists teams_one_active_per_leader
  on public.teams(event_id, leader_id)
  where status = 'active';

-- ---------------------------------------------------------------------
-- 3. Team members.
-- ---------------------------------------------------------------------
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  role       text not null default 'member',
  joined_at  timestamptz not null default now(),
  unique (team_id, student_id),
  constraint team_members_role_check check (role in ('leader', 'member'))
);

create index if not exists team_members_team_idx    on public.team_members(team_id);
create index if not exists team_members_student_idx on public.team_members(student_id);

-- ---------------------------------------------------------------------
-- 4. Registrations point at a team.
--
-- This is the whole integration. Each member keeps their own
-- registration row, their own registration_code and therefore their
-- own QR and their own attendance record. team_id simply groups them.
-- Individual events leave it null and behave exactly as before.
-- ---------------------------------------------------------------------
alter table public.registrations
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists registrations_team_idx on public.registrations(team_id);

/*
 * A student can hold at most one team place per event. Belt and braces
 * alongside the (team_id, student_id) unique on team_members, because
 * this one is scoped by EVENT rather than by team.
 */
create unique index if not exists registrations_one_team_per_student_event
  on public.registrations(event_id, student_id)
  where team_id is not null;

-- ---------------------------------------------------------------------
-- 5. Results can belong to a team instead of a student.
--
-- student_id and registration_id become nullable so a team result can
-- omit them, and a CHECK enforces that exactly one side is filled.
-- ---------------------------------------------------------------------
alter table public.event_results alter column student_id      drop not null;
alter table public.event_results alter column registration_id drop not null;

alter table public.event_results
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_results_subject_check'
  ) then
    alter table public.event_results
      add constraint event_results_subject_check
      check (
        (student_id is not null and team_id is null)
        or
        (student_id is null and team_id is not null)
      );
  end if;
end $$;

/*
 * Partial unique indexes, because a plain unique(event_id, student_id)
 * would treat every team row's NULL student_id as distinct and a plain
 * unique(event_id, team_id) likewise. These enforce the rule only on
 * the rows it applies to.
 */
create unique index if not exists event_results_one_per_student
  on public.event_results(event_id, student_id)
  where student_id is not null;

create unique index if not exists event_results_one_per_team
  on public.event_results(event_id, team_id)
  where team_id is not null;

create unique index if not exists event_results_one_per_position
  on public.event_results(event_id, position);

-- ---------------------------------------------------------------------
-- 6. Judge evaluations can target a team.
--
-- The table currently requires registration_id and student_id and has
-- a unique(event_id, judge_id, registration_id). All three have to
-- relax so a judge can score a team instead.
-- ---------------------------------------------------------------------
alter table public.judge_evaluations alter column registration_id drop not null;
alter table public.judge_evaluations alter column student_id      drop not null;

alter table public.judge_evaluations
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

do $$
declare
  c text;
begin
  -- drop the old table-level unique, whatever Postgres named it
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'judge_evaluations'
      and con.contype = 'u'
  loop
    execute format('alter table public.judge_evaluations drop constraint %I', c);
  end loop;

  if not exists (
    select 1 from pg_constraint where conname = 'judge_evaluations_subject_check'
  ) then
    alter table public.judge_evaluations
      add constraint judge_evaluations_subject_check
      check (
        (registration_id is not null and team_id is null)
        or
        (registration_id is null and team_id is not null)
      );
  end if;
end $$;

/*
 * The duplicate-evaluation guard, split by subject. This is what
 * actually prevents the same judge scoring the same participant — or
 * the same team — twice, even under two racing requests.
 */
create unique index if not exists judge_evaluations_one_per_participant
  on public.judge_evaluations(event_id, judge_id, registration_id)
  where registration_id is not null;

create unique index if not exists judge_evaluations_one_per_team
  on public.judge_evaluations(event_id, judge_id, team_id)
  where team_id is not null;

create index if not exists judge_evaluations_team_idx on public.judge_evaluations(team_id);

-- ---------------------------------------------------------------------
-- 7. Certificates remember the team they were earned with.
--
-- Still one certificate row per student — every member downloads their
-- own — but the row knows which team it belongs to, so the PDF can
-- print the team name and roster.
-- ---------------------------------------------------------------------
alter table public.certificates
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists certificates_team_idx on public.certificates(team_id);

-- ---------------------------------------------------------------------
-- 8. Row level security, matching the other tables.
-- The API uses the service role key, which bypasses RLS; these exist so
-- the anon key can never read these tables directly.
-- ---------------------------------------------------------------------
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;

commit;

-- =====================================================================
-- Verify
-- =====================================================================
-- select participation_type, min_team_size, max_team_size
--   from public.events limit 5;          -- all should read individual/1/1
--
-- select count(*) from public.teams;     -- 0
--
-- select indexname from pg_indexes
--  where tablename in ('event_results','judge_evaluations','registrations')
--    and indexname like '%one_per%';     -- the partial uniques
