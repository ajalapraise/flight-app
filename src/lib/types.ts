// Database type — mirrors migrations/0001_init.sql. Hand-written rather than
// generated so the repo doesn't require `supabase gen types`; if you want to
// regenerate this from a live project, run:
//   supabase gen types typescript --project-id <ref> --schema public

export type SeatClass = 'economy' | 'business' | 'first';
export type FlightStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'arrived'
  | 'cancelled';
export type BookingStatus = 'confirmed' | 'rescheduled' | 'cancelled';

export interface FlightRow {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  departs_at: string; // ISO
  arrives_at: string; // ISO
  aircraft_type: string;
  status: FlightStatus;
  base_price: number;
  created_at: string;
}

export interface SeatRow {
  id: string;
  flight_id: string;
  seat_number: string;
  class: SeatClass;
  is_available: boolean;
  extra_fee: number;
}

export interface BookingRow {
  id: string;
  user_id: string;
  flight_id: string;
  seat_id: string;
  status: BookingStatus;
  booked_at: string;
  total_price: number;
  pnr_code: string;
}

export interface PassengerRow {
  id: string;
  booking_id: string;
  full_name: string;
  passport_no: string;
  nationality: string;
  dob: string;
  created_at: string;
}

export interface RescheduleRow {
  id: string;
  booking_id: string;
  old_flight_id: string;
  new_flight_id: string;
  requested_at: string;
  fee_charged: number;
}

// Argument + return shapes for the RPCs in 0003_rpcs.sql.
export interface ReserveSeatArgs {
  p_flight_id: string;
  p_seat_id: string;
  p_full_name: string;
  p_passport_no: string;
  p_nationality: string;
  p_dob: string;
}
export interface ReserveSeatResult {
  booking_id: string;
  pnr_code: string;
  total_price: number;
}

export interface RescheduleArgs {
  p_booking_id: string;
  p_new_flight_id: string;
  p_new_seat_id: string;
}
export interface RescheduleResult {
  booking_id: string;
  fee_charged: number;
  total_price: number;
}

// The minimal Database shape that satisfies @supabase/supabase-js's generic.
// We only model what we read/write directly; views/RPCs are handled with
// explicit `.returns<T>()` calls at the call sites.
export interface Database {
  public: {
    Tables: {
      flights: { Row: FlightRow; Insert: Partial<FlightRow>; Update: Partial<FlightRow> };
      seats: { Row: SeatRow; Insert: Partial<SeatRow>; Update: Partial<SeatRow> };
      bookings: { Row: BookingRow; Insert: Partial<BookingRow>; Update: Partial<BookingRow> };
      passengers: { Row: PassengerRow; Insert: Partial<PassengerRow>; Update: Partial<PassengerRow> };
      reschedules: { Row: RescheduleRow; Insert: Partial<RescheduleRow>; Update: Partial<RescheduleRow> };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_seat: { Args: ReserveSeatArgs; Returns: ReserveSeatResult[] };
      cancel_booking: { Args: { p_booking_id: string }; Returns: null };
      reschedule_booking: { Args: RescheduleArgs; Returns: RescheduleResult[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
