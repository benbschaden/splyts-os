import { createServiceClient } from '@/lib/supabase/service'
import { isAtLeastAdmin } from '@/lib/auth/roles'

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
}

export interface DocumentVersionRow {
  id: string
  document_id: string
  version: number
  content: string
  title: string
  edited_by: string
  created_at: string
  editor_name?: string | null
}

const DOCUMENT_SELECT =
  'id, organization_id, created_by, title, content, doc_type, visibility, source_session_id, version, locked_by, locked_at, filed_at, filed_by, review_requested_at, review_requested_by, team_id, summary, created_at, updated_at'

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

export async function getFiledDocuments(organizationId: string): Promise<DocumentRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('visibility', 'filed')
    .is('deleted_at', null)
    .order('filed_at', { ascending: false })

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
  expectedVersion?: number,
): Promise<{ document: DocumentRow | null; error: string | null; conflict?: boolean }> {
  const supabase = createServiceClient()

  // If version check requested, verify before updating
  if (expectedVersion !== undefined) {
    const { data: current } = await supabase
      .from('documents')
      .select('id, version, content, title')
      .eq('id', id)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!current) return { document: null, error: 'Not found' }

    if (current.version !== expectedVersion) {
      return { document: null, error: 'Document was modified', conflict: true }
    }

    // Snapshot current content to version history before overwriting
    if (updates.content !== undefined || updates.title !== undefined) {
      await snapshotDocumentVersion({
        documentId: id,
        version: current.version,
        content: current.content as string,
        title: current.title as string,
        editedBy: userId,
      })
    }
  }

  const shouldBumpVersion = updates.content !== undefined || updates.title !== undefined
  const updatePayload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }

  // Fetch current version for incrementing
  let nextVersion: number | undefined
  if (shouldBumpVersion) {
    const { data: current } = await supabase
      .from('documents')
      .select('version')
      .eq('id', id)
      .maybeSingle()
    if (current) {
      nextVersion = (current.version as number) + 1
      updatePayload.version = nextVersion
    }
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updatePayload)
    .eq('id', id)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to update document' }

  return { document: data as DocumentRow, error: null }
}

export async function snapshotDocumentVersion(input: {
  documentId: string
  version: number
  content: string
  title: string
  editedBy: string
}): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('document_versions').insert({
    document_id: input.documentId,
    version: input.version,
    content: input.content,
    title: input.title,
    edited_by: input.editedBy,
  })
}

export async function lockDocument(
  id: string,
  userId: string,
  organizationId: string,
): Promise<{ locked: boolean; lockedBy: string | null; lockedAt: string | null }> {
  const supabase = createServiceClient()

  const existing = await getDocumentById(id, organizationId)
  if (!existing) return { locked: false, lockedBy: null, lockedAt: null }

  // If already locked by someone else within the last 10 minutes, reject
  if (existing.locked_by && existing.locked_by !== userId && existing.locked_at) {
    const lockAge = Date.now() - new Date(existing.locked_at).getTime()
    if (lockAge < 10 * 60 * 1000) {
      return { locked: false, lockedBy: existing.locked_by, lockedAt: existing.locked_at }
    }
  }

  await supabase
    .from('documents')
    .update({ locked_by: userId, locked_at: new Date().toISOString() })
    .eq('id', id)

  return { locked: true, lockedBy: userId, lockedAt: new Date().toISOString() }
}

export async function unlockDocument(id: string, userId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('documents')
    .update({ locked_by: null, locked_at: null })
    .eq('id', id)
    .eq('locked_by', userId)
}

