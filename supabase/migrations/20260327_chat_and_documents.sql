-- ============================================================
-- Chat Sessions, Chat Messages, and Documents
-- ============================================================
-- Supports the Company Chat feature: context-aware AI chat
-- sessions that can be captured into private documents.
-- Documents are org-scoped but start private to the creator,
-- with the ability to share with the team or file to company.
-- ============================================================

-- -------------------------------------------------------
-- Chat Sessions
-- -------------------------------------------------------
CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL DEFAULT 'New Chat',
  -- JSONB config for which knowledge sources are enabled
  context_config  JSONB NOT NULL DEFAULT '{"brand": true, "business_plan": false, "personas": false}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX chat_sessions_org_user_idx ON chat_sessions (organization_id, created_by)
  WHERE deleted_at IS NULL;

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own chat sessions
CREATE POLICY "chat_sessions_select" ON chat_sessions
  FOR SELECT
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_sessions_update" ON chat_sessions
  FOR UPDATE
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "chat_sessions_delete" ON chat_sessions
  FOR DELETE
  USING (created_by = auth.uid());

-- -------------------------------------------------------
-- Chat Messages
-- -------------------------------------------------------
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_session_idx ON chat_messages (session_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Messages are accessible if the user owns the parent session
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

-- -------------------------------------------------------
-- Documents
-- -------------------------------------------------------
-- Visibility levels:
--   'private'  — only the creator can see it
--   'shared'   — all org members can see it
--   'filed'    — promoted to company knowledge (visible to all)
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  doc_type        TEXT NOT NULL DEFAULT 'note',
  visibility      TEXT NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('private', 'shared', 'filed')),
  -- Optional: link back to the chat session that produced it
  source_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX documents_org_idx ON documents (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX documents_creator_idx ON documents (organization_id, created_by)
  WHERE deleted_at IS NULL;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Private: only creator. Shared/filed: all org members.
CREATE POLICY "documents_select" ON documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR (
        visibility IN ('shared', 'filed')
        AND organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "documents_insert" ON documents
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "documents_update" ON documents
  FOR UPDATE
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "documents_delete" ON documents
  FOR DELETE
  USING (created_by = auth.uid());
