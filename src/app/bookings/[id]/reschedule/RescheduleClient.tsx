"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SeatMap } from "@/components/SeatMap";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Spinner } from "@/components/Spinner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDateTime, formatPrice, flightDuration } from "@/lib/utils";
import type { FlightRow, SeatRow } from "@/lib/types";

export interface RescheduleClientProps {
  bookingId: string;
  currentTotalPrice: number;
  candidates: FlightRow[];
}

export function RescheduleClient({
  bookingId,
  currentTotalPrice,
  candidates,
}: RescheduleClientProps) {
  const router = useRouter();
  const [selectedFlight, setSelectedFlight] = useState<FlightRow | null>(null);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Fetch seats whenever the candidate flight changes.
  useEffect(() => {
    if (!selectedFlight) {
      setSeats([]);
      setSelectedSeatId(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    setSeatsLoading(true);
    supabase
      .from("seats")
      .select("*")
      .eq("flight_id", selectedFlight.id)
      .order("seat_number", { ascending: true })
      .returns<SeatRow[]>()
      .then(({ data }) => {
        setSeats(data ?? []);
        setSelectedSeatId(null);
        setSeatsLoading(false);
      });
  }, [selectedFlight]);

  const selectedSeat = seats.find((s) => s.id === selectedSeatId) ?? null;
  const newTotal =
    selectedFlight && selectedSeat
      ? Number(selectedFlight.base_price) + Number(selectedSeat.extra_fee)
      : 0;
  const fee = Math.max(0, newTotal - currentTotalPrice);

  function doReschedule() {
    if (!selectedFlight || !selectedSeat) return;
    setError(null);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc("reschedule_booking", {
        p_booking_id: bookingId,
        p_new_flight_id: selectedFlight.id,
        p_new_seat_id: selectedSeat.id,
      });
      if (error) {
        setError(humanize(error.message));
        return;
      }
      setConfirmOpen(false);
      router.push("/bookings");
      router.refresh();
    });
  }

  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
        No alternative flights on this route are currently available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Pick a new flight
        </h2>
        <ul className="space-y-2">
          {candidates.map((f) => {
            const isPicked = selectedFlight?.id === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedFlight(f)}
                  className={`w-full rounded-lg border bg-white p-4 text-left text-sm shadow-sm transition ${
                    isPicked
                      ? "border-brand-500 ring-2 ring-brand-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {f.flight_no}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {formatDateTime(f.departs_at)} →{" "}
                        {formatDateTime(f.arrives_at)}
                      </p>
                      <p className="text-slate-600">
                        {flightDuration(f.departs_at, f.arrives_at)} ·{" "}
                        {f.aircraft_type}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatPrice(Number(f.base_price))}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selectedFlight && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            Pick a seat on {selectedFlight.flight_no}
          </h2>
          {seatsLoading ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading seats…
            </p>
          ) : (
            <SeatMap
              flightId={selectedFlight.id}
              initialSeats={seats}
              selectedSeatId={selectedSeatId}
              onSelect={setSelectedSeatId}
            />
          )}
        </section>
      )}

      {selectedSeat && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Fee summary</h3>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-slate-600">Original total</span>
            <span className="text-right text-slate-900">
              {formatPrice(currentTotalPrice)}
            </span>
            <span className="text-slate-600">New total</span>
            <span className="text-right text-slate-900">
              {formatPrice(newTotal)}
            </span>
            <span className="font-semibold text-slate-900">
              Fee charged today
            </span>
            <span className="text-right font-semibold text-slate-900">
              {formatPrice(fee)}
            </span>
          </div>
          {fee === 0 && (
            <p className="mt-1 text-xs text-emerald-700">
              The new flight is the same price or cheaper — no fee applied.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={pending}
              className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Reschedule booking
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm reschedule"
        message={`Switch this booking to ${selectedFlight?.flight_no} and pay ${formatPrice(fee)} in fees?`}
        confirmLabel="Confirm"
        pending={pending}
        onConfirm={doReschedule}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function humanize(msg: string): string {
  if (msg.includes("seat_unavailable"))
    return "That seat was just taken. Please pick another.";
  if (msg.includes("route_mismatch"))
    return "New flight must be on the same route.";
  if (msg.includes("booking_cancelled"))
    return "You cannot reschedule a cancelled booking.";
  if (msg.includes("flight_not_bookable"))
    return "That flight is no longer bookable.";
  return msg;
}
