// Reschedule page (Task 03). Server-renders the current booking's flight
// + a list of alternative flights on the same route. The actual switch is
// performed via the `reschedule_booking` RPC, which atomically:
//   - frees the old seat
//   - claims the new seat
//   - updates booking.flight_id and total_price
//   - inserts a row into `reschedules` with the fee difference

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RescheduleClient } from "./RescheduleClient";
import type { BookingRow, FlightRow, SeatRow } from "@/lib/types";

export default async function ReschedulePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .single<BookingRow>();
  if (!booking) notFound();

  const { data: currentFlight } = await supabase
    .from("flights")
    .select("*")
    .eq("id", booking.flight_id)
    .single<FlightRow>();
  if (!currentFlight) notFound();

  const { data: currentSeat } = await supabase
    .from("seats")
    .select("*")
    .eq("id", booking.seat_id)
    .single<SeatRow>();

  // Alternative flights: same route, scheduled, departing in the future,
  // not the same flight as the current one.
  const { data: candidates } = await supabase
    .from("flights")
    .select("*")
    .eq("origin", currentFlight.origin)
    .eq("destination", currentFlight.destination)
    .eq("status", "scheduled")
    .gt("departs_at", new Date().toISOString())
    .neq("id", currentFlight.id)
    .order("departs_at", { ascending: true })
    .returns<FlightRow[]>();

  return (
    <div className="space-y-6">
      <Link href="/bookings" className="text-sm text-brand-700 hover:underline">
        ← My bookings
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Reschedule booking
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Currently: {currentFlight.flight_no} ({currentFlight.origin} →{" "}
          {currentFlight.destination}), seat {currentSeat?.seat_number ?? "—"} (
          {currentSeat?.class ?? "—"}).
        </p>
      </header>

      <RescheduleClient
        bookingId={booking.id}
        currentTotalPrice={Number(booking.total_price)}
        candidates={candidates ?? []}
      />
    </div>
  );
}
