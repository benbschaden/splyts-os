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
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          category?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          category?: string | null
        }
        Relationships: []
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
            browser: boolean
          }
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
            competitors: boolean
            social_proof: boolean
            browser: boolean
          }
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
            competitors: boolean
            social_proof: boolean
            browser: boolean
          }
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
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
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
      current_goals: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
