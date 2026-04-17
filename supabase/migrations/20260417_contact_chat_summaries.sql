CREATE TABLE contact_chat_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  segment TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_chat_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see summaries in their orgs"
  ON contact_chat_summaries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX contact_chat_summaries_session_id_idx ON contact_chat_summaries (session_id);
CREATE INDEX contact_chat_summaries_contact_id_idx ON contact_chat_summaries (contact_id);
CREATE INDEX contact_chat_summaries_organization_id_idx ON contact_chat_summaries (organization_id);
