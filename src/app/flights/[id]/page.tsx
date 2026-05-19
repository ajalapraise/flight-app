// Flight detail + booking (Task 01 + 02 entry point).
// Server-renders the flight summary and the initial seat snapshot; the
// SeatMap then takes over for Realtime sync on the client.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookingPanel } from "./BookingPanel";
import { formatDateTime, flightDuration, formatPrice } from "@/lib/utils";
import type { FlightRow, SeatRow } from "@/lib/types";

export default async function FlightDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flight } = await supabase
    .from("flights")
    .select("*")
    .eq("id", params.id)
    .single<FlightRow>();

  if (!flight) notFound();

  const { data: seats } = await supabase
    .from("seats")
    .select("*")
    .eq("flight_id", flight.id)
    .order("seat_number", { ascending: true })
    .returns<SeatRow[]>();

  return (
    <div className="space-y-6">
      <Link href="/search" className="text-sm text-brand-700 hover:underline">
        ← New search
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {flight.flight_no} · {flight.aircraft_type}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {flight.origin} → {flight.destination}
            </h1>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {formatPrice(flight.base_price)}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Depart {formatDateTime(flight.departs_at)} · Arrive{" "}
          {formatDateTime(flight.arrives_at)} ·{" "}
          {flightDuration(flight.departs_at, flight.arrives_at)}
        </p>
      </section>

      <BookingPanel
        flight={flight}
        initialSeats={seats ?? []}
        isAuthenticated={!!user}
      />
    </div>
  );
}
