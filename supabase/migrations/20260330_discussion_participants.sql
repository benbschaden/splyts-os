-- ============================================================
-- Discussion Participants
-- ============================================================
-- Explicit participant list per discussion.
-- Creator is always inserted as a participant on creation.
-- At least one other participant must be selected when creating.
-- ============================================================

CREATE TABLE discussion_participants (
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by      UUID NOT NULL REFERENCES auth.users(id),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

CREATE INDEX discussion_participants_idx ON discussion_participants (discussion_id);
CREATE INDEX discussion_participants_user_idx ON discussion_participants (user_id);

ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_participants_select" ON discussion_participants FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_participants_insert" ON discussion_participants FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_participants_delete" ON discussion_participants FOR DELETE
  USING (
    added_by = auth.uid()
    OR discussion_id IN (
      SELECT d.id FROM discussions d WHERE d.created_by = auth.uid()
    )
  );
