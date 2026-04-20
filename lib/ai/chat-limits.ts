/**
 * Per-message UTF-16 length cap for output/document chat API bodies.
 * Keeps requests bounded while allowing long pastes and transcripts.
 */
export const CHAT_MESSAGE_CONTENT_MAX_CHARS = 250_000

/**
 * Anthropic `max_tokens` for assistant completions in discuss / multi-turn generate flows
 * (output and document chat, project generate session). Low values truncate long drafts and
 * full-document replacement rewrites mid-response.
 */
export const DISCUSS_AI_MAX_OUTPUT_TOKENS = 16_000
