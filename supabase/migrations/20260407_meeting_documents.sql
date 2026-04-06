-- ============================================================
-- Meeting documents (AI discussion outputs)
-- ============================================================
-- meeting_documents        — drafts and published notes created from
--                            the meeting Discuss flow; tied to a meeting.
-- meeting_document_projects — which projects can see a published
--                            document (user-selected + aligned with
--                            meeting routing).
-- ============================================================

CREATE TABLE public.meeting_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES auth.users(id),

  title            TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT '',

  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published')),
  published_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX meeting_documents_meeting_idx
  ON public.meeting_documents (meeting_id) WHERE deleted_at IS NULL;

CREATE INDEX meeting_documents_org_idx
  ON public.meeting_documents (organization_id) WHERE deleted_at IS NULL;

CREATE TRIGGER meeting_documents_updated_at
  BEFORE UPDATE ON public.meeting_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.meeting_document_projects (
  meeting_document_id UUID NOT NULL REFERENCES public.meeting_documents(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  linked_by           UUID NOT NULL REFERENCES auth.users(id),
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_document_id, project_id)
);

CREATE INDEX meeting_document_projects_project_idx
  ON public.meeting_document_projects (project_id);

ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_document_projects ENABLE ROW LEVEL SECURITY;

-- meeting_documents: same visibility as parent meeting
CREATE POLICY "meeting_documents_select" ON public.meeting_documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    AND meeting_id IN (
      SELECT id FROM public.meetings
      WHERE deleted_at IS NULL
        AND (
          created_by = auth.uid()
          OR visibility = 'org_wide'
          OR id IN (
            SELECT meeting_id FROM public.meeting_attendees
            WHERE user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "meeting_documents_insert" ON public.meeting_documents
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_documents_update" ON public.meeting_documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "meeting_documents_delete" ON public.meeting_documents
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "meeting_document_projects_select" ON public.meeting_document_projects
  FOR SELECT
  USING (
    meeting_document_id IN (
      SELECT md.id
      FROM public.meeting_documents md
      INNER JOIN public.meetings m ON m.id = md.meeting_id
      WHERE md.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND md.organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid()
        )
        AND (
          m.created_by = auth.uid()
          OR m.visibility = 'org_wide'
          OR m.id IN (
            SELECT meeting_id FROM public.meeting_attendees
            WHERE user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "meeting_document_projects_insert" ON public.meeting_document_projects
  FOR INSERT
  WITH CHECK (
    meeting_document_id IN (
      SELECT id FROM public.meeting_documents
      WHERE deleted_at IS NULL AND created_by = auth.uid()
    )
  );

CREATE POLICY "meeting_document_projects_delete" ON public.meeting_document_projects
  FOR DELETE
  USING (
    meeting_document_id IN (
      SELECT id FROM public.meeting_documents
      WHERE deleted_at IS NULL AND created_by = auth.uid()
    )
  );
