-- 0003_rpcs.sql
-- All mutating operations live behind SECURITY DEFINER RPCs so we can
-- enforce business rules atomically and bypass the deliberately-strict RLS
-- write policies. Every function re-checks auth.uid() against the row's
-- owner — that is how we keep RLS-equivalent guarantees through the RPC.

-- =============================================================================
-- reserve_seat:
--   The seat-locking RPC the brief calls out. Used by Task 01's booking flow.
--   Performs the four-step booking insert as ONE atomic transaction with
--   row-level locks so two concurrent callers cannot both grab the same seat.
--
--   Steps:
--     1. SELECT ... FOR UPDATE on the seat row → blocks concurrent reservers.
--     2. Re-check is_available; raise if not.
--     3. Flip seat.is_available = false.
--     4. Insert the booking + passenger rows.
--   If any step throws, the whole tx rolls back and the seat is left
--   untouched, so we never end up with a half-reserved seat.
-- =============================================================================
create or replace function public.reserve_seat(
  p_flight_id      uuid,
  p_seat_id        uuid,
  p_full_name      text,
  p_passport_no    text,
  p_nationality    text,
  p_dob            date
)
returns table (booking_id uuid, pnr_code text, total_price numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_seat        seats%rowtype;
  v_flight      flights%rowtype;
  v_pnr         text;
  v_total       numeric(10,2);
  v_booking_id  uuid;
  v_attempts    int := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Lock the seat row. FOR UPDATE serializes concurrent reservers.
  select * into v_seat
    from public.seats
    where id = p_seat_id and flight_id = p_flight_id
    for update;

  if not found then
    raise exception 'seat_not_found' using errcode = 'P0001';
  end if;
  if not v_seat.is_available then
    raise exception 'seat_unavailable' using errcode = 'P0002';
  end if;

  select * into v_flight from public.flights where id = p_flight_id;
  if not found then
    raise exception 'flight_not_found' using errcode = 'P0003';
  end if;
  if v_flight.status <> 'scheduled' then
    raise exception 'flight_not_bookable' using errcode = 'P0004';
  end if;

  v_total := v_flight.base_price + v_seat.extra_fee;

  -- Generate a unique PNR; retry on the (vanishingly rare) collision.
  loop
    v_pnr := public.generate_pnr();
    exit when not exists (select 1 from public.bookings where pnr_code = v_pnr);
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'pnr_generation_failed' using errcode = 'P0005';
    end if;
  end loop;

  -- Flip the seat now that we are committed to this booking.
  update public.seats set is_available = false where id = p_seat_id;

  insert into public.bookings (user_id, flight_id, seat_id, total_price, pnr_code)
  values (v_user_id, p_flight_id, p_seat_id, v_total, v_pnr)
  returning id into v_booking_id;

  insert into public.passengers (booking_id, full_name, passport_no, nationality, dob)
  values (v_booking_id, p_full_name, p_passport_no, p_nationality, p_dob);

  return query select v_booking_id, v_pnr, v_total;
end;
$$;

grant execute on function public.reserve_seat(uuid, uuid, text, text, text, date)
  to authenticated;

-- =============================================================================
-- cancel_booking:
--   Atomic cancel. Flips booking.status, frees the seat. The 2-hour rule is
--   enforced by the trigger in 0004; this function itself just performs the
--   state change.
-- =============================================================================
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_booking  bookings%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.user_id <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'already_cancelled' using errcode = 'P0006';
  end if;

  -- Two-hour rule enforced by the trigger on bookings (see 0004).
  update public.bookings
    set status = 'cancelled'
    where id = p_booking_id;

  update public.seats
    set is_available = true
    where id = v_booking.seat_id;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- =============================================================================
-- reschedule_booking:
--   Move a booking to a new flight on the same route. Re-locks the new seat,
--   frees the old seat, records the reschedule, and charges a fee equal to
--   the price difference if the new flight costs more.
-- =============================================================================
create or replace function public.reschedule_booking(
  p_booking_id   uuid,
  p_new_flight_id uuid,
  p_new_seat_id  uuid
)
returns table (booking_id uuid, fee_charged numeric, total_price numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_booking     bookings%rowtype;
  v_old_flight  flights%rowtype;
  v_new_flight  flights%rowtype;
  v_new_seat    seats%rowtype;
  v_fee         numeric(10,2);
  v_total       numeric(10,2);
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.user_id <> v_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'booking_cancelled' using errcode = 'P0007';
  end if;

  select * into v_old_flight from public.flights where id = v_booking.flight_id;
  select * into v_new_flight from public.flights where id = p_new_flight_id;

  if not found then
    raise exception 'new_flight_not_found' using errcode = 'P0003';
  end if;

  -- Must be the same route. The brief: "user picks an alternative flight on
  -- the same route".
  if v_old_flight.origin <> v_new_flight.origin
     or v_old_flight.destination <> v_new_flight.destination then
    raise exception 'route_mismatch' using errcode = 'P0008';
  end if;

  if v_new_flight.status <> 'scheduled' then
    raise exception 'flight_not_bookable' using errcode = 'P0004';
  end if;

  -- Lock and validate the new seat.
  select * into v_new_seat
    from public.seats
    where id = p_new_seat_id and flight_id = p_new_flight_id
    for update;

  if not found then
    raise exception 'seat_not_found' using errcode = 'P0001';
  end if;
  if not v_new_seat.is_available then
    raise exception 'seat_unavailable' using errcode = 'P0002';
  end if;

  v_total := v_new_flight.base_price + v_new_seat.extra_fee;
  v_fee   := greatest(0, v_total - v_booking.total_price);

  -- Free old seat, claim new seat.
  update public.seats set is_available = true  where id = v_booking.seat_id;
  update public.seats set is_available = false where id = p_new_seat_id;

  -- Update the booking. We keep the original booking id and PNR so the
  -- user's reference doesn't change after a reschedule.
  update public.bookings
     set flight_id   = p_new_flight_id,
         seat_id     = p_new_seat_id,
         total_price = v_total,
         status      = 'rescheduled'
   where id = p_booking_id;

  insert into public.reschedules (booking_id, old_flight_id, new_flight_id, fee_charged)
  values (p_booking_id, v_old_flight.id, v_new_flight.id, v_fee);

  return query select p_booking_id, v_fee, v_total;
end;
$$;

grant execute on function public.reschedule_booking(uuid, uuid, uuid) to authenticated;
