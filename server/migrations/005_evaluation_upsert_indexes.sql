-- =====================================================================
-- 005 — make the judge evaluation upsert work again
--
-- WHY
--
-- 002 replaced the original unique (event_id, judge_id, registration_id)
-- constraint with two PARTIAL unique indexes, so that a row could be
-- about a participant or about a team but not both.
--
-- That broke every judge submission. submitEvaluation() upserts with
-- ON CONFLICT (event_id, judge_id, registration_id), and PostgreSQL
-- infers the arbiter index from that column list. A partial index can
-- only be inferred if the statement also repeats the index predicate --
-- ON CONFLICT (...) WHERE registration_id IS NOT NULL -- and PostgREST
-- emits only the column list, never a predicate. So Postgres found no
-- matching index and raised
--
--   42P10  there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- which the API turned into "Failed to save the evaluation". It failed
-- 100% of the time, for individual and team events alike.
--
-- THE FIX, AND WHY IT LOSES NOTHING
--
-- Drop the WHERE clauses. Under PostgreSQL's default NULLS DISTINCT,
-- two NULLs are never equal, so a full unique index on
-- (event_id, judge_id, registration_id) already ignores every row where
-- registration_id IS NULL -- which is exactly the set the partial index
-- excluded. The rows constrained are identical; only the inference
-- changes. Team rows keep being policed by the team index, and vice
-- versa.
--
-- Idempotent, and no data is read or written.
-- =====================================================================

drop index if exists public.judge_evaluations_one_per_participant;
drop index if exists public.judge_evaluations_one_per_team;

-- One evaluation per judge per participant.
create unique index if not exists judge_evaluations_one_per_participant
  on public.judge_evaluations(event_id, judge_id, registration_id);

-- One evaluation per judge per team.
create unique index if not exists judge_evaluations_one_per_team
  on public.judge_evaluations(event_id, judge_id, team_id);

-- ---------------------------------------------------------------------
-- Verify
--
--   select indexname, indexdef
--     from pg_indexes
--    where tablename = 'judge_evaluations'
--      and indexname like '%one_per%';
--
-- Both indexdef lines should now end at the column list, with no
-- trailing WHERE clause.
-- ---------------------------------------------------------------------
