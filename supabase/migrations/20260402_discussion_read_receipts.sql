CREATE TABLE discussion_read_receipts (
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  last_read_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discussion_id, user_id)
);

ALTER TABLE discussion_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own read receipts"
  ON discussion_read_receipts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
