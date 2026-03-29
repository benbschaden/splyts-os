# 20260329_project_files_allow_markdown

## Summary
Adds `text/markdown` to the `project-files` storage bucket's allowed MIME type list.

## Gherkin specs
- Project materials upload: user uploads a `.md` file

## ADRs
- Bucket MIME allowlists are the source of truth for what Storage will accept; the application-level `ALLOWED_MIME_TYPES` set in the upload route must stay in sync with this.

## Design notes
- Uses `array_append` with an existence check so the migration is idempotent — safe to run more than once.
- The application-level allowlist in `app/api/projects/[id]/materials/upload/route.ts` was updated in the same change to keep both layers in sync.
