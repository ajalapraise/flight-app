// Compact flight card used on the search results page.
//
// The "class options" shown here are derived from the seat counts the
// server queried up-front, so we never load the full seat list into the
// list view — same idea as the Go assignment's list/detail split.

import Link from "next/link";
import { formatPrice, formatTime, flightDuration } from "@/lib/utils";
import type { FlightRow, SeatClass } from "@/lib/types";

export interface FlightCardProps {
  flight: FlightRow;
  classAvailability: Record<SeatClass, number>;
}

export function FlightCard({ flight, classAvailability }: FlightCardProps) {
  const hasAvailability =
    classAvailability.economy +
      classAvailability.business +
      classAvailability.first >
    0;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {flight.flight_no}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {flight.origin} → {flight.destination}
          </h3>
          <p className="text-sm text-slate-600">{flight.aircraft_type}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900">
            {formatPrice(flight.base_price)}
          </p>
          <p className="text-xs text-slate-500">starting from</p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
        <div>
          <span className="font-medium">{formatTime(flight.departs_at)}</span>
          <span className="ml-1 text-slate-500">depart</span>
        </div>
        <div>
          <span className="font-medium">{formatTime(flight.arrives_at)}</span>
          <span className="ml-1 text-slate-500">arrive</span>
        </div>
        <div>
          <span className="font-medium">
            {flightDuration(flight.departs_at, flight.arrives_at)}
          </span>
          <span className="ml-1 text-slate-500">duration</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <ClassPill label="Economy" count={classAvailability.economy} />
        <ClassPill label="Business" count={classAvailability.business} />
        <ClassPill label="First" count={classAvailability.first} />
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/flights/${flight.id}`}
          aria-disabled={!hasAvailability}
          className={`rounded px-4 py-2 text-sm text-white ${
            hasAvailability
              ? "bg-brand-600 hover:bg-brand-700"
              : "pointer-events-none bg-slate-300"
          }`}
        >
          {hasAvailability ? "Choose seat" : "Sold out"}
        </Link>
      </div>
    </article>
  );
}

function ClassPill({ label, count }: { label: string; count: number }) {
  const ok = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ring-1 ring-inset ${
        ok
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      {label} · {count} left
    </span>
  );
}
