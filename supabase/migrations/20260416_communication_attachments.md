# 20260416 — Communication attachment paths

## Summary
Adds `attachment_paths TEXT[] NOT NULL DEFAULT '{}'` to `contact_communications` so that images uploaded alongside a communication can be stored and later resolved to signed URLs.

## Gherkin specs
- `docs/features/communication-image-upload.md`

## ADRs
- Storage paths (not URLs) are stored so that the bucket can be renamed or the signing expiry changed without a data migration.
- The column is `TEXT[]` rather than a join table because attachments are append-only, ordered, and always loaded with their parent communication. A separate table would add complexity with no benefit at this scale.
- Private bucket with signed URLs is required per `security.mdc` — no permanent public URLs for user uploads.

## Design notes
- Bucket name: `communication-attachments` — must be created manually in the Supabase dashboard as a **private** bucket before the upload API is used.
- No RLS policy is needed on this column directly; the parent `contact_communications` RLS already governs who can read/write the row.
- `DEFAULT '{}'` ensures existing rows are valid and no backfill is needed.
