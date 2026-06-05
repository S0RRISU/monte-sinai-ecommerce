'use client';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './constants';

type TableRecord = Record<string, unknown>;

type AdminDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      pedidos: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      pedido_itens: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      produtos: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      produto_variacoes: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      produto_imagens: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      estoque_movimentacoes: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
      site_configuracoes: {
        Row: TableRecord;
        Insert: TableRecord;
        Update: TableRecord;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_current_profile: {
        Args: Record<PropertyKey, never>;
        Returns: TableRecord;
      };
      admin_update_order: {
        Args: {
          p_id: string;
          p_status: string | null;
          p_pagamento_status: string | null;
          p_confirmado: boolean | null;
        };
        Returns: TableRecord | null;
      };
      admin_registrar_movimentacao_estoque: {
        Args: {
          p_produto_id: string;
          p_variacao_id?: string | null;
          p_tipo?: string;
          p_quantidade?: number;
          p_motivo?: string | null;
          p_fornecedor?: string | null;
          p_documento?: string | null;
          p_custo_unitario?: number | null;
          p_ocorrido_em?: string;
          p_grupo_id?: string | null;
        };
        Returns: TableRecord[];
      };
      app_current_module_access: {
        Args: Record<PropertyKey, never>;
        Returns: TableRecord[];
      };
      developer_module_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: TableRecord[];
      };
      developer_set_module_permission: {
        Args: {
          p_role: string;
          p_module: string;
          p_enabled: boolean;
        };
        Returns: TableRecord | null;
      };
      developer_users_overview: {
        Args: Record<PropertyKey, never>;
        Returns: TableRecord[];
      };
      developer_user_module_permissions: {
        Args: {
          p_user_id: string;
        };
        Returns: TableRecord[];
      };
      developer_set_user_module_permission: {
        Args: {
          p_user_id: string;
          p_module: string;
          p_enabled: boolean;
        };
        Returns: TableRecord[];
      };
      developer_set_user_access: {
        Args: {
          p_user_id: string;
          p_role: string;
          p_active: boolean;
        };
        Returns: TableRecord[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: ReturnType<typeof createClient<AdminDatabase>> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient<AdminDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}
