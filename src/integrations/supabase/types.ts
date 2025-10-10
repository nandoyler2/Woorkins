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
      business_posts: {
        Row: {
          business_id: string
          content: string
          created_at: string
          id: string
          media_types: string[] | null
          media_urls: string[] | null
          updated_at: string
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          average_rating: number | null
          category: string | null
          company_name: string
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          enable_negotiation: boolean | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          phone: string | null
          portfolio_description: string | null
          profile_id: string
          response_time_avg: number | null
          services_offered: string[] | null
          slug: string | null
          total_reviews: number | null
          twitter: string | null
          updated_at: string
          website_url: string | null
          whatsapp: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          average_rating?: number | null
          category?: string | null
          company_name: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          enable_negotiation?: boolean | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_description?: string | null
          profile_id: string
          response_time_avg?: number | null
          services_offered?: string[] | null
          slug?: string | null
          total_reviews?: number | null
          twitter?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          average_rating?: number | null
          category?: string | null
          company_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          enable_negotiation?: boolean | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_description?: string | null
          profile_id?: string
          response_time_avg?: number | null
          services_offered?: string[] | null
          slug?: string | null
          total_reviews?: number | null
          twitter?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          business_id: string
          content: string
          created_at: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          public_response: string | null
          rating: number
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          public_response?: string | null
          rating: number
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          evaluation_type?: Database["public"]["Enums"]["evaluation_type"]
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          public_response?: string | null
          rating?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_messages: {
        Row: {
          amount: number | null
          content: string | null
          created_at: string
          id: string
          message_type: string
          negotiation_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          amount?: number | null
          content?: string | null
          created_at?: string
          id?: string
          message_type?: string
          negotiation_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          amount?: number | null
          content?: string | null
          created_at?: string
          id?: string
          message_type?: string
          negotiation_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          accepted_at: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          current_amount: number | null
          escrow_released: boolean | null
          escrow_released_at: string | null
          final_amount: number | null
          id: string
          net_amount_to_business: number | null
          paid_at: string | null
          payment_captured_at: string | null
          payment_status: string | null
          platform_fee_amount: number | null
          service_description: string | null
          status: string
          stripe_fee_amount: number | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          escrow_released?: boolean | null
          escrow_released_at?: string | null
          final_amount?: number | null
          id?: string
          net_amount_to_business?: number | null
          paid_at?: string | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          service_description?: string | null
          status?: string
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number | null
          escrow_released?: boolean | null
          escrow_released_at?: string | null
          final_amount?: number | null
          id?: string
          net_amount_to_business?: number | null
          paid_at?: string | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          service_description?: string | null
          status?: string
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          media_type: string
          media_url: string
          order_index: number | null
          title: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          media_type: string
          media_url: string
          order_index?: number | null
          title: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number | null
          content: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_story: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number | null
          content?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_story?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number | null
          content?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_story?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          location: string | null
          trust_level: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
          username: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          trust_level?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
          username: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          trust_level?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          username?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          profile_id: string
          proposals_count: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          profile_id: string
          proposals_count?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          profile_id?: string
          proposals_count?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          proposal_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          proposal_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          proposal_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_amount: number | null
          budget: number
          business_id: string | null
          created_at: string
          delivery_days: number
          escrow_released_at: string | null
          freelancer_id: string
          id: string
          message: string
          net_amount: number | null
          payment_captured_at: string | null
          payment_status: string | null
          platform_fee_amount: number | null
          project_id: string
          status: string
          stripe_fee_amount: number | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_amount?: number | null
          budget: number
          business_id?: string | null
          created_at?: string
          delivery_days: number
          escrow_released_at?: string | null
          freelancer_id: string
          id?: string
          message: string
          net_amount?: number | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          project_id: string
          status?: string
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_amount?: number | null
          budget?: number
          business_id?: string | null
          created_at?: string
          delivery_days?: number
          escrow_released_at?: string | null
          freelancer_id?: string
          id?: string
          message?: string
          net_amount?: number | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_fee_amount?: number | null
          project_id?: string
          status?: string
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      stripe_connected_accounts: {
        Row: {
          account_status: string | null
          bank_account_last4: string | null
          business_profile_id: string | null
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          onboarding_completed: boolean | null
          payout_method: string | null
          payouts_enabled: boolean | null
          pix_enabled: boolean | null
          profile_id: string
          stripe_account_id: string
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          bank_account_last4?: string | null
          business_profile_id?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          pix_enabled?: boolean | null
          profile_id: string
          stripe_account_id: string
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          bank_account_last4?: string | null
          business_profile_id?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          pix_enabled?: boolean | null
          profile_id?: string
          stripe_account_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connected_accounts_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connected_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          gross_amount: number | null
          id: string
          negotiation_id: string
          platform_fee: number | null
          released_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_fee: number | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          gross_amount?: number | null
          id?: string
          negotiation_id: string
          platform_fee?: number | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee?: number | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          gross_amount?: number | null
          id?: string
          negotiation_id?: string
          platform_fee?: number | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee?: number | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
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
      user_subscription_plans: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          plan_type: string
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_type: string
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_type?: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          bank_details: Json | null
          business_id: string
          id: string
          processed_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          bank_details?: Json | null
          business_id: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          business_id?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_platform_fees: {
        Args: { _amount: number; _plan_type: string }
        Returns: {
          net_amount: number
          platform_fee: number
          stripe_fee: number
          total_fees: number
        }[]
      }
      get_business_balance: {
        Args: { business_uuid: string }
        Returns: {
          available: number
          pending: number
          total: number
        }[]
      }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_stripe_account: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      evaluation_type: "praise" | "complaint" | "suggestion" | "neutral"
      user_type: "consumer" | "business"
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
      evaluation_type: ["praise", "complaint", "suggestion", "neutral"],
      user_type: ["consumer", "business"],
    },
  },
} as const
