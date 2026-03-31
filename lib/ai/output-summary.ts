/**
 * Derives a concise summary from brief + content body for embeddings / search.
 * Format: "<type>: <brief truncated>. <content opening truncated>"
 */
export function deriveOutputSummary(
  brief: string,
  content: string,
  typeLabel?: string,
): string {
  const type = typeLabel?.trim() || 'content'
  const briefPart = brief.trim().slice(0, 200)
  const cleanContent = content.replace(/[#*_`>\[\]]/g, '').replace(/\s+/g, ' ').trim()
  const contentPart = cleanContent.slice(0, 300)
  return `${type}: ${briefPart}. ${contentPart}`.slice(0, 500)
}
