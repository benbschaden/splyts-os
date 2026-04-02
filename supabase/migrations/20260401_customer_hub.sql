-- ============================================================
-- Customer Hub
-- ============================================================
-- Adds the three tables that power the Customer Hub tool:
--
--   contacts               — people and companies the organisation
--                            communicates with (segments, health,
--                            tags, soft-delete).
--
--   contact_communications — every logged interaction with a
--                            contact: inbound/outbound emails,
--                            calls, meetings, notes, and drafts.
--
--   customer_insights      — structured learnings extracted from
--                            communications (pain points, feature
--                            requests, churn signals, etc.) with
--                            an include_in_ai flag so that key
--                            signal automatically enriches AI
--                            context across the OS.
--
-- Also seeds a default "Customer Hub" org-level project for every
-- existing organisation that does not already have one, using the
-- same backfill pattern as 20260329_customer_discovery.sql.
-- ============================================================

-- -------------------------------------------------------
-- 1. contacts
-- -------------------------------------------------------

CREATE TABLE public.contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  name            TEXT NOT NULL,
  email           TEXT,
  company         TEXT,
  role            TEXT,
  segment         TEXT
                  CHECK (segment IN ('beta_user','prospect','customer','churned','investor','partner','other')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','archived')),
  health          TEXT
                  CHECK (health IN ('green','yellow','red')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  last_contacted_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX contacts_org_idx
  ON public.contacts (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX contacts_org_segment_idx
  ON public.contacts (organization_id, segment) WHERE deleted_at IS NULL;

CREATE INDEX contacts_org_status_idx
  ON public.contacts (organization_id, status) WHERE deleted_at IS NULL;

CREATE INDEX contacts_tags_idx
  ON public.contacts USING GIN (tags) WHERE deleted_at IS NULL;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. contact_communications
-- -------------------------------------------------------

CREATE TABLE public.contact_communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  direction       TEXT NOT NULL
                  CHECK (direction IN ('inbound','outbound','internal_note')),
  channel         TEXT NOT NULL
                  CHECK (channel IN ('email','call','meeting','chat','sms','other')),
  subject         TEXT,
  content         TEXT NOT NULL,
  sent_at         TIMESTAMPTZ,
  is_draft        BOOLEAN NOT NULL DEFAULT false,
  sentiment       TEXT
                  CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  tags            TEXT[] NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX contact_communications_contact_idx
  ON public.contact_communications (contact_id) WHERE deleted_at IS NULL;

CREATE INDEX contact_communications_org_idx
  ON public.contact_communications (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX contact_communications_org_direction_idx
  ON public.contact_communications (organization_id, direction) WHERE deleted_at IS NULL;

CREATE INDEX contact_communications_org_sent_at_idx
  ON public.contact_communications (organization_id, sent_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER contact_communications_updated_at
  BEFORE UPDATE ON public.contact_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_communications_select" ON public.contact_communications
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contact_communications_insert" ON public.contact_communications
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contact_communications_update" ON public.contact_communications
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contact_communications_delete" ON public.contact_communications
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. customer_insights
-- -------------------------------------------------------

CREATE TABLE public.customer_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),

  content         TEXT NOT NULL,
  category        TEXT NOT NULL
                  CHECK (category IN ('pain_point','feature_request','praise','objection','churn_signal','usage_pattern','market_insight')),
  impact          TEXT NOT NULL DEFAULT 'medium'
                  CHECK (impact IN ('high','medium','low')),
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','validated','actioned','archived')),

  source_contact_id       UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  source_communication_id UUID REFERENCES public.contact_communications(id) ON DELETE SET NULL,

  tags            TEXT[] NOT NULL DEFAULT '{}',
  include_in_ai   BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX customer_insights_org_idx
  ON public.customer_insights (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX customer_insights_org_category_idx
  ON public.customer_insights (organization_id, category) WHERE deleted_at IS NULL;

CREATE INDEX customer_insights_org_ai_idx
  ON public.customer_insights (organization_id, include_in_ai) WHERE deleted_at IS NULL;

CREATE INDEX customer_insights_tags_idx
  ON public.customer_insights USING GIN (tags) WHERE deleted_at IS NULL;

CREATE TRIGGER customer_insights_updated_at
  BEFORE UPDATE ON public.customer_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_insights_select" ON public.customer_insights
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customer_insights_insert" ON public.customer_insights
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customer_insights_update" ON public.customer_insights
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customer_insights_delete" ON public.customer_insights
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 4. Seed: Customer Hub default project
-- -------------------------------------------------------

INSERT INTO public.org_project_seeds (name, description, category, visibility, sort_order, tool_key)
SELECT
  'Customer Hub',
  'Track contacts, log communications, draft replies, and extract learnings that inform every project across the OS.',
  'Research',
  'organization',
  2,
  'customer_hub'
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_project_seeds WHERE name = 'Customer Hub'
);

-- -------------------------------------------------------
-- 5. Assign tool_key to any existing Customer Hub projects
-- -------------------------------------------------------

UPDATE public.projects
SET tool_key = 'customer_hub'
WHERE name = 'Customer Hub'
  AND project_type = 'tool'
  AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 6. Backfill: create Customer Hub for orgs that lack one
-- -------------------------------------------------------

INSERT INTO public.projects (
  name, description, organization_id, created_by,
  category, visibility, status, project_type, tool_key
)
SELECT
  'Customer Hub',
  'Track contacts, log communications, draft replies, and extract learnings that inform every project across the OS.',
  o.id,
  member.user_id,
  'Research',
  'organization',
  'active',
  'tool',
  'customer_hub'
FROM public.organizations o
CROSS JOIN LATERAL (
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id = o.id
  ORDER BY CASE WHEN om.role = 'admin' THEN 0 ELSE 1 END, om.created_at ASC
  LIMIT 1
) AS member
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.organization_id = o.id
      AND p.name = 'Customer Hub'
      AND p.deleted_at IS NULL
  );
