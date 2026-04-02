import { createUntypedServiceClient } from '@/lib/supabase/service'
import type { InsightSourceSegment } from './customer-insights'

export type CohortDocumentSegment = InsightSourceSegment

export type CohortDocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed'

export interface CohortDocumentRow {
  id: string
  organization_id: string
  project_id: string
  created_by: string
  segment: CohortDocumentSegment
  file_name: string
  file_mime: string
  storage_path: string
  extracted_text: string | null
  status: CohortDocumentStatus
  insights_extracted: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, created_by, segment, file_name, file_mime, storage_path, extracted_text, status, insights_extracted, created_at, updated_at, deleted_at'

function mapRow(row: Record<string, unknown>): CohortDocumentRow {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    project_id: row.project_id as string,
    created_by: row.created_by as string,
    segment: row.segment as CohortDocumentSegment,
    file_name: row.file_name as string,
    file_mime: row.file_mime as string,
    storage_path: row.storage_path as string,
    extracted_text: (row.extracted_text as string | null) ?? null,
    status: row.status as CohortDocumentStatus,
    insights_extracted: (row.insights_extracted as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
  }
}

export async function getCohortDocumentsForProject(
  projectId: string,
  orgId: string,
): Promise<CohortDocumentRow[]> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('cohort_documents')
    .select(SELECT_COLUMNS)
    .eq('project_id', projectId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getCohortDocumentById(
  id: string,
  orgId: string,
): Promise<CohortDocumentRow | null> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('cohort_documents')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function createCohortDocument(params: {
  organizationId: string
  projectId: string
  userId: string
  segment: CohortDocumentSegment
  fileName: string
  fileMime: string
  storagePath: string
  extractedText?: string | null
}): Promise<{ doc: CohortDocumentRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('cohort_documents')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      created_by: params.userId,
      segment: params.segment,
      file_name: params.fileName,
      file_mime: params.fileMime,
      storage_path: params.storagePath,
      extracted_text: params.extractedText ?? null,
      status: 'uploaded',
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { doc: null, error: 'Failed to create document record' }
  return { doc: mapRow(data as Record<string, unknown>), error: null }
}

export async function updateCohortDocument(
  id: string,
  orgId: string,
  updates: Partial<Pick<CohortDocumentRow, 'status' | 'insights_extracted'>>,
): Promise<{ doc: CohortDocumentRow | null; error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { data, error } = await supabase
    .from('cohort_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return { doc: null, error: 'Failed to update document' }
  return { doc: mapRow(data as Record<string, unknown>), error: null }
}

export async function deleteCohortDocument(
  id: string,
  orgId: string,
): Promise<{ error: string | null }> {
  const supabase = createUntypedServiceClient()
  const { error } = await supabase
    .from('cohort_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (error) return { error: 'Failed to delete document' }
  return { error: null }
}
