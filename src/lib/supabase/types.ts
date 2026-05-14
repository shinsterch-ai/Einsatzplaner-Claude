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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignment_types: {
        Row: {
          code: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_employee_id: string | null
          created_at: string
          date: string
          duration_minutes: number
          employee_note: string | null
          end_time: string | null
          id: string
          internal_note: string | null
          organization_id: string
          patient_id: string
          preferred_end_time: string
          preferred_start_time: string
          priority: Database["public"]["Enums"]["priority_level"]
          recurrence: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date: string | null
          responsible_person_id: string | null
          series_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          type: Database["public"]["Enums"]["assignment_type"]
          updated_at: string
          zone: string | null
        }
        Insert: {
          assigned_employee_id?: string | null
          created_at?: string
          date: string
          duration_minutes: number
          employee_note?: string | null
          end_time?: string | null
          id?: string
          internal_note?: string | null
          organization_id: string
          patient_id: string
          preferred_end_time: string
          preferred_start_time: string
          priority?: Database["public"]["Enums"]["priority_level"]
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date?: string | null
          responsible_person_id?: string | null
          series_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          type: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string
          zone?: string | null
        }
        Update: {
          assigned_employee_id?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number
          employee_note?: string | null
          end_time?: string | null
          id?: string
          internal_note?: string | null
          organization_id?: string
          patient_id?: string
          preferred_end_time?: string
          preferred_start_time?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date?: string | null
          responsible_person_id?: string | null
          series_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          type?: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      component_registry: {
        Row: {
          baseline_response_ms: number | null
          category: Database["public"]["Enums"]["component_category"]
          created_at: string
          dependencies: string[] | null
          id: string
          is_critical: boolean
          last_healthy: string | null
          name: string
          path: string | null
          updated_at: string
        }
        Insert: {
          baseline_response_ms?: number | null
          category: Database["public"]["Enums"]["component_category"]
          created_at?: string
          dependencies?: string[] | null
          id?: string
          is_critical?: boolean
          last_healthy?: string | null
          name: string
          path?: string | null
          updated_at?: string
        }
        Update: {
          baseline_response_ms?: number | null
          category?: Database["public"]["Enums"]["component_category"]
          created_at?: string
          dependencies?: string[] | null
          id?: string
          is_critical?: boolean
          last_healthy?: string | null
          name?: string
          path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string | null
          id: string
          is_available: boolean
          start_time: string | null
          updated_at: string
          week_pattern: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          start_time?: string | null
          updated_at?: string
          week_pattern?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          start_time?: string | null
          updated_at?: string
          week_pattern?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_qualifications: {
        Row: {
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          certified_at: string | null
          created_at: string
          employee_id: string
          expires_at: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          certified_at?: string | null
          created_at?: string
          employee_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          certified_at?: string | null
          created_at?: string
          employee_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_qualifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vacations: {
        Row: {
          created_at: string
          created_by: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          note: string | null
          organization_id: string
          start_date: string
          status: string
          updated_at: string
          vacation_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          note?: string | null
          organization_id: string
          start_date: string
          status?: string
          updated_at?: string
          vacation_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          note?: string | null
          organization_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          vacation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_vacations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      health_alerts: {
        Row: {
          ai_suggestion: string | null
          check_id: string | null
          created_at: string
          description: string | null
          id: string
          is_resolved: boolean
          notified_at: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          updated_at: string
        }
        Insert: {
          ai_suggestion?: string | null
          check_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          notified_at?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
          updated_at?: string
        }
        Update: {
          ai_suggestion?: string | null
          check_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          notified_at?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_alerts_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "health_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          check_type: Database["public"]["Enums"]["health_check_type"]
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          status: Database["public"]["Enums"]["health_status"]
          target_name: string
        }
        Insert: {
          check_type: Database["public"]["Enums"]["health_check_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status?: Database["public"]["Enums"]["health_status"]
          target_name: string
        }
        Update: {
          check_type?: Database["public"]["Enums"]["health_check_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status?: Database["public"]["Enums"]["health_status"]
          target_name?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          notify_assignment_cancelled: boolean
          notify_assignment_changed: boolean
          notify_new_assignment: boolean
          organization_id: string
          send_email: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_assignment_cancelled?: boolean
          notify_assignment_changed?: boolean
          notify_new_assignment?: boolean
          organization_id: string
          send_email?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_assignment_cancelled?: boolean
          notify_assignment_changed?: boolean
          notify_new_assignment?: boolean
          organization_id?: string
          send_email?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          is_sick: boolean | null
          must_change_password: boolean
          organization_id: string | null
          phone: string | null
          sick_note: string | null
          sick_since: string | null
          sick_until: string | null
          updated_at: string
          vacation_days_total: number | null
          vacation_days_used: number | null
          weekly_hours: number | null
          work_mode: string | null
          work_percentage: number | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_sick?: boolean | null
          must_change_password?: boolean
          organization_id?: string | null
          phone?: string | null
          sick_note?: string | null
          sick_since?: string | null
          sick_until?: string | null
          updated_at?: string
          vacation_days_total?: number | null
          vacation_days_used?: number | null
          weekly_hours?: number | null
          work_mode?: string | null
          work_percentage?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_sick?: boolean | null
          must_change_password?: boolean
          organization_id?: string | null
          phone?: string | null
          sick_note?: string | null
          sick_since?: string | null
          sick_until?: string | null
          updated_at?: string
          vacation_days_total?: number | null
          vacation_days_used?: number | null
          weekly_hours?: number | null
          work_mode?: string | null
          work_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_rules: {
        Row: {
          applies_to_employee_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parameters: Json
          priority: number
          rule_category: Database["public"]["Enums"]["scheduling_rule_category"]
          rule_type: Database["public"]["Enums"]["scheduling_rule_type"]
          updated_at: string
        }
        Insert: {
          applies_to_employee_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parameters?: Json
          priority?: number
          rule_category?: Database["public"]["Enums"]["scheduling_rule_category"]
          rule_type: Database["public"]["Enums"]["scheduling_rule_type"]
          updated_at?: string
        }
        Update: {
          applies_to_employee_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parameters?: Json
          priority?: number
          rule_category?: Database["public"]["Enums"]["scheduling_rule_category"]
          rule_type?: Database["public"]["Enums"]["scheduling_rule_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_time_cache: {
        Row: {
          cached_at: string
          destination_address: string
          distance_meters: number | null
          id: string
          organization_id: string
          origin_address: string
          travel_time_minutes: number
        }
        Insert: {
          cached_at?: string
          destination_address: string
          distance_meters?: number | null
          id?: string
          organization_id: string
          origin_address: string
          travel_time_minutes: number
        }
        Update: {
          cached_at?: string
          destination_address?: string
          distance_meters?: number | null
          id?: string
          organization_id?: string
          origin_address?: string
          travel_time_minutes?: number
        }
        Relationships: []
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
      worktime_settings: {
        Row: {
          block_conflicts: boolean
          created_at: string
          id: string
          max_daily_hours: number
          min_break_after_hours: number
          min_break_duration_minutes: number
          organization_id: string
          updated_at: string
          weekly_hours_base: number
        }
        Insert: {
          block_conflicts?: boolean
          created_at?: string
          id?: string
          max_daily_hours?: number
          min_break_after_hours?: number
          min_break_duration_minutes?: number
          organization_id: string
          updated_at?: string
          weekly_hours_base?: number
        }
        Update: {
          block_conflicts?: boolean
          created_at?: string
          id?: string
          max_daily_hours?: number
          min_break_after_hours?: number
          min_break_duration_minutes?: number
          organization_id?: string
          updated_at?: string
          weekly_hours_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "worktime_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_severity: "warning" | "critical"
      app_role: "superadmin" | "admin" | "planer" | "mitarbeiter"
      assignment_status:
        | "draft"
        | "planned"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      assignment_type:
        | "grundpflege"
        | "behandlungspflege"
        | "abklaerung"
        | "haushalt"
        | "privatleistungen"
      component_category:
        | "page"
        | "component"
        | "hook"
        | "edge_function"
        | "table"
      health_check_type: "api" | "database" | "edge_function" | "component"
      health_status: "healthy" | "degraded" | "error"
      priority_level: "normal" | "urgent"
      recurrence_type: "none" | "daily" | "weekly"
      scheduling_rule_category: "hard" | "soft"
      scheduling_rule_type:
        | "max_hours_per_day"
        | "min_break_between_shifts"
        | "no_weekend_work"
        | "max_consecutive_days"
        | "max_hours_per_week"
        | "min_rest_per_week"
        | "no_night_shifts"
        | "max_patients_per_day"
        | "required_qualification"
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
      alert_severity: ["warning", "critical"],
      app_role: ["superadmin", "admin", "planer", "mitarbeiter"],
      assignment_status: [
        "draft",
        "planned",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      assignment_type: [
        "grundpflege",
        "behandlungspflege",
        "abklaerung",
        "haushalt",
        "privatleistungen",
      ],
      component_category: [
        "page",
        "component",
        "hook",
        "edge_function",
        "table",
      ],
      health_check_type: ["api", "database", "edge_function", "component"],
      health_status: ["healthy", "degraded", "error"],
      priority_level: ["normal", "urgent"],
      recurrence_type: ["none", "daily", "weekly"],
      scheduling_rule_category: ["hard", "soft"],
      scheduling_rule_type: [
        "max_hours_per_day",
        "min_break_between_shifts",
        "no_weekend_work",
        "max_consecutive_days",
        "max_hours_per_week",
        "min_rest_per_week",
        "no_night_shifts",
        "max_patients_per_day",
        "required_qualification",
      ],
    },
  },
} as const
