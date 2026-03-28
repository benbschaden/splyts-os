import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

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
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const text = result.text?.trim() ?? ''
    if (!text) throw new Error('PDF appears to be image-based (scanned). Only text-based PDFs are supported.')
    return text
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8').trim()
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
