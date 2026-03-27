# Migration: product_roadmap_items

Creates the `product_roadmap_items` table — kanban-style Now/Next/Later/Shipped items.

**Key fields:** `title`, `description`, `phase` (now/next/later/shipped), `status` (planned/in_progress/shipped/cut), `category`, `sort_order`.

**RLS:** org members can view; only admins can create/edit/delete. Soft deletes via `deleted_at`.

**Index:** `(organization_id, phase)` WHERE `deleted_at IS NULL` for kanban column queries.
