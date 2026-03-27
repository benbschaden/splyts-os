# Migration: product_context

Creates the `product_context` table — one row per organisation, JSONB sections blob.

**Sections (9):** `product_overview`, `key_user_flows`, `surfaces`, `backend_services`, `methodology`, `integrations`, `pricing_and_packaging`, `positioning`, `known_limitations`.

**RLS:** org members can select; only admins can insert/update. No delete — it's a singleton.
