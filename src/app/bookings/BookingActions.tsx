// Per-row cancel + reschedule actions. Cancel is a single Supabase RPC
// (atomic — flips booking.status and frees the seat in one transaction).
// Reschedule routes to a dedicated page.

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { BookingStatus } from '@/lib/types';

export interface BookingActionsProps {
  bookingId: string;
  status: BookingStatus;
  canModify: boolean;
  hoursOut: number;
}

export function BookingActions({ bookingId, status, canModify, hoursOut }: BookingActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (status === 'cancelled') {
    return <p className="text-xs text-slate-500">No actions available</p>;
  }

  if (!canModify) {
    return (
      <p className="max-w-[220px] text-right text-xs text-slate-500">
        Within 2 hours of departure — changes are no longer possible.
        {hoursOut > 0 && ` (T-${hoursOut.toFixed(1)}h)`}
      </p>
    );
  }

  function onCancel() {
    setError(null);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
      if (error) {
        setError(humanize(error.message));
        return;
      }
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Link
          href={`/bookings/${bookingId}/reschedule`}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Reschedule
        </Link>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <ConfirmDialog
        open={dialogOpen}
        title="Cancel this booking?"
        message="Your seat will be released. This action can't be undone."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep booking"
        destructive
        pending={pending}
        onConfirm={onCancel}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}

function humanize(msg: string): string {
  if (msg.includes('cancel_window_closed'))
    return "Cancellations can't be made within 2 hours of departure.";
  if (msg.includes('already_cancelled')) return 'This booking has already been cancelled.';
  if (msg.includes('forbidden')) return 'You can only cancel your own bookings.';
  return msg;
}
