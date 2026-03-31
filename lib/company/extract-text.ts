// Both heavy libraries are dynamically imported inside the function to avoid
// two problems: (1) pdf-parse's test fixture loading at module init time in
// Next.js App Router environments, and (2) slow cold-start compilation in dev
// mode that can freeze the browser while waiting for a response.
import 'server-only'

export type SupportedMime =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown'

export const SUPPORTED_MIMES = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

export const MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
}

export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

/**
 * Extracts plain text from a file buffer.
 * Throws if the MIME type is unsupported or extraction fails.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
    const data = await pdfParse(buffer)
    const text = data.text?.trim() ?? ''
    if (!text) throw new Error('PDF appears to be image-based (scanned). Only text-based PDFs are supported.')
    return text
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8').trim()
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
