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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accessibility_preferences: {
        Row: {
          communication_locale: string
          created_at: string
          high_contrast: boolean
          history_enabled: boolean
          owner_id: string
          reduce_motion: boolean
          revision: number
          speech_rate: number
          target_size: number
          text_scale: number
          ui_locale: string
          updated_at: string
          voice_uri: string | null
        }
        Insert: {
          communication_locale?: string
          created_at?: string
          high_contrast?: boolean
          history_enabled?: boolean
          owner_id: string
          reduce_motion?: boolean
          revision?: number
          speech_rate?: number
          target_size?: number
          text_scale?: number
          ui_locale?: string
          updated_at?: string
          voice_uri?: string | null
        }
        Update: {
          communication_locale?: string
          created_at?: string
          high_contrast?: boolean
          history_enabled?: boolean
          owner_id?: string
          reduce_motion?: boolean
          revision?: number
          speech_rate?: number
          target_size?: number
          text_scale?: number
          ui_locale?: string
          updated_at?: string
          voice_uri?: string | null
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          capture_id: string | null
          created_at: string
          decision: string
          id: string
          notice_version: string
          owner_id: string
          scope: string
        }
        Insert: {
          capture_id?: string | null
          created_at?: string
          decision: string
          id?: string
          notice_version: string
          owner_id: string
          scope: string
        }
        Update: {
          capture_id?: string | null
          created_at?: string
          decision?: string
          id?: string
          notice_version?: string
          owner_id?: string
          scope?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          language: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          owner_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          message_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_owned_message"
            columns: ["owner_id", "message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      messages: {
        Row: {
          client_event_id: string
          conversation_id: string
          created_at: string
          id: string
          intent: Json | null
          kind: string
          locale: string
          origin: string
          owner_id: string
          revision: number
          template_version: string | null
          text: string
          text_hash: string
        }
        Insert: {
          client_event_id: string
          conversation_id: string
          created_at?: string
          id?: string
          intent?: Json | null
          kind: string
          locale: string
          origin: string
          owner_id: string
          revision?: number
          template_version?: string | null
          text: string
          text_hash: string
        }
        Update: {
          client_event_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          intent?: Json | null
          kind?: string
          locale?: string
          origin?: string
          owner_id?: string
          revision?: number
          template_version?: string | null
          text?: string
          text_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_owned_conversation"
            columns: ["owner_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      erase_my_saved_data: {
        Args: { reset_settings?: boolean }
        Returns: undefined
      }
      save_favorite_snapshot: {
        Args: { conversation_title?: string; snapshot: Json }
        Returns: {
          created_at: string
          id: string
          message_id: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "favorites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
