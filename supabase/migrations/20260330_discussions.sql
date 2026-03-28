-- ============================================================
-- Discussions System
-- ============================================================
-- Team conversations anchored to projects or documents.
-- Separate from chat_sessions (AI assistant chat).
-- Follows a create → message → resolve lifecycle.
-- AI extracts decisions/learnings/next-steps at resolution.
-- ============================================================

-- -------------------------------------------------------
-- 1. discussions
-- -------------------------------------------------------
CREATE TABLE discussions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_type     TEXT NOT NULL CHECK (parent_type IN ('project', 'document', 'section')),
  parent_id       UUID NOT NULL,
  section_key     TEXT,
  mode            TEXT NOT NULL DEFAULT 'lightweight'
                  CHECK (mode IN ('lightweight', 'structured')),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'resolved')),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_summary      TEXT,
  CONSTRAINT section_key_matches_parent CHECK (
    (parent_type = 'section') = (section_key IS NOT NULL)
  )
);

CREATE INDEX discussions_parent_idx
  ON discussions (organization_id, parent_type, parent_id, status);

CREATE TRIGGER discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussions_select" ON discussions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "discussions_insert" ON discussions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discussions_update" ON discussions FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "discussions_delete" ON discussions FOR DELETE
  USING (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. discussion_messages
-- -------------------------------------------------------
CREATE TABLE discussion_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  content       TEXT NOT NULL,
  message_type  TEXT NOT NULL DEFAULT 'user'
                CHECK (message_type IN ('user', 'system')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX discussion_messages_idx
  ON discussion_messages (discussion_id, created_at)
  WHERE deleted_at IS NULL;

CREATE TRIGGER discussion_messages_updated_at
  BEFORE UPDATE ON discussion_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_messages_select" ON discussion_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND discussion_id IN (
      SELECT d.id FROM discussions d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "discussion_messages_insert" ON discussion_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND discussion_id IN (
      SELECT d.id FROM discussions d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. discussion_decisions
-- -------------------------------------------------------
CREATE TABLE discussion_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_decisions_idx ON discussion_decisions (discussion_id);

ALTER TABLE discussion_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_decisions_select" ON discussion_decisions FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_decisions_insert" ON discussion_decisions FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 4. discussion_learnings
-- -------------------------------------------------------
CREATE TABLE discussion_learnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_learnings_idx ON discussion_learnings (discussion_id);

ALTER TABLE discussion_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_learnings_select" ON discussion_learnings FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_learnings_insert" ON discussion_learnings FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 5. discussion_next_steps
-- -------------------------------------------------------
CREATE TABLE discussion_next_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_next_steps_idx ON discussion_next_steps (discussion_id);

ALTER TABLE discussion_next_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_next_steps_select" ON discussion_next_steps FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_next_steps_insert" ON discussion_next_steps FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_next_steps_update" ON discussion_next_steps FOR UPDATE
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 6. discussion_document_links
-- -------------------------------------------------------
CREATE TABLE discussion_document_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id     UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'created_from'
                    CHECK (relationship_type IN ('created_from', 'references')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, document_id)
);

CREATE INDEX discussion_doc_links_idx ON discussion_document_links (discussion_id);

ALTER TABLE discussion_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_doc_links_select" ON discussion_document_links FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_doc_links_insert" ON discussion_document_links FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));
