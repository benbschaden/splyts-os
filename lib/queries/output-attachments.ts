import { createServiceClient } from '@/lib/supabase/service'

export type OutputAttachmentRow = {
  id: string
  output_id: string
  file_url: string
  file_name: string
  file_mime: string
  caption: string | null
  sort_order: number
  created_at: string
}

const OUTPUT_ATTACHMENT_COLUMNS =
  'id, output_id, file_url, file_name, file_mime, caption, sort_order, created_at'

function sortAttachmentsByOrder(rows: OutputAttachmentRow[]): OutputAttachmentRow[] {
  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at.localeCompare(b.created_at)
  })
}

export async function getAttachmentsForOutput(outputId: string): Promise<OutputAttachmentRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('output_attachments')
    .select(OUTPUT_ATTACHMENT_COLUMNS)
    .eq('output_id', outputId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as OutputAttachmentRow[]
}

export async function getAttachmentsForOutputs(
  outputIds: string[],
): Promise<Record<string, OutputAttachmentRow[]>> {
  if (outputIds.length === 0) return {}

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('output_attachments')
    .select(OUTPUT_ATTACHMENT_COLUMNS)
    .in('output_id', outputIds)

  if (error) {
    const empty: Record<string, OutputAttachmentRow[]> = {}
    for (const id of outputIds) empty[id] = []
    return empty
  }

  const byOutput = new Map<string, OutputAttachmentRow[]>()
  for (const id of outputIds) {
    byOutput.set(id, [])
  }
  for (const row of (data ?? []) as OutputAttachmentRow[]) {
    const list = byOutput.get(row.output_id) ?? []
    list.push(row)
    byOutput.set(row.output_id, list)
  }

  const result: Record<string, OutputAttachmentRow[]> = {}
  for (const id of outputIds) {
    result[id] = sortAttachmentsByOrder(byOutput.get(id) ?? [])
  }
  return result
}

export async function createOutputAttachment(params: {
  outputId: string
  fileUrl: string
  fileName: string
  fileMime: string
  caption?: string | null
  sortOrder?: number
}): Promise<{ attachment: OutputAttachmentRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const insert: {
    output_id: string
    file_url: string
    file_name: string
    file_mime: string
    caption?: string | null
    sort_order?: number
  } = {
    output_id: params.outputId,
    file_url: params.fileUrl,
    file_name: params.fileName,
    file_mime: params.fileMime,
  }
  if (params.caption !== undefined) insert.caption = params.caption
  if (params.sortOrder !== undefined) insert.sort_order = params.sortOrder

  const { data, error } = await supabase
    .from('output_attachments')
    .insert(insert)
    .select(OUTPUT_ATTACHMENT_COLUMNS)
    .single()

  if (error || !data) return { attachment: null, error: 'Failed to create output attachment' }
  return { attachment: data, error: null }
}

export async function deleteOutputAttachment(id: string): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('output_attachments').delete().eq('id', id)

  if (error) return { error: 'Failed to delete output attachment' }
  return { error: null }
}
