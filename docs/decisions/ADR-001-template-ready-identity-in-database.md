# ADR-001: Template-Ready — Company Identity in Database, Not Code

**Status:** Decided

**Decision:** The splyts-os codebase contains no company-specific identity. Company names, brand voice, team members, and configuration all live in the database. Deploying for a new company requires zero code changes — only new Supabase and Vercel credentials.

**Why:** This codebase is a generic company OS product. It must be deployable for any company without modification. If company identity is hardcoded, the codebase cannot be reused. Template-ready design means the product is the system, not the configuration — any company signs up, enters their details through the UI, and it works.

**Alternatives considered:** Build specifically for the first customer, extract a generic version later.

**Why rejected:** "Extract a generic version later" is how technical debt is created. Every time something customer-specific gets added, it becomes harder to extract. Building generic from day one is the same amount of work and eliminates the extraction problem entirely. The template test — "if a different company deployed this with a fresh Supabase and signed up, would everything work?" — must pass at every point in development.
