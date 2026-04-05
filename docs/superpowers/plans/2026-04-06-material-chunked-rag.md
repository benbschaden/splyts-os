# Material Chunked RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chunk uploaded file materials into the content_index at upload time so the AI can semantically search across 100+ transcripts and see their actual content — not just the first 500 characters.

**Architecture:** Each uploaded file with meaningful text content is split into ~1,000-character overlapping chunks. Each chunk is stored as a separate `content_index` row (`content_type = 'project_material_chunk'`). The existing vector search (`search_content_index` RPC) already handles these rows automatically. The system prompt stops dumping file content directly and relies on retrieval to surface relevant chunks. A backfill endpoint re-indexes existing uploaded materials.

**Tech Stack:** TypeScript, Next.js App Router, Supabase (PostgreSQL + pgvector), OpenAI embeddings (`text-embedding-3-small`), existing `lib/indexing/index-content.ts` + `lib/retrieval/search.ts` patterns.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260406_material_chunks_index.sql` | CREATE | Expression index on metadata + fetch_material_chunks RPC |
| `supabase/migrations/20260406_material_chunks_index.md` | CREATE | Migration companion doc |
| `lib/indexing/chunk-material.ts` | CREATE | `chunkText()` + `indexMaterialChunks()` |
| `lib/indexing/content-registry.ts` | MODIFY | Add `project_material_chunk` type |
| `app/api/projects/[id]/materials/upload/route.ts` | MODIFY | Call `indexMaterialChunks` after upload |
| `lib/retrieval/search.ts` | MODIFY | Add chunk type to filter, `fetchAllMaterialChunks`, raise limit |
| `lib/ai/prompts.ts` | MODIFY | Fix files block (titles only), improve retrieved context attribution |
| `app/api/chat/sessions/[id]/messages/route.ts` | MODIFY | Raise retrieval limit from 5 → 15 |
| `app/api/generate/session/route.ts` | MODIFY | Raise retrieval limit from 5 → 10 |
| `app/api/projects/[id]/materials/reindex/route.ts` | CREATE | Backfill endpoint |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260406_material_chunks_index.sql`
- Create: `supabase/migrations/20260406_material_chunks_index.md`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration: Expression index for material chunk lookups + fetch_material_chunks RPC
-- Supports efficient retrieval of all chunks for a specific material (for full-document analysis).

-- Expression index: fast lookup of all chunks belonging to a material_id
CREATE INDEX IF NOT EXISTS content_index_material_id_idx
  ON content_index ((metadata->>'material_id'))
  WHERE content_type = 'project_material_chunk';

