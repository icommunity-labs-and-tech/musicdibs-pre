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
      ab_test_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          session_id: string | null
          test_id: string
          variant_index: number
          variant_text: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          session_id?: string | null
          test_id: string
          variant_index: number
          variant_text: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string | null
          test_id?: string
          variant_index?: number
          variant_text?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          audio_url: string
          created_at: string
          duration: number
          genre: string | null
          id: string
          is_favorite: boolean | null
          mood: string | null
          prompt: string
          user_id: string
          voice_id: string | null
          voice_name: string | null
          voice_profile_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration: number
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          mood?: string | null
          prompt: string
          user_id: string
          voice_id?: string | null
          voice_name?: string | null
          voice_profile_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration?: number
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          mood?: string | null
          prompt?: string
          user_id?: string
          voice_id?: string | null
          voice_name?: string | null
          voice_profile_id?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          called_at: string
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          called_at?: string
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          called_at?: string
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      api_cost_config: {
        Row: {
          api_cost_eur: number
          api_cost_notes: string | null
          api_cost_unit: string
          api_provider: string
          created_at: string | null
          credits_charged: number
          feature_key: string
          feature_label: string
          id: string
          price_per_credit_eur: number
          updated_at: string | null
        }
        Insert: {
          api_cost_eur: number
          api_cost_notes?: string | null
          api_cost_unit: string
          api_provider: string
          created_at?: string | null
          credits_charged: number
          feature_key: string
          feature_label: string
          id?: string
          price_per_credit_eur: number
          updated_at?: string | null
        }
        Update: {
          api_cost_eur?: number
          api_cost_notes?: string | null
          api_cost_unit?: string
          api_provider?: string
          created_at?: string | null
          credits_charged?: number
          feature_key?: string
          feature_label?: string
          id?: string
          price_per_credit_eur?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      api_cost_daily: {
        Row: {
          created_at: string | null
          date: string
          feature_key: string
          gross_margin_eur: number | null
          id: string
          margin_pct: number | null
          total_api_cost_eur: number | null
          total_credits_charged: number | null
          total_revenue_eur: number | null
          total_uses: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          feature_key: string
          gross_margin_eur?: number | null
          id?: string
          margin_pct?: number | null
          total_api_cost_eur?: number | null
          total_credits_charged?: number | null
          total_revenue_eur?: number | null
          total_uses?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          feature_key?: string
          gross_margin_eur?: number | null
          id?: string
          margin_pct?: number | null
          total_api_cost_eur?: number | null
          total_credits_charged?: number | null
          total_revenue_eur?: number | null
          total_uses?: number | null
        }
        Relationships: []
      }
      audiomack_connections: {
        Row: {
          audiomack_id: string | null
          audiomack_slug: string
          connected_at: string
          id: string
          last_sync_at: string | null
          user_id: string
        }
        Insert: {
          audiomack_id?: string | null
          audiomack_slug: string
          connected_at?: string
          id?: string
          last_sync_at?: string | null
          user_id: string
        }
        Update: {
          audiomack_id?: string | null
          audiomack_slug?: string
          connected_at?: string
          id?: string
          last_sync_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audiomack_metrics: {
        Row: {
          audiomack_slug: string
          favorites: number | null
          fetched_at: string
          followers: number | null
          id: string
          plays_last_hour: number | null
          reposts: number | null
          top_songs: Json | null
          user_id: string
        }
        Insert: {
          audiomack_slug: string
          favorites?: number | null
          fetched_at?: string
          followers?: number | null
          id?: string
          plays_last_hour?: number | null
          reposts?: number | null
          top_songs?: Json | null
          user_id: string
        }
        Update: {
          audiomack_slug?: string
          favorites?: number | null
          fetched_at?: string
          followers?: number | null
          id?: string
          plays_last_hour?: number | null
          reposts?: number | null
          top_songs?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      auphonic_productions: {
        Row: {
          auphonic_uuid: string
          created_at: string
          credits_used: number | null
          duration_secs: number | null
          error_detail: string | null
          id: string
          input_url: string | null
          mode: string
          output_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auphonic_uuid: string
          created_at?: string
          credits_used?: number | null
          duration_secs?: number | null
          error_detail?: string | null
          id?: string
          input_url?: string | null
          mode: string
          output_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auphonic_uuid?: string
          created_at?: string
          credits_used?: number | null
          duration_secs?: number | null
          error_detail?: string | null
          id?: string
          input_url?: string | null
          mode?: string
          output_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          language: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cancellation_surveys: {
        Row: {
          account_deleted_at: string | null
          additional_feedback: string | null
          created_at: string
          credits_remaining: number | null
          id: string
          is_account_deletion: boolean
          plan_type: string | null
          reason: string
          user_id: string
        }
        Insert: {
          account_deleted_at?: string | null
          additional_feedback?: string | null
          created_at?: string
          credits_remaining?: number | null
          id?: string
          is_account_deletion?: boolean
          plan_type?: string | null
          reason: string
          user_id: string
        }
        Update: {
          account_deleted_at?: string | null
          additional_feedback?: string | null
          created_at?: string
          credits_remaining?: number | null
          id?: string
          is_account_deletion?: boolean
          plan_type?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      cancellation_tracking: {
        Row: {
          cancellation_reason: string
          cancelled_at: string | null
          created_at: string | null
          credits_remaining: number | null
          id: string
          lifetime_value: number | null
          plan_type: string
          subscription_id: string
          subscription_revenue: number | null
          subscription_start_date: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          cancellation_reason: string
          cancelled_at?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          id?: string
          lifetime_value?: number | null
          plan_type: string
          subscription_id: string
          subscription_revenue?: number | null
          subscription_start_date?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          cancellation_reason?: string
          cancelled_at?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          id?: string
          lifetime_value?: number | null
          plan_type?: string
          subscription_id?: string
          subscription_revenue?: number | null
          subscription_start_date?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feature_costs: {
        Row: {
          credit_cost: number
          feature_key: string
          label: string
        }
        Insert: {
          credit_cost?: number
          feature_key: string
          label?: string
        }
        Update: {
          credit_cost?: number
          feature_key?: string
          label?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          audio_duration_seconds: number | null
          audio_url: string | null
          completed_at: string | null
          created_at: string
          credits_cost: number
          credits_refunded: boolean | null
          duration_seconds: number | null
          error_message: string | null
          genre: string | null
          id: string
          lyrics: string | null
          mode: string
          mood: string | null
          prompt: string | null
          provider: string
          provider_job_id: string | null
          started_at: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          voice_id: string | null
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          credits_refunded?: boolean | null
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          mode?: string
          mood?: string | null
          prompt?: string | null
          provider?: string
          provider_job_id?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          voice_id?: string | null
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          credits_cost?: number
          credits_refunded?: boolean | null
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          mode?: string
          mood?: string | null
          prompt?: string | null
          provider?: string
          provider_job_id?: string | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      ibs_signatures: {
        Row: {
          created_at: string
          ibs_signature_id: string
          id: string
          kyc_url: string | null
          signature_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ibs_signature_id: string
          id?: string
          kyc_url?: string | null
          signature_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ibs_signature_id?: string
          id?: string
          kyc_url?: string | null
          signature_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ibs_sync_queue: {
        Row: {
          created_at: string
          error_detail: string | null
          ibs_evidence_id: string
          id: string
          last_retry_at: string | null
          max_retries: number
          retry_count: number
          status: string
          updated_at: string
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          ibs_evidence_id: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          retry_count?: number
          status?: string
          updated_at?: string
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          ibs_evidence_id?: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          work_id?: string
        }
        Relationships: []
      }
      library_deletion_queue: {
        Row: {
          asset_id: string
          asset_type: string
          created_at: string | null
          deleted_at: string | null
          id: string
          notified_at: string | null
          scheduled_deletion_at: string
          status: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          asset_id: string
          asset_type: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notified_at?: string | null
          scheduled_deletion_at: string
          status?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string
          asset_type?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notified_at?: string | null
          scheduled_deletion_at?: string
          status?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lyrics_generations: {
        Row: {
          artist_refs: string[] | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          language: string | null
          lyrics: string
          mood: string | null
          pov: string | null
          rhyme_scheme: string | null
          structure: string | null
          style: string | null
          theme: string | null
          user_id: string
        }
        Insert: {
          artist_refs?: string[] | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          lyrics: string
          mood?: string | null
          pov?: string | null
          rhyme_scheme?: string | null
          structure?: string | null
          style?: string | null
          theme?: string | null
          user_id: string
        }
        Update: {
          artist_refs?: string[] | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          lyrics?: string
          mood?: string | null
          pov?: string | null
          rhyme_scheme?: string | null
          structure?: string | null
          style?: string | null
          theme?: string | null
          user_id?: string
        }
        Relationships: []
      }
      managed_artists: {
        Row: {
          artist_country: string | null
          artist_email: string | null
          artist_name: string
          artist_phone: string | null
          artist_user_id: string | null
          contract_ref: string | null
          contract_reference: string | null
          contract_signed_at: string | null
          created_at: string
          id: string
          manager_user_id: string
          notes: string | null
          representation_type: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_country?: string | null
          artist_email?: string | null
          artist_name: string
          artist_phone?: string | null
          artist_user_id?: string | null
          contract_ref?: string | null
          contract_reference?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          manager_user_id: string
          notes?: string | null
          representation_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_country?: string | null
          artist_email?: string | null
          artist_name?: string
          artist_phone?: string | null
          artist_user_id?: string | null
          contract_ref?: string | null
          contract_reference?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          manager_user_id?: string
          notes?: string | null
          representation_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      managed_works: {
        Row: {
          authorized_by: string
          created_at: string
          id: string
          managed_artist_id: string
          manager_user_id: string
          work_id: string
        }
        Insert: {
          authorized_by?: string
          created_at?: string
          id?: string
          managed_artist_id: string
          manager_user_id: string
          work_id: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          id?: string
          managed_artist_id?: string
          manager_user_id?: string
          work_id?: string
        }
        Relationships: []
      }
      manager_contact_requests: {
        Row: {
          annual_works_estimated: number | null
          annual_works_range: string | null
          assigned_to: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string | null
          name: string
          needs_ai_studio: boolean | null
          needs_distribution: boolean | null
          num_artists_estimated: number | null
          num_artists_range: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          annual_works_estimated?: number | null
          annual_works_range?: string | null
          assigned_to?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message?: string | null
          name: string
          needs_ai_studio?: boolean | null
          needs_distribution?: boolean | null
          num_artists_estimated?: number | null
          num_artists_range?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          annual_works_estimated?: number | null
          annual_works_range?: string | null
          assigned_to?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string | null
          name?: string
          needs_ai_studio?: boolean | null
          needs_distribution?: boolean | null
          num_artists_estimated?: number | null
          num_artists_range?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      manager_contracts: {
        Row: {
          annual_price_eur: number | null
          annual_works_quota: number
          company_name: string
          contact_email: string
          contact_phone: string | null
          contract_end: string
          contract_start: string
          created_at: string
          credits_included: number
          id: string
          includes_ai_studio: boolean | null
          includes_distribution: boolean | null
          manager_user_id: string
          max_artists: number
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          annual_price_eur?: number | null
          annual_works_quota?: number
          company_name: string
          contact_email: string
          contact_phone?: string | null
          contract_end: string
          contract_start: string
          created_at?: string
          credits_included?: number
          id?: string
          includes_ai_studio?: boolean | null
          includes_distribution?: boolean | null
          manager_user_id: string
          max_artists?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          annual_price_eur?: number | null
          annual_works_quota?: number
          company_name?: string
          contact_email?: string
          contact_phone?: string | null
          contract_end?: string
          contract_start?: string
          created_at?: string
          credits_included?: number
          id?: string
          includes_ai_studio?: boolean | null
          includes_distribution?: boolean | null
          manager_user_id?: string
          max_artists?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          cost: number
          coupon_code: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          owner: string | null
          start_date: string | null
          type: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          cost?: number
          coupon_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          owner?: string | null
          start_date?: string | null
          type?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          cost?: number
          coupon_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          owner?: string | null
          start_date?: string | null
          type?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_metrics: {
        Row: {
          ad_spend: number
          cash_balance: number
          cogs: number
          created_at: string
          id: string
          month: number
          monthly_burn: number
          notes: string | null
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          ad_spend?: number
          cash_balance?: number
          cogs?: number
          created_at?: string
          id?: string
          month: number
          monthly_burn?: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          ad_spend?: number
          cash_balance?: number
          cogs?: number
          created_at?: string
          id?: string
          month?: number
          monthly_burn?: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      metric_alert_notifications: {
        Row: {
          alert_description: string | null
          alert_key: string
          alert_title: string
          id: string
          notified_at: string
          resolved_at: string | null
        }
        Insert: {
          alert_description?: string | null
          alert_key: string
          alert_title: string
          id?: string
          notified_at?: string
          resolved_at?: string | null
        }
        Update: {
          alert_description?: string | null
          alert_key?: string
          alert_title?: string
          id?: string
          notified_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operation_pricing: {
        Row: {
          api_cost_eur: number | null
          category: string
          created_at: string | null
          credits_cost: number
          description: string | null
          display_order: number
          euro_cost: number | null
          id: string
          is_active: boolean | null
          is_annual_only: boolean | null
          is_free: boolean | null
          llm_model: string | null
          llm_provider: string | null
          llm_recommendation: string | null
          margin_multiplier: number | null
          model_name: string | null
          operation_icon: string | null
          operation_key: string
          operation_label: string
          operation_name: string
          updated_at: string | null
        }
        Insert: {
          api_cost_eur?: number | null
          category?: string
          created_at?: string | null
          credits_cost?: number
          description?: string | null
          display_order?: number
          euro_cost?: number | null
          id?: string
          is_active?: boolean | null
          is_annual_only?: boolean | null
          is_free?: boolean | null
          llm_model?: string | null
          llm_provider?: string | null
          llm_recommendation?: string | null
          margin_multiplier?: number | null
          model_name?: string | null
          operation_icon?: string | null
          operation_key: string
          operation_label: string
          operation_name?: string
          updated_at?: string | null
        }
        Update: {
          api_cost_eur?: number | null
          category?: string
          created_at?: string | null
          credits_cost?: number
          description?: string | null
          display_order?: number
          euro_cost?: number | null
          id?: string
          is_active?: boolean | null
          is_annual_only?: boolean | null
          is_free?: boolean | null
          llm_model?: string | null
          llm_provider?: string | null
          llm_recommendation?: string | null
          margin_multiplier?: number | null
          model_name?: string | null
          operation_icon?: string | null
          operation_key?: string
          operation_label?: string
          operation_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_attribution: {
        Row: {
          attributed_campaign_name: string | null
          attribution_model: string
          campaign: string | null
          campaign_id: string | null
          content: string | null
          coupon_code: string | null
          created_at: string
          id: string
          medium: string | null
          order_id: string
          source: string | null
        }
        Insert: {
          attributed_campaign_name?: string | null
          attribution_model?: string
          campaign?: string | null
          campaign_id?: string | null
          content?: string | null
          coupon_code?: string | null
          created_at?: string
          id?: string
          medium?: string | null
          order_id: string
          source?: string | null
        }
        Update: {
          attributed_campaign_name?: string | null
          attribution_model?: string
          campaign?: string | null
          campaign_id?: string | null
          content?: string | null
          coupon_code?: string | null
          created_at?: string
          id?: string
          medium?: string | null
          order_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_attribution_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attribution_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_evidences_consistency"
            referencedColumns: ["order_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_gross: number
          amount_net: number | null
          attributed_campaign_name: string | null
          billing_interval: string | null
          campaign_id: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          id: string
          is_first_purchase: boolean
          is_renewal: boolean
          is_subscription: boolean
          landing_path: string | null
          metadata: Json
          order_source: string | null
          order_status: string
          paid_at: string
          product_code: string | null
          product_label: string | null
          product_type: string
          promotion_code: string | null
          quantity: number
          referrer: string | null
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          attributed_campaign_name?: string | null
          billing_interval?: string | null
          campaign_id?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_first_purchase?: boolean
          is_renewal?: boolean
          is_subscription?: boolean
          landing_path?: string | null
          metadata?: Json
          order_source?: string | null
          order_status?: string
          paid_at?: string
          product_code?: string | null
          product_label?: string | null
          product_type: string
          promotion_code?: string | null
          quantity?: number
          referrer?: string | null
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          attributed_campaign_name?: string | null
          billing_interval?: string | null
          campaign_id?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_first_purchase?: boolean
          is_renewal?: boolean
          is_subscription?: boolean
          landing_path?: string | null
          metadata?: Json
          order_source?: string | null
          order_status?: string
          paid_at?: string
          product_code?: string | null
          product_label?: string | null
          product_type?: string
          promotion_code?: string | null
          quantity?: number
          referrer?: string | null
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      premium_social_promotions: {
        Row: {
          artist_name: string
          audio_file_path: string | null
          created_at: string
          credits_spent: number
          description: string
          external_link: string | null
          id: string
          media_file_path: string | null
          media_file_type: string | null
          promo_message: string | null
          promo_style: string | null
          song_title: string
          status: string
          team_notes: string | null
          updated_at: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          artist_name: string
          audio_file_path?: string | null
          created_at?: string
          credits_spent?: number
          description: string
          external_link?: string | null
          id?: string
          media_file_path?: string | null
          media_file_type?: string | null
          promo_message?: string | null
          promo_style?: string | null
          song_title: string
          status?: string
          team_notes?: string | null
          updated_at?: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          artist_name?: string
          audio_file_path?: string | null
          created_at?: string
          credits_spent?: number
          description?: string
          external_link?: string | null
          id?: string
          media_file_path?: string | null
          media_file_type?: string | null
          promo_message?: string | null
          promo_style?: string | null
          song_title?: string
          status?: string
          team_notes?: string | null
          updated_at?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: []
      }
      press_releases: {
        Row: {
          body: string
          created_at: string
          genre: string | null
          groover_campaign_id: string | null
          id: string
          language: string | null
          short_bio: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          work_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          genre?: string | null
          groover_campaign_id?: string | null
          id?: string
          language?: string | null
          short_bio?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          work_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          genre?: string | null
          groover_campaign_id?: string | null
          id?: string
          language?: string | null
          short_bio?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_id?: string | null
        }
        Relationships: []
      }
      product_events: {
        Row: {
          created_at: string
          event_name: string
          feature: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          feature: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          feature?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_metrics_daily: {
        Row: {
          ai_studio_entries: number | null
          audios_downloaded: number | null
          created_at: string | null
          date: string
          generation_to_register_pct: number | null
          generations_completed: number | null
          generations_started: number | null
          id: string
          revenue_cover_eur: number | null
          revenue_create_music_eur: number | null
          revenue_promotion_eur: number | null
          revenue_register_eur: number | null
          revenue_video_eur: number | null
          total_credits_spent: number | null
          total_revenue_eur: number | null
          unique_ai_studio_users: number | null
          unique_users: number | null
          uses_cover: number | null
          uses_create_music: number | null
          uses_enhance_audio: number | null
          uses_lyrics: number | null
          uses_press: number | null
          uses_promotion: number | null
          uses_register: number | null
          uses_video: number | null
          uses_vocal: number | null
          uses_voice_cloning: number | null
          works_after_generation: number | null
        }
        Insert: {
          ai_studio_entries?: number | null
          audios_downloaded?: number | null
          created_at?: string | null
          date: string
          generation_to_register_pct?: number | null
          generations_completed?: number | null
          generations_started?: number | null
          id?: string
          revenue_cover_eur?: number | null
          revenue_create_music_eur?: number | null
          revenue_promotion_eur?: number | null
          revenue_register_eur?: number | null
          revenue_video_eur?: number | null
          total_credits_spent?: number | null
          total_revenue_eur?: number | null
          unique_ai_studio_users?: number | null
          unique_users?: number | null
          uses_cover?: number | null
          uses_create_music?: number | null
          uses_enhance_audio?: number | null
          uses_lyrics?: number | null
          uses_press?: number | null
          uses_promotion?: number | null
          uses_register?: number | null
          uses_video?: number | null
          uses_vocal?: number | null
          uses_voice_cloning?: number | null
          works_after_generation?: number | null
        }
        Update: {
          ai_studio_entries?: number | null
          audios_downloaded?: number | null
          created_at?: string | null
          date?: string
          generation_to_register_pct?: number | null
          generations_completed?: number | null
          generations_started?: number | null
          id?: string
          revenue_cover_eur?: number | null
          revenue_create_music_eur?: number | null
          revenue_promotion_eur?: number | null
          revenue_register_eur?: number | null
          revenue_video_eur?: number | null
          total_credits_spent?: number | null
          total_revenue_eur?: number | null
          unique_ai_studio_users?: number | null
          unique_users?: number | null
          uses_cover?: number | null
          uses_create_music?: number | null
          uses_enhance_audio?: number | null
          uses_lyrics?: number | null
          uses_press?: number | null
          uses_promotion?: number | null
          uses_register?: number | null
          uses_video?: number | null
          uses_vocal?: number | null
          uses_voice_cloning?: number | null
          works_after_generation?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available_credits: number
          created_at: string
          display_name: string | null
          free_downloads_used: number | null
          ibs_signature_id: string | null
          id: string
          is_blocked: boolean | null
          is_managed_artist: boolean | null
          kyc_status: string
          language: string | null
          last_active_at: string | null
          library_status: string | null
          library_status_since: string | null
          managed_by_manager_id: string | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_credits?: number
          created_at?: string
          display_name?: string | null
          free_downloads_used?: number | null
          ibs_signature_id?: string | null
          id?: string
          is_blocked?: boolean | null
          is_managed_artist?: boolean | null
          kyc_status?: string
          language?: string | null
          last_active_at?: string | null
          library_status?: string | null
          library_status_since?: string | null
          managed_by_manager_id?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_credits?: number
          created_at?: string
          display_name?: string | null
          free_downloads_used?: number | null
          ibs_signature_id?: string | null
          id?: string
          is_blocked?: boolean | null
          is_managed_artist?: boolean | null
          kyc_status?: string
          language?: string | null
          last_active_at?: string | null
          library_status?: string | null
          library_status_since?: string | null
          managed_by_manager_id?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotion_requests: {
        Row: {
          artist_name: string
          created_at: string
          description: string
          id: string
          main_link: string
          promotion_goal: string
          social_networks: string | null
          status: string
          user_id: string
          work_title: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          description: string
          id?: string
          main_link: string
          promotion_goal: string
          social_networks?: string | null
          status?: string
          user_id: string
          work_title: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          description?: string
          id?: string
          main_link?: string
          promotion_goal?: string
          social_networks?: string | null
          status?: string
          user_id?: string
          work_title?: string
        }
        Relationships: []
      }
      purchase_evidences: {
        Row: {
          accepted_terms: boolean | null
          accepted_terms_timestamp: string | null
          accepted_terms_version: string | null
          amount: number
          browser_language: string | null
          certificate_pdf_path: string | null
          certificate_pdf_url: string | null
          certification_status: string
          charge_id: string | null
          checkout_session_id: string | null
          created_at: string | null
          currency: string
          error_message: string | null
          evidence_hash: string | null
          evidence_payload_json: Json
          ibs_registered_at: string | null
          ibs_transaction_id: string | null
          id: string
          ip_address: string | null
          last_retry_at: string | null
          payment_intent_id: string | null
          payment_provider: string
          payment_status: string
          product_name: string | null
          product_type: string
          purchase_id: string | null
          retry_count: number | null
          session_id: string | null
          source: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_terms?: boolean | null
          accepted_terms_timestamp?: string | null
          accepted_terms_version?: string | null
          amount: number
          browser_language?: string | null
          certificate_pdf_path?: string | null
          certificate_pdf_url?: string | null
          certification_status?: string
          charge_id?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string
          error_message?: string | null
          evidence_hash?: string | null
          evidence_payload_json?: Json
          ibs_registered_at?: string | null
          ibs_transaction_id?: string | null
          id?: string
          ip_address?: string | null
          last_retry_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string
          payment_status: string
          product_name?: string | null
          product_type: string
          purchase_id?: string | null
          retry_count?: number | null
          session_id?: string | null
          source?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_terms?: boolean | null
          accepted_terms_timestamp?: string | null
          accepted_terms_version?: string | null
          amount?: number
          browser_language?: string | null
          certificate_pdf_path?: string | null
          certificate_pdf_url?: string | null
          certification_status?: string
          charge_id?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string
          error_message?: string | null
          evidence_hash?: string | null
          evidence_payload_json?: Json
          ibs_registered_at?: string | null
          ibs_transaction_id?: string | null
          id?: string
          ip_address?: string | null
          last_retry_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string
          payment_status?: string
          product_name?: string | null
          product_type?: string
          purchase_id?: string | null
          retry_count?: number | null
          session_id?: string | null
          source?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchase_usage_evidences: {
        Row: {
          certification_status: string
          created_at: string | null
          event_timestamp: string
          event_type: string
          evidence_hash: string | null
          ibs_registered_at: string | null
          ibs_transaction_id: string | null
          id: string
          ip_address: string | null
          metadata_json: Json | null
          purchase_evidence_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          certification_status?: string
          created_at?: string | null
          event_timestamp?: string
          event_type: string
          evidence_hash?: string | null
          ibs_registered_at?: string | null
          ibs_transaction_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          purchase_evidence_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          certification_status?: string
          created_at?: string | null
          event_timestamp?: string
          event_type?: string
          evidence_hash?: string | null
          ibs_registered_at?: string | null
          ibs_transaction_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          purchase_evidence_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_usage_evidences_purchase_evidence_id_fkey"
            columns: ["purchase_evidence_id"]
            isOneToOne: false
            referencedRelation: "purchase_evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_usage_evidences_purchase_evidence_id_fkey"
            columns: ["purchase_evidence_id"]
            isOneToOne: false
            referencedRelation: "v_orders_evidences_consistency"
            referencedColumns: ["evidence_id"]
          },
        ]
      }
      social_promotions: {
        Row: {
          copy_ig_feed: string | null
          copy_ig_story: string | null
          copy_tiktok: string | null
          created_at: string
          credits_spent: number | null
          email_sent_at: string | null
          error_detail: string | null
          id: string
          image_url: string | null
          regeneration_count: number
          status: string
          updated_at: string
          user_id: string
          work_id: string
        }
        Insert: {
          copy_ig_feed?: string | null
          copy_ig_story?: string | null
          copy_tiktok?: string | null
          created_at?: string
          credits_spent?: number | null
          email_sent_at?: string | null
          error_detail?: string | null
          id?: string
          image_url?: string | null
          regeneration_count?: number
          status?: string
          updated_at?: string
          user_id: string
          work_id: string
        }
        Update: {
          copy_ig_feed?: string | null
          copy_ig_story?: string | null
          copy_tiktok?: string | null
          created_at?: string
          credits_spent?: number | null
          email_sent_at?: string | null
          error_detail?: string | null
          id?: string
          image_url?: string | null
          regeneration_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          work_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_artist_profiles: {
        Row: {
          created_at: string
          created_from_generation_id: string | null
          default_duration: number | null
          genre: string | null
          id: string
          is_default: boolean | null
          mood: string | null
          name: string
          style_notes: string | null
          updated_at: string
          user_id: string
          voice_clone_id: string | null
          voice_profile_id: string | null
          voice_type: string | null
        }
        Insert: {
          created_at?: string
          created_from_generation_id?: string | null
          default_duration?: number | null
          genre?: string | null
          id?: string
          is_default?: boolean | null
          mood?: string | null
          name: string
          style_notes?: string | null
          updated_at?: string
          user_id: string
          voice_clone_id?: string | null
          voice_profile_id?: string | null
          voice_type?: string | null
        }
        Update: {
          created_at?: string
          created_from_generation_id?: string | null
          default_duration?: number | null
          genre?: string | null
          id?: string
          is_default?: boolean | null
          mood?: string | null
          name?: string
          style_notes?: string | null
          updated_at?: string
          user_id?: string
          voice_clone_id?: string | null
          voice_profile_id?: string | null
          voice_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_artist_profiles_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attribution: {
        Row: {
          attributed_campaign_name: string | null
          created_at: string
          first_campaign: string | null
          first_content: string | null
          first_coupon_seen: string | null
          first_landing_path: string | null
          first_medium: string | null
          first_referrer: string | null
          first_source: string | null
          first_term: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attributed_campaign_name?: string | null
          created_at?: string
          first_campaign?: string | null
          first_content?: string | null
          first_coupon_seen?: string | null
          first_landing_path?: string | null
          first_medium?: string | null
          first_referrer?: string | null
          first_source?: string | null
          first_term?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attributed_campaign_name?: string | null
          created_at?: string
          first_campaign?: string | null
          first_content?: string | null
          first_coupon_seen?: string | null
          first_landing_path?: string | null
          first_medium?: string | null
          first_referrer?: string | null
          first_source?: string | null
          first_term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          duration: number | null
          failure_reason: string | null
          id: string
          merged_audio_id: string | null
          merged_url: string | null
          mode: string
          prompt: string
          status: string
          style: string | null
          task_id: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          failure_reason?: string | null
          id?: string
          merged_audio_id?: string | null
          merged_url?: string | null
          mode?: string
          prompt: string
          status?: string
          style?: string | null
          task_id: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          failure_reason?: string | null
          id?: string
          merged_audio_id?: string | null
          merged_url?: string | null
          mode?: string
          prompt?: string
          status?: string
          style?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      voice_clones: {
        Row: {
          created_at: string
          id: string
          mureka_vocal_id: string | null
          name: string
          provider: string
          provider_voice_id: string
          sample_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mureka_vocal_id?: string | null
          name?: string
          provider?: string
          provider_voice_id: string
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mureka_vocal_id?: string | null
          name?: string
          provider?: string
          provider_voice_id?: string
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          active: boolean | null
          description: string | null
          emoji: string | null
          gender: string
          id: string
          label: string
          preview_generated_at: string | null
          preview_url: string | null
          prompt_tag: string
          sample_generated_at: string | null
          sample_url: string | null
          sort_order: number | null
          style: string
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          emoji?: string | null
          gender: string
          id: string
          label: string
          preview_generated_at?: string | null
          preview_url?: string | null
          prompt_tag: string
          sample_generated_at?: string | null
          sample_url?: string | null
          sort_order?: number | null
          style: string
        }
        Update: {
          active?: boolean | null
          description?: string | null
          emoji?: string | null
          gender?: string
          id?: string
          label?: string
          preview_generated_at?: string | null
          preview_url?: string | null
          prompt_tag?: string
          sample_generated_at?: string | null
          sample_url?: string | null
          sort_order?: number | null
          style?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          author: string | null
          blockchain_hash: string | null
          blockchain_network: string | null
          certificate_url: string | null
          certified_at: string | null
          checker_url: string | null
          created_at: string
          description: string | null
          distributed_at: string | null
          distribution_clicks: number | null
          file_hash: string | null
          file_hash_sha512_b64: string | null
          file_path: string | null
          ibs_evidence_id: string | null
          ibs_payload_algorithm: string | null
          ibs_payload_checksum: string | null
          ibs_signature_id: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          blockchain_hash?: string | null
          blockchain_network?: string | null
          certificate_url?: string | null
          certified_at?: string | null
          checker_url?: string | null
          created_at?: string
          description?: string | null
          distributed_at?: string | null
          distribution_clicks?: number | null
          file_hash?: string | null
          file_hash_sha512_b64?: string | null
          file_path?: string | null
          ibs_evidence_id?: string | null
          ibs_payload_algorithm?: string | null
          ibs_payload_checksum?: string | null
          ibs_signature_id?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          blockchain_hash?: string | null
          blockchain_network?: string | null
          certificate_url?: string | null
          certified_at?: string | null
          checker_url?: string | null
          created_at?: string
          description?: string | null
          distributed_at?: string | null
          distribution_clicks?: number | null
          file_hash?: string | null
          file_hash_sha512_b64?: string | null
          file_path?: string | null
          ibs_evidence_id?: string | null
          ibs_payload_algorithm?: string | null
          ibs_payload_checksum?: string | null
          ibs_signature_id?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cancellation_stats: {
        Row: {
          avg_creditos_restantes: number | null
          avg_lifetime_value: number | null
          cancellation_reason: string | null
          fecha: string | null
          plan_type: string | null
          total_cancelaciones: number | null
        }
        Relationships: []
      }
      manager_dashboard: {
        Row: {
          artist_email: string | null
          artist_name: string | null
          artist_status: string | null
          distributed_works: number | null
          last_work_at: string | null
          managed_artist_id: string | null
          manager_user_id: string | null
          registered_works: number | null
          representation_type: string | null
          total_works: number | null
        }
        Relationships: []
      }
      v_orders_evidences_consistency: {
        Row: {
          amount_gross: number | null
          certificate_pdf_path: string | null
          certification_status: string | null
          consistency_status: string | null
          evidence_id: string | null
          ibs_transaction_id: string | null
          order_id: string | null
          order_status: string | null
          paid_at: string | null
          payment_intent_id: string | null
          product_label: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_library_tier: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_free_downloads: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_active_manager: { Args: { _user_id: string }; Returns: boolean }
      manager_can_access_artist: {
        Args: { _artist_id: string; _manager_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "manager"
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
      app_role: ["admin", "moderator", "user", "manager"],
    },
  },
} as const
