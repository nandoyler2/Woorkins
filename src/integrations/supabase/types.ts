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
      ai_assistant_conversations: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          created_at: string | null
          id: string
          messages: Json
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          messages?: Json
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          messages?: Json
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_faq: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          id: string
          keywords: string[]
          link: string | null
          priority: number
          question_pattern: string
          response: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keywords: string[]
          link?: string | null
          priority?: number
          question_pattern: string
          response: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keywords?: string[]
          link?: string | null
          priority?: number
          question_pattern?: string
          response?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocked_messages: {
        Row: {
          blocked_at: string
          conversation_id: string | null
          conversation_type: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          moderation_category: string | null
          moderation_reason: string
          original_content: string | null
          profile_id: string
        }
        Insert: {
          blocked_at?: string
          conversation_id?: string | null
          conversation_type: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          moderation_category?: string | null
          moderation_reason: string
          original_content?: string | null
          profile_id: string
        }
        Update: {
          blocked_at?: string
          conversation_id?: string | null
          conversation_type?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          moderation_category?: string | null
          moderation_reason?: string
          original_content?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          business_id: string
          client_profile_id: string
          created_at: string | null
          duration_minutes: number | null
          google_calendar_event_id: string | null
          id: string
          notes: string | null
          service_description: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          business_id: string
          client_profile_id: string
          created_at?: string | null
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          service_description?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          business_id?: string
          client_profile_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          service_description?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_appointments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_availability: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_banners: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          id: string
          image_url: string
          link_url: string | null
          order_index: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_catalog_items: {
        Row: {
          active: boolean | null
          business_id: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_catalog_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_certifications: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          issued_by: string | null
          issued_date: string | null
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          order_index?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_certifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_custom_links: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          icon_name: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          icon_name?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          icon_name?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_custom_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_job_applications: {
        Row: {
          applicant_profile_id: string
          cover_letter: string | null
          created_at: string | null
          id: string
          resume_url: string | null
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
          vacancy_id: string
        }
        Insert: {
          applicant_profile_id: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          resume_url?: string | null
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          vacancy_id: string
        }
        Update: {
          applicant_profile_id?: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          resume_url?: string | null
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_job_applications_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_job_applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "business_job_vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_job_vacancies: {
        Row: {
          area: string | null
          business_id: string
          created_at: string | null
          deadline: string | null
          description: string
          id: string
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          title: string
          updated_at: string | null
          work_mode: string | null
        }
        Insert: {
          area?: string | null
          business_id: string
          created_at?: string | null
          deadline?: string | null
          description: string
          id?: string
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Update: {
          area?: string | null
          business_id?: string
          created_at?: string | null
          deadline?: string | null
          description?: string
          id?: string
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_job_vacancies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_profile_features: {
        Row: {
          business_id: string
          created_at: string | null
          feature_key: string
          id: string
          is_active: boolean | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          feature_key: string
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profile_features_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          active: boolean | null
          address: string | null
          average_rating: number | null
          category: string | null
          company_name: string
          cover_url: string | null
          created_at: string
          deleted: boolean | null
          deleted_at: string | null
          deleted_by: string | null
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
          active?: boolean | null
          address?: string | null
          average_rating?: number | null
          category?: string | null
          company_name: string
          cover_url?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          active?: boolean | null
          address?: string | null
          average_rating?: number | null
          category?: string | null
          company_name?: string
          cover_url?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
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
      business_testimonials: {
        Row: {
          business_id: string
          client_name: string
          client_profile_id: string | null
          content: string
          created_at: string | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          rating: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          client_name: string
          client_profile_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          client_name?: string
          client_profile_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_testimonials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_testimonials_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_testimonials_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_videos: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          youtube_url: string
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          youtube_url: string
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_videos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_proposals: {
        Row: {
          amount: number
          created_at: string
          from_profile_id: string
          id: string
          message: string | null
          proposal_id: string
          responded_at: string | null
          status: string
          to_profile_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_profile_id: string
          id?: string
          message?: string | null
          proposal_id: string
          responded_at?: string | null
          status?: string
          to_profile_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_profile_id?: string
          id?: string
          message?: string | null
          proposal_id?: string
          responded_at?: string | null
          status?: string
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_proposals_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_proposals_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verifications: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          document_back_url: string
          document_front_url: string
          extracted_birth_date: string | null
          extracted_cpf: string | null
          extracted_name: string | null
          id: string
          profile_id: string
          selfie_url: string | null
          updated_at: string | null
          verification_result: Json | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          document_back_url: string
          document_front_url: string
          extracted_birth_date?: string | null
          extracted_cpf?: string | null
          extracted_name?: string | null
          id?: string
          profile_id: string
          selfie_url?: string | null
          updated_at?: string | null
          verification_result?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          document_back_url?: string
          document_front_url?: string
          extracted_birth_date?: string | null
          extracted_cpf?: string | null
          extracted_name?: string | null
          id?: string
          profile_id?: string
          selfie_url?: string | null
          updated_at?: string | null
          verification_result?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          new_email: string
          user_id: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          new_email: string
          user_id: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          new_email?: string
          user_id?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
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
      freelancer_wallet: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          profile_id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          profile_id: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          profile_id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_wallet_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          last_updated: string
          slug: string
          title: string
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          last_updated?: string
          slug: string
          title: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          last_updated?: string
          slug?: string
          title?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      manual_document_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_back_url: string
          document_front_url: string
          id: string
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          social_media_link: string | null
          status: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_back_url: string
          document_front_url: string
          id?: string
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          social_media_link?: string | null
          status?: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_back_url?: string
          document_front_url?: string
          id?: string
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          social_media_link?: string | null
          status?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_document_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_spam_tracking: {
        Row: {
          block_duration_minutes: number | null
          blocked_until: string | null
          context: string
          created_at: string | null
          id: string
          last_spam_at: string | null
          profile_id: string
          spam_count: number | null
          updated_at: string | null
        }
        Insert: {
          block_duration_minutes?: number | null
          blocked_until?: string | null
          context: string
          created_at?: string | null
          id?: string
          last_spam_at?: string | null
          profile_id: string
          spam_count?: number | null
          updated_at?: string | null
        }
        Update: {
          block_duration_minutes?: number | null
          blocked_until?: string | null
          context?: string
          created_at?: string | null
          id?: string
          last_spam_at?: string | null
          profile_id?: string
          spam_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_spam_tracking_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_unread_counts: {
        Row: {
          conversation_id: string
          conversation_type: string
          created_at: string | null
          id: string
          last_read_at: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          conversation_type: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moderation_violations: {
        Row: {
          blocked_until: string | null
          created_at: string
          id: string
          last_violation_at: string | null
          profile_id: string
          updated_at: string
          violation_count: number
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          last_violation_at?: string | null
          profile_id: string
          updated_at?: string
          violation_count?: number
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          id?: string
          last_violation_at?: string | null
          profile_id?: string
          updated_at?: string
          violation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "moderation_violations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
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
          delivered_at: string | null
          id: string
          is_deleted: boolean | null
          media_name: string | null
          media_type: string | null
          media_url: string | null
          message_type: string
          moderation_reason: string | null
          moderation_status: string | null
          negotiation_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          moderation_reason?: string | null
          moderation_status?: string | null
          negotiation_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          moderation_reason?: string | null
          moderation_status?: string | null
          negotiation_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          status?: string | null
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
      payment_gateway_config: {
        Row: {
          active_gateway: string
          created_at: string | null
          id: string
          mercadopago_card_discount_percent: number | null
          mercadopago_enabled: boolean | null
          mercadopago_pix_discount_percent: number | null
          mercadopago_public_key: string | null
          updated_at: string | null
        }
        Insert: {
          active_gateway?: string
          created_at?: string | null
          id?: string
          mercadopago_card_discount_percent?: number | null
          mercadopago_enabled?: boolean | null
          mercadopago_pix_discount_percent?: number | null
          mercadopago_public_key?: string | null
          updated_at?: string | null
        }
        Update: {
          active_gateway?: string
          created_at?: string | null
          id?: string
          mercadopago_card_discount_percent?: number | null
          mercadopago_enabled?: boolean | null
          mercadopago_pix_discount_percent?: number | null
          mercadopago_public_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          bank_account_holder: string | null
          created_at: string | null
          id: string
          pix_key: string | null
          pix_key_type: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          created_at?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          created_at?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          birth_date: string | null
          cpf: string | null
          created_at: string
          document_verification_status: string | null
          document_verified: boolean | null
          filiation: string | null
          full_name: string | null
          id: string
          last_username_change: string | null
          location: string | null
          nationality: string | null
          place_of_birth: string | null
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
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          document_verification_status?: string | null
          document_verified?: boolean | null
          filiation?: string | null
          full_name?: string | null
          id?: string
          last_username_change?: string | null
          location?: string | null
          nationality?: string | null
          place_of_birth?: string | null
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
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          document_verification_status?: string | null
          document_verified?: boolean | null
          filiation?: string | null
          full_name?: string | null
          id?: string
          last_username_change?: string | null
          location?: string | null
          nationality?: string | null
          place_of_birth?: string | null
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
          delivered_at: string | null
          id: string
          media_name: string | null
          media_type: string | null
          media_url: string | null
          moderation_reason: string | null
          moderation_status: string | null
          proposal_id: string
          read_at: string | null
          sender_id: string
          status: string | null
        }
        Insert: {
          content: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          proposal_id: string
          read_at?: string | null
          sender_id: string
          status?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          proposal_id?: string
          read_at?: string | null
          sender_id?: string
          status?: string | null
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
          awaiting_acceptance_from: string | null
          budget: number
          business_id: string | null
          created_at: string
          current_proposal_amount: number | null
          current_proposal_by: string | null
          delivery_days: number
          escrow_released_at: string | null
          freelancer_amount: number | null
          freelancer_id: string
          id: string
          is_unlocked: boolean | null
          message: string
          net_amount: number | null
          owner_has_messaged: boolean | null
          payment_captured_at: string | null
          payment_status: string | null
          platform_commission: number | null
          project_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_processing_fee: number | null
          updated_at: string
        }
        Insert: {
          accepted_amount?: number | null
          awaiting_acceptance_from?: string | null
          budget: number
          business_id?: string | null
          created_at?: string
          current_proposal_amount?: number | null
          current_proposal_by?: string | null
          delivery_days: number
          escrow_released_at?: string | null
          freelancer_amount?: number | null
          freelancer_id: string
          id?: string
          is_unlocked?: boolean | null
          message: string
          net_amount?: number | null
          owner_has_messaged?: boolean | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          project_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_processing_fee?: number | null
          updated_at?: string
        }
        Update: {
          accepted_amount?: number | null
          awaiting_acceptance_from?: string | null
          budget?: number
          business_id?: string | null
          created_at?: string
          current_proposal_amount?: number | null
          current_proposal_by?: string | null
          delivery_days?: number
          escrow_released_at?: string | null
          freelancer_amount?: number | null
          freelancer_id?: string
          id?: string
          is_unlocked?: boolean | null
          message?: string
          net_amount?: number | null
          owner_has_messaged?: boolean | null
          payment_captured_at?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          project_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_processing_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_awaiting_acceptance_from_fkey"
            columns: ["awaiting_acceptance_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_current_proposal_by_fkey"
            columns: ["current_proposal_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          commission_percentage: number
          created_at: string
          display_order: number
          features: Json
          id: string
          name: string
          recommended: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_percentage: number
          created_at?: string
          display_order?: number
          features?: Json
          id?: string
          name: string
          recommended?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_percentage?: number
          created_at?: string
          display_order?: number
          features?: Json
          id?: string
          name?: string
          recommended?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          profile_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          profile_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_blocks: {
        Row: {
          block_type: string
          blocked_by: string
          blocked_until: string | null
          created_at: string
          id: string
          is_permanent: boolean
          profile_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          block_type: string
          blocked_by: string
          blocked_until?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          profile_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          blocked_by?: string
          blocked_until?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          profile_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_blocks_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_blocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          freelancer_profile_id: string | null
          gross_amount: number | null
          id: string
          negotiation_id: string
          platform_fee: number | null
          proposal_id: string | null
          released_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_fee: number | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          type: string
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          freelancer_profile_id?: string | null
          gross_amount?: number | null
          id?: string
          negotiation_id: string
          platform_fee?: number | null
          proposal_id?: string | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee?: number | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          type: string
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          freelancer_profile_id?: string | null
          gross_amount?: number | null
          id?: string
          negotiation_id?: string
          platform_fee?: number | null
          proposal_id?: string | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee?: number | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          type?: string
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_freelancer_profile_id_fkey"
            columns: ["freelancer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          conversation_type: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          conversation_type: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
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
      withdrawal_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          profile_id: string
          requested_at: string | null
          status: string
          stripe_payout_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pix_key: string
          pix_key_type: string
          processed_at?: string | null
          profile_id: string
          requested_at?: string | null
          status?: string
          stripe_payout_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          profile_id?: string
          requested_at?: string | null
          status?: string
          stripe_payout_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      woorkoins_balance: {
        Row: {
          balance: number
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "woorkoins_balance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      woorkoins_mercadopago_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          payment_data: Json | null
          payment_id: string
          payment_method: string
          price: number
          profile_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payment_data?: Json | null
          payment_id: string
          payment_method: string
          price: number
          profile_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payment_data?: Json | null
          payment_id?: string
          payment_method?: string
          price?: number
          profile_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woorkoins_efi_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      woorkoins_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          profile_id: string
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id: string
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id?: string
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "woorkoins_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_progressive_system_block: {
        Args: {
          p_profile_id: string
          p_reason: string
          p_violation_category: string
        }
        Returns: {
          block_duration_hours: number
          block_message: string
          blocked: boolean
          blocked_until: string
          violation_count: number
        }[]
      }
      calculate_payment_split: {
        Args: { _amount: number; _platform_commission_percent?: number }
        Returns: {
          freelancer_amount: number
          platform_commission: number
          stripe_fee: number
          total_amount: number
        }[]
      }
      calculate_platform_fees: {
        Args: { _amount: number; _plan_type: string }
        Returns: {
          net_amount: number
          platform_fee: number
          stripe_fee: number
          total_fees: number
        }[]
      }
      cleanup_expired_email_verifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_spam_blocks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_own_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_freelancer_wallet_balance: {
        Args: { freelancer_profile_id: string }
        Returns: {
          available: number
          pending: number
          total: number
          withdrawn: number
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
