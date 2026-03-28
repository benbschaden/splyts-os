import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type KnowledgeFileRow = Database['public']['Tables']['company_knowledge_files']['Row']
export type KnowledgeConflictRow = Database['public']['Tables']['company_knowledge_conflicts']['Row']

// ─── Files ────────────────────────────────────────────────────────────────────

export async function listKnowledgeFiles(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_name, file_mime, file_size_bytes, processing_status, processing_error, created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
}

export async function getKnowledgeFilesWithText(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_name, processed_text')
    .eq('organization_id', organizationId)
    .eq('processing_status', 'ready')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
}

export async function getKnowledgeFileById(
  supabase: SupabaseClient<Database>,
  fileId: string,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_url, file_name, processing_status')
    .eq('id', fileId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()
}

export async function createKnowledgeFile(
  supabase: SupabaseClient<Database>,
  input: {
    organizationId: string
    createdBy: string
    fileName: string
    fileUrl: string
    fileMime: string
    fileSizeBytes: number
  },
) {
  return supabase
    .from('company_knowledge_files')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_mime: input.fileMime,
      file_size_bytes: input.fileSizeBytes,
      processing_status: 'processing',
    })
    .select('id, file_name, file_mime, file_size_bytes, processing_status, created_at')
    .single()
}

export async function updateKnowledgeFileProcessed(
  supabase: SupabaseClient<Database>,
  fileId: string,
  processedText: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ processed_text: processedText, processing_status: 'ready' })
    .eq('id', fileId)
    .select('id, file_name, file_mime, file_size_bytes, processing_status, created_at')
    .single()
}

export async function updateKnowledgeFileFailed(
  supabase: SupabaseClient<Database>,
  fileId: string,
  processingError: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ processing_status: 'failed', processing_error: processingError })
    .eq('id', fileId)
}

export async function softDeleteKnowledgeFile(
  supabase: SupabaseClient<Database>,
  fileId: string,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
}

// ─── Conflicts ────────────────────────────────────────────────────────────────

export async function listActiveConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_conflicts')
    .select(`
      id, organization_id, file_id_a, file_id_b, topic, description,
      excerpt_a, excerpt_b, dismissed_at, created_at,
      file_a:company_knowledge_files!company_knowledge_conflicts_file_id_a_fkey(file_name),
      file_b:company_knowledge_files!company_knowledge_conflicts_file_id_b_fkey(file_name)
    `)
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
}

export async function countActiveConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<number> {
  const { count } = await supabase
    .from('company_knowledge_conflicts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
  return count ?? 0
}

export async function createConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  fileIdA: string,
  fileIdB: string,
  conflicts: Array<{ topic: string; description: string; excerpt_a: string | null; excerpt_b: string | null }>,
) {
  if (conflicts.length === 0) return { error: null }
  const rows = conflicts.map((c) => ({
    organization_id: organizationId,
    file_id_a: fileIdA,
    file_id_b: fileIdB,
    topic: c.topic,
    description: c.description,
    excerpt_a: c.excerpt_a,
    excerpt_b: c.excerpt_b,
  }))
  return supabase.from('company_knowledge_conflicts').insert(rows)
}

export async function deleteConflictsForFilePair(
  supabase: SupabaseClient<Database>,
  fileIdA: string,
  fileIdB: string,
) {
  await supabase
    .from('company_knowledge_conflicts')
    .delete()
    .eq('file_id_a', fileIdA)
    .eq('file_id_b', fileIdB)
  await supabase
    .from('company_knowledge_conflicts')
    .delete()
    .eq('file_id_a', fileIdB)
    .eq('file_id_b', fileIdA)
}

export async function getConflictById(
  supabase: SupabaseClient<Database>,
  conflictId: string,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_conflicts')
    .select('id, file_id_a, file_id_b, excerpt_a, excerpt_b, dismissed_at')
    .eq('id', conflictId)
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
    .single()
}

export async function dismissConflict(
  supabase: SupabaseClient<Database>,
  conflictId: string,
  organizationId: string,
  dismissedBy: string,
  trust?: { trustedFileId: string; trustedExcerpt: string },
) {
  return supabase
    .from('company_knowledge_conflicts')
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by: dismissedBy,
      ...(trust
        ? { trusted_file_id: trust.trustedFileId, trusted_excerpt: trust.trustedExcerpt }
        : {}),
    })
    .eq('id', conflictId)
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
    .select('id')
    .single()
}

export async function getResolvedConflictExcerpts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_conflicts')
    .select('topic, trusted_excerpt')
    .eq('organization_id', organizationId)
    .not('dismissed_at', 'is', null)
    .not('trusted_excerpt', 'is', null)
}
