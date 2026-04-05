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
        ]
      }
      brand_context: {
        Row: {
          brand_assets: Json
          company_name: string
          created_at: string
          guardrails: string | null
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
        }
        Insert: {
          brand_assets?: Json
          company_name: string
          created_at?: string
          guardrails?: string | null
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
        }
        Update: {
          brand_assets?: Json
          company_name?: string
          created_at?: string
          guardrails?: string | null
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
      brand_narratives: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          include_in_ai: boolean
          narrative: string
          organization_id: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
          usage_context: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          narrative: string
          organization_id: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          usage_context?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          narrative?: string
          organization_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_narratives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plans: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          sections?: Json
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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          captured_at: string | null
          context_config: Json
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          model_id: string
          organization_id: string
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          captured_at?: string | null
          context_config?: Json
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          model_id?: string
          organization_id: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          captured_at?: string | null
          context_config?: Json
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          model_id?: string
          organization_id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_documents: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          extracted_text: string | null
          file_mime: string
          file_name: string
          id: string
          insights_extracted: number
          organization_id: string
          project_id: string
          segment: string
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          extracted_text?: string | null
          file_mime: string
          file_name: string
          id?: string
          insights_extracted?: number
          organization_id: string
          project_id: string
          segment: string
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          extracted_text?: string | null
          file_mime?: string
          file_name?: string
          id?: string
          insights_extracted?: number
          organization_id?: string
          project_id?: string
          segment?: string
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_knowledge_conflicts: {
        Row: {
          created_at: string
          description: string
          dismissed_at: string | null
          dismissed_by: string | null
          excerpt_a: string | null
          excerpt_b: string | null
          file_id_a: string
          file_id_b: string
          id: string
          organization_id: string
          topic: string
          trusted_excerpt: string | null
          trusted_file_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          excerpt_a?: string | null
          excerpt_b?: string | null
          file_id_a: string
          file_id_b: string
          id?: string
          organization_id: string
          topic: string
          trusted_excerpt?: string | null
          trusted_file_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          excerpt_a?: string | null
          excerpt_b?: string | null
          file_id_a?: string
          file_id_b?: string
          id?: string
          organization_id?: string
          topic?: string
          trusted_excerpt?: string | null
          trusted_file_id?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "company_knowledge_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_conflicts_trusted_file_id_fkey"
            columns: ["trusted_file_id"]
            isOneToOne: false
            referencedRelation: "company_knowledge_files"
            referencedColumns: ["id"]
          },
        ]
      }
      company_knowledge_files: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          file_mime: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          organization_id: string
          processed_text: string | null
          processing_error: string | null
          processing_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          file_mime: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          organization_id: string
          processed_text?: string | null
          processing_error?: string | null
          processing_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          file_mime?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          organization_id?: string
          processed_text?: string | null
          processing_error?: string | null
          processing_status?: string
          updated_at?: string
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
      company_milestones: {
        Row: {
          category: string
          completion_notes: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          milestone_date: string
          organization_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          completion_notes?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          milestone_date: string
          organization_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          completion_notes?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          milestone_date?: string
          organization_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_milestones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          battle_card: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          include_in_ai: boolean
          name: string
          organization_id: string
          positioning: string | null
          pricing_notes: string | null
          sort_order: number
          strengths: string | null
          updated_at: string
          updated_by: string | null
          weaknesses: string | null
          website: string | null
        }
        Insert: {
          battle_card?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          name: string
          organization_id: string
          positioning?: string | null
          pricing_notes?: string | null
          sort_order?: number
          strengths?: string | null
          updated_at?: string
          updated_by?: string | null
          weaknesses?: string | null
          website?: string | null
        }
        Update: {
          battle_card?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          name?: string
          organization_id?: string
          positioning?: string | null
          pricing_notes?: string | null
          sort_order?: number
          strengths?: string | null
          updated_at?: string
          updated_by?: string | null
          weaknesses?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_communications: {
        Row: {
          channel: string
          contact_id: string
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          direction: string
          id: string
          is_draft: boolean
          organization_id: string
          sent_at: string | null
          sentiment: string | null
          subject: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          channel: string
          contact_id: string
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          direction: string
          id?: string
          is_draft?: boolean
          organization_id: string
          sent_at?: string | null
          sentiment?: string | null
          subject?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          direction?: string
          id?: string
          is_draft?: boolean
          organization_id?: string
          sent_at?: string | null
          sentiment?: string | null
          subject?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          email: string | null
          health: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          organization_id: string
          persona_id: string | null
          persona_match_reasoning: string | null
          persona_match_score: number | null
          persona_matched_at: string | null
          role: string | null
          segment: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          email?: string | null
          health?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          organization_id: string
          persona_id?: string | null
          persona_match_reasoning?: string | null
          persona_match_score?: number | null
          persona_matched_at?: string | null
          role?: string | null
          segment?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string | null
          health?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          persona_id?: string | null
          persona_match_reasoning?: string | null
          persona_match_score?: number | null
          persona_matched_at?: string | null
          role?: string | null
          segment?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      content_benchmarks: {
        Row: {
          benchmark_unit: string
          benchmark_value: number
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          metric_name: string
          notes: string | null
          organization_id: string
          platform: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          benchmark_unit?: string
          benchmark_value: number
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          metric_name: string
          notes?: string | null
          organization_id: string
          platform: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          benchmark_unit?: string
          benchmark_value?: number
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          metric_name?: string
          notes?: string | null
          organization_id?: string
          platform?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          assigned_to: string | null
          author_id: string | null
          content_type_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          notes: string | null
          organization_id: string
          output_id: string | null
          platform: string | null
          scheduled_date: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          author_id?: string | null
          content_type_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          output_id?: string | null
          platform?: string | null
          scheduled_date: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          author_id?: string | null
          content_type_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          output_id?: string | null
          platform?: string | null
          scheduled_date?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          content_type_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          organization_id: string
          platform: string | null
          platform_owner: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content_type_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          platform?: string | null
          platform_owner: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content_type_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          platform?: string | null
          platform_owner?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_index: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          metadata: Json
          organization_id: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_index_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
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
          cadence: string | null
          created_at: string
          created_by: string
          custom_rules: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          platform: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          created_by: string
          custom_rules: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          platform?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          cadence?: string | null
          created_at?: string
          created_by?: string
          custom_rules?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          platform?: string | null
          template_id?: string
          updated_at?: string
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
      customer_insights: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          impact: string
          include_in_ai: boolean
          organization_id: string
          source_communication_id: string | null
          source_contact_id: string | null
          source_contact_ids: string[]
          source_segment: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          impact?: string
          include_in_ai?: boolean
          organization_id: string
          source_communication_id?: string | null
          source_contact_id?: string | null
          source_contact_ids?: string[]
          source_segment?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          impact?: string
          include_in_ai?: boolean
          organization_id?: string
          source_communication_id?: string | null
          source_contact_id?: string | null
          source_contact_ids?: string[]
          source_segment?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_insights_source_communication_id_fkey"
            columns: ["source_communication_id"]
            isOneToOne: false
            referencedRelation: "contact_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_insights_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_entries: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          entry_date: string | null
          entry_type: string
          id: string
          include_in_ai: boolean
          jtbd: string | null
          key_quote_1: string | null
          key_quote_2: string | null
          key_quote_3: string | null
          organization_id: string
          participant: string | null
          platform: string | null
          project_id: string
          raw_content: string
          sentiment: string | null
          source: string | null
          source_material_id: string | null
          star_rating: number | null
          study_id: string | null
          tags: string[]
          updated_at: string
          user_segment: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          entry_date?: string | null
          entry_type: string
          id?: string
          include_in_ai?: boolean
          jtbd?: string | null
          key_quote_1?: string | null
          key_quote_2?: string | null
          key_quote_3?: string | null
          organization_id: string
          participant?: string | null
          platform?: string | null
          project_id: string
          raw_content: string
          sentiment?: string | null
          source?: string | null
          source_material_id?: string | null
          star_rating?: number | null
          study_id?: string | null
          tags?: string[]
          updated_at?: string
          user_segment?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          entry_date?: string | null
          entry_type?: string
          id?: string
          include_in_ai?: boolean
          jtbd?: string | null
          key_quote_1?: string | null
          key_quote_2?: string | null
          key_quote_3?: string | null
          organization_id?: string
          participant?: string | null
          platform?: string | null
          project_id?: string
          raw_content?: string
          sentiment?: string | null
          source?: string | null
          source_material_id?: string | null
          star_rating?: number | null
          study_id?: string | null
          tags?: string[]
          updated_at?: string
          user_segment?: string | null
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
          {
            foreignKeyName: "discovery_entries_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "project_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_entries_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "discovery_studies"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_studies: {
        Row: {
          analysis_markdown: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          goal: string | null
          id: string
          method: string | null
          name: string
          organization_id: string
          project_id: string
          script_markdown: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          analysis_markdown?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          goal?: string | null
          id?: string
          method?: string | null
          name: string
          organization_id: string
          project_id: string
          script_markdown?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_markdown?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          goal?: string | null
          id?: string
          method?: string | null
          name?: string
          organization_id?: string
          project_id?: string
          script_markdown?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_studies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_decisions: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_decisions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_document_links: {
        Row: {
          created_at: string
          discussion_id: string
          document_id: string
          id: string
          relationship_type: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          document_id: string
          id?: string
          relationship_type?: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          document_id?: string
          id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_document_links_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_learnings: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_learnings_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          discussion_id: string
          id: string
          message_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          discussion_id: string
          id?: string
          message_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          discussion_id?: string
          id?: string
          message_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_next_steps: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          owner_id: string | null
          sort_order: number
          status: string
          text: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          owner_id?: string | null
          sort_order?: number
          status?: string
          text: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          owner_id?: string | null
          sort_order?: number
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_next_steps_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_participants: {
        Row: {
          added_at: string
          added_by: string
          discussion_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          discussion_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          discussion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_participants_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_read_receipts: {
        Row: {
          discussion_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          discussion_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          discussion_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_read_receipts_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          ai_summary: string | null
          created_at: string
          created_by: string
          id: string
          mode: string
          organization_id: string
          parent_id: string
          parent_type: string
          resolved_at: string | null
          resolved_by: string | null
          section_key: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          mode?: string
          organization_id: string
          parent_id: string
          parent_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_key?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          mode?: string
          organization_id?: string
          parent_id?: string
          parent_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_key?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content: string
          created_at: string
          document_id: string
          edited_by: string
          id: string
          title: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          edited_by: string
          id?: string
          title: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          edited_by?: string
          id?: string
          title?: string
          version?: number
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
      documents: {
        Row: {
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          doc_type: string
          filed_at: string | null
          filed_by: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          organization_id: string
          review_requested_at: string | null
          review_requested_by: string | null
          source_session_id: string | null
          summary: string | null
          team_id: string | null
          title: string
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          doc_type?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          organization_id: string
          review_requested_at?: string | null
          review_requested_by?: string | null
          source_session_id?: string | null
          summary?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          doc_type?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          organization_id?: string
          review_requested_at?: string | null
          review_requested_by?: string | null
          source_session_id?: string | null
          summary?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_stages: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          kpi_definition_id: string
          label_override: string | null
          stage_order: number
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          kpi_definition_id: string
          label_override?: string | null
          stage_order?: number
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          kpi_definition_id?: string
          label_override?: string | null
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_stages_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_stages_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_dashboard_default: boolean
          name: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_dashboard_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_dashboard_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_periods: {
        Row: {
          created_at: string
          created_by: string
          focus_areas: string | null
          id: string
          organization_id: string
          period_end: string
          period_label: string
          period_start: string
          review_summary: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          what_to_defer: string | null
          what_to_push: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          focus_areas?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_label: string
          period_start: string
          review_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          what_to_defer?: string | null
          what_to_push?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          focus_areas?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          review_summary?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          what_to_defer?: string | null
          what_to_push?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
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
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          category: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_highlighted: boolean
          name: string
          organization_id: string
          sort_order: number
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_highlighted?: boolean
          name: string
          organization_id: string
          sort_order?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_highlighted?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          snapshot_date: string
          updated_at: string
          values: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          snapshot_date: string
          updated_at?: string
          values?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          snapshot_date?: string
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_project_seeds: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_type: string
          sort_order: number
          tool_key: string | null
          visibility: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_type?: string
          sort_order?: number
          tool_key?: string | null
          visibility?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_type?: string
          sort_order?: number
          tool_key?: string | null
          visibility?: string | null
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
      output_attachments: {
        Row: {
          caption: string | null
          created_at: string
          file_mime: string
          file_name: string
          file_url: string
          id: string
          output_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_mime: string
          file_name: string
          file_url: string
          id?: string
          output_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_mime?: string
          file_name?: string
          file_url?: string
          id?: string
          output_id?: string
          sort_order?: number
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
      outputs: {
        Row: {
          brief: string
          content: string
          content_type_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          draft_messages: Json | null
          email_signups: number | null
          engagement: number | null
          id: string
          metadata: Json | null
          model_id: string
          organization_id: string
          performance_notes: string | null
          performance_recorded_at: string | null
          project_id: string
          published_at: string | null
          reach: number | null
          reach_metric: string | null
          status: string
          summary: string | null
          updated_at: string
          views_1d: number | null
          views_30d: number | null
          views_7d: number | null
          website_visits: number | null
        }
        Insert: {
          brief: string
          content: string
          content_type_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          draft_messages?: Json | null
          email_signups?: number | null
          engagement?: number | null
          id?: string
          metadata?: Json | null
          model_id?: string
          organization_id: string
          performance_notes?: string | null
          performance_recorded_at?: string | null
          project_id: string
          published_at?: string | null
          reach?: number | null
          reach_metric?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          views_1d?: number | null
          views_30d?: number | null
          views_7d?: number | null
          website_visits?: number | null
        }
        Update: {
          brief?: string
          content?: string
          content_type_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          draft_messages?: Json | null
          email_signups?: number | null
          engagement?: number | null
          id?: string
          metadata?: Json | null
          model_id?: string
          organization_id?: string
          performance_notes?: string | null
          performance_recorded_at?: string | null
          project_id?: string
          published_at?: string | null
          reach?: number | null
          reach_metric?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          views_1d?: number | null
          views_30d?: number | null
          views_7d?: number | null
          website_visits?: number | null
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
      period_goals: {
        Row: {
          carried_from_goal_id: string | null
          created_at: string
          description: string | null
          goal_period_id: string
          id: string
          organization_id: string
          outcome: string | null
          outcome_notes: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          carried_from_goal_id?: string | null
          created_at?: string
          description?: string | null
          goal_period_id: string
          id?: string
          organization_id: string
          outcome?: string | null
          outcome_notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          carried_from_goal_id?: string | null
          created_at?: string
          description?: string | null
          goal_period_id?: string
          id?: string
          organization_id?: string
          outcome?: string | null
          outcome_notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_goals_carried_from_goal_id_fkey"
            columns: ["carried_from_goal_id"]
            isOneToOne: false
            referencedRelation: "period_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_goals_goal_period_id_fkey"
            columns: ["goal_period_id"]
            isOneToOne: false
            referencedRelation: "goal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          age_range: string | null
          behaviors: string | null
          buying_triggers: string | null
          channels: string | null
          company_size: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          frustrations: string | null
          goals: string | null
          id: string
          include_in_ai: boolean
          industry: string | null
          job_title: string | null
          location: string | null
          motivations: string | null
          name: string
          objections: string | null
          organization_id: string
          quote: string | null
          tagline: string | null
          updated_at: string
          values: string | null
        }
        Insert: {
          age_range?: string | null
          behaviors?: string | null
          buying_triggers?: string | null
          channels?: string | null
          company_size?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          frustrations?: string | null
          goals?: string | null
          id?: string
          include_in_ai?: boolean
          industry?: string | null
          job_title?: string | null
          location?: string | null
          motivations?: string | null
          name: string
          objections?: string | null
          organization_id: string
          quote?: string | null
          tagline?: string | null
          updated_at?: string
          values?: string | null
        }
        Update: {
          age_range?: string | null
          behaviors?: string | null
          buying_triggers?: string | null
          channels?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          frustrations?: string | null
          goals?: string | null
          id?: string
          include_in_ai?: boolean
          industry?: string | null
          job_title?: string | null
          location?: string | null
          motivations?: string | null
          name?: string
          objections?: string | null
          organization_id?: string
          quote?: string | null
          tagline?: string | null
          updated_at?: string
          values?: string | null
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
      platform_guidelines: {
        Row: {
          cadence: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          format_notes: string | null
          guidelines: string
          id: string
          include_in_ai: boolean
          organization_id: string
          platform_name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          format_notes?: string | null
          guidelines: string
          id?: string
          include_in_ai?: boolean
          organization_id: string
          platform_name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cadence?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          format_notes?: string | null
          guidelines?: string
          id?: string
          include_in_ai?: boolean
          organization_id?: string
          platform_name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_guidelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_context: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          sections: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          sections?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          sections?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_context_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          category: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          include_in_ai: boolean
          name: string
          organization_id: string
          sort_order: number
          status: string
          surfaces: string[]
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          include_in_ai?: boolean
          name: string
          organization_id: string
          sort_order?: number
          status?: string
          surfaces?: string[]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          include_in_ai?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          status?: string
          surfaces?: string[]
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_roadmap_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          organization_id: string
          phase: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          phase: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          phase?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_roadmap_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity: {
        Row: {
          action_type: string
          actor_user_id: string
          created_at: string
          entity_name: string | null
          id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          action_type: string
          actor_user_id: string
          created_at?: string
          entity_name?: string | null
          id?: string
          organization_id: string
          project_id: string
        }
        Update: {
          action_type?: string
          actor_user_id?: string
          created_at?: string
          entity_name?: string | null
          id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_project_id_fkey"
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
      project_materials: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          file_mime: string | null
          file_name: string | null
          file_url: string | null
          id: string
          link_url: string | null
          material_type: string
          organization_id: string
          project_id: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          link_url?: string | null
          material_type: string
          organization_id: string
          project_id: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          link_url?: string | null
          material_type?: string
          organization_id?: string
          project_id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
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
      projects: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          estimated_end_date: string | null
          id: string
          name: string
          organization_id: string
          project_type: string
          start_date: string | null
          status: string
          tags: string[] | null
          tool_key: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          estimated_end_date?: string | null
          id?: string
          name: string
          organization_id: string
          project_type?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tool_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          estimated_end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          project_type?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tool_key?: string | null
          updated_at?: string
          visibility?: string
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
      risks: {
        Row: {
          category: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          impact: number
          last_reviewed_at: string | null
          likelihood: number
          mitigation: string | null
          organization_id: string
          owner: string | null
          priority_score: number | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          impact?: number
          last_reviewed_at?: string | null
          likelihood?: number
          mitigation?: string | null
          organization_id: string
          owner?: string | null
          priority_score?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          impact?: number
          last_reviewed_at?: string | null
          likelihood?: number
          mitigation?: string | null
          organization_id?: string
          owner?: string | null
          priority_score?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_proof: {
        Row: {
          approved: boolean
          attribution: string | null
          company: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          include_in_ai: boolean
          metric_label: string | null
          metric_value: string | null
          organization_id: string
          proof_type: string
          quote: string | null
          sort_order: number
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved?: boolean
          attribution?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          metric_label?: string | null
          metric_value?: string | null
          organization_id: string
          proof_type?: string
          quote?: string | null
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved?: boolean
          attribution?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          include_in_ai?: boolean
          metric_label?: string | null
          metric_value?: string | null
          organization_id?: string
          proof_type?: string
          quote?: string | null
          sort_order?: number
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_proof_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
        ]
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
        ]
      }
      terminology: {
        Row: {
          avoid: string | null
          category: string
          context: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          organization_id: string
          preferred: string
          sort_order: number
          term: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avoid?: string | null
          category?: string
          context?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          preferred: string
          sort_order?: number
          term: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avoid?: string | null
          category?: string
          context?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          preferred?: string
          sort_order?: number
          term?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terminology_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          notifications_last_read_at: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          notifications_last_read_at?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notifications_last_read_at?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_unconfirmed_user_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      get_auth_user_by_email: {
        Args: { p_email: string }
        Returns: {
          is_confirmed: boolean
          user_id: string
        }[]
      }
      search_content_index: {
        Args: {
          org_id: string
          query_embedding: string
          result_limit?: number
          type_filter?: string[]
        }
        Returns: {
          content_id: string
          content_type: string
          metadata: Json
          similarity: number
          summary: string
          title: string
        }[]
      }
    }
    Enums: {
      member_role: "owner" | "admin" | "member"
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
      member_role: ["owner", "admin", "member"],
    },
  },
} as const
