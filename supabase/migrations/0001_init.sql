-- 0001_init.sql
-- Core schema for the flight management app.
-- All tables live in the `public` schema so the Supabase API auto-exposes them.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- =============================================================================
-- flights
-- =============================================================================
create table public.flights (
  id              uuid primary key default gen_random_uuid(),
  flight_no       text not null unique,
  origin          text not null,
  destination     text not null,
  departs_at      timestamptz not null,
  arrives_at      timestamptz not null,
  aircraft_type   text not null,
  status          text not null default 'scheduled'
                  check (status in ('scheduled','boarding','departed','arrived','cancelled')),
  base_price      numeric(10,2) not null check (base_price >= 0),
  created_at      timestamptz not null default now()
);

create index flights_route_idx on public.flights (origin, destination, departs_at);
create index flights_departs_idx on public.flights (departs_at);

-- =============================================================================
-- seats
-- =============================================================================
create table public.seats (
  id              uuid primary key default gen_random_uuid(),
  flight_id       uuid not null references public.flights(id) on delete cascade,
  seat_number     text not null,                 -- e.g. "12A"
  class           text not null
                  check (class in ('economy','business','first')),
  is_available    boolean not null default true,
  extra_fee       numeric(10,2) not null default 0 check (extra_fee >= 0),
  unique (flight_id, seat_number)
);

create index seats_flight_idx on public.seats (flight_id);
-- Useful for "show only available seats" queries.
create index seats_flight_available_idx on public.seats (flight_id) where is_available;

-- =============================================================================
-- bookings
-- =============================================================================
create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  flight_id       uuid not null references public.flights(id),
  seat_id         uuid not null references public.seats(id),
  status          text not null default 'confirmed'
                  check (status in ('confirmed','rescheduled','cancelled')),
  booked_at       timestamptz not null default now(),
  total_price     numeric(10,2) not null check (total_price >= 0),
  pnr_code        text not null unique
);

create index bookings_user_idx on public.bookings (user_id, booked_at desc);
create index bookings_flight_idx on public.bookings (flight_id);

-- A seat can only be tied to one ACTIVE booking at a time. Cancelled
-- bookings keep their seat_id for history but release the unique slot.
create unique index bookings_active_seat_idx
  on public.bookings (seat_id)
  where status <> 'cancelled';

-- =============================================================================
-- passengers
-- =============================================================================
create table public.passengers (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  full_name       text not null,
  passport_no     text not null,
  nationality     text not null,
  dob             date not null,
  created_at      timestamptz not null default now()
);

create index passengers_booking_idx on public.passengers (booking_id);

-- =============================================================================
-- reschedules
-- =============================================================================
create table public.reschedules (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  old_flight_id   uuid not null references public.flights(id),
  new_flight_id   uuid not null references public.flights(id),
  requested_at    timestamptz not null default now(),
  fee_charged     numeric(10,2) not null default 0 check (fee_charged >= 0)
);

create index reschedules_booking_idx on public.reschedules (booking_id, requested_at desc);

-- =============================================================================
-- Helper: generate a 6-char PNR. Collision-resistant for the scale we need.
-- =============================================================================
create or replace function public.generate_pnr() returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- omit confusables I/1, O/0
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;
