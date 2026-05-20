"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFlightStore } from "@/store/flight-store";
import { LocationComboBox, type AirportOption } from "@/components/LocationComboBox";
import { airportLabel } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RouteSchedule } from "./RouteSchedule";
import type { FlightRow } from "@/lib/types";

export interface SearchFormProps {
  origins: string[];
  destinations: string[];
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildOptions(codes: string[]): AirportOption[] {
  return codes.map((code) => ({ code, label: airportLabel(code) }));
}

export function SearchForm({ origins, destinations }: SearchFormProps) {
  const router = useRouter();
  const setSearchQuery = useFlightStore((s) => s.setSearchQuery);

  const allLocations = buildOptions(
    Array.from(new Set([...origins, ...destinations])),
  );

  const [origin, setOrigin] = useState(origins[0] ?? "");
  const [destination, setDestination] = useState(
    destinations.find((d) => d !== origins[0]) ?? destinations[0] ?? "",
  );
  const [date, setDate] = useState(todayPlusDays(1));
  const [passengers, setPassengers] = useState(1);

  const [scheduleFlights, setScheduleFlights] = useState<FlightRow[] | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Restore persisted query after mount
  useEffect(() => {
    const stored = useFlightStore.getState().searchQuery;
    if (stored) {
      setOrigin(stored.origin);
      setDestination(stored.destination);
      setDate(stored.date);
      setPassengers(stored.passengers);
    }
  }, []);

  // Fetch upcoming flights whenever origin or destination changes
  useEffect(() => {
    if (!origin || !destination || origin === destination) {
      setScheduleFlights(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    setScheduleLoading(true);
    supabase
      .from("flights")
      .select("*")
      .eq("origin", origin)
      .eq("destination", destination)
      .eq("status", "scheduled")
      .gte("departs_at", new Date().toISOString())
      .order("departs_at", { ascending: true })
      .returns<FlightRow[]>()
      .then(({ data }) => {
        setScheduleFlights(data ?? []);
        setScheduleLoading(false);
      });
  }, [origin, destination]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!origin || !destination || origin === destination) return;
    setSearchQuery({ origin, destination, date, passengers });
    const params = new URLSearchParams({
      origin,
      destination,
      date,
      passengers: String(passengers),
    });
    router.push(`/flights?${params.toString()}`);
  }

  const showSchedule = (origin && destination && origin !== destination);

  return (
    <div className="mt-6 space-y-4">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
      >
        <div className="block sm:col-span-1">
          <span className="text-sm font-medium text-slate-700">From</span>
          <LocationComboBox
            options={allLocations}
            value={origin}
            onChange={setOrigin}
            disabledCode={destination}
            placeholder="Search origin…"
          />
        </div>

        <div className="block sm:col-span-1">
          <span className="text-sm font-medium text-slate-700">To</span>
          <LocationComboBox
            options={allLocations}
            value={destination}
            onChange={setDestination}
            disabledCode={origin}
            placeholder="Search destination…"
          />
        </div>

        <label className="block sm:col-span-1">
          <span className="text-sm font-medium text-slate-700">
            Departure date
          </span>
          <input
            type="date"
            value={date}
            min={todayPlusDays(0)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="text-sm font-medium text-slate-700">Passengers</span>
          <input
            type="number"
            value={passengers}
            min={1}
            max={9}
            onChange={(e) =>
              setPassengers(Math.max(1, Math.min(9, Number(e.target.value) || 1)))
            }
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
          />
        </label>

        <button
          type="submit"
          disabled={!origin || !destination || origin === destination}
          className="sm:col-span-2 rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Search flights
        </button>
      </form>

      {showSchedule && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <RouteSchedule
            flights={scheduleFlights}
            loading={scheduleLoading}
            selectedDate={date}
            onSelectDate={setDate}
          />
        </div>
      )}
    </div>
  );
}
