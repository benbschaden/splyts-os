# Migration: Chat Sessions, Messages, and Documents

## Summary
Adds three tables supporting the Company Chat feature: `chat_sessions` for tracking AI conversations, `chat_messages` for individual messages, and `documents` for captured artifacts that start private and can be shared or filed to company knowledge.

## Gherkin specs
- `docs/features/company-chat.md`

## ADRs
- `docs/decisions/ADR-002-project-centric-data-model.md` — documents use the same org-scoped, soft-delete pattern

## Design notes

### Chat sessions are user-scoped, not org-scoped for visibility
Chat sessions are private to the creator by RLS policy (`created_by = auth.uid()`). They are still org-scoped via `organization_id` for data isolation, but other team members cannot see each other's chat threads. This matches the "thinking partner" use case — chat is personal, documents are shareable.

### Documents use a visibility enum instead of a boolean
Three states: `private` → `shared` → `filed`. This avoids the boolean trap of "is_public" that can't be extended. Filed means promoted to company knowledge, shared means visible to the team but still owned by the creator.

### context_config is JSONB on chat_sessions
Stores which knowledge sources were enabled for the session (brand, business plan, personas). This makes the context selection auditable and allows future sources (documents, author profiles) to be added without a schema change.

### source_session_id on documents
Optional back-reference to the chat session that produced the document. Allows the document to link back to the conversation for context. ON DELETE SET NULL so deleting a chat session doesn't delete the document.

### No project_items link for documents (yet)
Documents can be linked to projects in a future migration by adding `'document'` as a valid `item_type` in `project_items`. The architecture already supports this. It was intentionally left out of V1 to avoid premature complexity.
