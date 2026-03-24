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
      analytics_events: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          menu_id: string | null
          meta: Json | null
          restaurant_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          menu_id?: string | null
          meta?: Json | null
          restaurant_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          menu_id?: string | null
          meta?: Json | null
          restaurant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_templates: {
        Row: {
          created_at: string
          design_json: Json
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          design_json?: Json
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          design_json?: Json
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          menu_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_category_translations: {
        Row: {
          category_id: string
          lang: string
          name: string
        }
        Insert: {
          category_id: string
          lang: string
          name: string
        }
        Update: {
          category_id?: string
          lang?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_import_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          restaurant_id: string
          result_json: Json | null
          status: Database["public"]["Enums"]["job_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          restaurant_id: string
          result_json?: Json | null
          status?: Database["public"]["Enums"]["job_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          restaurant_id?: string
          result_json?: Json | null
          status?: Database["public"]["Enums"]["job_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_import_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_media: {
        Row: {
          created_at: string
          id: string
          item_id: string
          sort_order: number
          storage_path: string
          type: Database["public"]["Enums"]["media_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          sort_order?: number
          storage_path: string
          type?: Database["public"]["Enums"]["media_type"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          sort_order?: number
          storage_path?: string
          type?: Database["public"]["Enums"]["media_type"]
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_models: {
        Row: {
          glb_path: string | null
          item_id: string
          preview_image_path: string | null
          status: Database["public"]["Enums"]["model_status"]
          updated_at: string
          usdz_path: string | null
        }
        Insert: {
          glb_path?: string | null
          item_id: string
          preview_image_path?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          updated_at?: string
          usdz_path?: string | null
        }
        Update: {
          glb_path?: string | null
          item_id?: string
          preview_image_path?: string | null
          status?: Database["public"]["Enums"]["model_status"]
          updated_at?: string
          usdz_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_models_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_translations: {
        Row: {
          description: string | null
          item_id: string
          lang: string
          name: string
        }
        Insert: {
          description?: string | null
          item_id: string
          lang: string
          name: string
        }
        Update: {
          description?: string | null
          item_id?: string
          lang?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_translations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          category_id: string
          created_at: string
          currency: string
          id: string
          is_available: boolean
          price_cents: number
          sort_order: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id: string
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          price_cents?: number
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          price_cents?: number
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          design_json: Json | null
          id: string
          is_default: boolean
          is_global: boolean
          name: string
          published_at: string | null
          restaurant_id: string
          schedule_days: string[] | null
          schedule_end: string | null
          schedule_start: string | null
          status: Database["public"]["Enums"]["menu_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_json?: Json | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          name?: string
          published_at?: string | null
          restaurant_id: string
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_json?: Json | null
          id?: string
          is_default?: boolean
          is_global?: boolean
          name?: string
          published_at?: string | null
          restaurant_id?: string
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      model_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_paths: Json | null
          item_id: string
          outputs: Json | null
          restaurant_id: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_paths?: Json | null
          item_id: string
          outputs?: Json | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_paths?: Json | null
          item_id?: string
          outputs?: Json | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_jobs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          city: string | null
          cover_image_path: string | null
          created_at: string
          default_lang: string
          description: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_path: string | null
          name: string
          owner_user_id: string
          phone: string | null
          slug: string
          supported_langs: string[]
          tiktok: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cover_image_path?: string | null
          created_at?: string
          default_lang?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_path?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
          slug: string
          supported_langs?: string[]
          tiktok?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cover_image_path?: string | null
          created_at?: string
          default_lang?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_path?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          slug?: string
          supported_langs?: string[]
          tiktok?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          generations_limit: number
          generations_used: number
          id: string
          plan: string
          restaurant_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          generations_limit?: number
          generations_used?: number
          id?: string
          plan?: string
          restaurant_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          generations_limit?: number
          generations_used?: number
          id?: string
          plan?: string
          restaurant_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_restaurant_id_from_category: {
        Args: { _category_id: string }
        Returns: string
      }
      get_restaurant_id_from_item: {
        Args: { _item_id: string }
        Returns: string
      }
      get_restaurant_id_from_menu: {
        Args: { _menu_id: string }
        Returns: string
      }
      has_restaurant_role: {
        Args: {
          _restaurant_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_restaurant_member: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "editor" | "viewer"
      job_status: "pending" | "processing" | "completed" | "failed"
      media_type: "image" | "video"
      menu_status: "draft" | "published"
      model_status: "none" | "pending" | "processing" | "ready" | "failed"
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
      app_role: ["owner", "editor", "viewer"],
      job_status: ["pending", "processing", "completed", "failed"],
      media_type: ["image", "video"],
      menu_status: ["draft", "published"],
      model_status: ["none", "pending", "processing", "ready", "failed"],
    },
  },
} as const
