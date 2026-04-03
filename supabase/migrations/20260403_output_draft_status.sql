-- Add draft/published status to outputs and store chat history for resumable sessions.
ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published'));

ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS draft_messages JSONB;

-- Index to quickly find in-progress drafts for a user in a project
CREATE INDEX IF NOT EXISTS idx_outputs_draft_project_user
  ON public.outputs (project_id, created_by)
  WHERE status = 'draft' AND deleted_at IS NULL;
