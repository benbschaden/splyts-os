# Migration: product_features

Creates the `product_features` table — individual feature rows, many per organisation.

**Key fields:** `name`, `tagline`, `description`, `category` (free text, default "core"), `surfaces` (TEXT[]), `status` (live/beta/planned/deprecated), `include_in_ai`, `sort_order`.

**RLS:** org members can view; only admins can create/edit/delete. Soft deletes via `deleted_at`.

**Index:** `(organization_id, category)` WHERE `deleted_at IS NULL` for fast grouped queries.