export async function fileDocument(
  id: string,
  filedByUserId: string,
  organizationId: string,
  summary: string,
): Promise<{ document: DocumentRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .update({
      visibility: 'filed',
      filed_at: new Date().toISOString(),
      filed_by: filedByUserId,
      review_requested_at: null,
      review_requested_by: null,
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to file document' }
  return { document: data as DocumentRow, error: null }
}

export function canUserFileDocument(input: {
  userId: string
  userRole: 'owner' | 'admin' | 'member'
  document: Pick<DocumentRow, 'team_id'>
  reviewerTeamIds: string[]
}): boolean {
  const { userRole, document, reviewerTeamIds } = input
  if (isAtLeastAdmin(userRole)) return true
  if (!document.team_id) return false
  return reviewerTeamIds.includes(document.team_id)
}

export async function requestDocumentReview(
  id: string,
  userId: string,
): Promise<{ document: DocumentRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('documents')
    .update({
      review_requested_at: new Date().toISOString(),
      review_requested_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('created_by', userId)
    .is('deleted_at', null)
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to request review' }
  return { document: data as DocumentRow, error: null }
}

export async function getPendingReviewDocuments(
  organizationId: string,
  reviewerTeamIds: string[],
  userRole: 'owner' | 'admin' | 'member',
): Promise<DocumentRow[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('review_requested_at', 'is', null)
    .neq('visibility', 'filed')
    .order('review_requested_at', { ascending: false })

  if (!isAtLeastAdmin(userRole)) {
    if (reviewerTeamIds.length === 0) return []
    query = query.in('team_id', reviewerTeamIds)
  }

  const { data, error } = await query.limit(50)
  if (error) return []
  return data as DocumentRow[]
}

export async function getDocumentVersions(
  documentId: string,
  organizationId: string,
): Promise<DocumentVersionRow[]> {
  const supabase = createServiceClient()

  // Verify access
  const doc = await getDocumentById(documentId, organizationId)
  if (!doc) return []

  const { data, error } = await supabase
    .from('document_versions')
    .select('id, document_id, version, content, title, edited_by, created_at')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(50)

  if (error) return []
  return data as DocumentVersionRow[]
}

export async function restoreDocumentVersion(
  documentId: string,
  targetVersion: number,
  userId: string,
  organizationId: string,
): Promise<{ document: DocumentRow | null; error: string | null }> {
  const supabase = createServiceClient()

  // Fetch the target version snapshot
  const { data: versionRow, error: versionError } = await supabase
    .from('document_versions')
    .select('content, title, version')
    .eq('document_id', documentId)
    .eq('version', targetVersion)
    .maybeSingle()

  if (versionError || !versionRow) {
    return { document: null, error: 'Version not found' }
  }

  // Verify ownership
  const existing = await getDocumentById(documentId, organizationId)
  if (!existing || existing.created_by !== userId) {
    return { document: null, error: 'Not found' }
  }

  // Snapshot current state before restore
  await snapshotDocumentVersion({
    documentId,
    version: existing.version,
    content: existing.content,
    title: existing.title,
    editedBy: userId,
  })

  const { data, error } = await supabase
    .from('documents')
    .update({
      content: versionRow.content,
      title: versionRow.title,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select(DOCUMENT_SELECT)
    .single()

  if (error) return { document: null, error: 'Failed to restore version' }
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

export async function upsertDocumentEmbedding(input: {
  documentId: string
  content: string
  embedding: number[]
}): Promise<void> {
  const supabase = createServiceClient()
  // Supabase passes vector columns as "[x,y,z]" string format
  const embeddingStr = `[${input.embedding.join(',')}]`
  await supabase.from('document_embeddings').upsert(
    {
      document_id: input.documentId,
      content: input.content,
      embedding: embeddingStr as unknown as number[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'document_id' },
  )
}

export async function upsertMaterialEmbedding(input: {
  materialId: string
  content: string
  embedding: number[]
}): Promise<void> {
  const supabase = createServiceClient()
  const embeddingStr = `[${input.embedding.join(',')}]`
  await supabase.from('project_material_embeddings').upsert(
    {
      material_id: input.materialId,
      content: input.content,
      embedding: embeddingStr as unknown as number[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'material_id' },
  )
}
