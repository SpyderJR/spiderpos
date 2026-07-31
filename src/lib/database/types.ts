export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          employee_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          store_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          store_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_shift_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          store_id: string
          type: Database['public']['Enums']['cash_movement_type']
        }
        Insert: {
          amount: number
          cash_shift_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          store_id: string
          type: Database['public']['Enums']['cash_movement_type']
        }
        Update: {
          amount?: number
          cash_shift_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          store_id?: string
          type?: Database['public']['Enums']['cash_movement_type']
        }
        Relationships: [
          {
            foreignKeyName: 'cash_movements_cash_shift_id_fkey'
            columns: ['cash_shift_id']
            isOneToOne: false
            referencedRelation: 'cash_shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cash_movements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cash_movements_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      cash_shifts: {
        Row: {
          closing_amount_counted: number | null
          closing_amount_theoretical: number | null
          closing_at: string | null
          created_at: string
          difference: number | null
          employee_id: string
          id: string
          opening_amount: number
          opening_at: string
          status: Database['public']['Enums']['cash_shift_status']
          store_id: string
        }
        Insert: {
          closing_amount_counted?: number | null
          closing_amount_theoretical?: number | null
          closing_at?: string | null
          created_at?: string
          difference?: number | null
          employee_id: string
          id?: string
          opening_amount?: number
          opening_at?: string
          status?: Database['public']['Enums']['cash_shift_status']
          store_id: string
        }
        Update: {
          closing_amount_counted?: number | null
          closing_amount_theoretical?: number | null
          closing_at?: string | null
          created_at?: string
          difference?: number | null
          employee_id?: string
          id?: string
          opening_amount?: number
          opening_at?: string
          status?: Database['public']['Enums']['cash_shift_status']
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cash_shifts_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cash_shifts_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          note: string | null
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method?: string
          note?: string | null
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: string
          note?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_payments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_payments_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_payments_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      customer_prices: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          price: number
          product_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          price: number
          product_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          price?: number
          product_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_prices_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_prices_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_prices_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          created_at: string
          credit_balance: number
          credit_limit: number
          email: string | null
          id: string
          name: string
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credit_balance?: number
          credit_limit?: number
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credit_balance?: number
          credit_limit?: number
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customers_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      pin_login_attempts: {
        Row: {
          attempts: number
          locked_until: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          locked_until?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          locked_until?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pin_login_attempts_store_id_fkey'
            columns: ['store_id']
            isOneToOne: true
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          conversion_factor: number
          cost: number
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
          store_id: string
        }
        Insert: {
          barcode?: string | null
          conversion_factor?: number
          cost?: number
          created_at?: string
          id?: string
          name: string
          price: number
          product_id: string
          store_id: string
        }
        Update: {
          barcode?: string | null
          conversion_factor?: number
          cost?: number
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_variants_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          barcode: string | null
          category_id: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_favorite: boolean
          min_stock: number
          name: string
          price: number
          stock: number
          store_id: string
          unit_type: Database['public']['Enums']['product_unit_type']
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          min_stock?: number
          name: string
          price: number
          stock?: number
          store_id: string
          unit_type?: Database['public']['Enums']['product_unit_type']
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          min_stock?: number
          name?: string
          price?: number
          stock?: number
          store_id?: string
          unit_type?: Database['public']['Enums']['product_unit_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          min_quantity: number | null
          name: string
          product_id: string | null
          starts_at: string | null
          store_id: string
          type: Database['public']['Enums']['promotion_type']
          value: number | null
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          min_quantity?: number | null
          name: string
          product_id?: string | null
          starts_at?: string | null
          store_id: string
          type: Database['public']['Enums']['promotion_type']
          value?: number | null
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          min_quantity?: number | null
          name?: string
          product_id?: string | null
          starts_at?: string | null
          store_id?: string
          type?: Database['public']['Enums']['promotion_type']
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'promotions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'promotions_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'promotions_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          store_id: string
          unit_cost: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          store_id: string
          unit_cost: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          store_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_order_items_purchase_order_id_fkey'
            columns: ['purchase_order_id']
            isOneToOne: false
            referencedRelation: 'purchase_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_order_items_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          received_at: string | null
          status: Database['public']['Enums']['purchase_order_status']
          store_id: string
          supplier_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          received_at?: string | null
          status?: Database['public']['Enums']['purchase_order_status']
          store_id: string
          supplier_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          received_at?: string | null
          status?: Database['public']['Enums']['purchase_order_status']
          store_id?: string
          supplier_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_orders_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_orders_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      recharge_transactions: {
        Row: {
          amount: number
          commission: number
          created_at: string
          employee_id: string | null
          folio: string | null
          id: string
          phone_number: string | null
          provider: string
          status: Database['public']['Enums']['recharge_status']
          store_id: string
        }
        Insert: {
          amount: number
          commission?: number
          created_at?: string
          employee_id?: string | null
          folio?: string | null
          id?: string
          phone_number?: string | null
          provider: string
          status?: Database['public']['Enums']['recharge_status']
          store_id: string
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          employee_id?: string | null
          folio?: string | null
          id?: string
          phone_number?: string | null
          provider?: string
          status?: Database['public']['Enums']['recharge_status']
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recharge_transactions_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recharge_transactions_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          quantity: number
          return_id: string
          sale_item_id: string
          store_id: string
        }
        Insert: {
          id?: string
          quantity: number
          return_id: string
          sale_item_id: string
          store_id: string
        }
        Update: {
          id?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'return_items_return_id_fkey'
            columns: ['return_id']
            isOneToOne: false
            referencedRelation: 'returns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'return_items_sale_item_id_fkey'
            columns: ['sale_item_id']
            isOneToOne: false
            referencedRelation: 'sale_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'return_items_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string
          sale_id: string
          store_id: string
          total_returned: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          sale_id: string
          store_id: string
          total_returned: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          sale_id?: string
          store_id?: string
          total_returned?: number
        }
        Relationships: [
          {
            foreignKeyName: 'returns_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'returns_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'returns_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      sale_items: {
        Row: {
          discount: number
          id: string
          product_id: string
          quantity: number
          sale_id: string
          store_id: string
          subtotal: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          store_id: string
          subtotal: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          discount?: number
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          store_id?: string
          subtotal?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sale_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          change_given: number
          created_at: string
          id: string
          method: Database['public']['Enums']['sale_payment_method']
          sale_id: string
          store_id: string
        }
        Insert: {
          amount: number
          change_given?: number
          created_at?: string
          id?: string
          method: Database['public']['Enums']['sale_payment_method']
          sale_id: string
          store_id: string
        }
        Update: {
          amount?: number
          change_given?: number
          created_at?: string
          id?: string
          method?: Database['public']['Enums']['sale_payment_method']
          sale_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sale_payments_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_payments_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          cancelled_by: string | null
          cancelled_reason: string | null
          cash_shift_id: string | null
          client_created_at: string
          created_at: string
          customer_id: string | null
          discount: number
          employee_id: string
          id: string
          notes: string | null
          status: Database['public']['Enums']['sale_status']
          store_id: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          cancelled_by?: string | null
          cancelled_reason?: string | null
          cash_shift_id?: string | null
          client_created_at: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          employee_id: string
          id: string
          notes?: string | null
          status?: Database['public']['Enums']['sale_status']
          store_id: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Update: {
          cancelled_by?: string | null
          cancelled_reason?: string | null
          cash_shift_id?: string | null
          client_created_at?: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database['public']['Enums']['sale_status']
          store_id?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sales_cancelled_by_fkey'
            columns: ['cancelled_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_cash_shift_id_fkey'
            columns: ['cash_shift_id']
            isOneToOne: false
            referencedRelation: 'cash_shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          store_id: string
          type: Database['public']['Enums']['stock_movement_type']
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          store_id: string
          type: Database['public']['Enums']['stock_movement_type']
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          store_id?: string
          type?: Database['public']['Enums']['stock_movement_type']
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'stock_movements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'store_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      store_members: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          permissions: Json
          pin_hash: string | null
          role: Database['public']['Enums']['store_role']
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          permissions?: Json
          pin_hash?: string | null
          role?: Database['public']['Enums']['store_role']
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          permissions?: Json
          pin_hash?: string | null
          role?: Database['public']['Enums']['store_role']
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_members_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          business_type: Database['public']['Enums']['store_business_type']
          created_at: string
          footer_message: string | null
          id: string
          logo_url: string | null
          name: string
          payout_clabe: string | null
          payout_mp_account_id: string | null
          phone: string | null
          plan: Database['public']['Enums']['subscription_plan'] | null
          subscription_status: Database['public']['Enums']['subscription_status']
          tax_data: Json
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_type: Database['public']['Enums']['store_business_type']
          created_at?: string
          footer_message?: string | null
          id?: string
          logo_url?: string | null
          name: string
          payout_clabe?: string | null
          payout_mp_account_id?: string | null
          phone?: string | null
          plan?: Database['public']['Enums']['subscription_plan'] | null
          subscription_status?: Database['public']['Enums']['subscription_status']
          tax_data?: Json
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_type?: Database['public']['Enums']['store_business_type']
          created_at?: string
          footer_message?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          payout_clabe?: string | null
          payout_mp_account_id?: string | null
          phone?: string | null
          plan?: Database['public']['Enums']['subscription_plan'] | null
          subscription_status?: Database['public']['Enums']['subscription_status']
          tax_data?: Json
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database['public']['Enums']['subscription_plan']
          provider: Database['public']['Enums']['subscription_provider']
          provider_sub_id: string | null
          status: Database['public']['Enums']['subscription_status']
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: Database['public']['Enums']['subscription_plan']
          provider: Database['public']['Enums']['subscription_provider']
          provider_sub_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database['public']['Enums']['subscription_plan']
          provider?: Database['public']['Enums']['subscription_provider']
          provider_sub_id?: string | null
          status?: Database['public']['Enums']['subscription_status']
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_store_id_fkey'
            columns: ['store_id']
            isOneToOne: true
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          store_id: string
          visit_days: string[]
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          store_id: string
          visit_days?: string[]
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          store_id?: string
          visit_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: { p_new_stock: number; p_product_id: string; p_reason: string }
        Returns: undefined
      }
      auth_has_permission: { Args: { perm: string }; Returns: boolean }
      auth_role: {
        Args: never
        Returns: Database['public']['Enums']['store_role']
      }
      auth_store_id: { Args: never; Returns: string }
      receive_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: Json
      }
      record_customer_payment: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_method?: string
          p_note?: string
        }
        Returns: Json
      }
      record_sale: {
        Args: {
          p_client_created_at: string
          p_customer_id?: string
          p_discount?: number
          p_items: Json
          p_notes?: string
          p_payments: Json
          p_sale_id: string
        }
        Returns: Json
      }
      seed_store_catalog: { Args: { p_store_id: string }; Returns: undefined }
      verify_supervisor_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      cash_movement_type: 'in' | 'out'
      cash_shift_status: 'open' | 'closed'
      product_unit_type: 'piece' | 'kg' | 'g' | 'lt' | 'm'
      promotion_type: 'percentage' | 'fixed' | '2x1' | '3x2' | 'bulk_price'
      purchase_order_status: 'draft' | 'ordered' | 'received' | 'cancelled'
      recharge_status: 'pending' | 'completed' | 'failed'
      sale_payment_method: 'cash' | 'card' | 'transfer' | 'credit'
      sale_status: 'completed' | 'parked' | 'cancelled' | 'returned' | 'partially_returned'
      stock_movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'initial'
      store_business_type: 'abarrotes' | 'papeleria' | 'farmacia' | 'ferreteria'
      store_role: 'owner' | 'manager' | 'cashier'
      subscription_plan: 'monthly' | 'annual'
      subscription_provider: 'stripe' | 'mercadopago'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cash_movement_type: ['in', 'out'],
      cash_shift_status: ['open', 'closed'],
      product_unit_type: ['piece', 'kg', 'g', 'lt', 'm'],
      promotion_type: ['percentage', 'fixed', '2x1', '3x2', 'bulk_price'],
      purchase_order_status: ['draft', 'ordered', 'received', 'cancelled'],
      recharge_status: ['pending', 'completed', 'failed'],
      sale_payment_method: ['cash', 'card', 'transfer', 'credit'],
      sale_status: ['completed', 'parked', 'cancelled', 'returned', 'partially_returned'],
      stock_movement_type: ['sale', 'purchase', 'adjustment', 'return', 'initial'],
      store_business_type: ['abarrotes', 'papeleria', 'farmacia', 'ferreteria'],
      store_role: ['owner', 'manager', 'cashier'],
      subscription_plan: ['monthly', 'annual'],
      subscription_provider: ['stripe', 'mercadopago'],
      subscription_status: ['trialing', 'active', 'past_due', 'suspended', 'cancelled'],
    },
  },
} as const
