/**
 * Extracts readable text from uploaded files at upload time.
 * The extracted text is stored in project_materials.content so AI prompts
 * can read document contents rather than just the filename.
 *
 * Supported:
 *   .docx  — mammoth (already a dependency)
 *   .pdf   — pdf-parse (already a dependency)
 *   .txt / .md / .csv / .json — plain text, read directly
 *
 * Not extractable (returns null):
 *   images, .xlsx (binary grid data isn't useful as raw text for AI context)
 */

import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

/** Cap at 60 000 chars — well inside the DB column limit and safe for prompts. */
const MAX_CHARS = 60_000

export async function extractTextFromFile(
  file: File,
): Promise<string | null> {
  const { type } = file

  // Plain text formats — read directly
  if (
    type === 'text/plain' ||
    type === 'text/markdown' ||
    type === 'text/csv' ||
    type === 'application/json'
  ) {
    const text = await file.text()
    return text.slice(0, MAX_CHARS) || null
  }

  // Word documents
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value.trim()
      return text ? text.slice(0, MAX_CHARS) : null
    } catch (err) {
      console.error('[extract-text] mammoth failed:', err)
      return null
    }
  }

  // PDF
  if (type === 'application/pdf') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await pdfParse(buffer)
      const text = result.text.trim()
      return text ? text.slice(0, MAX_CHARS) : null
    } catch (err) {
      console.error('[extract-text] pdf-parse failed:', err)
      return null
    }
  }

  // Images, xlsx, svg — no meaningful text to extract
  return null
}
