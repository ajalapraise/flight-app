// useFlightStore — persists the active search and in-progress booking so
// the user can close the tab and resume.
//
// Persistence strategy (per Task 04):
//   - The whole `searchQuery` and the lightweight `currentStep` /
//     `selectedFlightId` / `selectedSeatId` survive a reload.
//   - `passengerForm` is partially persisted: name/nationality/dob are kept
//     but `passport_no` is REMOVED before writing to localStorage. Passport
//     numbers are sensitive; we keep them in memory only and the user
//     re-enters them on resume.
//
// The reset() action wipes the in-progress booking. Called on confirmation
// success, on cancellation, and on logout (see user-store.ts).

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BookingStep = 'search' | 'select-flight' | 'select-seat' | 'passenger' | 'review' | 'done';

export interface SearchQuery {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  passengers: number;
}

export interface PassengerForm {
  full_name: string;
  passport_no: string; // NOT persisted — see partialize below
  nationality: string;
  dob: string; // YYYY-MM-DD
}

export interface FlightState {
  searchQuery: SearchQuery | null;
  selectedFlightId: string | null;
  // Optimistic seat selection: this is set immediately in the click
  // handler, before the Supabase RPC confirms (Task 04).
  selectedSeatId: string | null;
  currentStep: BookingStep;
  passengerForm: PassengerForm;

  setSearchQuery: (q: SearchQuery) => void;
  setSelectedFlight: (id: string | null) => void;
  setSelectedSeat: (id: string | null) => void;
  setStep: (s: BookingStep) => void;
  updatePassengerForm: (patch: Partial<PassengerForm>) => void;
  reset: () => void;
}

const initialPassengerForm: PassengerForm = {
  full_name: '',
  passport_no: '',
  nationality: '',
  dob: '',
};

const initialState = {
  searchQuery: null,
  selectedFlightId: null,
  selectedSeatId: null,
  currentStep: 'search' as BookingStep,
  passengerForm: initialPassengerForm,
};

export const useFlightStore = create<FlightState>()(
  persist(
    (set) => ({
      ...initialState,

      setSearchQuery: (searchQuery) => set({ searchQuery, currentStep: 'select-flight' }),
      setSelectedFlight: (selectedFlightId) =>
        set({ selectedFlightId, currentStep: selectedFlightId ? 'select-seat' : 'select-flight' }),
      setSelectedSeat: (selectedSeatId) =>
        set({ selectedSeatId, currentStep: selectedSeatId ? 'passenger' : 'select-seat' }),
      setStep: (currentStep) => set({ currentStep }),
      updatePassengerForm: (patch) =>
        set((state) => ({ passengerForm: { ...state.passengerForm, ...patch } })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'flight-booking-v1',
      storage: createJSONStorage(() => localStorage),
      // partialize: strip passport_no before writing to localStorage. The
      // brief calls this out explicitly under Task 04.
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedFlightId: state.selectedFlightId,
        selectedSeatId: state.selectedSeatId,
        currentStep: state.currentStep,
        passengerForm: {
          full_name: state.passengerForm.full_name,
          passport_no: '', // never persisted
          nationality: state.passengerForm.nationality,
          dob: state.passengerForm.dob,
        },
      }),
      version: 1,
    },
  ),
);
