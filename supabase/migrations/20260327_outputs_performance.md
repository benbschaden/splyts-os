# Migration: outputs_performance

Adds performance tracking columns to the `outputs` table:

- `published_at` — when the content was published
- `reach` — numeric reach figure (impressions, views, etc.)
- `reach_metric` — what "reach" means: impressions/views/opens/plays/other
- `engagement` — optional engagement count (likes, clicks, replies)
- `performance_notes` — free-text notes about performance

**Index:** `(organization_id, reach DESC)` WHERE `reach IS NOT NULL AND deleted_at IS NULL` — used to fetch top-performing outputs for AI injection.
