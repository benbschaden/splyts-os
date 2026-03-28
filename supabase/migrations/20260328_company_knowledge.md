# 20260328_company_knowledge

## Summary
Adds `company_knowledge_files` and `company_knowledge_conflicts` tables plus a private
`company-knowledge` Supabase Storage bucket. These are strictly isolated from all generate
and chat endpoints — they are only queried from the company section suggest routes.

## Gherkin specs
See `docs/features/company-knowledge.md`

## ADRs
- **No vector embeddings in V1**: files are short enough (< 10 per org typically) that
  sending full extracted text to Claude is simpler, more accurate, and avoids an
  OpenAI API key dependency. Embeddings can be added in a future migration if needed.
- **Conflict stored as rows**: detected conflicts are persisted so they survive page refreshes
  and can be dismissed independently, not regenerated on every page load.
- **Isolation enforced at query layer**: only `app/api/company/suggest/route.ts` and
  `app/api/company-knowledge/upload/route.ts` may query company knowledge tables.

## Design notes
- `processing_status` FSM: `pending → processing → ready | failed`
- `deleted_at` is soft-delete; queries always filter `WHERE deleted_at IS NULL`
- `file_url` stores the Supabase Storage path, not a public URL
- Conflicts cascade-delete if either referenced file is deleted
- `dismissed_at` NULL = active conflict
