// My Bookings (Task 03). Server-renders the list under RLS — Supabase will
// only return rows where bookings.user_id = auth.uid().

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingActions } from "./BookingActions";
import { CacheBookingsForOffline } from "./CacheBookingsForOffline";
import { formatDateTime, formatPrice, hoursUntil } from "@/lib/utils";
import type { BookingRow, FlightRow, SeatRow } from "@/lib/types";

interface BookingWithJoins extends BookingRow {
  flights: Pick<
    FlightRow,
    | "id"
    | "flight_no"
    | "origin"
    | "destination"
    | "departs_at"
    | "arrives_at"
    | "status"
  >;
  seats: Pick<SeatRow, "id" | "seat_number" | "class">;
}

export default async function MyBookingsPage() {
  const supabase = createSupabaseServerClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id, user_id, flight_id, seat_id, status, booked_at, total_price, pnr_code,
      flights:flights ( id, flight_no, origin, destination, departs_at, arrives_at, status ),
      seats:seats ( id, seat_number, class )
    `,
    )
    .order("booked_at", { ascending: false })
    .returns<BookingWithJoins[]>();

  if (error) {
    return (
      <p className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Couldn&apos;t load bookings: {error.message}
      </p>
    );
  }

  const rows = bookings ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My bookings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Everything you&apos;ve booked. Cancellations within 2 hours of
          departure are blocked at the database level.
        </p>
      </header>

      {/* Pushes a fresh snapshot into the persisted user-store so that
          this page can render from cache on the next offline visit. */}
      <CacheBookingsForOffline
        snapshot={rows.map((r) => ({
          booking: {
            id: r.id,
            user_id: r.user_id,
            flight_id: r.flight_id,
            seat_id: r.seat_id,
            status: r.status,
            booked_at: r.booked_at,
            total_price: Number(r.total_price),
            pnr_code: r.pnr_code,
          },
          flight: r.flights,
          seat: r.seats,
        }))}
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          You have no bookings yet.{" "}
          <Link href="/search" className="text-brand-700 hover:underline">
            Find a flight →
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => {
            const hoursOut = hoursUntil(b.flights.departs_at);
            const canModify = b.status !== "cancelled" && hoursOut > 2;
            return (
              <li
                key={b.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {b.flights.origin} → {b.flights.destination}
                      </h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-slate-600">
                      {b.flights.flight_no} · Seat {b.seats.seat_number} (
                      {b.seats.class})
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Depart {formatDateTime(b.flights.departs_at)} · Arrive{" "}
                      {formatDateTime(b.flights.arrives_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      PNR{" "}
                      <span className="font-mono tracking-widest text-slate-800">
                        {b.pnr_code}
                      </span>{" "}
                      · Total {formatPrice(Number(b.total_price))}
                    </p>
                  </div>
                  <BookingActions
                    bookingId={b.id}
                    canModify={canModify}
                    hoursOut={hoursOut}
                    status={b.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