-- RPC: fetch all chunks for a material in chunk_index order
-- Used to reconstruct full document text when the user requests complete analysis.
CREATE OR REPLACE FUNCTION fetch_material_chunks(p_material_id uuid)
RETURNS TABLE (
  chunk_index   int,
  total_chunks  int,
  chunk_content text,
  material_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (metadata->>'chunk_index')::int   AS chunk_index,
    (metadata->>'total_chunks')::int  AS total_chunks,
    summary                            AS chunk_content,
    metadata->>'material_title'        AS material_title
  FROM content_index
  WHERE content_type = 'project_material_chunk'
    AND metadata->>'material_id' = p_material_id::text
  ORDER BY (metadata->>'chunk_index')::int;
$$;
```

Save to `supabase/migrations/20260406_material_chunks_index.sql`.

- [ ] **Step 2: Write the companion doc**

```markdown
# 20260406_material_chunks_index

## Summary
Adds an expression index on `content_index(metadata->>'material_id')` for fast chunk
lookups, and a `fetch_material_chunks` RPC to retrieve all chunks for a material in order.

## Gherkin specs
Supports: material chunked RAG feature

## ADRs
- Uses a partial expression index (WHERE content_type = 'project_material_chunk') to keep
  the index small and fast — only chunk rows need this lookup.
- SECURITY DEFINER on the RPC allows it to be called from service-client contexts without
  requiring the caller to have direct table access.

## Design notes
- `fetch_material_chunks` is used when a user explicitly requests full analysis of a
  specific transcript — it reassembles all chunks in order.
- The expression index supports DELETE ... WHERE metadata->>'material_id' = $1, which is
  how we clean up old chunks before re-indexing.
```

Save to `supabase/migrations/20260406_material_chunks_index.md`.

- [ ] **Step 3: Apply the migration**

```bash
cd /Users/benb/Documents/OS/splyts-os
npx supabase db push
```

Expected: migration applies cleanly with no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260406_material_chunks_index.sql supabase/migrations/20260406_material_chunks_index.md
git commit -m "chore: add expression index and fetch_material_chunks RPC for material chunk retrieval"
```

---

## Task 2: `lib/indexing/chunk-material.ts`

**Files:**
- Create: `lib/indexing/chunk-material.ts`

- [ ] **Step 1: Create the file**

```typescript
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { embedText } from '@/lib/retrieval/embed'

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 150
// Materials shorter than this are handled by the standard single-row indexContent path
const MIN_CONTENT_FOR_CHUNKING = 200

/**
 * Split text into overlapping chunks of a fixed size.
 * Exported for unit testing.
 */
export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    if (end >= text.length) break
    start = end - overlap
  }
  return chunks
}

type MaterialForChunking = {
  id: string
  content: string | null
  title: string | null
  file_name: string | null
  project_id: string
  material_type: string
  created_by?: string | null
}

/**
 * Chunk a material's content and index each chunk in content_index.
 * Deletes existing chunks for this material before inserting new ones.
 * Safe to call fire-and-forget — all errors are logged, not thrown.
 *
 * Only processes materials with content >= MIN_CONTENT_FOR_CHUNKING chars.
 * Short materials are handled by the standard indexContent() path instead.
 */
export async function indexMaterialChunks(
  material: MaterialForChunking,
  organizationId: string,
): Promise<void> {
  if (!material.content || material.content.length < MIN_CONTENT_FOR_CHUNKING) return
  if (!process.env.OPENAI_API_KEY) return

  const chunks = chunkText(material.content)
  const materialTitle = material.title ?? material.file_name ?? 'Untitled'
  const supabase = createUntypedServiceClient()

  // Remove stale chunks before re-indexing
  const { error: deleteError } = await supabase
    .from('content_index')
    .delete()
    .eq('content_type', 'project_material_chunk')
    .filter('metadata->>material_id', 'eq', material.id)

  if (deleteError) {
    console.error(`[chunk-material] Failed to delete old chunks for ${material.id}:`, deleteError.message)
    // Continue — partial re-index is better than no index
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i]

    let embedding: number[]
    try {
      embedding = await embedText(chunkContent)
    } catch (err) {
      console.error(`[chunk-material] Embedding failed for chunk ${i} of material ${material.id}:`, err)
      continue
    }

    const embeddingStr = `[${embedding.join(',')}]`
    const payload: Record<string, unknown> = {
      organization_id: organizationId,
      content_type: 'project_material_chunk',
      content_id: crypto.randomUUID(),
      title: materialTitle,
      summary: chunkContent,
      embedding: embeddingStr as unknown as string,
      metadata: {
        material_id: material.id,
        project_id: material.project_id,
        chunk_index: i,
        total_chunks: chunks.length,
        material_type: material.material_type,
        material_title: materialTitle,
      },
      updated_at: new Date().toISOString(),
    }
    if (material.created_by) payload.created_by = material.created_by

    const { error } = await supabase.from('content_index').insert(payload)
    if (error) {
      console.error(`[chunk-material] Insert failed for chunk ${i} of material ${material.id}:`, error.message)
    }
  }
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd /Users/benb/Documents/OS/splyts-os
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `lib/indexing/chunk-material.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/indexing/chunk-material.ts
git commit -m "feat: add chunkText and indexMaterialChunks for material chunked RAG"
```

---

## Task 3: Update content registry

**Files:**
- Modify: `lib/indexing/content-registry.ts` (lines 274–283, after existing `project_material` entry)

- [ ] **Step 1: Read the file to confirm line numbers**

Read `lib/indexing/content-registry.ts`. Locate the `project_material` entry (currently ends around line 283) and the closing `}` of `CONTENT_REGISTRY`.

- [ ] **Step 2: Add the chunk type after the `project_material` entry**

Find this block:
```typescript
  project_material: {
    deriveText: (row) => ({
      title: str(row.title),
      summary: truncate(str(row.content), 500),
    }),
    deriveMetadata: (row) => ({
      project_id: row.project_id ?? null,
      material_type: row.material_type ?? null,
    }),
  },
