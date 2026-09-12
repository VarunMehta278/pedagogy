-- =====================================================================
-- Pedagogy — data-integrity constraints
--
-- Closes the races that application code currently guards with
-- "check, then insert". Two concurrent requests can both pass such a
-- check; only the database can actually prevent the second write.
--
-- SAFE TO RUN TWICE. Everything is idempotent.
--
-- IMPORTANT: this migration REFUSES to create a constraint if the
-- table already contains rows that would violate it, and tells you
-- exactly which rows. It does not delete anything — you decide what
-- to do with existing duplicates.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Report existing duplicates BEFORE trying to constrain anything.
--    A failure here rolls the whole migration back, changing nothing.
-- ---------------------------------------------------------------------
do $$
declare
  n integer;
  detail text;
begin
  -- one registration per student per event
  select count(*), coalesce(string_agg(format('event=%s student=%s x%s', event_id, student_id, c), '; '), '')
    into n, detail
  from (
    select event_id, student_id, count(*) c
    from public.registrations
    group by event_id, student_id
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'Cannot add the registration uniqueness constraint: % duplicate (event, student) pair(s) already exist. %',
      n, detail;
  end if;

  -- one attendance row per registration
  select count(*) into n
  from (
    select registration_id
    from public.attendance
    group by registration_id
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'Cannot add the attendance uniqueness constraint: % registration(s) have more than one attendance row.', n;
  end if;

  -- one certificate per student per event per type
  select count(*) into n
  from (
    select event_id, student_id, certificate_type
    from public.certificates
    group by event_id, student_id, certificate_type
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'Cannot add the certificate uniqueness constraint: % duplicate certificate(s) already exist.', n;
  end if;

  -- registration codes must be globally unique
  select count(*) into n
  from (
    select registration_code
    from public.registrations
    group by registration_code
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'Cannot add the registration_code uniqueness constraint: % duplicated code(s) exist. These are QR identities — resolve before continuing.', n;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. One registration per student per event.
--
-- This is the important one. Without it two concurrent POSTs both
-- insert, and because the read path uses .maybeSingle() — which
-- errors on multiple rows — that student's registration becomes
-- permanently unreadable rather than merely duplicated.
--
-- Covers BOTH individual and team registrations, unlike the partial
-- index added in 002 which only applied when team_id was set.
-- ---------------------------------------------------------------------
create unique index if not exists registrations_one_per_student_event
  on public.registrations(event_id, student_id);

-- ---------------------------------------------------------------------
-- 2. A registration_code is a QR identity, so it must be unique
--    across the whole system, not merely unlikely to repeat.
-- ---------------------------------------------------------------------
create unique index if not exists registrations_code_unique
  on public.registrations(registration_code);

-- ---------------------------------------------------------------------
-- 3. One attendance row per registration.
--    Makes check-in idempotent at the database level, so two
--    volunteers scanning the same QR simultaneously cannot both write.
-- ---------------------------------------------------------------------
create unique index if not exists attendance_one_per_registration
  on public.attendance(registration_id);

-- ---------------------------------------------------------------------
-- 4. One certificate per student per event per type.
--    Stops a double-clicked Generate button issuing two certificates
--    with different codes that both verify as genuine.
-- ---------------------------------------------------------------------
create unique index if not exists certificates_one_per_student_event_type
  on public.certificates(event_id, student_id, certificate_type);

create unique index if not exists certificates_code_unique
  on public.certificates(certificate_code);

-- ---------------------------------------------------------------------
-- 5. Supporting indexes for the lookups these paths perform.
-- ---------------------------------------------------------------------
create index if not exists registrations_event_idx  on public.registrations(event_id);
create index if not exists registrations_student_idx on public.registrations(student_id);
create index if not exists attendance_event_idx      on public.attendance(event_id);
create index if not exists certificates_student_idx  on public.certificates(student_id);

commit;

-- =====================================================================
-- Verify — should list the six unique indexes created above.
-- =====================================================================
-- select indexname from pg_indexes
--  where schemaname = 'public'
--    and indexname in (
--      'registrations_one_per_student_event','registrations_code_unique',
--      'attendance_one_per_registration','certificates_one_per_student_event_type',
--      'certificates_code_unique')
--  order by indexname;
