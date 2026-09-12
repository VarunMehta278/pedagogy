-- =====================================================================
-- Pedagogy — atomic participant limit
--
-- Run once in the Supabase SQL editor. Safe to run twice.
--
-- THE PROBLEM
-- The API counts registrations, sees room, and inserts. Two requests
-- can run that count at the same moment, both see room, and both
-- insert. The post-insert recount in registrationController narrows
-- the window but cannot close it, and its rollback can evict whoever
-- finished second rather than whoever actually raced.
--
-- THE FIX
-- A BEFORE trigger that takes a row lock on the event before counting.
-- Postgres then serialises every registration for that event: the
-- second transaction waits for the first to commit, so it counts the
-- first one and correctly sees the event as full.
--
-- Doing it in the database rather than the API means it holds for
-- every path that ever inserts a registration — including anything
-- added later, and anything run by hand in the SQL editor.
-- =====================================================================

begin;

create or replace function public.enforce_participant_limit()
returns trigger
language plpgsql
as $$
declare
  lim integer;
  taken integer;
begin
  /*
   * A cancelled registration occupies no slot, so cancelling is
   * always allowed and never needs a capacity check.
   */
  if new.status = 'cancelled' then
    return new;
  end if;

  /*
   * FOR UPDATE is the whole point. It locks this event's row for the
   * duration of the transaction, so a second registration for the
   * same event blocks here until the first commits — and then counts
   * it. Without the lock both transactions read the same stale count.
   *
   * Different events lock different rows, so registrations for
   * unrelated events never wait on each other.
   */
  select participant_limit
    into lim
  from public.events
  where id = new.event_id
  for update;

  -- No limit set means unlimited; nothing to enforce.
  if lim is null then
    return new;
  end if;

  select count(*)
    into taken
  from public.registrations
  where event_id = new.event_id
    and status <> 'cancelled'
    /*
     * On UPDATE (a cancelled registration being revived) the row
     * already exists, so it must not count itself.
     */
    and id is distinct from new.id;

  if taken >= lim then
    raise exception 'EVENT_FULL'
      using
        errcode = 'P0001',
        hint = 'participant_limit reached for this event';
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_enforce_capacity on public.registrations;

create trigger registrations_enforce_capacity
  before insert or update of status on public.registrations
  for each row
  execute function public.enforce_participant_limit();

commit;

-- =====================================================================
-- Verify
-- =====================================================================
-- select tgname from pg_trigger
--  where tgrelid = 'public.registrations'::regclass
--    and not tgisinternal;
--
-- Try it: set an event's participant_limit to the number of people
-- already registered, then attempt one more registration through the
-- app. You should get a clean "This event is full" 409, not a 500.
