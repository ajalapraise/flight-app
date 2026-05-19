// Two-pane client component: the SeatMap on top + the passenger form below.
// Owns the reserve_seat RPC call.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SeatMap } from "@/components/SeatMap";
import { Spinner } from "@/components/Spinner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useFlightStore } from "@/store/flight-store";
import { formatPrice } from "@/lib/utils";
import type { FlightRow, SeatRow } from "@/lib/types";

export interface BookingPanelProps {
  flight: FlightRow;
  initialSeats: SeatRow[];
  isAuthenticated: boolean;
}

export function BookingPanel({
  flight,
  initialSeats,
  isAuthenticated,
}: BookingPanelProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ----- store hookups -----------------------------------------------------
  const selectedSeatId = useFlightStore((s) => s.selectedSeatId);
  const setSelectedSeat = useFlightStore((s) => s.setSelectedSeat);
  const setSelectedFlight = useFlightStore((s) => s.setSelectedFlight);
  const passengerForm = useFlightStore((s) => s.passengerForm);
  const updatePassengerForm = useFlightStore((s) => s.updatePassengerForm);
  const resetFlight = useFlightStore((s) => s.reset);

  // Pin the selected flight in the store whenever this page mounts/changes.
  useEffect(() => {
    setSelectedFlight(flight.id);
  }, [flight.id, setSelectedFlight]);

  // If the persisted seat selection belongs to a different flight, drop it.
  useEffect(() => {
    if (selectedSeatId && !initialSeats.some((s) => s.id === selectedSeatId)) {
      setSelectedSeat(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSeat = useMemo(
    () => initialSeats.find((s) => s.id === selectedSeatId) ?? null,
    [initialSeats, selectedSeatId],
  );

  const total = selectedSeat
    ? flight.base_price + Number(selectedSeat.extra_fee)
    : flight.base_price;

  // ----- submit -----------------------------------------------------------
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      router.push(`/login?next=/flights/${flight.id}`);
      return;
    }
    if (!selectedSeat) {
      setError("Please pick a seat.");
      return;
    }

    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("reserve_seat", {
        p_flight_id: flight.id,
        p_seat_id: selectedSeat.id,
        p_full_name: passengerForm.full_name.trim(),
        p_passport_no: passengerForm.passport_no.trim(),
        p_nationality: passengerForm.nationality.trim(),
        p_dob: passengerForm.dob,
      });

      if (error || !data || data.length === 0) {
        setError(humanizeRpcError(error?.message));
        // If the seat was grabbed by someone else, drop it from the store
        // so the SeatMap re-paints it as occupied on the next Realtime tick.
        if (error?.message?.includes("seat_unavailable")) {
          setSelectedSeat(null);
        }
        return;
      }

      const pnr = data[0].pnr_code;
      resetFlight(); // booking done — clear in-progress state
      router.push(`/confirmation/${pnr}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Pick your seat</h2>
        <SeatMap
          flightId={flight.id}
          initialSeats={initialSeats}
          selectedSeatId={selectedSeatId}
          onSelect={setSelectedSeat}
        />
      </section>

      <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm h-fit">
        <h2 className="text-lg font-semibold text-slate-900">
          Passenger details
        </h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            label="Full name"
            value={passengerForm.full_name}
            onChange={(v) => updatePassengerForm({ full_name: v })}
            required
            autoComplete="name"
          />
          <Field
            label="Passport number"
            value={passengerForm.passport_no}
            onChange={(v) => updatePassengerForm({ passport_no: v })}
            required
            autoComplete="off"
            hint="Stored only in memory — not saved to your browser."
          />
          <Field
            label="Nationality"
            value={passengerForm.nationality}
            onChange={(v) => updatePassengerForm({ nationality: v })}
            required
            autoComplete="country-name"
          />
          <Field
            label="Date of birth"
            type="date"
            value={passengerForm.dob}
            onChange={(v) => updatePassengerForm({ dob: v })}
            required
          />

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Base fare</span>
              <span className="text-slate-900">
                {formatPrice(flight.base_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">
                Seat{" "}
                {selectedSeat
                  ? `${selectedSeat.seat_number} (${selectedSeat.class})`
                  : "—"}
              </span>
              <span className="text-slate-900">
                {selectedSeat
                  ? formatPrice(Number(selectedSeat.extra_fee))
                  : "—"}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {error && (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !selectedSeat}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending && <Spinner />}
            {isAuthenticated ? "Confirm booking" : "Sign in to book"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
      />
      {props.hint && (
        <span className="mt-0.5 block text-xs text-slate-500">
          {props.hint}
        </span>
      )}
    </label>
  );
}

// Map the Postgres-side raise_exception strings to friendly text.
function humanizeRpcError(msg: string | undefined): string {
  if (!msg) return "Could not complete your booking. Please try again.";
  if (msg.includes("seat_unavailable"))
    return "That seat was just taken. Please pick another.";
  if (msg.includes("seat_not_found"))
    return "Seat not found. Please refresh and try again.";
  if (msg.includes("flight_not_bookable"))
    return "This flight is no longer available for booking.";
  if (msg.includes("not_authenticated"))
    return "Please sign in to book a seat.";
  if (msg.includes("pnr_generation_failed"))
    return "A temporary error occurred. Please try again.";
  return msg;
}
