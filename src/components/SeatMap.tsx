// SeatMap (Task 02).
//
// Architecture:
//   - Receives the initial seat snapshot from the server. From there, the
//     local `seats` state is the source of truth.
//   - Subscribes to Supabase Realtime UPDATE events on the `seats` table
//     filtered to this flight. When another user grabs a seat, its row's
//     is_available flips, the postgres_changes payload arrives here, and
//     we patch the local map without a refetch.
//   - Optimistic selection: the click handler updates the store
//     IMMEDIATELY. The actual reservation only happens when the user hits
//     "Confirm booking" in the BookingPanel — until then the seat stays
//     "available" in the DB, so Realtime won't yank it from another
//     visitor. If someone else does book it first, our reservation RPC
//     will fail with `seat_unavailable` and we drop our selection.
//   - Each class lives in its own zone with a heading + colored cells.
//     Layout uses a 6-column CSS grid with the centre aisle (between cols
//     3 and 4) rendered as a thin gap.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SeatRow, SeatClass } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export interface SeatMapProps {
  flightId: string;
  initialSeats: SeatRow[];
  selectedSeatId: string | null;
  /** Called with the seat id when the user clicks an available seat, or null to deselect. */
  onSelect: (id: string | null) => void;
}

// Display order for the zones.
const CLASS_ORDER: SeatClass[] = ['first', 'business', 'economy'];
const CLASS_LABEL: Record<SeatClass, string> = {
  first: 'First class',
  business: 'Business class',
  economy: 'Economy',
};

