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
      account_activities: {
        Row: {
          account_id: string
          activity_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          account_id: string
          activity_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          account_id?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "account_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          account_id: string | null
          content: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          signature_data: Json | null
          signed_at: string | null
          status: string
          team_member_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          signature_data?: Json | null
          signed_at?: string | null
          status?: string
          team_member_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          signature_data?: Json | null
          signed_at?: string | null
          status?: string
          team_member_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          record_type: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          record_type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_accounts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          content_count: number | null
          created_at: string
          display_name: string | null
          engagement_rate: number | null
          id: string
          last_activity_at: string | null
          monthly_revenue: number | null
          notes: string | null
          of_auth_id: string | null
          of_connected: boolean | null
          of_connected_at: string | null
          of_session_token: string | null
          of_user_agent: string | null
          of_x_bc: string | null
          onboarded_at: string | null
          platform: string
          social_links: Json | null
          status: string
          subscriber_count: number | null
          tags: string[] | null
          tier: string | null
          total_revenue: number | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content_count?: number | null
          created_at?: string
          display_name?: string | null
          engagement_rate?: number | null
          id?: string
          last_activity_at?: string | null
          monthly_revenue?: number | null
          notes?: string | null
          of_auth_id?: string | null
          of_connected?: boolean | null
          of_connected_at?: string | null
          of_session_token?: string | null
          of_user_agent?: string | null
          of_x_bc?: string | null
          onboarded_at?: string | null
          platform?: string
          social_links?: Json | null
          status?: string
          subscriber_count?: number | null
          tags?: string[] | null
          tier?: string | null
          total_revenue?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content_count?: number | null
          created_at?: string
          display_name?: string | null
          engagement_rate?: number | null
          id?: string
          last_activity_at?: string | null
          monthly_revenue?: number | null
          notes?: string | null
          of_auth_id?: string | null
          of_connected?: boolean | null
          of_connected_at?: string | null
          of_session_token?: string | null
          of_user_agent?: string | null
          of_x_bc?: string | null
          onboarded_at?: string | null
          platform?: string
          social_links?: Json | null
          status?: string
          subscriber_count?: number | null
          tags?: string[] | null
          tier?: string | null
          total_revenue?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          account_id: string
          assigned_chatter: string | null
          created_at: string
          id: string
          last_message_at: string | null
          metadata: Json | null
          priority: string | null
          status: string
          subscriber_id: string | null
          subscriber_name: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_id: string
          assigned_chatter?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string
          subscriber_id?: string | null
          subscriber_name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          assigned_chatter?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string
          subscriber_id?: string | null
          subscriber_name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_assigned_chatter_fkey"
            columns: ["assigned_chatter"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_lookup_history: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          looked_up_by: string | null
          snapshot_data: Json
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          looked_up_by?: string | null
          snapshot_data?: Json
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          looked_up_by?: string | null
          snapshot_data?: Json
          username?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          id: string
          page_path: string
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_account_assignments: {
        Row: {
          account_id: string
          assigned_at: string
          id: string
          role_on_account: string
          team_member_id: string
        }
        Insert: {
          account_id: string
          assigned_at?: string
          id?: string
          role_on_account?: string
          team_member_id: string
        }
        Update: {
          account_id?: string
          assigned_at?: string
          id?: string
          role_on_account?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_account_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_account_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
