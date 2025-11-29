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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ban_appeals: {
        Row: {
          admin_response: string | null
          appeal_reason: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_reason: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_reason?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          caller_id: string
          created_at: string
          id: string
          receiver_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          caller_id: string
          created_at?: string
          id?: string
          receiver_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          caller_id?: string
          created_at?: string
          id?: string
          receiver_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          responded_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          responded_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          responded_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_call_usage: {
        Row: {
          call_count: number
          call_date: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_count?: number
          call_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_count?: number
          call_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_like_usage: {
        Row: {
          created_at: string
          id: string
          like_count: number
          like_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          like_count?: number
          like_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          like_count?: number
          like_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_super_like_usage: {
        Row: {
          created_at: string
          id: string
          super_like_count: number
          super_like_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          super_like_count?: number
          super_like_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          super_like_count?: number
          super_like_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_profiles: {
        Row: {
          age: number | null
          bio: string | null
          created_at: string
          gender: string | null
          id: string
          interests: string[] | null
          location: string | null
          looking_for: string | null
          name: string
          photo_urls: string[] | null
          verified: boolean
        }
        Insert: {
          age?: number | null
          bio?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          interests?: string[] | null
          location?: string | null
          looking_for?: string | null
          name: string
          photo_urls?: string[] | null
          verified?: boolean
        }
        Update: {
          age?: number | null
          bio?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          interests?: string[] | null
          location?: string | null
          looking_for?: string | null
          name?: string
          photo_urls?: string[] | null
          verified?: boolean
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          liked_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_liked_user_id_fkey"
            columns: ["liked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_likes: boolean
          email_matches: boolean
          email_messages: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_likes?: boolean
          email_matches?: boolean
          email_messages?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_likes?: boolean
          email_matches?: boolean
          email_messages?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_verifications: {
        Row: {
          ai_confidence: number | null
          ai_result: Json | null
          created_at: string
          id: string
          pose_type: string
          selfie_url: string | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_result?: Json | null
          created_at?: string
          id?: string
          pose_type: string
          selfie_url?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_result?: Json | null
          created_at?: string
          id?: string
          pose_type?: string
          selfie_url?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profile_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_profile_id: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_profile_id: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_profile_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          created_at: string
          gender: string | null
          id: string
          interests: string[] | null
          is_visible: boolean
          location: string | null
          looking_for: string | null
          name: string
          photo_urls: string[] | null
          preferred_language: string | null
          status: string
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          age?: number | null
          bio?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          location?: string | null
          looking_for?: string | null
          name: string
          photo_urls?: string[] | null
          preferred_language?: string | null
          status?: string
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          age?: number | null
          bio?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_visible?: boolean
          location?: string | null
          looking_for?: string | null
          name?: string
          photo_urls?: string[] | null
          preferred_language?: string | null
          status?: string
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      super_likes: {
        Row: {
          created_at: string
          id: string
          super_liked_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          super_liked_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          super_liked_user_id?: string
          user_id?: string
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
      verification_requests: {
        Row: {
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      matches: {
        Row: {
          matched_at: string | null
          user1_id: string | null
          user2_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_users_matched: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: boolean
      }
      check_login_rate_limit: { Args: { p_email: string }; Returns: boolean }
      check_message_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      get_today_call_count: { Args: { p_user_id: string }; Returns: number }
      get_today_like_count: { Args: { p_user_id: string }; Returns: number }
      get_today_super_like_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_matches: {
        Args: { user_uuid: string }
        Returns: {
          age: number
          last_message: string
          last_message_at: string
          location: string
          match_id: string
          matched_at: string
          name: string
          photo_urls: string[]
          profile_id: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_call_count: { Args: { p_user_id: string }; Returns: number }
      increment_like_count: { Args: { p_user_id: string }; Returns: number }
      increment_super_like_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_email: string; p_success: boolean }
        Returns: undefined
      }
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
