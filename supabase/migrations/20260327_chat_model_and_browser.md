# Migration: Chat model selection and browser toggle

## Summary
Adds `model_id` to `chat_sessions` so each session tracks which AI model to use, and adds `browser` to the `context_config` JSONB default so new sessions can toggle web search access. Backfills existing sessions with `browser: false`.

## Gherkin specs
- `docs/features/company-chat.md`

## Design notes

### model_id is a column, not part of context_config
Model is operationally distinct from context toggles — it affects how the AI responds, not what knowledge it has access to. Keeping it as a dedicated column makes it easy to index, filter, or report on later.

### Backfill via jsonb merge operator
Using `|| '{"browser": false}'::jsonb` safely adds the key without touching existing keys. Only runs on rows where `browser` key is absent, making it idempotent-safe.
