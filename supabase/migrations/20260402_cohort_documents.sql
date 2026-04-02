-- ============================================================
-- Cohort Documents
-- ============================================================
-- Stores files uploaded against a user segment (cohort).
-- After upload, AI extracts draft insights from the file.
-- Confirmed insights are saved to customer_insights with
-- source_segment matching the cohort's segment.
-- ============================================================

-- -------------------------------------------------------
-- Storage bucket
-- -------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cohort-files',
  'cohort-files',
  false,
  52428800,
  ARRAY[
    'text/csv',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can upload/read their own org's files
CREATE POLICY "Org members can upload cohort files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cohort-files');

CREATE POLICY "Org members can read cohort files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cohort-files');

CREATE POLICY "Org members can delete cohort files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cohort-files');

-- -------------------------------------------------------
-- Table
-- -------------------------------------------------------

CREATE TABLE public.cohort_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  segment           TEXT NOT NULL
    CHECK (segment IN ('beta_user','free_user','customer','power_user','prospect','churned','other')),
  file_name         TEXT NOT NULL,
  file_mime         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  extracted_text    TEXT,
  status            TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','processing','processed','failed')),
  insights_extracted INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX cohort_documents_org_idx
  ON public.cohort_documents (organization_id, segment)
  WHERE deleted_at IS NULL;

CREATE INDEX cohort_documents_project_idx
  ON public.cohort_documents (project_id)
  WHERE deleted_at IS NULL;

-- updated_at trigger
CREATE TRIGGER cohort_documents_updated_at
  BEFORE UPDATE ON public.cohort_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

ALTER TABLE public.cohort_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see their cohort documents"
  ON public.cohort_documents FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
