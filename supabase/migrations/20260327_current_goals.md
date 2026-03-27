# Migration: current_goals

Creates the `current_goals` table — one row per organisation, JSONB sections for quarterly OKRs.

**Sections (5, all AI-visible):** `period_label`, `focus_areas`, `key_results`, `what_to_push`, `what_to_defer`.

**RLS:** org members can view; only admins can insert/update. No delete — it's a singleton updated each quarter.
