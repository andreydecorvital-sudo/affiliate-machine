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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acquisition_visits: {
        Row: {
          campaign_id: string | null
          created_at: string
          group_id: string | null
          id: string
          niche: string
          referrer_host: string | null
          routed: boolean
          user_agent_family: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          niche: string
          referrer_host?: string | null
          routed?: boolean
          user_agent_family?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          niche?: string
          referrer_host?: string | null
          routed?: boolean
          user_agent_family?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_visits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "traffic_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_visits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_url: string
          created_at: string
          id: string
          origin_url: string
          product_id: string | null
          provider: string
          sub_ids: Json
          tracking_key: string | null
        }
        Insert: {
          affiliate_url: string
          created_at?: string
          id?: string
          origin_url: string
          product_id?: string | null
          provider: string
          sub_ids?: Json
          tracking_key?: string | null
        }
        Update: {
          affiliate_url?: string
          created_at?: string
          id?: string
          origin_url?: string
          product_id?: string | null
          provider?: string
          sub_ids?: Json
          tracking_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          category_ids: Json
          external_item_id: string
          external_shop_id: string | null
          first_seen_at: string
          id: string
          image_url: string | null
          last_seen_at: string
          metadata: Json
          product_link: string | null
          product_name: string
          provider: string
          shop_name: string | null
        }
        Insert: {
          category_ids?: Json
          external_item_id: string
          external_shop_id?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          metadata?: Json
          product_link?: string | null
          product_name: string
          provider: string
          shop_name?: string | null
        }
        Update: {
          category_ids?: Json
          external_item_id?: string
          external_shop_id?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          metadata?: Json
          product_link?: string | null
          product_name?: string
          provider?: string
          shop_name?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          sensitive: boolean
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          correlation_id: string | null
          created_at: string
          id: number
          payload: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          correlation_id?: string | null
          created_at?: string
          id?: never
          payload?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          correlation_id?: string | null
          created_at?: string
          id?: never
          payload?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      click_events: {
        Row: {
          id: number
          is_bot: boolean
          occurred_at: string
          referrer_host: string | null
          short_link_id: string
          user_agent_family: string
        }
        Insert: {
          id?: never
          is_bot?: boolean
          occurred_at?: string
          referrer_host?: string | null
          short_link_id: string
          user_agent_family?: string
        }
        Update: {
          id?: never
          is_bot?: boolean
          occurred_at?: string
          referrer_host?: string | null
          short_link_id?: string
          user_agent_family?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          amount: number
          conversion_id: string
          external_conversion_id: string
          first_seen_at: string
          id: string
          metadata: Json
          observed_order_status: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          conversion_id: string
          external_conversion_id: string
          first_seen_at?: string
          id?: string
          metadata?: Json
          observed_order_status?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          conversion_id?: string
          external_conversion_id?: string
          first_seen_at?: string
          id?: string
          metadata?: Json
          observed_order_status?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_attributions: {
        Row: {
          confidence: number
          conversion_id: string
          created_at: string
          delivery_id: string
          evidence: string | null
          id: string
          method: string
        }
        Insert: {
          confidence: number
          conversion_id: string
          created_at?: string
          delivery_id: string
          evidence?: string | null
          id?: string
          method: string
        }
        Update: {
          confidence?: number
          conversion_id?: string
          created_at?: string
          delivery_id?: string
          evidence?: string | null
          id?: string
          method?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_attributions_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: true
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_attributions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "post_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_items: {
        Row: {
          attribution_type: string | null
          complete_at: string | null
          conversion_id: string
          external_item_id: string | null
          external_order_id: string
          id: number
          item_commission: number | null
          item_name: string | null
          item_price: number | null
          order_status: string | null
          quantity: number
          shop_name: string | null
        }
        Insert: {
          attribution_type?: string | null
          complete_at?: string | null
          conversion_id: string
          external_item_id?: string | null
          external_order_id: string
          id?: never
          item_commission?: number | null
          item_name?: string | null
          item_price?: number | null
          order_status?: string | null
          quantity?: number
          shop_name?: string | null
        }
        Update: {
          attribution_type?: string | null
          complete_at?: string | null
          conversion_id?: string
          external_item_id?: string | null
          external_order_id?: string
          id?: never
          item_commission?: number | null
          item_name?: string | null
          item_price?: number | null
          order_status?: string | null
          quantity?: number
          shop_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_items_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          buyer_type: string | null
          click_at: string | null
          device: string | null
          external_conversion_id: string
          first_seen_at: string
          id: string
          last_synced_at: string
          order_status: string | null
          provider: string
          provider_commission: number | null
          purchase_at: string
          raw: Json
          seller_commission: number | null
          total_commission: number
          utm_content: string | null
        }
        Insert: {
          buyer_type?: string | null
          click_at?: string | null
          device?: string | null
          external_conversion_id: string
          first_seen_at?: string
          id?: string
          last_synced_at?: string
          order_status?: string | null
          provider: string
          provider_commission?: number | null
          purchase_at: string
          raw?: Json
          seller_commission?: number | null
          total_commission?: number
          utm_content?: string | null
        }
        Update: {
          buyer_type?: string | null
          click_at?: string | null
          device?: string | null
          external_conversion_id?: string
          first_seen_at?: string
          id?: string
          last_synced_at?: string
          order_status?: string | null
          provider?: string
          provider_commission?: number | null
          purchase_at?: string
          raw?: Json
          seller_commission?: number | null
          total_commission?: number
          utm_content?: string | null
        }
        Relationships: []
      }
      distribution_experiment_assignments: {
        Row: {
          arm: string
          assigned_at: string
          experiment_id: string
          id: string
          post_id: string
        }
        Insert: {
          arm: string
          assigned_at?: string
          experiment_id: string
          id?: string
          post_id: string
        }
        Update: {
          arm?: string
          assigned_at?: string
          experiment_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "distribution_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_experiment_assignments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_experiments: {
        Row: {
          config: Json
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          min_posts_per_arm: number
          name: string
          niche: string | null
          starts_at: string | null
          status: string
          treatment_share: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          kind: string
          min_posts_per_arm?: number
          name: string
          niche?: string | null
          starts_at?: string | null
          status?: string
          treatment_share?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          min_posts_per_arm?: number
          name?: string
          niche?: string | null
          starts_at?: string | null
          status?: string
          treatment_share?: number
          updated_at?: string
        }
        Relationships: []
      }
      distribution_group_metrics: {
        Row: {
          clicks: number
          commission: number
          conversions: number
          group_id: string
          period_days: number
          raw_commission_per_delivery: number | null
          rpc: number | null
          sample_confidence: number
          smoothed_commission_per_delivery: number | null
          successful_deliveries: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          commission?: number
          conversions?: number
          group_id: string
          period_days: number
          raw_commission_per_delivery?: number | null
          rpc?: number | null
          sample_confidence?: number
          smoothed_commission_per_delivery?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          commission?: number
          conversions?: number
          group_id?: string
          period_days?: number
          raw_commission_per_delivery?: number | null
          rpc?: number | null
          sample_confidence?: number
          smoothed_commission_per_delivery?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_group_metrics_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_timing_metrics: {
        Row: {
          clicks: number
          commission: number
          conversions: number
          local_hour: number
          niche: string
          period_days: number
          raw_commission_per_delivery: number | null
          rpc: number | null
          sample_confidence: number
          smoothed_commission_per_delivery: number | null
          successful_deliveries: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          commission?: number
          conversions?: number
          local_hour: number
          niche: string
          period_days: number
          raw_commission_per_delivery?: number | null
          rpc?: number | null
          sample_confidence?: number
          smoothed_commission_per_delivery?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          commission?: number
          conversions?: number
          local_hour?: number
          niche?: string
          period_days?: number
          raw_commission_per_delivery?: number | null
          rpc?: number | null
          sample_confidence?: number
          smoothed_commission_per_delivery?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Relationships: []
      }
      experiment_assignments: {
        Row: {
          assigned_at: string
          delivery_id: string
          experiment_id: string
          id: string
          variant_id: string
        }
        Insert: {
          assigned_at?: string
          delivery_id: string
          experiment_id: string
          id?: string
          variant_id: string
        }
        Update: {
          assigned_at?: string
          delivery_id?: string
          experiment_id?: string
          id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "post_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_assignments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "experiment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_variants: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          experiment_id: string
          id: string
          label: string
          variant_key: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          experiment_id: string
          id?: string
          label: string
          variant_key: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          experiment_id?: string
          id?: string
          label?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          min_clicks_per_variant: number
          name: string
          niche: string | null
          objective: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          min_clicks_per_variant?: number
          name: string
          niche?: string | null
          objective?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          min_clicks_per_variant?: number
          name?: string
          niche?: string | null
          objective?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      health_snapshots: {
        Row: {
          checked_at: string
          component: string
          details: Json
          id: number
          state: string
        }
        Insert: {
          checked_at?: string
          component: string
          details?: Json
          id?: never
          state: string
        }
        Update: {
          checked_at?: string
          component?: string
          details?: Json
          id?: never
          state?: string
        }
        Relationships: []
      }
      hunter_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          offers_fetched: number
          offers_persisted: number
          pages_fetched: number
          started_at: string
          status: string
          strategy_id: string
          unique_items: number
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_fetched?: number
          offers_persisted?: number
          pages_fetched?: number
          started_at?: string
          status?: string
          strategy_id: string
          unique_items?: number
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_fetched?: number
          offers_persisted?: number
          pages_fetched?: number
          started_at?: string
          status?: string
          strategy_id?: string
          unique_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "hunter_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "hunter_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_strategies: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          keyword: string | null
          last_error: string | null
          last_run_at: string | null
          list_type: number
          name: string
          niche: string
          page_size: number
          pages_per_run: number
          priority: number
          product_cat_id: number | null
          provider: string
          sort_type: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string | null
          last_error?: string | null
          last_run_at?: string | null
          list_type?: number
          name: string
          niche?: string
          page_size?: number
          pages_per_run?: number
          priority?: number
          product_cat_id?: number | null
          provider?: string
          sort_type?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string | null
          last_error?: string | null
          last_run_at?: string | null
          list_type?: number
          name?: string
          niche?: string
          page_size?: number
          pages_per_run?: number
          priority?: number
          product_cat_id?: number | null
          provider?: string
          sort_type?: number
          updated_at?: string
        }
        Relationships: []
      }
      learning_product_metrics: {
        Row: {
          clicks: number
          commission: number
          conversions: number
          period_days: number
          product_id: string
          raw_cvr: number | null
          raw_rpc: number | null
          sample_confidence: number
          smoothed_cvr: number | null
          smoothed_rpc: number | null
          successful_deliveries: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          commission?: number
          conversions?: number
          period_days: number
          product_id: string
          raw_cvr?: number | null
          raw_rpc?: number | null
          sample_confidence?: number
          smoothed_cvr?: number | null
          smoothed_rpc?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          commission?: number
          conversions?: number
          period_days?: number
          product_id?: string
          raw_cvr?: number | null
          raw_rpc?: number | null
          sample_confidence?: number
          smoothed_cvr?: number | null
          smoothed_rpc?: number | null
          successful_deliveries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_product_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_strategy_metrics: {
        Row: {
          clicks: number
          commission: number
          conversions: number
          performance_index: number | null
          period_days: number
          published_products: number
          raw_cvr: number | null
          raw_rpc: number | null
          sample_confidence: number
          smoothed_cvr: number | null
          smoothed_rpc: number | null
          strategy_id: string
          successful_deliveries: number
          updated_at: string
        }
        Insert: {
          clicks?: number
          commission?: number
          conversions?: number
          performance_index?: number | null
          period_days: number
          published_products?: number
          raw_cvr?: number | null
          raw_rpc?: number | null
          sample_confidence?: number
          smoothed_cvr?: number | null
          smoothed_rpc?: number | null
          strategy_id: string
          successful_deliveries?: number
          updated_at?: string
        }
        Update: {
          clicks?: number
          commission?: number
          conversions?: number
          performance_index?: number | null
          period_days?: number
          published_products?: number
          raw_cvr?: number | null
          raw_rpc?: number | null
          sample_confidence?: number
          smoothed_cvr?: number | null
          smoothed_rpc?: number | null
          strategy_id?: string
          successful_deliveries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_strategy_metrics_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: true
            referencedRelation: "hunter_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_scores: {
        Row: {
          algorithm_version: string
          confidence: number
          created_at: string
          decision: string
          factors: Json
          id: number
          offer_snapshot_id: number
          product_id: string
          score: number
          thresholds: Json
        }
        Insert: {
          algorithm_version: string
          confidence: number
          created_at?: string
          decision: string
          factors?: Json
          id?: never
          offer_snapshot_id: number
          product_id: string
          score: number
          thresholds?: Json
        }
        Update: {
          algorithm_version?: string
          confidence?: number
          created_at?: string
          decision?: string
          factors?: Json
          id?: never
          offer_snapshot_id?: number
          product_id?: string
          score?: number
          thresholds?: Json
        }
        Relationships: [
          {
            foreignKeyName: "offer_scores_offer_snapshot_id_fkey"
            columns: ["offer_snapshot_id"]
            isOneToOne: false
            referencedRelation: "offer_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_snapshots: {
        Row: {
          captured_at: string
          commission_rate: number | null
          discount_rate: number | null
          discovery_niche: string | null
          discovery_strategy_id: string | null
          estimated_commission: number | null
          id: number
          offer_link: string
          period_end_at: string | null
          period_start_at: string | null
          price: number | null
          price_max: number | null
          price_min: number | null
          product_id: string
          provider: string
          provider_commission_rate: number | null
          rating: number | null
          raw: Json
          sales: number | null
          seller_commission_rate: number | null
        }
        Insert: {
          captured_at?: string
          commission_rate?: number | null
          discount_rate?: number | null
          discovery_niche?: string | null
          discovery_strategy_id?: string | null
          estimated_commission?: number | null
          id?: never
          offer_link: string
          period_end_at?: string | null
          period_start_at?: string | null
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          product_id: string
          provider: string
          provider_commission_rate?: number | null
          rating?: number | null
          raw?: Json
          sales?: number | null
          seller_commission_rate?: number | null
        }
        Update: {
          captured_at?: string
          commission_rate?: number | null
          discount_rate?: number | null
          discovery_niche?: string | null
          discovery_strategy_id?: string | null
          estimated_commission?: number | null
          id?: never
          offer_link?: string
          period_end_at?: string | null
          period_start_at?: string | null
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          product_id?: string
          provider?: string
          provider_commission_rate?: number | null
          rating?: number | null
          raw?: Json
          sales?: number | null
          seller_commission_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_snapshots_discovery_strategy_id_fkey"
            columns: ["discovery_strategy_id"]
            isOneToOne: false
            referencedRelation: "hunter_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_traffic_campaign_links: {
        Row: {
          campaign_id: string | null
          created_at: string
          discovered_at: string
          external_account_id: string
          external_campaign_id: string
          external_campaign_name: string | null
          id: string
          last_seen_at: string
          provider: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          discovered_at?: string
          external_account_id: string
          external_campaign_id: string
          external_campaign_name?: string | null
          id?: string
          last_seen_at?: string
          provider: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          discovered_at?: string
          external_account_id?: string
          external_campaign_id?: string
          external_campaign_name?: string | null
          id?: string
          last_seen_at?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_traffic_campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "traffic_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_traffic_spend: {
        Row: {
          campaign_id: string | null
          created_at: string
          currency: string
          external_account_id: string | null
          external_campaign_id: string
          external_campaign_name: string | null
          id: number
          impressions: number
          platform_clicks: number
          provider: string
          raw: Json
          spend: number
          spent_on: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          currency?: string
          external_account_id?: string | null
          external_campaign_id: string
          external_campaign_name?: string | null
          id?: never
          impressions?: number
          platform_clicks?: number
          provider: string
          raw?: Json
          spend?: number
          spent_on: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          currency?: string
          external_account_id?: string | null
          external_campaign_id?: string
          external_campaign_name?: string | null
          id?: never
          impressions?: number
          platform_clicks?: number
          provider?: string
          raw?: Json
          spend?: number
          spent_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_traffic_spend_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "traffic_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      post_deliveries: {
        Row: {
          accepted_at: string | null
          account_id: string
          affiliate_link_id: string | null
          allocation_arm: string | null
          allocation_experiment_id: string | null
          allocation_reason: string | null
          attempt_count: number
          confirmed_at: string | null
          content_override: string | null
          created_at: string
          eligible_after: string | null
          group_id: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string | null
          post_id: string
          provider_message_id: string | null
          short_link_id: string | null
          status: string
          timing_arm: string | null
          timing_experiment_id: string | null
          timing_hour: number | null
          tracking_key: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          affiliate_link_id?: string | null
          allocation_arm?: string | null
          allocation_experiment_id?: string | null
          allocation_reason?: string | null
          attempt_count?: number
          confirmed_at?: string | null
          content_override?: string | null
          created_at?: string
          eligible_after?: string | null
          group_id: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string | null
          post_id: string
          provider_message_id?: string | null
          short_link_id?: string | null
          status?: string
          timing_arm?: string | null
          timing_experiment_id?: string | null
          timing_hour?: number | null
          tracking_key?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          affiliate_link_id?: string | null
          allocation_arm?: string | null
          allocation_experiment_id?: string | null
          allocation_reason?: string | null
          attempt_count?: number
          confirmed_at?: string | null
          content_override?: string | null
          created_at?: string
          eligible_after?: string | null
          group_id?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string | null
          post_id?: string
          provider_message_id?: string | null
          short_link_id?: string | null
          status?: string
          timing_arm?: string | null
          timing_experiment_id?: string | null
          timing_hour?: number | null
          tracking_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_deliveries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_allocation_experiment_id_fkey"
            columns: ["allocation_experiment_id"]
            isOneToOne: false
            referencedRelation: "distribution_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_deliveries_timing_experiment_id_fkey"
            columns: ["timing_experiment_id"]
            isOneToOne: false
            referencedRelation: "distribution_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          affiliate_link_id: string
          content: string
          created_at: string
          first_sent_at: string | null
          id: string
          last_revalidated_at: string | null
          niche: string
          offer_score_id: number
          offer_snapshot_id: number
          revalidation_reason: string | null
          revalidation_state: string
          scheduled_at: string | null
          short_link_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_link_id: string
          content: string
          created_at?: string
          first_sent_at?: string | null
          id?: string
          last_revalidated_at?: string | null
          niche?: string
          offer_score_id: number
          offer_snapshot_id: number
          revalidation_reason?: string | null
          revalidation_state?: string
          scheduled_at?: string | null
          short_link_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_link_id?: string
          content?: string
          created_at?: string
          first_sent_at?: string | null
          id?: string
          last_revalidated_at?: string | null
          niche?: string
          offer_score_id?: number
          offer_snapshot_id?: number
          revalidation_reason?: string | null
          revalidation_state?: string
          scheduled_at?: string | null
          short_link_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_offer_score_id_fkey"
            columns: ["offer_score_id"]
            isOneToOne: false
            referencedRelation: "offer_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_offer_snapshot_id_fkey"
            columns: ["offer_snapshot_id"]
            isOneToOne: false
            referencedRelation: "offer_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          affiliate_link_id: string | null
          code: string
          context: Json
          created_at: string
          destination_url: string
          expires_at: string | null
          id: string
          is_active: boolean
          provider: string
          tracking_key: string | null
        }
        Insert: {
          affiliate_link_id?: string | null
          code: string
          context?: Json
          created_at?: string
          destination_url: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider: string
          tracking_key?: string | null
        }
        Update: {
          affiliate_link_id?: string | null
          code?: string
          context?: Json
          created_at?: string
          destination_url?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          tracking_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_links_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      system_idempotency: {
        Row: {
          created_at: string
          expires_at: string | null
          key: string
          payload_hash: string | null
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          key: string
          payload_hash?: string | null
          scope: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          key?: string
          payload_hash?: string | null
          scope?: string
        }
        Relationships: []
      }
      traffic_campaigns: {
        Row: {
          campaign_key: string
          created_at: string
          id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          campaign_key: string
          created_at?: string
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          campaign_key?: string
          created_at?: string
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      universal_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          occurred_at: string
          payload: Json
          source: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload?: Json
          source: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          occurred_at?: string
          payload?: Json
          source?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          last_connected_at: string | null
          last_error: string | null
          pairing_qr_data_url: string | null
          pairing_qr_expires_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          last_connected_at?: string | null
          last_error?: string | null
          pairing_qr_data_url?: string | null
          pairing_qr_expires_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          last_connected_at?: string | null
          last_error?: string | null
          pairing_qr_data_url?: string | null
          pairing_qr_expires_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_groups: {
        Row: {
          accepting_traffic: boolean
          account_id: string
          active: boolean
          capacity_limit: number | null
          group_jid: string
          id: string
          invite_url: string | null
          last_routed_at: string | null
          last_synced_at: string
          member_count: number
          metadata: Json
          name: string
          niche: string
        }
        Insert: {
          accepting_traffic?: boolean
          account_id: string
          active?: boolean
          capacity_limit?: number | null
          group_jid: string
          id?: string
          invite_url?: string | null
          last_routed_at?: string | null
          last_synced_at?: string
          member_count?: number
          metadata?: Json
          name: string
          niche?: string
        }
        Update: {
          accepting_traffic?: boolean
          account_id?: string
          active?: boolean
          capacity_limit?: number | null
          group_jid?: string
          id?: string
          invite_url?: string | null
          last_routed_at?: string | null
          last_synced_at?: string
          member_count?: number
          metadata?: Json
          name?: string
          niche?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_send_dedupe: {
        Row: {
          account_id: string
          ack: string | null
          confirmed: boolean
          created_at: string
          group_jid: string
          idempotency_key: string
          provider_message_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          ack?: string | null
          confirmed?: boolean
          created_at?: string
          group_jid: string
          idempotency_key: string
          provider_message_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          ack?: string | null
          confirmed?: boolean
          created_at?: string
          group_jid?: string
          idempotency_key?: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_send_dedupe_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_session_secrets: {
        Row: {
          account_id: string
          auth_bundle: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          auth_bundle?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          auth_bundle?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_session_secrets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_job: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      assign_distribution_experiment: {
        Args: { p_kind: string; p_niche: string; p_post_id: string }
        Returns: {
          arm: string
          experiment_config: Json
          experiment_id: string
          experiment_name: string
          min_posts_per_arm: number
        }[]
      }
      assign_message_experiment: {
        Args: { p_delivery_id: string }
        Returns: {
          experiment_id: string
          experiment_name: string
          min_clicks_per_variant: number
          objective: string
          variant_config: Json
          variant_id: string
          variant_key: string
          variant_label: string
        }[]
      }
      attach_delivery_tracking: {
        Args: {
          p_affiliate_link_id: string
          p_content: string
          p_delivery_id: string
          p_short_link_id: string
          p_tracking_key: string
        }
        Returns: undefined
      }
      cancel_post: {
        Args: { p_post_id: string; p_reason: string }
        Returns: undefined
      }
      claim_idempotency: {
        Args: {
          hash_value?: string
          idempotency_key: string
          idempotency_scope: string
        }
        Returns: boolean
      }
      claim_next_delivery: {
        Args: never
        Returns: {
          account_id: string
          attempt_count: number
          content: string
          delivery_id: string
          group_id: string
          group_jid: string
          idempotency_key: string
          post_id: string
        }[]
      }
      create_post_with_deliveries: {
        Args: {
          p_affiliate_link_id: string
          p_content: string
          p_niche: string
          p_offer_score_id: number
          p_offer_snapshot_id: number
          p_scheduled_at?: string
          p_short_link_id: string
        }
        Returns: string
      }
      create_short_link: {
        Args: {
          p_affiliate_link_id: string
          p_code: string
          p_context?: Json
          p_destination_url: string
          p_expires_at?: string
          p_provider: string
          p_tracking_key?: string
        }
        Returns: string
      }
      distribution_experiment_performance: {
        Args: { p_experiment_id: string }
        Returns: {
          arm: string
          assigned_posts: number
          clicks: number
          commission: number
          commission_per_delivery: number
          commission_per_post: number
          conversions: number
          rpc: number
          sample_ready: boolean
          successful_deliveries: number
        }[]
      }
      distribution_quota_status: {
        Args: never
        Returns: {
          allowed: boolean
          daily_limit: number
          hourly_limit: number
          sent_current_hour: number
          sent_today: number
        }[]
      }
      distribution_target_count: { Args: { p_niche: string }; Returns: number }
      enqueue_job: {
        Args: { delay_seconds?: number; message: Json; queue_name: string }
        Returns: number
      }
      experiment_performance: {
        Args: { p_experiment_id: string }
        Returns: {
          assigned_deliveries: number
          clicks: number
          commission: number
          commission_per_delivery: number
          conversions: number
          cvr: number
          rpc: number
          sample_ready: boolean
          successful_deliveries: number
          variant_id: string
          variant_key: string
          variant_label: string
        }[]
      }
      fanout_post: { Args: { p_post_id: string }; Returns: number }
      finish_delivery: {
        Args: {
          p_delivery_id: string
          p_error?: string
          p_provider_message_id?: string
          p_retry_after_seconds?: number
          p_status: string
        }
        Returns: undefined
      }
      get_delivery_tracking_context: {
        Args: { p_delivery_id: string }
        Returns: {
          affiliate_link_id: string
          content_override: string
          delivery_id: string
          discount_rate: number
          external_item_id: string
          group_id: string
          group_name: string
          niche: string
          origin_url: string
          post_id: string
          price: number
          price_min: number
          product_name: string
          rating: number
          sales: number
          short_link_id: string
          tracking_key: string
        }[]
      }
      get_post_revalidation_context: {
        Args: { p_post_id: string }
        Returns: {
          external_item_id: string
          first_sent_at: string
          last_revalidated_at: string
          niche: string
          post_id: string
          short_code: string
        }[]
      }
      get_publishable_opportunities: {
        Args: { p_limit?: number }
        Returns: {
          confidence: number
          discount_rate: number
          discovery_niche: string
          external_item_id: string
          offer_link: string
          offer_score_id: number
          offer_snapshot_id: number
          price: number
          price_min: number
          product_name: string
          rating: number
          sales: number
          score: number
        }[]
      }
      get_unscored_offer_candidates: {
        Args: { p_algorithm_version: string; p_limit?: number }
        Returns: {
          captured_at: string
          commission_rate: number
          discount_rate: number
          external_item_id: string
          first_seen_at: string
          historical_cvr: number
          learning_confidence: number
          offer_snapshot_id: number
          price: number
          price_min: number
          product_id: string
          rating: number
          recent_publication_count: number
          revenue_per_click: number
          sales: number
        }[]
      }
      learned_delivery_eligible_after: {
        Args: {
          p_max_delay_hours?: number
          p_min_confidence?: number
          p_niche: string
          p_reference: string
        }
        Returns: string
      }
      learning_strategy_rank: {
        Args: never
        Returns: {
          clicks: number
          commission: number
          conversions: number
          effective_rank: number
          enabled: boolean
          keyword: string
          list_type: number
          name: string
          niche: string
          page_size: number
          pages_per_run: number
          performance_index: number
          priority: number
          product_cat_id: number
          provider: string
          sample_confidence: number
          sort_type: number
          strategy_id: string
        }[]
      }
      link_paid_traffic_campaign: {
        Args: { p_campaign_key: string; p_link_id: string }
        Returns: {
          campaign_id: string
          campaign_key: string
          link_id: string
          updated_spend_rows: number
        }[]
      }
      mark_post_revalidated: {
        Args: {
          p_content?: string
          p_post_id: string
          p_reason?: string
          p_state: string
        }
        Returns: undefined
      }
      money_group_performance: {
        Args: { p_days?: number }
        Returns: {
          acquisition_visits: number
          clicks: number
          commission: number
          commission_per_visit: number
          conversions: number
          epc: number
          group_id: string
          group_name: string
          niche: string
          successful_deliveries: number
        }[]
      }
      money_summary: {
        Args: { p_days?: number }
        Returns: {
          clicks: number
          commission_approved: number
          commission_paid: number
          commission_pending: number
          commission_total: number
          conversions: number
          deliveries_sent: number
          epc: number
          period_days: number
          posts_sent: number
        }[]
      }
      paid_campaign_performance: {
        Args: { p_days?: number }
        Returns: {
          campaign_id: string
          campaign_key: string
          cost_per_routed_visit: number
          impressions: number
          platform_clicks: number
          routed_visits: number
          spend: number
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }[]
      }
      paid_group_economics: {
        Args: { p_days?: number }
        Returns: {
          attributed_commission: number
          cost_per_routed_visit: number
          group_id: string
          group_name: string
          modeled_commission_roas: number
          modeled_net_commission: number
          modeled_spend: number
          niche: string
          routed_paid_visits: number
        }[]
      }
      persist_affiliate_link: {
        Args: {
          p_affiliate_url: string
          p_external_item_id: string
          p_origin_url: string
          p_provider: string
          p_sub_ids?: Json
          p_tracking_key?: string
        }
        Returns: string
      }
      persist_offer_score: {
        Args: {
          p_algorithm_version: string
          p_confidence: number
          p_decision: string
          p_factors: Json
          p_offer_snapshot_id: number
          p_score: number
          p_thresholds: Json
        }
        Returns: number
      }
      persist_shopee_conversion: {
        Args: { p_conversion: Json }
        Returns: string
      }
      persist_shopee_offer_snapshot: {
        Args: {
          p_discovery_niche?: string
          p_discovery_strategy_id?: string
          p_offer: Json
        }
        Returns: string
      }
      read_jobs: {
        Args: {
          batch_size?: number
          queue_name: string
          visibility_seconds?: number
        }
        Returns: {
          enqueued_at: string
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      reconcile_conversion_attributions: {
        Args: never
        Returns: {
          attributed: number
          unattributed: number
        }[]
      }
      record_event: {
        Args: {
          p_correlation_id?: string
          p_entity_id?: string
          p_entity_type?: string
          p_event_type: string
          p_idempotency_key?: string
          p_payload?: Json
          p_source: string
        }
        Returns: string
      }
      record_short_link_click: {
        Args: {
          p_is_bot?: boolean
          p_referrer_host?: string
          p_short_link_id: string
          p_user_agent_family?: string
        }
        Returns: number
      }
      refresh_distribution_performance: {
        Args: { p_days?: number }
        Returns: {
          global_commission: number
          global_deliveries: number
          group_rows: number
          timing_rows: number
        }[]
      }
      refresh_learning_metrics: {
        Args: { p_days?: number }
        Returns: {
          global_clicks: number
          global_commission: number
          global_conversions: number
          product_rows: number
          strategy_rows: number
        }[]
      }
      resolve_short_link: {
        Args: { p_code: string }
        Returns: {
          context: Json
          destination_url: string
          short_link_id: string
          tracking_key: string
        }[]
      }
      route_acquisition_visit: {
        Args: {
          p_campaign_key: string
          p_niche: string
          p_referrer_host?: string
          p_user_agent_family?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: {
          group_id: string
          group_name: string
          invite_url: string
          routed_niche: string
          visit_id: string
        }[]
      }
      unlink_paid_traffic_campaign: {
        Args: { p_link_id: string }
        Returns: number
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
