-- 0004_triggers.sql
-- DB-level enforcement of the 2-hour cancellation rule.
--
-- Why a trigger and not just an RPC check?
-- The brief says explicitly: "Cancellations within 2 hours of departure must
-- be blocked (enforced at DB level)". A trigger guarantees the rule even if
-- a future code path bypasses the RPC and updates `status` directly.

create or replace function public.enforce_cancel_window()
returns trigger
language plpgsql
as $$
declare
  v_departs timestamptz;
begin
  -- Only fire on the confirmed/rescheduled → cancelled transition.
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    select departs_at into v_departs
      from public.flights
      where id = new.flight_id;

    if v_departs is null then
      raise exception 'flight_missing' using errcode = 'P0003';
    end if;

    if v_departs - now() < interval '2 hours' then
      raise exception 'cancel_window_closed: cannot cancel within 2 hours of departure'
        using errcode = 'P0009';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bookings_enforce_cancel_window on public.bookings;
create trigger trg_bookings_enforce_cancel_window
  before update of status on public.bookings
  for each row
  execute function public.enforce_cancel_window();
