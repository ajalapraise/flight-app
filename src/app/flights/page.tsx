// Results page. Server-renders the matching flights for the search query,
// plus per-class seat counts so the FlightCard can show availability
// without fetching the full seat list.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FlightCard } from "@/components/FlightCard";
import { formatDate, airportLabel } from "@/lib/utils";
import type { FlightRow, SeatClass } from "@/lib/types";

interface SearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: string;
}

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const origin = searchParams.origin ?? "";
  const destination = searchParams.destination ?? "";
  const date = searchParams.date ?? "";
  const passengers = Number(searchParams.passengers ?? "1");

  if (!origin || !destination || !date) {
    return (
      <div className="text-center">
        <p className="text-slate-700">Missing search parameters.</p>
        <Link
          href="/search"
          className="mt-3 inline-block text-brand-700 hover:underline"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  const supabase = createSupabaseServerClient();

  // Day window: [date 00:00, date+1 00:00). Using UTC to match the seed's
  // `now() + interval` timestamps; in production we'd use the airport's TZ.
  const dayStart = new Date(`${date}T00:00:00Z`).toISOString();
  const dayEnd = new Date(
    new Date(`${date}T00:00:00Z`).getTime() + 86_400_000,
  ).toISOString();

  const { data: flights, error: flightsError } = await supabase
    .from("flights")
    .select("*")
    .eq("origin", origin)
    .eq("destination", destination)
    .eq("status", "scheduled")
    .gte("departs_at", dayStart)
    .lt("departs_at", dayEnd)
    .order("departs_at", { ascending: true })
    .returns<FlightRow[]>();

  if (flightsError) {
    return <ErrorState message={flightsError.message} />;
  }

  // Per-flight class availability — fetched in one query.
  const flightIds = (flights ?? []).map((f) => f.id);
  const availability: Record<string, Record<SeatClass, number>> = {};
  if (flightIds.length > 0) {
    const { data: seats } = await supabase
      .from("seats")
      .select("flight_id, class, is_available")
      .in("flight_id", flightIds)
      .eq("is_available", true);

    for (const id of flightIds) {
      availability[id] = { economy: 0, business: 0, first: 0 };
    }
    for (const s of seats ?? []) {
      availability[s.flight_id][s.class] += 1;
    }
  }

  return (
    <div>
      <Link href="/search" className="text-sm text-brand-700 hover:underline">
        ← New search
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {airportLabel(origin)} → {airportLabel(destination)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatDate(date)} · {passengers} passenger
          {passengers === 1 ? "" : "s"}
        </p>
      </header>

      {!flights || flights.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          No flights found on this route for the selected date.
        </p>
      ) : (
        <ul className="space-y-3">
          {flights.map((f) => (
            <li key={f.id}>
              <FlightCard
                flight={f}
                classAvailability={
                  availability[f.id] ?? { economy: 0, business: 0, first: 0 }
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      Couldn&apos;t load flights: {message}
    </p>
  );
}
