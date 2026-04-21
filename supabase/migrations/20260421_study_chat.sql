-- Add persistent chat session link and saved report to discovery_studies.
-- chat_session_id: one reusable chat session per study (persisted across visits)
-- report_markdown: AI-generated summary document created from the study chat

ALTER TABLE discovery_studies
  ADD COLUMN IF NOT EXISTS chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_markdown TEXT;
