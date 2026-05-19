// useUserStore — auth session + cached bookings.
//
// Persistence: only the session token survives a reload (partialize). The
// full Session object from Supabase contains refresh tokens and provider
// metadata; we deliberately do NOT cache that in localStorage — Supabase's
// own cookie-based session handles refresh. The token kept here is only a
// hint so the UI can render "you're logged in" before the SSR hydration
// reaches the page.
//
// `cachedBookings` is populated by the My Bookings page and is what makes
// the offline / stale-while-revalidate experience possible (Task 05 bonus,
// but harmless to keep even without PWA).

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useFlightStore } from "./flight-store";
import type { BookingRow, FlightRow, SeatRow } from "@/lib/types";

export interface CachedBooking {
  booking: BookingRow;
  flight: Pick<
    FlightRow,
    "id" | "flight_no" | "origin" | "destination" | "departs_at" | "arrives_at"
  >;
  seat: Pick<SeatRow, "id" | "seat_number" | "class">;
}

export interface UserState {
  userId: string | null;
  email: string | null;
  sessionToken: string | null; // persisted
  cachedBookings: CachedBooking[]; // persisted, for offline reads

  setSession: (s: { userId: string; email: string; token: string }) => void;
  clearSession: () => void;
  setCachedBookings: (b: CachedBooking[]) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      sessionToken: null,
      cachedBookings: [],

      setSession: ({ userId, email, token }) =>
        set({ userId, email, sessionToken: token }),
      clearSession: () =>
        set({ userId: null, email: null, sessionToken: null }),
      setCachedBookings: (cachedBookings) => set({ cachedBookings }),

      // reset on logout — also reset the flight booking store so we don't
      // leak in-progress passenger data between accounts.
      reset: () => {
        set({
          userId: null,
          email: null,
          sessionToken: null,
          cachedBookings: [],
        });
        useFlightStore.getState().reset();
      },
    }),
    {
      name: "user-session-v1",
      storage: createJSONStorage(() => localStorage),
      // Persist only the session token (per the brief) plus the cached
      // bookings list (needed for the My Bookings offline read).
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        cachedBookings: state.cachedBookings,
      }),
      version: 1,
    },
  ),
);
