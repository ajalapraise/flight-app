// Confirmation page (Task 01). Shows PNR + seat + flight summary.
// RLS guarantees the user can only fetch their own booking.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatPrice, airportLabel } from "@/lib/utils";
import type { BookingRow, FlightRow, SeatRow, PassengerRow } from "@/lib/types";

export default async function ConfirmationPage({
  params,
}: {
  params: { pnr: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("pnr_code", params.pnr)
    .single<BookingRow>();

  if (!booking) notFound();

  const [{ data: flight }, { data: seat }, { data: passenger }] =
    await Promise.all([
      supabase
        .from("flights")
        .select("*")
        .eq("id", booking.flight_id)
        .single<FlightRow>(),
      supabase
        .from("seats")
        .select("*")
        .eq("id", booking.seat_id)
        .single<SeatRow>(),
      supabase
        .from("passengers")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single<PassengerRow>(),
    ]);

  if (!flight || !seat) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <p className="text-sm font-medium">Booking confirmed ✓</p>
        <p className="mt-1 text-xs">
          A copy of your itinerary has been associated with your account.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          PNR code
        </p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-widest text-slate-900">
          {booking.pnr_code}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Item label="Flight" value={flight.flight_no} />
          <Item
            label="Route"
            value={`${airportLabel(flight.origin)} → ${airportLabel(flight.destination)}`}
          />
          <Item label="Departure" value={formatDateTime(flight.departs_at)} />
          <Item label="Arrival" value={formatDateTime(flight.arrives_at)} />
          <Item label="Aircraft" value={flight.aircraft_type} />
          <Item label="Seat" value={`${seat.seat_number} (${seat.class})`} />
          {passenger && (
            <>
              <Item label="Passenger" value={passenger.full_name} />
              <Item label="Nationality" value={passenger.nationality} />
            </>
          )}
          <Item
            label="Total paid"
            value={formatPrice(Number(booking.total_price))}
          />
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/bookings"
          className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          View my bookings
        </Link>
        <Link
          href="/search"
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Book another flight
        </Link>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}
