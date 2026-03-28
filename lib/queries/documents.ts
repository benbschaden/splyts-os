import { createServiceClient } from '@/lib/supabase/service'

export type DocumentVisibility = 'private' | 'shared' | 'filed'

export interface DocumentRow {
  id: string
  organization_id: string
  created_by: string
  title: string
  content: string
  doc_type: string
  visibility: DocumentVisibility
  source_session_id: string | null
  created_at: string
  updated_at: string
}

const DOCUMENT_SELECT =
  'id, organization_id, created_by, title, content, doc_type, visibility, source_session_id, created_at, updated_at'

export async function getDocuments(
  organizationId: string,
  userId: string,
): Promise<DocumentRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) return []
  return data as DocumentRow[]
}

export async function getSharedDocuments(organizationId: string): Promise<DocumentRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .in('visibility', ['shared', 'filed'])
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) return []
  return data as DocumentRow[]
}

export async function getDocumentById(
  id: string,
  organizationId: string,
): Promise<DocumentRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as DocumentRow
}

export async function createDocument(input: {
  organizationId: string
  userId: string
  title: string
  content: string
  docType: string
  sourceSessionId?: string
  visibility?: DocumentVisibility
}): Promise<{ document: DocumentRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const visibility = input.visibility ?? 'private'

  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      title: input.title,
      content: input.content,
      doc_type: input.docType,
      visibility,
      source_session_id: input.sourceSessionId ?? null,
    })
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to create document' }
  return { document: data as DocumentRow, error: null }
}

export async function updateDocument(
  id: string,
  userId: string,
  updates: Partial<Pick<DocumentRow, 'title' | 'content' | 'doc_type' | 'visibility'>>,
): Promise<{ document: DocumentRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to update document' }
  return { document: data as DocumentRow, error: null }
}

export async function deleteDocument(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', userId)

  if (error) return { error: 'Failed to delete document' }
  return { error: null }
}
