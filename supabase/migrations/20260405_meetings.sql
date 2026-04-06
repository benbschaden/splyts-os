-- ============================================================
-- Meeting Intelligence
-- ============================================================
-- Three tables that power meeting transcript processing:
--
--   meetings              — one row per meeting; stores raw transcript
--                           and AI-extracted structured output.
--
--   meeting_attendees     — org members who attended the meeting;
--                           controls who can see it (attendees_only
--                           vs org_wide visibility).
--
--   meeting_project_links — accepted routing decisions linking a
--                           meeting to one or more projects so each
--                           project's Meetings tab shows relevant
--                           content.
--
-- All three tables are created before any RLS policies are added,
-- because the meetings_select policy references meeting_attendees,
-- and meeting_project_links_select also references meeting_attendees.
-- ============================================================

-- -------------------------------------------------------
-- 1. Table definitions (no policies yet)
-- -------------------------------------------------------

CREATE TABLE public.meetings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by               UUID NOT NULL REFERENCES auth.users(id),

  title                    TEXT NOT NULL,
  meeting_date             DATE,
  raw_transcript           TEXT NOT NULL,

  -- Populated by AI processing (null until /process is called)
  processed_summary        TEXT,
  extracted_decisions      JSONB,        -- [{text: string, owner: string|null}]
  extracted_action_items   JSONB,        -- [{text: string, assignee_name: string|null}]
  extracted_open_questions JSONB,        -- [{text: string}]

  -- Routing suggestions from AI (null until /process is called)
  suggested_project_links  JSONB,        -- [{project_id, project_name, rationale,
                                          --   relevant_decisions: number[], relevant_actions: number[]}]

  processed_at             TIMESTAMPTZ,
  accepted_at              TIMESTAMPTZ,

  visibility               TEXT NOT NULL DEFAULT 'attendees_only'
                           CHECK (visibility IN ('attendees_only', 'org_wide')),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX meetings_org_idx
  ON public.meetings (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX meetings_org_date_idx
  ON public.meetings (organization_id, meeting_date DESC NULLS LAST) WHERE deleted_at IS NULL;

CREATE INDEX meetings_created_by_idx
  ON public.meetings (created_by) WHERE deleted_at IS NULL;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -------------------------------------------------------

CREATE TABLE public.meeting_attendees (
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by    UUID NOT NULL REFERENCES auth.users(id),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX meeting_attendees_user_idx
  ON public.meeting_attendees (user_id);

-- -------------------------------------------------------

CREATE TABLE public.meeting_project_links (
  meeting_id       UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  relevant_summary TEXT,
  linked_by        UUID NOT NULL REFERENCES auth.users(id),
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, project_id)
);

CREATE INDEX meeting_project_links_project_idx
  ON public.meeting_project_links (project_id);

-- -------------------------------------------------------
-- 2. Enable RLS on all three tables
-- -------------------------------------------------------

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_project_links ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 3. meetings policies
-- -------------------------------------------------------

-- SELECT: org member + (is creator, org_wide, or is attendee)
-- meeting_attendees exists now so this subquery is safe
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR visibility = 'org_wide'
      OR id IN (
        SELECT meeting_id FROM public.meeting_attendees
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "meetings_update" ON public.meetings
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

CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- -------------------------------------------------------
-- 4. meeting_attendees policies
-- -------------------------------------------------------

-- SELECT: you can see your own attendee rows, or rows you added
-- (service client is used for most queries; this is a safety net)
CREATE POLICY "meeting_attendees_select" ON public.meeting_attendees
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR added_by = auth.uid()
  );

CREATE POLICY "meeting_attendees_insert" ON public.meeting_attendees
  FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "meeting_attendees_delete" ON public.meeting_attendees
  FOR DELETE
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

-- -------------------------------------------------------
-- 5. meeting_project_links policies
-- -------------------------------------------------------

CREATE POLICY "meeting_project_links_select" ON public.meeting_project_links
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE deleted_at IS NULL
        AND organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid()
        )
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

CREATE POLICY "meeting_project_links_insert" ON public.meeting_project_links
  FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "meeting_project_links_delete" ON public.meeting_project_links
  FOR DELETE
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );
