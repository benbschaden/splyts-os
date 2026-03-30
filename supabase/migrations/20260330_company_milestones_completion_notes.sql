-- Optional note captured when a milestone is marked achieved (e.g. from "Mark done").
ALTER TABLE company_milestones
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;
