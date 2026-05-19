import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  rescheduled: 'bg-amber-100 text-amber-800 ring-amber-200',
  cancelled: 'bg-slate-200 text-slate-700 ring-slate-300',
};

const LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
