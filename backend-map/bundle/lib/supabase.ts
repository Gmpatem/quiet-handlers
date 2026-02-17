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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      featured_products: {
        Row: {
          id: string
          is_active: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_code: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
        }
        Insert: {
          batch_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          batch_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      inventory_lots: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          product_id: string
          qty_received: number
          qty_remaining: number
          unit_cost_cents: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          product_id: string
          qty_received: number
          qty_remaining: number
          unit_cost_cents: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          product_id?: string
          qty_received?: number
          qty_remaining?: number
          unit_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_profit_realized"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batch_lines_admin"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches_admin"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "inventory_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_lot_allocations: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          order_id: string
          product_id: string
          qty: number
          unit_cost_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          order_id: string
          product_id: string
          qty: number
          unit_cost_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          order_id?: string
          product_id?: string
          qty?: number
          unit_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_lot_allocations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_lot_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_item_lot_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit_realized"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_item_lot_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_lot_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          category_snapshot: string
          created_at: string
          id: string
          line_total_cents: number
          name_snapshot: string
          order_id: string
          product_id: string
          qty: number
          unit_cost_cents: number
          unit_price_cents: number
        }
        Insert: {
          category_snapshot: string
          created_at?: string
          id?: string
          line_total_cents: number
          name_snapshot: string
          order_id: string
          product_id: string
          qty: number
          unit_cost_cents: number
          unit_price_cents: number
        }
        Update: {
          category_snapshot?: string
          created_at?: string
          id?: string
          line_total_cents?: number
          name_snapshot?: string
          order_id?: string
          product_id?: string
          qty?: number
          unit_cost_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit_realized"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_suggestions: {
        Row: {
          contact: string | null
          created_at: string
          customer_name: string | null
          id: string
          message: string
          order_code: string | null
          order_id: string | null
          source: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          message: string
          order_code?: string | null
          order_id?: string | null
          source?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          message?: string
          order_code?: string | null
          order_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_suggestions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_suggestions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit_realized"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_suggestions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contact: string
          created_at: string
          customer_name: string
          delivery_fee_cents: number
          delivery_location: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          notes: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          pickup_location: string | null
          status: Database["public"]["Enums"]["order_status_type"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          contact: string
          created_at?: string
          customer_name: string
          delivery_fee_cents?: number
          delivery_location?: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          pickup_location?: string | null
          status?: Database["public"]["Enums"]["order_status_type"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
        }
        Update: {
          contact?: string
          created_at?: string
          customer_name?: string
          delivery_fee_cents?: number
          delivery_location?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          notes?: string | null
          order_code?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          pickup_location?: string | null
          status?: Database["public"]["Enums"]["order_status_type"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          gcash_ref: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_type"]
          order_id: string
          paid_at: string | null
          proof_url: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status_type"]
          verified_by: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          gcash_ref?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method_type"]
          order_id: string
          paid_at?: string | null
          proof_url?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status_type"]
          verified_by?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          gcash_ref?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method_type"]
          order_id?: string
          paid_at?: string | null
          proof_url?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status_type"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_profit_realized"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost_cents: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          price_cents: number
          stock_qty: number
          updated_at: string
        }
        Insert: {
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          price_cents: number
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          price_cents?: number
          stock_qty?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      settings_meta: {
        Row: {
          created_at: string
          description: string | null
          input_type: string
          key: string
          label: string
          section: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          input_type?: string
          key: string
          label: string
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          input_type?: string
          key?: string
          label?: string
          section?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_meta_key_fkey"
            columns: ["key"]
            isOneToOne: true
            referencedRelation: "app_settings"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      batch_profit_realized: {
        Row: {
          batch_created_at: string | null
          batch_id: string | null
          cogs_cents: number | null
          note: string | null
          order_day: string | null
          profit_cents: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      daily_profit: {
        Row: {
          cogs_cents: number | null
          day: string | null
          orders_count: number | null
          profit_cents: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      daily_profit_pipeline: {
        Row: {
          cogs_cents: number | null
          day: string | null
          orders_count: number | null
          profit_cents: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      daily_profit_realized: {
        Row: {
          cogs_cents: number | null
          day: string | null
          orders_count: number | null
          profit_cents: number | null
          revenue_cents: number | null
        }
        Relationships: []
      }
      inventory_batch_lines_admin: {
        Row: {
          batch_code: string | null
          batch_id: string | null
          line_cost_cents: number | null
          product_id: string | null
          product_name: string | null
          qty_received: number | null
          qty_remaining: number | null
          unit_cost_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches_admin: {
        Row: {
          batch_code: string | null
          batch_id: string | null
          created_at: string | null
          distinct_products: number | null
          note: string | null
          total_cost_cents: number | null
          total_units_received: number | null
        }
        Relationships: []
      }
      order_profit: {
        Row: {
          cogs_cents: number | null
          created_at: string | null
          delivery_fee_cents: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          has_items: boolean | null
          items_count: number | null
          order_code: string | null
          order_id: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          profit_cents: number | null
          revenue_cents: number | null
          status: Database["public"]["Enums"]["order_status_type"] | null
          subtotal_cents: number | null
          subtotal_matches_items: boolean | null
        }
        Relationships: []
      }
      order_profit_realized: {
        Row: {
          cogs_cents: number | null
          created_at: string | null
          delivery_fee_cents: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          has_items: boolean | null
          items_count: number | null
          order_code: string | null
          order_id: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          profit_cents: number | null
          revenue_cents: number | null
          status: Database["public"]["Enums"]["order_status_type"] | null
          subtotal_cents: number | null
          subtotal_matches_items: boolean | null
        }
        Relationships: []
      }
      order_status_counts: {
        Row: {
          count: number | null
          status: Database["public"]["Enums"]["order_status_type"] | null
        }
        Relationships: []
      }
      order_status_counts_today: {
        Row: {
          count: number | null
          status: Database["public"]["Enums"]["order_status_type"] | null
        }
        Relationships: []
      }
      top_products_7d_pipeline: {
        Row: {
          cogs_cents: number | null
          product_id: string | null
          product_name: string | null
          profit_cents: number | null
          qty_sold: number | null
          revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      top_products_7d_realized: {
        Row: {
          cogs_cents: number | null
          product_id: string | null
          product_name: string | null
          profit_cents: number | null
          qty_sold: number | null
          revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_sales: {
        Row: {
          day: string | null
          delivery_fee_cents: number | null
          orders_count: number | null
          subtotal_cents: number | null
          total_cents: number | null
        }
        Relationships: []
      }
      v_fulfillment_split: {
        Row: {
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          orders_count: number | null
          total_cents: number | null
        }
        Relationships: []
      }
      v_payment_split: {
        Row: {
          orders_count: number | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          total_cents: number | null
        }
        Relationships: []
      }
      v_top_products: {
        Row: {
          category: string | null
          name: string | null
          product_id: string | null
          profit_cents: number | null
          qty_sold: number | null
          revenue_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_bulk_update_products: { Args: { p_updates: Json }; Returns: number }
      admin_confirm_order: { Args: { p_order_id: string }; Returns: undefined }
      admin_set_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status_type"]
        }
        Returns: undefined
      }
      admin_verify_gcash_paid: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      admin_verify_gcash_paid_v2: {
        Args: { p_order_id: string; p_reference_number: string }
        Returns: undefined
      }
      admin_verify_payment: {
        Args: {
          p_payment_id: string
          p_status: Database["public"]["Enums"]["payment_status_type"]
        }
        Returns: undefined
      }
      consume_inventory_fifo: {
        Args: { p_order_id: string; p_product_id: string; p_qty: number }
        Returns: number
      }
      create_order: {
        Args: {
          p_contact: string
          p_customer_name: string
          p_delivery_location: string
          p_fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          p_gcash_reference: string
          p_items: Json
          p_notes: string
          p_payment_method: Database["public"]["Enums"]["payment_method_type"]
        }
        Returns: {
          order_code: string
          order_id: string
        }[]
      }
      gen_batch_code: { Args: { ts?: string }; Returns: string }
      get_payment_status_enum: { Args: never; Returns: string[] }
      is_admin: { Args: never; Returns: boolean }
      mark_payment_paid: { Args: { p_order_id: string }; Returns: undefined }
      place_order_atomic:
        | {
            Args: {
              p_contact: string
              p_customer_name: string
              p_delivery_fee_cents: number
              p_delivery_location: string
              p_fulfillment: Database["public"]["Enums"]["fulfillment_type"]
              p_items: Json
              p_notes: string
              p_order_code: string
              p_order_id: string
              p_payment_method: Database["public"]["Enums"]["payment_method_type"]
              p_payment_ref: string
              p_payment_status: Database["public"]["Enums"]["payment_status_type"]
              p_pickup_location: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_contact: string
              p_customer_name: string
              p_delivery_fee_cents: number
              p_delivery_location: string
              p_fulfillment: Database["public"]["Enums"]["fulfillment_type"]
              p_items: Json
              p_notes: string
              p_order_code: string
              p_order_id: string
              p_payment_method: Database["public"]["Enums"]["payment_method_type"]
              p_payment_ref: string
              p_payment_status: Database["public"]["Enums"]["payment_status_type"]
              p_pickup_location: string
              p_suggestion: string
            }
            Returns: Json
          }
      receive_inventory_batch_atomic: {
        Args: { p_items: Json; p_note?: string }
        Returns: string
      }
      submit_order_suggestion: {
        Args: { p_order_id: string; p_suggestion: string }
        Returns: undefined
      }
      sync_payment_for_order:
        | { Args: { p_order_id: string }; Returns: undefined }
        | {
            Args: { p_order_id: string; p_payment_ref?: string }
            Returns: undefined
          }
      verify_gcash_payment: { Args: { p_order_id: string }; Returns: undefined }
    }
    Enums: {
      fulfillment_type: "pickup" | "delivery"
      order_status_type:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
        | "delivered"
      payment_method_type: "gcash" | "cod"
      payment_status_type:
        | "pending"
        | "verified"
        | "rejected"
        | "completed"
        | "paid"
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
      fulfillment_type: ["pickup", "delivery"],
      order_status_type: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
        "delivered",
      ],
      payment_method_type: ["gcash", "cod"],
      payment_status_type: [
        "pending",
        "verified",
        "rejected",
        "completed",
        "paid",
      ],
    },
  },
} as const
