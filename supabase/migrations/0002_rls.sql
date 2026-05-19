-- 0002_rls.sql
-- Row Level Security policies.
--
-- Rules:
--   - flights, seats          → public read (anyone, even anon, can browse)
--                               writes only by service role (not exposed)
--   - bookings, passengers,   → users can only see/touch their own rows
--     reschedules
--
-- All mutating actions go through SECURITY DEFINER RPCs (migration 0003),
-- so direct INSERT/UPDATE policies on bookings/seats are intentionally absent.

-- ---------- flights ---------------------------------------------------------
alter table public.flights enable row level security;

create policy flights_public_read
  on public.flights
  for select
  to anon, authenticated
  using (true);

-- ---------- seats -----------------------------------------------------------
alter table public.seats enable row level security;

create policy seats_public_read
  on public.seats
  for select
  to anon, authenticated
  using (true);

-- ---------- bookings --------------------------------------------------------
alter table public.bookings enable row level security;

create policy bookings_owner_read
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE happen through SECURITY DEFINER RPCs only.
-- No direct write policies on purpose.

-- ---------- passengers ------------------------------------------------------
alter table public.passengers enable row level security;

create policy passengers_owner_read
  on public.passengers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = passengers.booking_id
        and b.user_id = auth.uid()
    )
  );

-- ---------- reschedules -----------------------------------------------------
alter table public.reschedules enable row level security;

create policy reschedules_owner_read
  on public.reschedules
  for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = reschedules.booking_id
        and b.user_id = auth.uid()
    )
  );