```

Add immediately after it (before `content_idea`):
```typescript
  project_material_chunk: {
    // Chunks are indexed directly by indexMaterialChunks() — this entry exists
    // as a fallback if indexContent() is ever called on a chunk row.
    deriveText: (row) => ({
      title: str(row.title),
      summary: str(row.summary ?? row.content).slice(0, 1000),
    }),
    deriveMetadata: (row) => ({
      material_id: row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>).material_id ?? null
        : null,
      project_id: row.project_id ?? null,
      material_type: row.material_type ?? null,
    }),
  },
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/indexing/content-registry.ts
git commit -m "feat: register project_material_chunk in content registry"
```

---

## Task 4: Update upload route to index chunks

**Files:**
- Modify: `app/api/projects/[id]/materials/upload/route.ts`

- [ ] **Step 1: Read the file**

Read `app/api/projects/[id]/materials/upload/route.ts`. Locate the block around line 188:
```typescript
    indexContent('project_material', material, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )
```

- [ ] **Step 2: Add the import at the top of the file**

Find the existing imports block (the `import` statements at the top). Add this import alongside the existing indexContent import:

```typescript
import { indexMaterialChunks } from '@/lib/indexing/chunk-material'
```

- [ ] **Step 3: Add chunk indexing call after the existing indexContent call**

After:
```typescript
    indexContent('project_material', material, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )
```

Add:
```typescript
    indexMaterialChunks({
      id: material.id,
      content: material.content ?? null,
      title: material.title ?? null,
      file_name: material.file_name ?? null,
      project_id: projectId,
      material_type: 'file',
      created_by: user.id,
    }, org.id).catch(err =>
      console.error('[content-index] Chunk indexing failed:', err)
    )
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/materials/upload/route.ts
git commit -m "feat: index material chunks at upload time"
```

---

## Task 5: Update retrieval — add chunk type, fetchAllMaterialChunks, raise limit

**Files:**
- Modify: `lib/retrieval/search.ts`

- [ ] **Step 1: Read the current file**

Read `lib/retrieval/search.ts` in full.

- [ ] **Step 2: Update `retrieveRelevantDocuments`**

Find:
```typescript
export async function retrieveRelevantDocuments(params: {
  query: string
  organizationId: string
  userId: string
  projectId?: string
  limit?: number
}): Promise<RetrievedContext[]> {
  return retrieveRelevantContext({
    query: params.query,
    organizationId: params.organizationId,
    typeFilter: ['document', 'project_material'],
    limit: params.limit,
  })
}
```

Replace with:
```typescript
export async function retrieveRelevantDocuments(params: {
  query: string
  organizationId: string
  userId: string
  projectId?: string
  limit?: number
}): Promise<RetrievedContext[]> {
  return retrieveRelevantContext({
    query: params.query,
    organizationId: params.organizationId,
    typeFilter: ['document', 'project_material', 'project_material_chunk'],
    limit: params.limit ?? 15,
  })
}
```

- [ ] **Step 3: Add `fetchAllMaterialChunks` at the bottom of the file**

```typescript
/**
 * Fetch all chunks for a specific material in chunk_index order and return
 * the full reconstructed text. Used for single-material deep-dive analysis.
 * Returns empty string if the material has no chunks or fetch fails.
 */
