# Migration: platform_guidelines

Creates the `platform_guidelines` table — per-platform content rules (LinkedIn, Email, Instagram, etc.).

**Key fields:** `platform_name`, `guidelines` (required), `format_notes`, `cadence`, `include_in_ai`, `sort_order`.

**RLS:** org members can view; only admins can create/edit/delete. Soft deletes via `deleted_at`.

**Index:** `(organization_id)` WHERE `deleted_at IS NULL`.
