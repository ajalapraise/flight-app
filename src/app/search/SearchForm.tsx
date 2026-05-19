'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFlightStore } from '@/store/flight-store';

export interface SearchFormProps {
  origins: string[];
  destinations: string[];
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SearchForm({ origins, destinations }: SearchFormProps) {
  const router = useRouter();
  const setSearchQuery = useFlightStore((s) => s.setSearchQuery);

  // Initial state uses SSR-safe defaults only — reading the persisted
  // store here would cause a React hydration mismatch because the server
  // doesn't have access to localStorage. We hydrate from the store inside
  // a useEffect after mount.
  const [origin, setOrigin] = useState(origins[0] ?? '');
  const [destination, setDestination] = useState(
    destinations.find((d) => d !== origins[0]) ?? destinations[0] ?? '',
  );
  const [date, setDate] = useState(todayPlusDays(1));
  const [passengers, setPassengers] = useState(1);

  useEffect(() => {
    const stored = useFlightStore.getState().searchQuery;
    if (stored) {
      setOrigin(stored.origin);
      setDestination(stored.destination);
      setDate(stored.date);
      setPassengers(stored.passengers);
    }
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (origin === destination) return;
    setSearchQuery({ origin, destination, date, passengers });
    const params = new URLSearchParams({ origin, destination, date, passengers: String(passengers) });
    router.push(`/flights?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
    >
      <label className="block sm:col-span-1">
        <span className="text-sm font-medium text-slate-700">From</span>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
        >
          {origins.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <label className="block sm:col-span-1">
        <span className="text-sm font-medium text-slate-700">To</span>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
        >
          {destinations.map((d) => (
            <option key={d} value={d} disabled={d === origin}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="block sm:col-span-1">
        <span className="text-sm font-medium text-slate-700">Departure date</span>
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
          onChange={(e) => setPassengers(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
        />
      </label>

      <button
        type="submit"
        disabled={origin === destination}
        className="sm:col-span-2 rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Search flights
      </button>
    </form>
  );
}
