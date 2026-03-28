const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  // Truncate to ~8000 tokens worth of characters (32000 chars ≈ 8000 tokens)
  const truncated = text.slice(0, 32000)

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSION,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI embedding failed: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding as number[]
}
