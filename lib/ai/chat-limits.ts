/**
 * Per-message UTF-16 length cap for output/document chat API bodies.
 * Keeps requests bounded while allowing long pastes and transcripts.
 */
export const CHAT_MESSAGE_CONTENT_MAX_CHARS = 250_000
