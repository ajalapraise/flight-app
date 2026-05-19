// Side-effect-only component: pushes the server-fetched bookings snapshot
// into useUserStore's persisted slice so the same list is readable when
// the user opens the page offline.

"use client";

import { useEffect } from "react";
import { useUserStore, type CachedBooking } from "@/store/user-store";

export function CacheBookingsForOffline({
  snapshot,
}: {
  snapshot: CachedBooking[];
}) {
  const setCachedBookings = useUserStore((s) => s.setCachedBookings);
  useEffect(() => {
    setCachedBookings(snapshot);
    // Snapshot is freshly computed on every server render, so safe to depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(snapshot)]);
  return null;
}
