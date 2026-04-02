# Universal Content Index — Design Spec

## Problem

Content created in the OS (outputs, documents, discussions, contacts, milestones, etc.) is not consistently searchable. Only documents have semantic search via pgvector. ~25 other content types are invisible to search and AI context retrieval. As the system grows, this gap widens.

## Solution

A unified `content_index` table that stores a title, summary, and embedding for every piece of user-created content. One search RPC queries it. A library-level indexing pipeline ensures every save/update/delete keeps the index current.

## Decisions

- **Unified table over per-type tables.** The current per-type pattern (`document_embeddings`, `project_material_embeddings`, `discovery_entry_embeddings`) doesn't scale to 27+ content types. A single polymorphic table with `(content_type, content_id)` is simpler to query, extend, and maintain.
- **Two summary strategies.** Long-form content (outputs, documents, discussions, business plans, etc.) gets AI-generated summaries. Short/structured content (milestones, terminology, features, etc.) uses concatenated fields directly. This avoids wasteful AI calls on content that's already concise.
- **Embeddings via OpenAI text-embedding-3-small (1536d).** Matches the existing embedding infrastructure.
- **Existing per-type embedding tables get migrated then dropped.** Data moves into `content_index`; old tables and RPCs are removed.

## Database Schema

### `content_index` table

```sql
CREATE TABLE content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_type, content_id)
);
```

**Indexes:**
- IVFFlat on `embedding` for vector similarity
- B-tree on `(organization_id, content_type)` for filtered queries

**RLS:** Same pattern as all other tables — users see rows where `organization_id` matches their org membership.

### `search_content_index` RPC

```sql
CREATE OR REPLACE FUNCTION search_content_index(
  query_embedding vector(1536),
  org_id UUID,
  result_limit INT DEFAULT 20,
  type_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  title TEXT,
  summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
```

Cosine similarity search, filtered by org. Optional `type_filter` array to restrict to specific content types.

## Content Types (27)

### AI-summarized (long-form)

| Type key | Source table | Summary input |
|----------|-------------|---------------|
| `output` | `outputs` | brief + content |
| `document` | `documents` | title + content |
| `discussion` | `discussions` | title + messages (aggregated) |
| `business_plan` | `business_plans` | name + sections JSONB |
| `discovery_study` | `discovery_studies` | goal + script + analysis |
| `discovery_entry` | `discovery_entries` | raw_content + quotes + jtbd |
| `customer_insight` | `customer_insights` | content + category |
| `persona` | `personas` | name + goals + frustrations + ... |

### Direct text (already concise)

| Type key | Source table | Concatenated fields |
|----------|-------------|-------------------|
| `project` | `projects` | name + description |
| `contact` | `contacts` | name + company + notes + segment |
| `contact_communication` | `contact_communications` | subject + content snippet |
| `company_milestone` | `company_milestones` | title + date + description |
| `product_roadmap_item` | `product_roadmap_items` | title + phase + description |
| `product_feature` | `product_features` | name + tagline + description |
| `period_goal` | `period_goals` | title + description + outcome_notes |
| `goal_period` | `goal_periods` | name + focus_areas + review_summary |
| `terminology` | `terminology` | preferred + avoid + context |
| `brand_narrative` | `brand_narratives` | name + narrative |
| `social_proof` | `social_proof` | quote + attribution |
| `competitor` | `competitors` | name + positioning + strengths + weaknesses |
| `content_calendar` | `content_calendar` | title + date + description |
| `platform_guideline` | `platform_guidelines` | platform + guidelines |
| `risk` | `risks` | title + description + mitigation |
| `project_material` | `project_materials` | title + content snippet |
| `content_idea` | `content_ideas` | title + description |
| `company_knowledge_file` | `company_knowledge_files` | filename + processed_text snippet |
| `product_context` | `product_context` | flatten sections JSONB |

## Library Architecture

### `lib/indexing/index-content.ts`

Main entry point. Exports:
- `indexContent(supabase, { organizationId, contentType, contentId, title, summary, metadata })` — generates embedding, upserts into `content_index`
- `removeFromIndex(supabase, contentType, contentId)` — deletes from `content_index`

### `lib/indexing/summary-registry.ts`

Maps each content type to its summary strategy:
- `strategy: 'ai' | 'direct'`
- `deriveDirectSummary(row): string` — for direct types, concatenates the right fields
- `deriveAiSummaryInput(row): string` — for AI types, builds the input text for summarization

### `lib/indexing/ai-summarize.ts`

Calls Claude to generate a 1-3 sentence summary of long-form content. Used only for AI-strategy types.

### Updated `lib/retrieval/search.ts`

`retrieveRelevantDocuments()` updated to call `search_content_index` RPC instead of the two separate per-type RPCs. Returns results from all content types, scored by similarity.

## Migration Plan

1. Create `content_index` table, RLS, indexes, search RPC
2. Migrate data from `document_embeddings`, `project_material_embeddings`, `discovery_entry_embeddings` into `content_index`
3. Add `summary` columns to AI-summarized tables that don't have one yet
4. Build `lib/indexing/` pipeline
5. Update `lib/retrieval/search.ts` to use new RPC
6. Update all save/update/delete paths to call `indexContent()` / `removeFromIndex()`
7. Backfill: index all existing content
8. Drop old per-type embedding tables and RPCs
9. Add `content-index.mdc` cursor rule

## Cursor Rule: `content-index.mdc`

Every new table that holds user-created content must:
1. Be registered in `lib/indexing/summary-registry.ts` with a content type key and summary strategy
2. Call `indexContent()` on insert/update and `removeFromIndex()` on delete
3. Have the summary strategy documented (AI or direct, which fields)

If a new content table is created without these three things, it is incomplete.

## Not in scope

- UI search page (future feature, will consume the search RPC)
- Real-time re-indexing triggers (Postgres triggers — deferred until volume justifies it)
- Chunked embeddings for very long documents (single embedding per content item for now)
