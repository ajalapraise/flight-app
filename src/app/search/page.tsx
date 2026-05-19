// Search page (Task 01). Server-renders a list of distinct origins/
// destinations from the flights table so the dropdowns are always in sync
// with what's actually bookable.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SearchForm } from "./SearchForm";

export const revalidate = 60; // refresh route lists every minute

export default async function SearchPage() {
  const supabase = createSupabaseServerClient();
  const { data: flights } = await supabase
    .from("flights")
    .select("origin, destination")
    .eq("status", "scheduled");

  const origins = Array.from(
    new Set((flights ?? []).map((f) => f.origin)),
  ).sort();
  const destinations = Array.from(
    new Set((flights ?? []).map((f) => f.destination)),
  ).sort();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">
        Find your flight
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Pick a route, a date, and how many passengers are travelling.
      </p>
      <SearchForm origins={origins} destinations={destinations} />
    </div>
  );
}
