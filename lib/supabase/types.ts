export type UserRole = "follower" | "delegate" | "admin" | "leader";
export type AppointmentStatus =
  | "pending_review"
  | "assigned_to_delegate"
  | "scheduled_delegate"
  | "scheduled_leader"
  | "sla_expired"
  | "resolved";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; invite_token: string; created_by: string | null; created_at: string };
        Insert: { name: string; invite_token?: string; created_by?: string | null };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: { id: string; full_name: string; phone: string | null; email: string | null; role: UserRole; organization_id: string | null; created_at: string };
        Insert: { id: string; full_name: string; phone?: string | null; email?: string | null; role?: UserRole; organization_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      system_settings: {
        Row: {
          id: number;
          organization_id: string | null;
          delegate_tier_active: boolean;
          sla_hours_threshold: number;
          min_character_count_business: number;
          min_character_count_outcome: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Row"]>;
      };
      curated_slots: {
        Row: {
          id: string;
          organization_id: string | null;
          assigned_to: string | null;
          title: string;
          visibility: "public_event" | "appointment";
          start_time: string;
          end_time: string;
          max_capacity: number;
          current_occupancy: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["curated_slots"]["Row"]> & { start_time: string; end_time: string };
        Update: Partial<Database["public"]["Tables"]["curated_slots"]["Row"]>;
      };
      appointments: {
        Row: {
          id: string;
          organization_id: string | null;
          tracking_reference: string;
          guest_full_name: string;
          guest_phone: string;
          guest_email: string | null;
          registered_follower_id: string | null;
          slot_id: string | null;
          assigned_agent_id: string | null;
          category: string;
          statement_of_business: string;
          desired_outcome: string;
          status: AppointmentStatus;
          preferred_windows: string[];
          is_time_sensitive: boolean;
          sla_expires_at: string | null;
          reschedule_count: number;
          created_at: string;
        };
        Insert: {
          tracking_reference: string;
          guest_full_name: string;
          guest_phone: string;
          guest_email?: string | null;
          registered_follower_id?: string | null;
          slot_id?: string | null;
          assigned_agent_id?: string | null;
          organization_id?: string | null;
          category: string;
          statement_of_business: string;
          desired_outcome: string;
          status?: AppointmentStatus;
          preferred_windows: string[];
          is_time_sensitive?: boolean;
          sla_expires_at?: string | null;
          reschedule_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      organization_delegate_state: {
        Row: { organization_id: string; last_delegate_id: string | null; updated_at: string };
        Insert: { organization_id: string; last_delegate_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["organization_delegate_state"]["Insert"]>;
      };
      notification_outbox: {
        Row: { id: string; appointment_id: string | null; channel: string; recipient: string; payload: Record<string, unknown>; sent_at: string | null; created_at: string };
        Insert: { appointment_id?: string | null; channel: string; recipient: string; payload: Record<string, unknown>; sent_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["notification_outbox"]["Insert"]>;
      };
    };
    Functions: {
      assign_next_agent: {
        Args: { p_is_time_sensitive: boolean; p_organization_id: string | null };
        Returns: string | null;
      };
      generate_tracking_reference: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
};
