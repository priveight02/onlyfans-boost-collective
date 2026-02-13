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
      ai_dm_conversations: {
        Row: {
          account_id: string
          ai_enabled: boolean
          created_at: string
          id: string
          last_ai_reply_at: string | null
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          participant_avatar_url: string | null
          participant_id: string
          participant_name: string | null
          participant_username: string | null
          platform: string
          platform_conversation_id: string | null
          redirect_sent: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          ai_enabled?: boolean
          created_at?: string
          id?: string
          last_ai_reply_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          participant_avatar_url?: string | null
          participant_id: string
          participant_name?: string | null
          participant_username?: string | null
          platform?: string
          platform_conversation_id?: string | null
          redirect_sent?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          ai_enabled?: boolean
          created_at?: string
          id?: string
          last_ai_reply_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          participant_avatar_url?: string | null
          participant_id?: string
          participant_name?: string | null
          participant_username?: string | null
          platform?: string
          platform_conversation_id?: string | null
          redirect_sent?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_dm_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_dm_messages: {
        Row: {
          account_id: string
          ai_model: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          life_pause_ms: number | null
          metadata: Json | null
          platform_message_id: string | null
          sender_name: string | null
          sender_type: string
          status: string
          typing_delay_ms: number | null
        }
        Insert: {
          account_id: string
          ai_model?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          life_pause_ms?: number | null
          metadata?: Json | null
          platform_message_id?: string | null
          sender_name?: string | null
          sender_type: string
          status?: string
          typing_delay_ms?: number | null
        }
        Update: {
          account_id?: string
          ai_model?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          life_pause_ms?: number | null
          metadata?: Json | null
          platform_message_id?: string | null
          sender_name?: string | null
          sender_type?: string
          status?: string
          typing_delay_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_dm_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_respond_state: {
        Row: {
          account_id: string
          id: string
          is_active: boolean
          redirect_url: string | null
          trigger_keywords: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          id?: string
          is_active?: boolean
          redirect_url?: string | null
          trigger_keywords?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          id?: string
          is_active?: boolean
          redirect_url?: string | null
          trigger_keywords?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_respond_state_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          account_id: string | null
          actions: Json | null
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_run_at: string | null
          script_id: string | null
          status: string
          success_rate: number | null
          title: string
          total_runs: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_run_at?: string | null
          script_id?: string | null
          status?: string
          success_rate?: number | null
          title: string
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_run_at?: string | null
          script_id?: string | null
          status?: string
          success_rate?: number | null
          title?: string
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_workflows_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_link_clicks: {
        Row: {
          bio_link_id: string
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_hash: string | null
          link_index: number | null
          link_url: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          bio_link_id: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          link_index?: number | null
          link_url?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          bio_link_id?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          link_index?: number | null
          link_url?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bio_link_clicks_bio_link_id_fkey"
            columns: ["bio_link_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_links: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          background_color: string | null
          bio: string | null
          created_at: string
          custom_css: string | null
          id: string
          is_active: boolean | null
          links: Json
          metadata: Json | null
          of_link: string | null
          slug: string
          social_links: Json | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          is_active?: boolean | null
          links?: Json
          metadata?: Json | null
          of_link?: string | null
          slug: string
          social_links?: Json | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          is_active?: boolean | null
          links?: Json
          metadata?: Json | null
          of_link?: string | null
          slug?: string
          social_links?: Json | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          contract_id: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          message_type: string
          metadata: Json | null
          room_id: string
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          content?: string | null
          contract_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          room_id: string
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          content?: string | null
          contract_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          room_id?: string
          sender_id?: string | null
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          team_member_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          team_member_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          team_member_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          room_type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          room_type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          account_id: string | null
          ai_suggestions: Json | null
          caption: string | null
          content_type: string
          created_at: string
          created_by: string | null
          cta: string | null
          description: string | null
          engagement_prediction: number | null
          hashtags: string[] | null
          id: string
          media_urls: Json | null
          metadata: Json | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          viral_score: number | null
        }
        Insert: {
          account_id?: string | null
          ai_suggestions?: Json | null
          caption?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          description?: string | null
          engagement_prediction?: number | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          metadata?: Json | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          viral_score?: number | null
        }
        Update: {
          account_id?: string | null
          ai_suggestions?: Json | null
          caption?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          description?: string | null
          engagement_prediction?: number | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          metadata?: Json | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          viral_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      copilot_conversations: {
        Row: {
          account_id: string | null
          context_type: string | null
          created_at: string
          created_by: string | null
          id: string
          messages: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_generated_content: {
        Row: {
          account_id: string | null
          aspect_ratio: string | null
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          mode: string | null
          prompt: string | null
          quality_mode: string | null
          url: string
        }
        Insert: {
          account_id?: string | null
          aspect_ratio?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          mode?: string | null
          prompt?: string | null
          quality_mode?: string | null
          url: string
        }
        Update: {
          account_id?: string | null
          aspect_ratio?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          mode?: string | null
          prompt?: string | null
          quality_mode?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_generated_content_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_voices: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          elevenlabs_voice_id: string | null
          id: string
          is_preset: boolean | null
          name: string
          preview_url: string | null
          sample_urls: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          is_preset?: boolean | null
          name: string
          preview_url?: string | null
          sample_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          is_preset?: boolean | null
          name?: string
          preview_url?: string | null
          sample_urls?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      fan_emotional_profiles: {
        Row: {
          account_id: string
          attachment_level: number | null
          churn_risk: number | null
          conflict_risk: number | null
          created_at: string
          emotional_triggers: Json | null
          fan_identifier: string
          fan_name: string | null
          id: string
          interaction_count: number | null
          last_interaction_at: string | null
          notes: string | null
          obsession_risk: number | null
          sentiment_history: Json | null
          spending_motivation: string | null
          tags: string[] | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          attachment_level?: number | null
          churn_risk?: number | null
          conflict_risk?: number | null
          created_at?: string
          emotional_triggers?: Json | null
          fan_identifier: string
          fan_name?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          notes?: string | null
          obsession_risk?: number | null
          sentiment_history?: Json | null
          spending_motivation?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          attachment_level?: number | null
          churn_risk?: number | null
          conflict_risk?: number | null
          created_at?: string
          emotional_triggers?: Json | null
          fan_identifier?: string
          fan_name?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          notes?: string | null
          obsession_risk?: number | null
          sentiment_history?: Json | null
          spending_motivation?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_emotional_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
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
      persona_consistency_checks: {
        Row: {
          account_id: string
          check_type: string
          consistency_score: number | null
          content_checked: string | null
          created_at: string
          id: string
          issues: Json | null
          suggestions: Json | null
        }
        Insert: {
          account_id: string
          check_type?: string
          consistency_score?: number | null
          content_checked?: string | null
          created_at?: string
          id?: string
          issues?: Json | null
          suggestions?: Json | null
        }
        Update: {
          account_id?: string
          check_type?: string
          consistency_score?: number | null
          content_checked?: string | null
          created_at?: string
          id?: string
          issues?: Json | null
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_consistency_checks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_profiles: {
        Row: {
          account_id: string
          boundaries: string | null
          brand_identity: string | null
          burnout_risk: number | null
          communication_rules: Json | null
          created_at: string
          created_by: string | null
          emotional_range: string
          id: string
          last_mood_update: string | null
          mood: string | null
          motivation_level: number | null
          personality_traits: Json | null
          stress_level: number | null
          tone: string
          updated_at: string
          vocabulary_style: string
        }
        Insert: {
          account_id: string
          boundaries?: string | null
          brand_identity?: string | null
          burnout_risk?: number | null
          communication_rules?: Json | null
          created_at?: string
          created_by?: string | null
          emotional_range?: string
          id?: string
          last_mood_update?: string | null
          mood?: string | null
          motivation_level?: number | null
          personality_traits?: Json | null
          stress_level?: number | null
          tone?: string
          updated_at?: string
          vocabulary_style?: string
        }
        Update: {
          account_id?: string
          boundaries?: string | null
          brand_identity?: string | null
          burnout_risk?: number | null
          communication_rules?: Json | null
          created_at?: string
          created_by?: string | null
          emotional_range?: string
          id?: string
          last_mood_update?: string | null
          mood?: string | null
          motivation_level?: number | null
          personality_traits?: Json | null
          stress_level?: number | null
          tone?: string
          updated_at?: string
          vocabulary_style?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
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
      script_steps: {
        Row: {
          condition_logic: Json | null
          content: string | null
          conversion_rate: number | null
          created_at: string
          delay_minutes: number | null
          drop_off_rate: number | null
          id: string
          impressions: number | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          price: number | null
          revenue_generated: number | null
          script_id: string
          step_order: number
          step_type: string
          title: string
          updated_at: string
        }
        Insert: {
          condition_logic?: Json | null
          content?: string | null
          conversion_rate?: number | null
          created_at?: string
          delay_minutes?: number | null
          drop_off_rate?: number | null
          id?: string
          impressions?: number | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          price?: number | null
          revenue_generated?: number | null
          script_id: string
          step_order?: number
          step_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          condition_logic?: Json | null
          content?: string | null
          conversion_rate?: number | null
          created_at?: string
          delay_minutes?: number | null
          drop_off_rate?: number | null
          id?: string
          impressions?: number | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          price?: number | null
          revenue_generated?: number | null
          script_id?: string
          step_order?: number
          step_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_steps_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          account_id: string | null
          avg_completion_rate: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          parent_script_id: string | null
          status: string
          target_segment: string
          title: string
          total_conversions: number | null
          total_revenue: number | null
          total_runs: number | null
          updated_at: string
          version: number
        }
        Insert: {
          account_id?: string | null
          avg_completion_rate?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          parent_script_id?: string | null
          status?: string
          target_segment?: string
          title: string
          total_conversions?: number | null
          total_revenue?: number | null
          total_runs?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string | null
          avg_completion_rate?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          parent_script_id?: string | null
          status?: string
          target_segment?: string
          title?: string
          total_conversions?: number | null
          total_revenue?: number | null
          total_runs?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_parent_script_id_fkey"
            columns: ["parent_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
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
      social_analytics: {
        Row: {
          account_id: string | null
          created_at: string
          fetched_at: string
          id: string
          metric_type: string
          metric_value: number | null
          period_end: string | null
          period_start: string | null
          platform: string
          raw_data: Json | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          metric_type: string
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
          platform: string
          raw_data?: Json | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          metric_type?: string
          metric_value?: number | null
          period_end?: string | null
          period_start?: string | null
          platform?: string
          raw_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "social_analytics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comment_replies: {
        Row: {
          account_id: string | null
          comment_author: string | null
          comment_id: string
          comment_text: string | null
          created_at: string
          error_message: string | null
          id: string
          platform: string
          post_id: string
          reply_sent_at: string | null
          reply_text: string
          status: string | null
        }
        Insert: {
          account_id?: string | null
          comment_author?: string | null
          comment_id: string
          comment_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          platform: string
          post_id: string
          reply_sent_at?: string | null
          reply_text: string
          status?: string | null
        }
        Update: {
          account_id?: string | null
          comment_author?: string | null
          comment_id?: string
          comment_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          post_id?: string
          reply_sent_at?: string | null
          reply_text?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_comment_replies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          account_id: string
          connected_at: string
          id: string
          is_connected: boolean | null
          metadata: Json | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id: string
          connected_at?: string
          id?: string
          is_connected?: boolean | null
          metadata?: Json | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string
          connected_at?: string
          id?: string
          is_connected?: boolean | null
          metadata?: Json | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          account_id: string | null
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          engagement_data: Json | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          media_urls: Json | null
          metadata: Json | null
          platform: string
          platform_post_id: string | null
          post_type: string
          published_at: string | null
          redirect_url: string | null
          scheduled_at: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          metadata?: Json | null
          platform?: string
          platform_post_id?: string | null
          post_type?: string
          published_at?: string | null
          redirect_url?: string | null
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json | null
          metadata?: Json | null
          platform?: string
          platform_post_id?: string | null
          post_type?: string
          published_at?: string | null
          redirect_url?: string | null
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_runs: {
        Row: {
          account_id: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          id: string
          result: Json | null
          script_id: string | null
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          result?: Json | null
          script_id?: string | null
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          result?: Json | null
          script_id?: string | null
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "managed_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
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
