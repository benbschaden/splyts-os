import { createServiceClient } from '@/lib/supabase/service'

export interface ContextConfig {
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

export interface ChatSessionRow {
  id: string
  organization_id: string
  created_by: string
  title: string
  model_id: string
  context_config: ContextConfig
  created_at: string
  updated_at: string
}

export interface ChatMessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const SESSION_SELECT = 'id, organization_id, created_by, title, model_id, context_config, created_at, updated_at'
const MESSAGE_SELECT = 'id, session_id, role, content, created_at'

export async function getChatSessions(
  organizationId: string,
  userId: string,
): Promise<ChatSessionRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(SESSION_SELECT)
    .eq('organization_id', organizationId)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) return []
  return data as ChatSessionRow[]
}

export async function getChatSessionById(
  id: string,
  userId: string,
): Promise<ChatSessionRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(SESSION_SELECT)
    .eq('id', id)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as ChatSessionRow
}

export async function createChatSession(
  organizationId: string,
  userId: string,
  contextConfig: ContextConfig,
  modelId: string,
): Promise<{ session: ChatSessionRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      context_config: contextConfig,
      model_id: modelId,
    })
    .select(SESSION_SELECT)
    .single()

  if (error) return { session: null, error: 'Failed to create chat session' }
  return { session: data as ChatSessionRow, error: null }
}

export async function updateChatSession(
  id: string,
  userId: string,
  updates: { title?: string; model_id?: string },
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', id)
    .eq('created_by', userId)
    .is('deleted_at', null)

  if (error) return { error: 'Failed to update chat session' }
  return { error: null }
}

export async function deleteChatSession(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('chat_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', userId)

  if (error) return { error: 'Failed to delete chat session' }
  return { error: null }
}

export async function getChatMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data as ChatMessageRow[]
}

export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<{ message: ChatMessageRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role, content })
    .select(MESSAGE_SELECT)
    .single()

  if (error) return { message: null, error: 'Failed to save message' }
  return { message: data as ChatMessageRow, error: null }
}
