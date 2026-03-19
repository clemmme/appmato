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
      bilan_cycles: {
        Row: {
          client_id: string
          created_at: string
          critical_points: Json | null
          cycle_id: string
          id: string
          items: Json
          notes: string | null
          rdv_chef_date: string | null
          revision_level: number
          supervision_mode: boolean | null
          supervision_status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          critical_points?: Json | null
          cycle_id: string
          id?: string
          items?: Json
          notes?: string | null
          rdv_chef_date?: string | null
          revision_level?: number
          supervision_mode?: boolean | null
          supervision_status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          critical_points?: Json | null
          cycle_id?: string
          id?: string
          items?: Json
          notes?: string | null
          rdv_chef_date?: string | null
          revision_level?: number
          supervision_mode?: boolean | null
          supervision_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilan_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          id: string
          organization_id: string
          name: string | null
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name?: string | null
          type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string | null
          type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_members: {
        Row: {
          channel_id: string
          user_id: string
          last_read_at: string | null
          joined_at: string
        }
        Insert: {
          channel_id: string
          user_id: string
          last_read_at?: string | null
          joined_at?: string
        }
        Update: {
          channel_id?: string
          user_id?: string
          last_read_at?: string | null
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string
          content: string
          mentions: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id: string
          content: string
          mentions?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          sender_id?: string
          content?: string
          mentions?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          address: string | null
          annual_fee: number | null
          closing_date: string | null
          code_ape: string | null
          created_at: string
          day: string
          entries_count: number | null
          establishments_count: number | null
          fee_compta: number | null
          fee_juridique: number | null
          fee_social: number | null
          form: string
          id: string
          invoices_per_month: number | null
          manager_email: string | null
          name: string
          phone: string | null
          ref: string
          regime: string
          siren: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          annual_fee?: number | null
          closing_date?: string | null
          code_ape?: string | null
          created_at?: string
          day?: string
          entries_count?: number | null
          establishments_count?: number | null
          fee_compta?: number | null
          fee_juridique?: number | null
          fee_social?: number | null
          form?: string
          id?: string
          invoices_per_month?: number | null
          manager_email?: string | null
          name: string
          phone?: string | null
          ref: string
          regime?: string
          siren?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          annual_fee?: number | null
          closing_date?: string | null
          code_ape?: string | null
          created_at?: string
          day?: string
          entries_count?: number | null
          establishments_count?: number | null
          fee_compta?: number | null
          fee_juridique?: number | null
          fee_social?: number | null
          form?: string
          id?: string
          invoices_per_month?: number | null
          manager_email?: string | null
          name?: string
          phone?: string | null
          ref?: string
          regime?: string
          siren?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cloture_annuelle: {
        Row: {
          affectation_dividendes: number | null
          affectation_report: number | null
          benefice_net: number | null
          capital_social: number | null
          charges_sociales_gerant: number | null
          client_id: string
          continuite_exploitation: boolean | null
          conventions_reglementees: Json | null
          created_at: string
          exercice: string
          exercice_cloture: boolean | null
          fec_envoye: boolean | null
          fec_genere: boolean | null
          id: string
          liasse_accuse_dgfip: boolean | null
          liasse_envoyee: boolean | null
          liasse_montee: boolean | null
          liasse_validee: boolean | null
          rdv_bilan_date: string | null
          rdv_bilan_done: boolean | null
          rdv_bilan_duration: number | null
          rdv_bilan_time: string | null
          remuneration_gerant: number | null
          reserve_legale_actuelle: number | null
          reserve_legale_dotation: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          affectation_dividendes?: number | null
          affectation_report?: number | null
          benefice_net?: number | null
          capital_social?: number | null
          charges_sociales_gerant?: number | null
          client_id: string
          continuite_exploitation?: boolean | null
          conventions_reglementees?: Json | null
          created_at?: string
          exercice?: string
          exercice_cloture?: boolean | null
          fec_envoye?: boolean | null
          fec_genere?: boolean | null
          id?: string
          liasse_accuse_dgfip?: boolean | null
          liasse_envoyee?: boolean | null
          liasse_montee?: boolean | null
          liasse_validee?: boolean | null
          rdv_bilan_date?: string | null
          rdv_bilan_done?: boolean | null
          rdv_bilan_duration?: number | null
          rdv_bilan_time?: string | null
          remuneration_gerant?: number | null
          reserve_legale_actuelle?: number | null
          reserve_legale_dotation?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          affectation_dividendes?: number | null
          affectation_report?: number | null
          benefice_net?: number | null
          capital_social?: number | null
          charges_sociales_gerant?: number | null
          client_id?: string
          continuite_exploitation?: boolean | null
          conventions_reglementees?: Json | null
          created_at?: string
          exercice?: string
          exercice_cloture?: boolean | null
          fec_envoye?: boolean | null
          fec_genere?: boolean | null
          id?: string
          liasse_accuse_dgfip?: boolean | null
          liasse_envoyee?: boolean | null
          liasse_montee?: boolean | null
          liasse_validee?: boolean | null
          rdv_bilan_date?: string | null
          rdv_bilan_done?: boolean | null
          rdv_bilan_duration?: number | null
          rdv_bilan_time?: string | null
          remuneration_gerant?: number | null
          reserve_legale_actuelle?: number | null
          reserve_legale_dotation?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloture_annuelle_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ctrl_entries: {
        Row: {
          ca_0: number
          ca_10: number
          ca_20: number
          ca_55: number
          created_at: string
          id: string
          period: string
          solde_end: number
          solde_start: number
          tva_declared: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ca_0?: number
          ca_10?: number
          ca_20?: number
          ca_55?: number
          created_at?: string
          id?: string
          period: string
          solde_end?: number
          solde_start?: number
          tva_declared?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ca_0?: number
          ca_10?: number
          ca_20?: number
          ca_55?: number
          created_at?: string
          id?: string
          period?: string
          solde_end?: number
          solde_start?: number
          tva_declared?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          legal_form: string | null
          siret: string | null
          address: string | null
          establishments_count: number
          establishment_names: string[] | null
          team_size_range: string | null
          specialties: string[] | null
          logo_url: string | null
          brand_primary_color: string | null
          brand_bg_color: string | null
          invite_code: string
          pennylane_api_key: string | null
          pennylane_access_token: string | null
          pennylane_refresh_token: string | null
          pennylane_expires_at: string | null
          microsoft_tenant_id: string | null
          microsoft_client_id: string | null
          microsoft_access_token: string | null
          microsoft_refresh_token: string | null
          microsoft_expires_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          legal_form?: string | null
          siret?: string | null
          address?: string | null
          establishments_count?: number
          establishment_names?: string[] | null
          team_size_range?: string | null
          specialties?: string[] | null
          logo_url?: string | null
          brand_primary_color?: string | null
          brand_bg_color?: string | null
          invite_code?: string
          pennylane_api_key?: string | null
          pennylane_access_token?: string | null
          pennylane_refresh_token?: string | null
          pennylane_expires_at?: string | null
          microsoft_tenant_id?: string | null
          microsoft_client_id?: string | null
          microsoft_access_token?: string | null
          microsoft_refresh_token?: string | null
          microsoft_expires_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          legal_form?: string | null
          siret?: string | null
          address?: string | null
          establishments_count?: number
          establishment_names?: string[] | null
          team_size_range?: string | null
          specialties?: string[] | null
          logo_url?: string | null
          brand_primary_color?: string | null
          brand_bg_color?: string | null
          invite_code?: string
          pennylane_api_key?: string | null
          pennylane_access_token?: string | null
          pennylane_refresh_token?: string | null
          pennylane_expires_at?: string | null
          microsoft_tenant_id?: string | null
          microsoft_client_id?: string | null
          microsoft_access_token?: string | null
          microsoft_refresh_token?: string | null
          microsoft_expires_at?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignments: {
        Row: {
          id: string
          organization_id: string
          team_lead_id: string
          collaborator_id: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          team_lead_id: string
          collaborator_id: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          team_lead_id?: string
          collaborator_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          has_completed_tutorial: boolean | null
          account_type: string | null
          current_organization_id: string | null
          has_completed_setup: boolean | null
          id: string
          lunch_duration_minutes: number | null
          updated_at: string
          work_days: Json | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          has_completed_tutorial?: boolean | null
          account_type?: string | null
          current_organization_id?: string | null
          has_completed_setup?: boolean | null
          id: string
          lunch_duration_minutes?: number | null
          updated_at?: string
          work_days?: Json | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          has_completed_tutorial?: boolean | null
          account_type?: string | null
          current_organization_id?: string | null
          has_completed_setup?: boolean | null
          id?: string
          lunch_duration_minutes?: number | null
          updated_at?: string
          work_days?: Json | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          absence_type: string | null
          client_id: string | null
          comment: string | null
          created_at: string
          duration_hours: number
          entry_date: string
          entry_type: string
          event_category: string | null
          guest_id: string | null
          guest_status: string | null
          id: string
          internal_type: string | null
          mission_type: string | null
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          absence_type?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          duration_hours?: number
          entry_date: string
          entry_type?: string
          event_category?: string | null
          guest_id?: string | null
          guest_status?: string | null
          id?: string
          internal_type?: string | null
          mission_type?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          absence_type?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          duration_hours?: number
          entry_date?: string
          entry_type?: string
          event_category?: string | null
          guest_id?: string | null
          guest_status?: string | null
          id?: string
          internal_type?: string | null
          mission_type?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tva_history: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          credit: number
          id: string
          note: string | null
          period: string
          step_calcul: boolean
          step_compta: boolean
          step_revise: boolean
          step_saisie: boolean
          step_tele: boolean
          step_valide: boolean
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          credit?: number
          id?: string
          note?: string | null
          period: string
          step_calcul?: boolean
          step_compta?: boolean
          step_revise?: boolean
          step_saisie?: boolean
          step_tele?: boolean
          step_valide?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          credit?: number
          id?: string
          note?: string | null
          period?: string
          step_calcul?: boolean
          step_compta?: boolean
          step_revise?: boolean
          step_saisie?: boolean
          step_tele?: boolean
          step_valide?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tva_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_posts: {
        Row: {
          id: string
          author_id: string
          content: string
          media_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          media_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          content?: string
          media_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pulse_comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "pulse_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pulse_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "pulse_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: string
          entity_id: string | null
          message: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          type: string
          entity_id?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string | null
          type?: string
          entity_id?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_organization_by_code: {
        Args: {
          code: string
        }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_cabinet_members: {
        Args: {
          p_org_id: string
        }
        Returns: {
          member_id: string
          member_org_id: string
          member_user_id: string
          member_role: string
          member_created_at: string
          profile_full_name: string | null
          profile_email: string
        }[]
      }
      get_cabinet_assignments: {
        Args: {
          p_org_id: string
        }
        Returns: {
          id: string
          organization_id: string
          team_lead_id: string
          collaborator_id: string
          created_at: string
        }[]
      }
      count_cabinet_members: {
        Args: {
          p_org_id: string
        }
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
    Enums: {},
  },
} as const
