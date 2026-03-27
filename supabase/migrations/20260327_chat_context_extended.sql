-- Extend chat sessions context_config with 6 new boolean flags
-- Backfill existing rows to include the new flags with default false
UPDATE chat_sessions
SET context_config = context_config || '{
  "product": false,
  "product_roadmap": false,
  "company_milestones": false,
  "current_goals": false,
  "platform_guidelines": false,
  "filed_docs": false
}'::jsonb
WHERE context_config IS NOT NULL;
