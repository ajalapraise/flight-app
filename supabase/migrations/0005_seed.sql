-- 0005_seed.sql
-- Seed data: 8 flights across 4 routes, each with a full seat map.
-- Idempotent: safe to re-run; conflicts on flight_no are ignored.
--
-- Routes:
--   LHR ↔ JFK   (London Heathrow / New York JFK)
--   DXB ↔ SIN   (Dubai / Singapore)
--   NRT ↔ LAX   (Tokyo Narita / Los Angeles)
--   CDG ↔ DOH   (Paris CDG / Doha)
--
-- Seat map per flight:
--   First class:    rows 1–2,  columns A,C,D,F        →  8 seats  (premium fee)
--   Business class: rows 3–5,  columns A,B,D,E        → 12 seats  (mid fee)
--   Economy:        rows 10–24, columns A,B,C,D,E,F   → 90 seats  (no fee)
-- Total: 110 seats per flight.

-- ---------- Flights ---------------------------------------------------------
insert into public.flights
  (flight_no, origin, destination, departs_at, arrives_at, aircraft_type, base_price)
values
  -- LHR ↔ JFK
  ('BA178', 'LHR', 'JFK', now() + interval '2 days' + interval '8 hours',  now() + interval '2 days' + interval '16 hours', 'Boeing 777-300ER', 480.00),
  ('AA101', 'JFK', 'LHR', now() + interval '3 days' + interval '21 hours', now() + interval '4 days' + interval '9 hours',  'Boeing 777-200',    520.00),
  -- DXB ↔ SIN
  ('EK432', 'DXB', 'SIN', now() + interval '2 days' + interval '3 hours',  now() + interval '2 days' + interval '10 hours', 'Airbus A380',       410.00),
  ('SQ495', 'SIN', 'DXB', now() + interval '5 days' + interval '2 hours',  now() + interval '5 days' + interval '7 hours',  'Boeing 787-10',     430.00),
  -- NRT ↔ LAX
  ('JL062', 'NRT', 'LAX', now() + interval '4 days' + interval '17 hours', now() + interval '5 days' + interval '8 hours',  'Boeing 777-300ER',  680.00),
  ('NH106', 'LAX', 'NRT', now() + interval '6 days' + interval '12 hours', now() + interval '7 days' + interval '5 hours',  'Boeing 787-9',      650.00),
  -- CDG ↔ DOH
  ('QR040', 'CDG', 'DOH', now() + interval '3 days' + interval '10 hours', now() + interval '3 days' + interval '17 hours', 'Airbus A350-1000',  390.00),
  ('AF666', 'DOH', 'CDG', now() + interval '7 days' + interval '23 hours', now() + interval '8 days' + interval '6 hours',  'Boeing 787-9',      410.00)
on conflict (flight_no) do nothing;

-- ---------- Seats: build a 110-seat map for every flight --------------------
-- Inserted per-flight in a single statement using LATERAL on a generated grid.
-- Skips any (flight_id, seat_number) pair that already exists, so re-running
-- this script is safe.
insert into public.seats (flight_id, seat_number, class, extra_fee)
select
  f.id,
  zone.row_num::text || zone.col,
  zone.cls,
  zone.fee
from public.flights f
cross join lateral (
  -- First class
  select 1 as row_num, c as col, 'first'    as cls, 250::numeric(10,2) as fee from unnest(array['A','C','D','F']) c
  union all
  select 2, c, 'first',    250::numeric(10,2) from unnest(array['A','C','D','F']) c
  union all
  -- Business class
  select 3, c, 'business', 120::numeric(10,2) from unnest(array['A','B','D','E']) c
  union all
  select 4, c, 'business', 120::numeric(10,2) from unnest(array['A','B','D','E']) c
  union all
  select 5, c, 'business', 120::numeric(10,2) from unnest(array['A','B','D','E']) c
  union all
  -- Economy: rows 10–24, columns A–F
  select gs as row_num, c as col, 'economy' as cls, 0::numeric(10,2) as fee
    from generate_series(10, 24) gs
    cross join unnest(array['A','B','C','D','E','F']) c
) as zone
on conflict (flight_id, seat_number) do nothing;
