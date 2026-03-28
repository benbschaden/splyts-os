import Anthropic from '@anthropic-ai/sdk'

export async function generateDocumentSummary(content: string, title: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fallback: return truncated content as summary
    return content.slice(0, 300).trim()
  }

  const anthropic = new Anthropic({ apiKey })

  // Truncate very long documents for summary generation
  const truncatedContent = content.length > 8000 ? content.slice(0, 8000) + '…' : content

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a 2-3 sentence summary of this document. Be concise and factual. Output only the summary, no preamble.

Title: ${title}

Content:
${truncatedContent}`,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text.trim() : content.slice(0, 300)
  } catch {
    return content.slice(0, 300).trim()
  }
}
