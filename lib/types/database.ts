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
      author_profiles: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          personal_pillars: string | null
          platform_notes: string | null
          role: string | null
          tone: string | null
          updated_at: string
          voice: string | null
          writing_style: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          personal_pillars?: string | null
          platform_notes?: string | null
          role?: string | null
          tone?: string | null
          updated_at?: string
          voice?: string | null
          writing_style?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          personal_pillars?: string | null
          platform_notes?: string | null
          role?: string | null
          tone?: string | null
          updated_at?: string
          voice?: string | null
          writing_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "author_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          id: string
          organization_id: string
          name: string
          tagline: string | null
          age_range: string | null
          job_title: string | null
          industry: string | null
          company_size: string | null
          location: string | null
          goals: string | null
          frustrations: string | null
          motivations: string | null
          behaviors: string | null
          values: string | null
          channels: string | null
          buying_triggers: string | null
          objections: string | null
          quote: string | null
          include_in_ai: boolean
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          tagline?: string | null
          age_range?: string | null
          job_title?: string | null
          industry?: string | null
          company_size?: string | null
          location?: string | null
          goals?: string | null
          frustrations?: string | null
          motivations?: string | null
          behaviors?: string | null
          values?: string | null
          channels?: string | null
          buying_triggers?: string | null
          objections?: string | null
          quote?: string | null
          include_in_ai?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          tagline?: string | null
          age_range?: string | null
          job_title?: string | null
          industry?: string | null
          company_size?: string | null
          location?: string | null
          goals?: string | null
          frustrations?: string | null
          motivations?: string | null
          behaviors?: string | null
          values?: string | null
          channels?: string | null
          buying_triggers?: string | null
          objections?: string | null
          quote?: string | null
          include_in_ai?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plans: {
        Row: {
          id: string
          organization_id: string
          sections: Record<string, string>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sections?: Record<string, string>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sections?: Record<string, string>
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: []
      }
      brand_context: {
        Row: {
          brand_assets: Json
          company_name: string
          created_at: string
          id: string
          mission: string
          north_star: string
          organization_id: string
          pillars: string
          target_audience: string
          tone: string
          updated_at: string
          values: string | null
          vision: string
          voice: string
          guardrails: string | null
        }
        Insert: {
          brand_assets?: Json
          company_name: string
          created_at?: string
          id?: string
          mission: string
          north_star: string
          organization_id: string
          pillars: string
          target_audience: string
          tone: string
          updated_at?: string
          values?: string | null
          vision: string
          voice: string
          guardrails?: string | null
        }
        Update: {
          brand_assets?: Json
          company_name?: string
          created_at?: string
          id?: string
          mission?: string
          north_star?: string
          organization_id?: string
          pillars?: string
          target_audience?: string
          tone?: string
          updated_at?: string
          values?: string | null
          vision?: string
          voice?: string
          guardrails?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_context_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_type_templates: {
        Row: {
          base_prompt: string
          created_at: string
          description: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          base_prompt?: string
          created_at?: string
          description: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          base_prompt?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      content_types: {
        Row: {
          created_at: string
          created_by: string
          custom_rules: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          template_id: string
          updated_at: string
          platform: string | null
          cadence: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          custom_rules: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          template_id: string
          updated_at?: string
          platform?: string | null
          cadence?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          custom_rules?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          template_id?: string
          updated_at?: string
          platform?: string | null
          cadence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "content_type_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_project_seeds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          category: string | null
          project_type: string
          tool_key: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          category?: string | null
          project_type?: string
          tool_key?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          category?: string | null
          project_type?: string
          tool_key?: string | null
        }
        Relationships: []
      }
      org_team_seeds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          added_by: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          project_id: string
          team_id: string
        }
        Insert: {
          project_id: string
          team_id: string
        }
        Update: {
          project_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          granted_at: string
          granted_by: string
          project_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          project_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      outputs: {
        Row: {
          brief: string
          content: string
          content_type_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          model_id: string
          organization_id: string
          project_id: string
          updated_at: string
          published_at: string | null
          reach: number | null
          reach_metric: string | null
          engagement: number | null
          performance_notes: string | null
          views_1d: number | null
          views_7d: number | null
          views_30d: number | null
          website_visits: number | null
          email_signups: number | null
          performance_recorded_at: string | null
          metadata: Json | null
        }
        Insert: {
          brief: string
          content: string
          content_type_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          model_id?: string
          organization_id: string
          project_id: string
          updated_at?: string
          published_at?: string | null
          reach?: number | null
          reach_metric?: string | null
          engagement?: number | null
          performance_notes?: string | null
          views_1d?: number | null
          views_7d?: number | null
          views_30d?: number | null
          website_visits?: number | null
          email_signups?: number | null
          performance_recorded_at?: string | null
          metadata?: Json | null
        }
        Update: {
          brief?: string
          content?: string
          content_type_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          model_id?: string
          organization_id?: string
          project_id?: string
          updated_at?: string
          published_at?: string | null
          reach?: number | null
          reach_metric?: string | null
          engagement?: number | null
          performance_notes?: string | null
          views_1d?: number | null
          views_7d?: number | null
          views_30d?: number | null
          website_visits?: number | null
          email_signups?: number | null
          performance_recorded_at?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outputs_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      output_attachments: {
        Row: {
          id: string
          output_id: string
          file_url: string
          file_name: string
          file_mime: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          output_id: string
          file_url: string
          file_name: string
          file_mime: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          output_id?: string
          file_url?: string
          file_name?: string
          file_mime?: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "output_attachments_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          created_at: string
          item_id: string
          item_type: string
          project_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: string
          project_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          id: string
          project_id: string
          organization_id: string
          created_by: string
          material_type: 'note' | 'file' | 'link'
          title: string | null
          content: string | null
          file_url: string | null
          file_name: string | null
          file_mime: string | null
          link_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          organization_id: string
          created_by: string
          material_type: 'note' | 'file' | 'link'
          title?: string | null
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          file_mime?: string | null
          link_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          organization_id?: string
          created_by?: string
          material_type?: 'note' | 'file' | 'link'
          title?: string | null
          content?: string | null
          file_url?: string | null
          file_name?: string | null
          file_mime?: string | null
          link_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          category: string | null
          tool_key: string | null
          visibility: string
          status: string
          tags: string[] | null
          project_type: string
          start_date: string | null
          estimated_end_date: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          category?: string | null
          tool_key?: string | null
          visibility?: string
          status?: string
          tags?: string[] | null
          project_type?: string
          start_date?: string | null
          estimated_end_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          category?: string | null
          tool_key?: string | null
          visibility?: string
          status?: string
          tags?: string[] | null
          project_type?: string
          start_date?: string | null
          estimated_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          title: string
          model_id: string
          context_config: {
            brand: boolean
            business_plan: boolean
            personas: boolean
            product: boolean
            product_roadmap: boolean
            company_milestones: boolean
            current_goals: boolean
            filed_documents: boolean
            competitors: boolean
            social_proof: boolean
            kpis: boolean
            browser: boolean
            project_materials: boolean
          }
          project_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          title?: string
          model_id?: string
          context_config?: {
            brand: boolean
            business_plan: boolean
            personas: boolean
            product: boolean
            product_roadmap: boolean
            company_milestones: boolean
            current_goals: boolean
            filed_documents: boolean
            competitors: boolean
            social_proof: boolean
            kpis: boolean
            browser: boolean
            project_materials: boolean
          }
          project_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          title?: string
          model_id?: string
          context_config?: {
            brand: boolean
            business_plan: boolean
            personas: boolean
            product: boolean
            product_roadmap: boolean
            company_milestones: boolean
            current_goals: boolean
            filed_documents: boolean
            competitors: boolean
            social_proof: boolean
            kpis: boolean
            browser: boolean
            project_materials: boolean
          }
          project_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      discussion_decisions: {
        Row: {
          id: string
          discussion_id: string
          text: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          text: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          text?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      discussion_document_links: {
        Row: {
          id: string
          discussion_id: string
          document_id: string
          relationship_type: string
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          document_id: string
          relationship_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          document_id?: string
          relationship_type?: string
          created_at?: string
        }
        Relationships: []
      }
      discussion_learnings: {
        Row: {
          id: string
          discussion_id: string
          text: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          text: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          text?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      discussion_messages: {
        Row: {
          id: string
          discussion_id: string
          user_id: string
          content: string
          message_type: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          discussion_id: string
          user_id: string
          content: string
          message_type?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          discussion_id?: string
          user_id?: string
          content?: string
          message_type?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      discussion_next_steps: {
        Row: {
          id: string
          discussion_id: string
          text: string
          owner_id: string | null
          status: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          text: string
          owner_id?: string | null
          status?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          text?: string
          owner_id?: string | null
          status?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      discussion_participants: {
        Row: {
          discussion_id: string
          user_id: string
          added_by: string
          added_at: string
        }
        Insert: {
          discussion_id: string
          user_id: string
          added_by: string
          added_at?: string
        }
        Update: {
          discussion_id?: string
          user_id?: string
          added_by?: string
          added_at?: string
        }
        Relationships: []
      }
      discussions: {
        Row: {
          id: string
          organization_id: string
          parent_type: string
          parent_id: string
          section_key: string | null
          mode: string
          title: string
          status: string
          created_by: string
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
          ai_summary: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          parent_type: string
          parent_id: string
          section_key?: string | null
          mode?: string
          title: string
          status?: string
          created_by: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          ai_summary?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          parent_type?: string
          parent_id?: string
          section_key?: string | null
          mode?: string
          title?: string
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          ai_summary?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          title: string
          content: string
          doc_type: string
          visibility: 'private' | 'shared' | 'filed'
          source_session_id: string | null
          version: number
          locked_by: string | null
          locked_at: string | null
          filed_at: string | null
          filed_by: string | null
          review_requested_at: string | null
          review_requested_by: string | null
          team_id: string | null
          summary: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          title: string
          content?: string
          doc_type?: string
          visibility?: 'private' | 'shared' | 'filed'
          source_session_id?: string | null
          version?: number
          locked_by?: string | null
          locked_at?: string | null
          filed_at?: string | null
          filed_by?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          team_id?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          title?: string
          content?: string
          doc_type?: string
          visibility?: 'private' | 'shared' | 'filed'
          source_session_id?: string | null
          version?: number
          locked_by?: string | null
          locked_at?: string | null
          filed_at?: string | null
          filed_by?: string | null
          review_requested_at?: string | null
          review_requested_by?: string | null
          team_id?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          id: string
          document_id: string
          version: number
          content: string
          title: string
          edited_by: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          version: number
          content: string
          title: string
          edited_by: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          version?: number
          content?: string
          title?: string
          edited_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          id: string
          document_id: string
          content: string
          embedding: number[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          embedding?: number[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          embedding?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      project_material_embeddings: {
        Row: {
          id: string
          material_id: string
          content: string
          embedding: number[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          content: string
          embedding?: number[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          content?: string
          embedding?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_material_embeddings_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "project_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      product_context: {
        Row: {
          id: string
          organization_id: string
          sections: Json
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sections?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sections?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_features: {
        Row: {
          id: string
          organization_id: string
          name: string
          tagline: string | null
          description: string | null
          category: string
          surfaces: string[]
          status: string
          include_in_ai: boolean
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          tagline?: string | null
          description?: string | null
          category?: string
          surfaces?: string[]
          status?: string
          include_in_ai?: boolean
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          tagline?: string | null
          description?: string | null
          category?: string
          surfaces?: string[]
          status?: string
          include_in_ai?: boolean
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      product_roadmap_items: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          phase: string
          status: string
          category: string | null
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          phase?: string
          status?: string
          category?: string | null
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          phase?: string
          status?: string
          category?: string | null
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      company_milestones: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          milestone_date: string
          category: string | null
          status: string
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          milestone_date: string
          category?: string | null
          status?: string
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          milestone_date?: string
          category?: string | null
          status?: string
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      competitors: {
        Row: {
          id: string
          organization_id: string
          name: string
          website: string | null
          positioning: string | null
          strengths: string | null
          weaknesses: string | null
          pricing_notes: string | null
          battle_card: string | null
          include_in_ai: boolean
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          website?: string | null
          positioning?: string | null
          strengths?: string | null
          weaknesses?: string | null
          pricing_notes?: string | null
          battle_card?: string | null
          include_in_ai?: boolean
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          website?: string | null
          positioning?: string | null
          strengths?: string | null
          weaknesses?: string | null
          pricing_notes?: string | null
          battle_card?: string | null
          include_in_ai?: boolean
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      content_benchmarks: {
        Row: {
          id: string
          organization_id: string
          platform: string
          metric_name: string
          benchmark_value: number
          benchmark_unit: string
          notes: string | null
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          platform: string
          metric_name: string
          benchmark_value: number
          benchmark_unit?: string
          notes?: string | null
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          platform?: string
          metric_name?: string
          benchmark_value?: number
          benchmark_unit?: string
          notes?: string | null
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      terminology: {
        Row: {
          id: string
          organization_id: string
          term: string
          preferred: string
          avoid: string | null
          context: string | null
          category: string
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          term: string
          preferred: string
          avoid?: string | null
          context?: string | null
          category?: string
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          term?: string
          preferred?: string
          avoid?: string | null
          context?: string | null
          category?: string
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      brand_narratives: {
        Row: {
          id: string
          organization_id: string
          title: string
          narrative: string
          usage_context: string | null
          include_in_ai: boolean
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          narrative: string
          usage_context?: string | null
          include_in_ai?: boolean
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          narrative?: string
          usage_context?: string | null
          include_in_ai?: boolean
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      social_proof: {
        Row: {
          id: string
          organization_id: string
          proof_type: string
          quote: string | null
          attribution: string | null
          company: string | null
          metric_value: string | null
          metric_label: string | null
          tags: string[]
          approved: boolean
          include_in_ai: boolean
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          proof_type?: string
          quote?: string | null
          attribution?: string | null
          company?: string | null
          metric_value?: string | null
          metric_label?: string | null
          tags?: string[]
          approved?: boolean
          include_in_ai?: boolean
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          proof_type?: string
          quote?: string | null
          attribution?: string | null
          company?: string | null
          metric_value?: string | null
          metric_label?: string | null
          tags?: string[]
          approved?: boolean
          include_in_ai?: boolean
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      goal_periods: {
        Row: {
          id: string
          organization_id: string
          period_label: string
          period_start: string
          period_end: string
          status: string
          focus_areas: string | null
          what_to_push: string | null
          what_to_defer: string | null
          review_summary: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          period_label: string
          period_start: string
          period_end: string
          status?: string
          focus_areas?: string | null
          what_to_push?: string | null
          what_to_defer?: string | null
          review_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          period_label?: string
          period_start?: string
          period_end?: string
          status?: string
          focus_areas?: string | null
          what_to_push?: string | null
          what_to_defer?: string | null
          review_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_goals: {
        Row: {
          id: string
          goal_period_id: string
          organization_id: string
          title: string
          description: string | null
          sort_order: number
          outcome: string | null
          outcome_notes: string | null
          carried_from_goal_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_period_id: string
          organization_id: string
          title: string
          description?: string | null
          sort_order?: number
          outcome?: string | null
          outcome_notes?: string | null
          carried_from_goal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_period_id?: string
          organization_id?: string
          title?: string
          description?: string | null
          sort_order?: number
          outcome?: string | null
          outcome_notes?: string | null
          carried_from_goal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          id: string
          organization_id: string
          project_id: string
          title: string
          description: string | null
          platform: string
          platform_owner: string
          status: string
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          project_id: string
          title: string
          description?: string | null
          platform: string
          platform_owner: string
          status?: string
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string
          title?: string
          description?: string | null
          platform?: string
          platform_owner?: string
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          scheduled_date: string
          content_type_id: string | null
          platform: string | null
          author_id: string | null
          assigned_to: string | null
          output_id: string | null
          status: string
          notes: string | null
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          scheduled_date: string
          content_type_id?: string | null
          platform?: string | null
          author_id?: string | null
          assigned_to?: string | null
          output_id?: string | null
          status?: string
          notes?: string | null
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          scheduled_date?: string
          content_type_id?: string | null
          platform?: string | null
          author_id?: string | null
          assigned_to?: string | null
          output_id?: string | null
          status?: string
          notes?: string | null
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      kpi_definitions: {
        Row: {
          id: string
          organization_id: string
          name: string
          unit: string
          category: string
          description: string | null
          is_highlighted: boolean
          sort_order: number
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          unit?: string
          category?: string
          description?: string | null
          is_highlighted?: boolean
          sort_order?: number
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          unit?: string
          category?: string
          description?: string | null
          is_highlighted?: boolean
          sort_order?: number
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          id: string
          organization_id: string
          snapshot_date: string
          values: Record<string, number>
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          snapshot_date: string
          values?: Record<string, number>
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          snapshot_date?: string
          values?: Record<string, number>
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnels: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          is_dashboard_default: boolean
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          is_dashboard_default?: boolean
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          is_dashboard_default?: boolean
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      funnel_stages: {
        Row: {
          id: string
          funnel_id: string
          kpi_definition_id: string
          stage_order: number
          label_override: string | null
          created_at: string
        }
        Insert: {
          id?: string
          funnel_id: string
          kpi_definition_id: string
          stage_order?: number
          label_override?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          funnel_id?: string
          kpi_definition_id?: string
          stage_order?: number
          label_override?: string | null
          created_at?: string
        }
        Relationships: []
      }
      discovery_entries: {
        Row: {
          id: string
          organization_id: string
          project_id: string
          created_by: string
          entry_type: string
          source: string | null
          entry_date: string | null
          raw_content: string
          sentiment: string | null
          tags: string[]
          include_in_ai: boolean
          user_segment: string | null
          key_quote_1: string | null
          key_quote_2: string | null
          key_quote_3: string | null
          jtbd: string | null
          star_rating: number | null
          platform: string | null
          source_material_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          project_id: string
          created_by: string
          entry_type: string
          source?: string | null
          entry_date?: string | null
          raw_content: string
          sentiment?: string | null
          tags?: string[]
          include_in_ai?: boolean
          user_segment?: string | null
          key_quote_1?: string | null
          key_quote_2?: string | null
          key_quote_3?: string | null
          jtbd?: string | null
          star_rating?: number | null
          platform?: string | null
          source_material_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string
          created_by?: string
          entry_type?: string
          source?: string | null
          entry_date?: string | null
          raw_content?: string
          sentiment?: string | null
          tags?: string[]
          include_in_ai?: boolean
          user_segment?: string | null
          key_quote_1?: string | null
          key_quote_2?: string | null
          key_quote_3?: string | null
          jtbd?: string | null
          star_rating?: number | null
          platform?: string | null
          source_material_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_entry_embeddings: {
        Row: {
          id: string
          entry_id: string
          content: string
          embedding: number[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          content: string
          embedding?: number[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          content?: string
          embedding?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_entry_embeddings_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "discovery_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      company_knowledge_files: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          file_name: string
          file_url: string
          file_mime: string
          file_size_bytes: number | null
          processed_text: string | null
          processing_status: 'pending' | 'processing' | 'ready' | 'failed'
          processing_error: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          file_name: string
          file_url: string
          file_mime: string
          file_size_bytes?: number | null
          processed_text?: string | null
          processing_status?: 'pending' | 'processing' | 'ready' | 'failed'
          processing_error?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          file_name?: string
          file_url?: string
          file_mime?: string
          file_size_bytes?: number | null
          processed_text?: string | null
          processing_status?: 'pending' | 'processing' | 'ready' | 'failed'
          processing_error?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_knowledge_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_knowledge_conflicts: {
        Row: {
          id: string
          organization_id: string
          file_id_a: string
          file_id_b: string
          topic: string
          description: string
          excerpt_a: string | null
          excerpt_b: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          file_id_a: string
          file_id_b: string
          topic: string
          description: string
          excerpt_a?: string | null
          excerpt_b?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          file_id_a?: string
          file_id_b?: string
          topic?: string
          description?: string
          excerpt_a?: string | null
          excerpt_b?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_knowledge_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_conflicts_file_id_a_fkey"
            columns: ["file_id_a"]
            isOneToOne: false
            referencedRelation: "company_knowledge_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_conflicts_file_id_b_fkey"
            columns: ["file_id_b"]
            isOneToOne: false
            referencedRelation: "company_knowledge_files"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_documents_by_embedding: {
        Args: {
          query_embedding: number[]
          org_id: string
          searching_user_id: string
          result_limit?: number
        }
        Returns: {
          document_id: string
          similarity: number
          title: string
          summary: string
          visibility: string
        }[]
      }
      search_materials_by_embedding: {
        Args: {
          query_embedding: number[]
          org_id: string
          project_id_filter?: string | null
          result_limit?: number
        }
        Returns: {
          material_id: string
          similarity: number
          title: string
          content_preview: string
          mat_project_id: string
        }[]
      }
    }
    Enums: {
      member_role: "admin" | "member"
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
      member_role: ["admin", "member"],
    },
  },
} as const