// The cabin uses 6 columns A-F with an aisle between C (col 3) and D (col 4).
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function SeatMap({ flightId, initialSeats, selectedSeatId, onSelect }: SeatMapProps) {
  const [seats, setSeats] = useState<SeatRow[]>(initialSeats);

  // Re-hydrate local state when the parent swaps in a new seat list
  // (happens on the reschedule flow when the user picks a different flight).
  useEffect(() => {
    setSeats(initialSeats);
  }, [initialSeats]);

  // Refs let the Realtime callback always see the freshest selection +
  // onSelect, without forcing us to tear down & rebuild the subscription
  // every time the user clicks a seat.
  const selectedSeatIdRef = useRef(selectedSeatId);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    selectedSeatIdRef.current = selectedSeatId;
  }, [selectedSeatId]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Realtime subscription on the seats table, filtered to this flight.
  // Only resubscribes when flightId changes.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`seats:flight=${flightId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seats',
          filter: `flight_id=eq.${flightId}`,
        },
        (payload) => {
          const updated = payload.new as SeatRow;
          setSeats((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          // If the seat *we* had optimistically selected just got taken
          // by someone else, drop our selection.
          if (
            updated.id === selectedSeatIdRef.current &&
            updated.is_available === false
          ) {
            onSelectRef.current(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flightId]);

  // Group seats by class for the zone rendering.
  const zones = useMemo(() => {
    const out: Record<SeatClass, SeatRow[]> = { first: [], business: [], economy: [] };
    for (const s of seats) out[s.class].push(s);
    for (const cls of CLASS_ORDER) {
      out[cls].sort(seatCompare);
    }
    return out;
  }, [seats]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Legend />
      {/* Horizontal scroll on small screens so the cabin never overflows. */}
      <div className="overflow-x-auto">
        <div className="mx-auto min-w-[320px] max-w-md py-4">
          {/* Nose-of-aircraft indicator */}
          <div className="mb-3 flex justify-center">
            <div className="h-6 w-24 rounded-t-[50%] border border-slate-200 bg-slate-50" aria-hidden />
          </div>

          {CLASS_ORDER.map((cls) => {
            const zoneSeats = zones[cls];
            if (zoneSeats.length === 0) return null;
            return (
              <SeatZone
                key={cls}
                title={CLASS_LABEL[cls]}
                seats={zoneSeats}
                selectedSeatId={selectedSeatId}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Sort 1A, 1B, ..., 2A, ... by row number then column letter. */
function seatCompare(a: SeatRow, b: SeatRow): number {
  const ra = parseInt(a.seat_number, 10);
  const rb = parseInt(b.seat_number, 10);
  if (ra !== rb) return ra - rb;
  return a.seat_number.localeCompare(b.seat_number);
}

function SeatZone({
  title,
  seats,
  selectedSeatId,
  onSelect,
}: {
  title: string;
  seats: SeatRow[];
  selectedSeatId: string | null;
  onSelect: (id: string | null) => void;
}) {
  // Group seats by row for grid layout.
  const rows = new Map<number, SeatRow[]>();
  for (const s of seats) {
    const r = parseInt(s.seat_number, 10);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(s);
  }

  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-1.5">
        {[...rows.entries()].map(([row, rowSeats]) => (
          <div key={row} className="grid grid-cols-[1.25rem_repeat(3,minmax(0,1fr))_0.5rem_repeat(3,minmax(0,1fr))] items-center gap-1">
            <span className="text-center text-[10px] font-medium text-slate-400">{row}</span>
            {COLS.slice(0, 3).map((col) => {
              const seat = rowSeats.find((s) => s.seat_number.endsWith(col));
              return seat ? (
                <Seat key={seat.id} seat={seat} isSelected={seat.id === selectedSeatId} onSelect={onSelect} />
              ) : (
                <div key={col} aria-hidden />
              );
            })}
            <div aria-hidden /> {/* aisle */}
            {COLS.slice(3).map((col) => {
              const seat = rowSeats.find((s) => s.seat_number.endsWith(col));
              return seat ? (
                <Seat key={seat.id} seat={seat} isSelected={seat.id === selectedSeatId} onSelect={onSelect} />
              ) : (
                <div key={col} aria-hidden />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function Seat({
  seat,
  isSelected,
  onSelect,
}: {
  seat: SeatRow;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const occupied = !seat.is_available;
  const label = occupied
    ? `${seat.seat_number} — occupied (${seat.class}${
        Number(seat.extra_fee) > 0 ? `, +${formatPrice(Number(seat.extra_fee))}` : ''
      })`
    : `${seat.seat_number} — ${seat.class}${
        Number(seat.extra_fee) > 0 ? `, +${formatPrice(Number(seat.extra_fee))}` : ''
      }`;

  let cls =
    'relative aspect-square min-h-[2rem] rounded-md text-[10px] font-medium select-none touch-manipulation transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
  if (occupied) {
    cls += ' bg-slate-300 text-slate-500 cursor-not-allowed';
  } else if (isSelected) {
    cls += ' bg-brand-600 text-white ring-2 ring-brand-700';
  } else if (seat.class === 'first') {
    cls += ' bg-amber-100 text-amber-900 hover:bg-amber-200';
  } else if (seat.class === 'business') {
    cls += ' bg-indigo-100 text-indigo-900 hover:bg-indigo-200';
  } else {
    cls += ' bg-emerald-100 text-emerald-900 hover:bg-emerald-200';
  }

  return (
    <button
      type="button"
      disabled={occupied}
      onClick={() => onSelect(isSelected ? null : seat.id)}
      title={label}
      aria-label={label}
      aria-pressed={isSelected}
      className={cls}
    >
      {seat.seat_number.replace(/^\d+/, '')}
    </button>
  );
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
      <Swatch className="bg-emerald-100 ring-emerald-200" /> Economy
      <Swatch className="bg-indigo-100 ring-indigo-200" /> Business
      <Swatch className="bg-amber-100 ring-amber-200" /> First
      <Swatch className="bg-brand-600 ring-brand-700" /> Selected
      <Swatch className="bg-slate-300 ring-slate-300" /> Occupied
    </div>
  );
}

function Swatch({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 rounded-sm ring-1 ring-inset ${className}`} aria-hidden />;
}
