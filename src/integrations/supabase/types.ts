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
      doses: {
        Row: {
          created_at: string
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
            foreignKeyName: "doses_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
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
      medicine_refills: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          refill_date: string | null
          tablets_remaining: number
          total_tablets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          refill_date?: string | null
          tablets_remaining?: number
          total_tablets?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          refill_date?: string | null
          tablets_remaining?: number
          total_tablets?: number
          updated_at?: string
        }
        Relationships: [
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
          food_instruction: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          purpose: string | null
          timing: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dosage: string
          food_instruction?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          purpose?: string | null
          timing: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          food_instruction?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          purpose?: string | null
          timing?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          verified?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_profile_id: { Args: never; Returns: string }
      is_my_medicine: { Args: { _medicine_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
