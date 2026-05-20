"use client";

import Link from "next/link";
import { formatDate, formatTime, flightDuration, formatPrice } from "@/lib/utils";
import type { FlightRow } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

interface Props {
  flights: FlightRow[] | null;
  loading: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function RouteSchedule({ flights, loading, selectedDate, onSelectDate }: Props) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Spinner /> Loading schedule…
      </p>
    );
  }

  if (!flights) return null;

  if (flights.length === 0) {
    return (
      <p className="rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
        No upcoming flights on this route.
      </p>
    );
  }

  // Group by local date string
  const byDate = new Map<string, FlightRow[]>();
  for (const f of flights) {
    const key = f.departs_at.slice(0, 10); // "YYYY-MM-DD"
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(f);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Available flights — click a flight to book it
      </p>
      {Array.from(byDate.entries()).map(([date, dayFlights]) => {
        const isSelected = selectedDate === date;
        return (
          <div
            key={date}
            className={`rounded-lg border px-4 py-3 transition ${
              isSelected
                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500"
                : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDate(date)}
              className={`w-full text-left text-sm font-semibold ${isSelected ? "text-brand-700" : "text-slate-800"}`}
            >
              {formatDate(date)}
            </button>
            <div className="mt-1.5 space-y-1">
              {dayFlights.map((f) => (
                <Link
                  key={f.id}
                  href={`/flights/${f.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-0.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-brand-100 hover:text-brand-800 transition -mx-2"
                >
                  <span className="font-mono text-slate-400 w-14">{f.flight_no}</span>
                  <span>
                    <span className="font-medium text-slate-800">{formatTime(f.departs_at)}</span>
                    {" → "}
                    <span className="font-medium text-slate-800">{formatTime(f.arrives_at)}</span>
                  </span>
                  <span className="text-slate-400">{flightDuration(f.departs_at, f.arrives_at)}</span>
                  <span className="ml-auto font-medium text-slate-700">{formatPrice(Number(f.base_price))}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
