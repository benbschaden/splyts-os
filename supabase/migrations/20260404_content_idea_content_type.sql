-- ============================================================
-- Link content_ideas to content_types
-- 1. Add content_type_id FK (nullable — existing rows keep platform)
-- 2. Make platform nullable (new rows use content_type_id instead)
-- ============================================================

ALTER TABLE public.content_ideas
  ADD COLUMN IF NOT EXISTS content_type_id UUID REFERENCES public.content_types(id) ON DELETE SET NULL;

ALTER TABLE public.content_ideas
  ALTER COLUMN platform DROP NOT NULL;

CREATE INDEX IF NOT EXISTS content_ideas_content_type_idx
  ON public.content_ideas (content_type_id)
  WHERE content_type_id IS NOT NULL AND deleted_at IS NULL;
