# Migration: chat_context_extended

Backfills 6 new boolean flags into the `context_config` JSONB column on `chat_sessions`:

- `product` — inject product context + features
- `product_roadmap` — inject product roadmap items
- `company_milestones` — inject company milestones  
- `current_goals` — inject quarterly goals and OKRs
- `platform_guidelines` — inject all platform guidelines
- `filed_docs` — inject up to 3 most recently filed documents

All default to `false` on existing sessions. New sessions will set these via the updated `createSchema` in the sessions API route.