export async function fetchAllMaterialChunks(materialId: string): Promise<string> {
  const supabase = createUntypedServiceClient()

  const { data, error } = await supabase.rpc('fetch_material_chunks', {
    p_material_id: materialId,
  })

  if (error || !data || data.length === 0) return ''

  return (data as Array<{ chunk_index: number; chunk_content: string }>)
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map((row) => row.chunk_content)
    .join(' ')
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/retrieval/search.ts
git commit -m "feat: add project_material_chunk to retrieval, raise limit, add fetchAllMaterialChunks"
```

---

## Task 6: Fix prompts — titles-only for files, chunk attribution in retrieved context

**Files:**
- Modify: `lib/ai/prompts.ts` (two functions: `buildProjectMaterialsBlock` lines 177–213, `buildRetrievedContextBlock` lines 215–222)

- [ ] **Step 1: Read the affected area of the file**

Read `lib/ai/prompts.ts` lines 177–230 to confirm exact current content.

- [ ] **Step 2: Update `buildProjectMaterialsBlock` — files section**

Find:
```typescript
  if (grouped['file']) {
    lines.push('Files:')
    for (const m of grouped['file']) {
      lines.push(`- ${m.file_name ?? 'Unnamed file'}`)
      if (m.content) lines.push(`  ${m.content.slice(0, 500)}`)
    }
  }
```

Replace with:
```typescript
  if (grouped['file']) {
    lines.push('Files (full content searchable via retrieval — relevant passages will appear below):')
    for (const m of grouped['file']) {
      const label = m.title ?? m.file_name ?? 'Unnamed file'
      lines.push(`- ${label}`)
    }
  }
```

- [ ] **Step 3: Update `buildRetrievedContextBlock` — add chunk attribution**

Find:
```typescript
function buildRetrievedContextBlock(items: RetrievedContext[]): string {
  if (items.length === 0) return ''
  return items.map((item) => {
    const typeLabel = item.type.replace(/_/g, ' ')
    const title = item.title ? item.title : 'Untitled'
    return `[${typeLabel}] ${title}\n${item.summary}`
  }).join('\n\n')
}
```

Replace with:
```typescript
function buildRetrievedContextBlock(items: RetrievedContext[]): string {
  if (items.length === 0) return ''
  return items.map((item) => {
    if (item.type === 'project_material_chunk') {
      const meta = item.metadata as {
        chunk_index?: number
        total_chunks?: number
        material_title?: string
      }
      const chunkLabel = meta.chunk_index != null && meta.total_chunks != null
        ? `, chunk ${meta.chunk_index + 1}/${meta.total_chunks}`
        : ''
      const title = meta.material_title ?? item.title ?? 'Untitled'
      return `[file: ${title}${chunkLabel}]\n${item.summary}`
    }
    const typeLabel = item.type.replace(/_/g, ' ')
    const title = item.title ?? 'Untitled'
    return `[${typeLabel}] ${title}\n${item.summary}`
  }).join('\n\n')
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat: show file titles only in materials block, add chunk attribution in retrieved context"
```

---

## Task 7: Raise retrieval limits in both chat routes

**Files:**
- Modify: `app/api/chat/sessions/[id]/messages/route.ts` (line ~205)
- Modify: `app/api/generate/session/route.ts` (line ~107)

- [ ] **Step 1: Update chat messages route**

In `app/api/chat/sessions/[id]/messages/route.ts`, find:
```typescript
      retrieveRelevantDocuments({
        query: content,
        organizationId: org.id,
        userId: user.id,
        projectId: session.project_id ?? undefined,
        limit: 5,
      }),
```

Replace `limit: 5` with `limit: 15`.

- [ ] **Step 2: Update generate session route**

In `app/api/generate/session/route.ts`, find:
```typescript
        ? retrieveRelevantDocuments({
            query: firstUserMessage,
            organizationId: org.id,
            userId: user.id,
            projectId,
            limit: 5,
          })
```

Replace `limit: 5` with `limit: 10`.

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/sessions/[id]/messages/route.ts app/api/generate/session/route.ts
git commit -m "feat: raise retrieval limits to 15 (chat) and 10 (generate) for transcript coverage"
```

---

## Task 8: Backfill endpoint

**Files:**
- Create: `app/api/projects/[id]/materials/reindex/route.ts`

- [ ] **Step 1: Check the directory exists**

```bash
ls app/api/projects/[id]/materials/
```

Expected: you see `upload/` directory. Create `reindex/` folder next.

- [ ] **Step 2: Create the route**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getProjectMaterials } from '@/lib/queries/project-materials'
import { indexMaterialChunks } from '@/lib/indexing/chunk-material'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: projectId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const materials = await getProjectMaterials(projectId, org.id)

    const fileMaterials = materials.filter(
      (m) => m.material_type === 'file' && m.content && m.content.length >= 200,
    )

    // Fire-and-forget: kick off indexing and return immediately
    Promise.all(
      fileMaterials.map((m) =>
        indexMaterialChunks(
          {
            id: m.id,
            content: m.content ?? null,
            title: m.title ?? null,
            file_name: m.file_name ?? null,
            project_id: projectId,
            material_type: m.material_type,
            created_by: m.created_by,
          },
          org.id,
        ).catch((err) =>
          console.error(`[materials/reindex] Failed for material ${m.id}:`, err),
        ),
      ),
    ).catch((err) => console.error('[materials/reindex] Batch failed:', err))

    return Response.json({
      message: `Reindexing ${fileMaterials.length} file material(s) in background`,
      count: fileMaterials.length,
    })
  } catch (error) {
    console.error('[materials/reindex POST]', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

Save to `app/api/projects/[id]/materials/reindex/route.ts`.

- [ ] **Step 3: Check `created_by` is in the ProjectMaterialRow type**

Run:
```bash
grep -n 'created_by' lib/queries/project-materials.ts
```

If `created_by` is not in the SELECT_COLUMNS string, add it: change the SELECT_COLUMNS in `lib/queries/project-materials.ts` to include `created_by`. The current value is `'id, project_id, organization_id, created_by, material_type, title, content, file_url, file_name, file_mime, link_url, sort_order, created_at, updated_at'` — confirm `created_by` is already there.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/materials/reindex/route.ts
git commit -m "feat: add materials reindex endpoint for backfilling chunk embeddings"
```

---

## Task 9: Build verification

- [ ] **Step 1: Full build**

```bash
cd /Users/benb/Documents/OS/splyts-os
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with zero errors.

- [ ] **Step 2: Backfill existing transcripts**

For each project that has uploaded transcripts, call the reindex endpoint:

```bash
# Replace PROJECT_ID and get a valid auth token from the browser dev tools
curl -X POST https://your-app.vercel.app/api/projects/PROJECT_ID/materials/reindex \
  -H "Cookie: <your-session-cookie>"
```

Expected response:
```json
{ "message": "Reindexing 1 file material(s) in background", "count": 1 }
```

Wait ~30 seconds (embedding takes time), then test in Generate Chat:

```
Analyse the March 30 podcast and give me key points, a clean summary not missing anything, 
tell me what's relevant for Splyts, and tell me which of the 3 speakers is most interesting 
for me to talk to about Splyts.
```

Expected: the AI now receives multiple labelled excerpts like `[file: march_30_podcast.txt, chunk 4/64]` in its context and can synthesise a real analysis.

---

## Plan Self-Review

**Spec coverage check:**
- ✅ Chunked indexing at upload — Task 2 + 4
- ✅ content_type = 'project_material_chunk' — Task 2 + 3
- ✅ Delete old chunks before re-indexing — Task 2 (delete step in indexMaterialChunks)
- ✅ Retrieval includes chunks — Task 5
- ✅ Retrieval limit raised — Task 7
- ✅ buildProjectMaterialsBlock files → titles only — Task 6
- ✅ buildRetrievedContextBlock chunk attribution — Task 6
- ✅ fetchAllMaterialChunks — Task 5
- ✅ fetch_material_chunks RPC — Task 1
- ✅ Expression index for fast material_id lookup — Task 1
- ✅ Backfill endpoint — Task 8
- ✅ Build passes — Task 9

**Placeholder scan:** No TBDs, no "handle edge cases", all code blocks complete.

**Type consistency:** `MaterialForChunking` type defined in Task 2, used identically in Tasks 4 and 8. `fetchAllMaterialChunks` defined in Task 5, used in Task 9 testing. `RetrievedContext.metadata` accessed as typed cast in Task 6.
