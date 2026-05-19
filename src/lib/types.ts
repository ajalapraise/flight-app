// Database type — mirrors migrations/0001_init.sql. Hand-written rather than
// generated so the repo doesn't require `supabase gen types`; if you want to
// regenerate this from a live project, run:
//   supabase gen types typescript --project-id <ref> --schema public

export type SeatClass = "economy" | "business" | "first";
export type FlightStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "arrived"
  | "cancelled";
export type BookingStatus = "confirmed" | "rescheduled" | "cancelled";

export type FlightRow = {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  departs_at: string;
  arrives_at: string;
  aircraft_type: string;
  status: FlightStatus;
  base_price: number;
  created_at: string;
};

export type SeatRow = {
  id: string;
  flight_id: string;
  seat_number: string;
  class: SeatClass;
  is_available: boolean;
  extra_fee: number;
};

export type BookingRow = {
  id: string;
  user_id: string;
  flight_id: string;
  seat_id: string;
  status: BookingStatus;
  booked_at: string;
  total_price: number;
  pnr_code: string;
};

export type PassengerRow = {
  id: string;
  booking_id: string;
  full_name: string;
  passport_no: string;
  nationality: string;
  dob: string;
  created_at: string;
};

export type RescheduleRow = {
  id: string;
  booking_id: string;
  old_flight_id: string;
  new_flight_id: string;
  requested_at: string;
  fee_charged: number;
};

// Argument + return shapes for the RPCs in 0003_rpcs.sql.
export type ReserveSeatArgs = {
  p_flight_id: string;
  p_seat_id: string;
  p_full_name: string;
  p_passport_no: string;
  p_nationality: string;
  p_dob: string;
};
export type ReserveSeatResult = {
  booking_id: string;
  pnr_code: string;
  total_price: number;
};

export type RescheduleArgs = {
  p_booking_id: string;
  p_new_flight_id: string;
  p_new_seat_id: string;
};
export type RescheduleResult = {
  booking_id: string;
  fee_charged: number;
  total_price: number;
};

// The minimal Database shape that satisfies @supabase/supabase-js's generic.
// We only model what we read/write directly; views/RPCs are handled with
// explicit `.returns<T>()` calls at the call sites.
export type Database = {
  public: {
    Tables: {
      flights: {
        Row: FlightRow;
        Insert: Partial<FlightRow>;
        Update: Partial<FlightRow>;
        Relationships: [];
      };
      seats: {
        Row: SeatRow;
        Insert: Partial<SeatRow>;
        Update: Partial<SeatRow>;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: Partial<BookingRow>;
        Update: Partial<BookingRow>;
        Relationships: [];
      };
      passengers: {
        Row: PassengerRow;
        Insert: Partial<PassengerRow>;
        Update: Partial<PassengerRow>;
        Relationships: [];
      };
      reschedules: {
        Row: RescheduleRow;
        Insert: Partial<RescheduleRow>;
        Update: Partial<RescheduleRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      reserve_seat: { Args: ReserveSeatArgs; Returns: ReserveSeatResult[] };
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined };
      reschedule_booking: { Args: RescheduleArgs; Returns: RescheduleResult[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
