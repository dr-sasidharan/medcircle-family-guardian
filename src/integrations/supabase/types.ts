export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          caretaker_notified: boolean
          created_at: string
          doctor_id: string
          doctor_slot_id: string
          id: string
          notes: string | null
          patient_profile_id: string
          status: string
        }
        Insert: {
          caretaker_notified?: boolean
          created_at?: string
          doctor_id: string
          doctor_slot_id: string
          id?: string
          notes?: string | null
          patient_profile_id: string
          status?: string
        }
        Update: {
          caretaker_notified?: boolean
          created_at?: string
          doctor_id?: string
          doctor_slot_id?: string
          id?: string
          notes?: string | null
          patient_profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_doctor_slot_id_fkey"
            columns: ["doctor_slot_id"]
            isOneToOne: false
            referencedRelation: "doctor_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          profile_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          invitee_email: string | null
          invitee_phone: string | null
          method: string
          permissions_template: Json | null
          profile_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          invitee_email?: string | null
          invitee_phone?: string | null
          method?: string
          permissions_template?: Json | null
          profile_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          invitee_email?: string | null
          invitee_phone?: string | null
          method?: string
          permissions_template?: Json | null
          profile_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_notifications: {
        Row: {
          action_url: string | null
          caregiver_id: string
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          profile_id: string | null
          severity: string
          type: string
        }
        Insert: {
          action_url?: string | null
          caregiver_id: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          profile_id?: string | null
          severity?: string
          type: string
        }
        Update: {
          action_url?: string | null
          caregiver_id?: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          profile_id?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_permissions: {
        Row: {
          can_add_medicines: boolean
          can_add_reports: boolean
          can_edit_medicines: boolean
          can_manage_appointments: boolean
          can_view_adherence: boolean
          can_view_alerts: boolean
          can_view_appointments: boolean
          can_view_medicines: boolean
          can_view_reports: boolean
          caregiver_id: string
          created_at: string
          email_notifications: boolean
          id: string
          invitation_id: string | null
          profile_id: string
          push_notifications: boolean
          role: string
          sms_notifications: boolean
          updated_at: string
        }
        Insert: {
          can_add_medicines?: boolean
          can_add_reports?: boolean
          can_edit_medicines?: boolean
          can_manage_appointments?: boolean
          can_view_adherence?: boolean
          can_view_alerts?: boolean
          can_view_appointments?: boolean
          can_view_medicines?: boolean
          can_view_reports?: boolean
          caregiver_id: string
          created_at?: string
          email_notifications?: boolean
          id?: string
          invitation_id?: string | null
          profile_id: string
          push_notifications?: boolean
          role?: string
          sms_notifications?: boolean
          updated_at?: string
        }
        Update: {
          can_add_medicines?: boolean
          can_add_reports?: boolean
          can_edit_medicines?: boolean
          can_manage_appointments?: boolean
          can_view_adherence?: boolean
          can_view_alerts?: boolean
          can_view_appointments?: boolean
          can_view_medicines?: boolean
          can_view_reports?: boolean
          caregiver_id?: string
          created_at?: string
          email_notifications?: boolean
          id?: string
          invitation_id?: string | null
          profile_id?: string
          push_notifications?: boolean
          role?: string
          sms_notifications?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_permissions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "caregiver_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caretaker_links: {
        Row: {
          caretaker_user_id: string
          created_at: string
          id: string
          patient_profile_id: string
        }
        Insert: {
          caretaker_user_id: string
          created_at?: string
          id?: string
          patient_profile_id: string
        }
        Update: {
          caretaker_user_id?: string
          created_at?: string
          id?: string
          patient_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caretaker_links_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caretakers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          patient_profile_id: string
          phone: string
          relationship: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          patient_profile_id: string
          phone: string
          relationship: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          patient_profile_id?: string
          phone?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "caretakers_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_slots: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_booked: boolean
          slot_date: string
          slot_time: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_booked?: boolean
          slot_date: string
          slot_time: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_booked?: boolean
          slot_date?: string
          slot_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          hospital_name: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          photo_url: string | null
          specialty: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hospital_name: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          specialty: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hospital_name?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          specialty?: string
          user_id?: string | null
        }
        Relationships: []
      }
      doses: {
        Row: {
          created_at: string
          family_profile_id: string | null
          id: string
          medicine_id: string
          missed: boolean
          scheduled_date: string
          scheduled_time: string
          taken: boolean
          taken_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          family_profile_id?: string | null
          id?: string
          medicine_id: string
          missed?: boolean
          scheduled_date?: string
          scheduled_time: string
          taken?: boolean
          taken_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          family_profile_id?: string | null
          id?: string
          medicine_id?: string
          missed?: boolean
          scheduled_date?: string
          scheduled_time?: string
          taken?: boolean
          taken_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doses_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doses_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      family_profiles: {
        Row: {
          age: number | null
          allergies: string[] | null
          allow_emergency_access: boolean
          blood_group: string | null
          conditions: string[] | null
          created_at: string
          doctor_name: string | null
          doctor_phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          height: number | null
          id: string
          is_self: boolean
          name: string
          owner_id: string
          relationship: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string[] | null
          allow_emergency_access?: boolean
          blood_group?: string | null
          conditions?: string[] | null
          created_at?: string
          doctor_name?: string | null
          doctor_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          is_self?: boolean
          name: string
          owner_id: string
          relationship?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string[] | null
          allow_emergency_access?: boolean
          blood_group?: string | null
          conditions?: string[] | null
          created_at?: string
          doctor_name?: string | null
          doctor_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          is_self?: boolean
          name?: string
          owner_id?: string
          relationship?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      family_relationships: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          related_profile_id: string
          relationship_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          related_profile_id: string
          relationship_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          related_profile_id?: string
          relationship_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_relationships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_relationships_related_profile_id_fkey"
            columns: ["related_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_visits: {
        Row: {
          created_at: string
          diagnosis: string
          doctor_name: string
          hospital_name: string
          id: string
          notes: string | null
          patient_profile_id: string
          report_url: string | null
          visit_date: string
        }
        Insert: {
          created_at?: string
          diagnosis: string
          doctor_name: string
          hospital_name: string
          id?: string
          notes?: string | null
          patient_profile_id: string
          report_url?: string | null
          visit_date: string
        }
        Update: {
          created_at?: string
          diagnosis?: string
          doctor_name?: string
          hospital_name?: string
          id?: string
          notes?: string | null
          patient_profile_id?: string
          report_url?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_visits_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_cache: {
        Row: {
          created_at: string
          drug1: string
          drug2: string
          id: string
          interaction_data: Json | null
          rxcui1: string | null
          rxcui2: string | null
          severity: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drug1: string
          drug2: string
          id?: string
          interaction_data?: Json | null
          rxcui1?: string | null
          rxcui2?: string | null
          severity?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drug1?: string
          drug2?: string
          id?: string
          interaction_data?: Json | null
          rxcui1?: string | null
          rxcui2?: string | null
          severity?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      medicine_refills: {
        Row: {
          created_at: string
          family_profile_id: string | null
          id: string
          medicine_id: string
          refill_date: string | null
          tablets_remaining: number
          total_tablets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_profile_id?: string | null
          id?: string
          medicine_id: string
          refill_date?: string | null
          tablets_remaining?: number
          total_tablets?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_profile_id?: string | null
          id?: string
          medicine_id?: string
          refill_date?: string | null
          tablets_remaining?: number
          total_tablets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_refills_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_refills_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          dosage: string
          family_profile_id: string | null
          food_instruction: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          purpose: string | null
          tablets_per_dose: number
          timing: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dosage: string
          family_profile_id?: string | null
          food_instruction?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          purpose?: string | null
          tablets_per_dose?: number
          timing: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          family_profile_id?: string | null
          food_instruction?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          purpose?: string | null
          tablets_per_dose?: number
          timing?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          age: number
          allergies: string[] | null
          blood_group: string | null
          chronic_conditions: string[] | null
          created_at: string
          emergency_contact: string | null
          emergency_notes: string | null
          emergency_token: string
          id: string
          last_active_at: string | null
          medcircle_code: string | null
          name: string
          onboarding_complete: boolean
          photo_url: string | null
          plan: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age?: number
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          emergency_contact?: string | null
          emergency_notes?: string | null
          emergency_token?: string
          id?: string
          last_active_at?: string | null
          medcircle_code?: string | null
          name?: string
          onboarding_complete?: boolean
          photo_url?: string | null
          plan?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age?: number
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          emergency_contact?: string | null
          emergency_notes?: string | null
          emergency_token?: string
          id?: string
          last_active_at?: string | null
          medcircle_code?: string | null
          name?: string
          onboarding_complete?: boolean
          photo_url?: string | null
          plan?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          patient_profile_id: string
          plan: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          upi_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          patient_profile_id: string
          plan: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          upi_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          patient_profile_id?: string
          plan?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          upi_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          send_count: number
          verified: boolean
          window_started_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp: string
          phone: string
          send_count?: number
          verified?: boolean
          window_started_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          send_count?: number
          verified?: boolean
          window_started_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      symptom_checks: {
        Row: {
          created_at: string
          id: string
          is_side_effect: boolean
          likely_medicine: string | null
          patient_profile_id: string
          summary: string | null
          symptom: string
          tamil_explanation: string | null
          urgency: string
          urgency_color: string
          what_to_do: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_side_effect?: boolean
          likely_medicine?: string | null
          patient_profile_id: string
          summary?: string | null
          symptom: string
          tamil_explanation?: string | null
          urgency?: string
          urgency_color?: string
          what_to_do?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_side_effect?: boolean
          likely_medicine?: string | null
          patient_profile_id?: string
          summary?: string | null
          symptom?: string
          tamil_explanation?: string | null
          urgency?: string
          urgency_color?: string
          what_to_do?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_checks_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_reminders: {
        Row: {
          caretaker_notified: boolean | null
          created_at: string
          dosage: string
          followup_sent_at: string | null
          id: string
          medicine_id: string
          medicine_name: string
          phone: string
          response: string | null
          response_at: string | null
          scheduled_date: string
          sent_at: string | null
          timing: string
          user_id: string
        }
        Insert: {
          caretaker_notified?: boolean | null
          created_at?: string
          dosage: string
          followup_sent_at?: string | null
          id?: string
          medicine_id: string
          medicine_name: string
          phone: string
          response?: string | null
          response_at?: string | null
          scheduled_date?: string
          sent_at?: string | null
          timing: string
          user_id: string
        }
        Update: {
          caretaker_notified?: boolean | null
          created_at?: string
          dosage?: string
          followup_sent_at?: string | null
          id?: string
          medicine_id?: string
          medicine_name?: string
          phone?: string
          response?: string | null
          response_at?: string | null
          scheduled_date?: string
          sent_at?: string | null
          timing?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_reminders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_caregiver_invitation: { Args: { _token: string }; Returns: Json }
      caregiver_has_perm: {
        Args: { _perm: string; _profile_id: string }
        Returns: boolean
      }
      decline_caregiver_invitation: { Args: { _token: string }; Returns: Json }
      family_member_status: {
        Args: { _date?: string; _profile_id: string }
        Returns: Json
      }
      get_family_overview: {
        Args: never
        Returns: {
          conditions: string[]
          is_owner: boolean
          is_self: boolean
          name: string
          profile_id: string
          relationship: string
          status: Json
        }[]
      }
      get_linked_patient_ids: { Args: never; Returns: string[] }
      get_my_doctor_id: { Args: never; Returns: string }
      get_my_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_caregiver_of_profile: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_family_profile_owner: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_my_medicine: { Args: { _medicine_id: string }; Returns: boolean }
      lookup_caregiver_invitation: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          id: string
          inviter_email: string
          method: string
          permissions_template: Json
          profile_id: string
          profile_name: string
          role: string
          status: string
        }[]
      }
      lookup_patient_by_medcircle_code: {
        Args: { _code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      scan_refills_for_owner: { Args: { _owner?: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
