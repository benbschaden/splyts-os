# Company Knowledge & Per-Field AI Suggest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add company knowledge file uploads (PDF/DOCX/MD/TXT), per-field AI suggestions that draw from those files and existing company context, and automatic conflict detection when uploaded docs contradict each other — all scoped to the company section only.

**Architecture:** Three isolated layers — (1) a `company_knowledge_files` table stores org-scoped uploads with extracted plain text, (2) server-only API routes handle upload, extraction, conflict detection, and per-field suggestion exclusively using this table, (3) per-field ✨ suggest UI wires into brand context, business plan, and product context forms. The knowledge table is strictly isolated: it is **never** queried by generate, chat, or any output-related endpoint. Uploads are never required — all company fields can be filled manually at any time.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + Storage), `@anthropic-ai/sdk` (already installed), `pdf-parse` (PDF extraction — new), `mammoth` (DOCX extraction — new), TypeScript strict, Zod

---

## Gherkin Scenarios

**File:** `docs/features/company-knowledge.md` (create alongside this plan)

```gherkin
Feature: Company knowledge uploads

  Scenario: Admin uploads a text-based PDF
    Given I am an admin on the company knowledge page
    When I upload a text-based PDF file under 50MB
    Then the file appears in the list with status "Processing"
    And after processing, status changes to "Ready"
    And I can see a text preview of the extracted content

  Scenario: Upload fails for unsupported file type
    Given I am on the company knowledge page
    When I try to upload a .xlsx file
    Then I see an error "Only PDF, DOCX, TXT, and MD files are supported"
    And no file is saved to the database

  Scenario: Conflict detected between two uploads
    Given I have uploaded "roadmap-v1.pdf" describing one set of priorities
    When I upload "roadmap-v2.pdf" with different strategic priorities
    Then a conflict appears in the conflicts panel
    And I can see which topics contradict and relevant excerpts from each doc
    And I can dismiss the conflict

  Scenario: Admin uses suggest on an empty field
    Given the mission field is empty
    And I have uploaded "business-plan.pdf"
    When I click the ✨ button next to Mission
    Then a suggestion appears below the field citing "business-plan.pdf"
    And I can click "Use this" to fill the field
    Or I can click "Dismiss" to close the suggestion without saving

  Scenario: Suggest works without any uploads
    Given no files have been uploaded
    And the company name and vision fields are filled
    When I click ✨ next to Mission
    Then a suggestion is generated from the other filled fields
    And no source citations appear

  Scenario: Non-admin sees files but cannot upload
    Given I am a non-admin team member
    When I visit the company knowledge page
    Then I see the uploaded files list
    And I do not see the upload button or delete buttons
```

---

## File Map

### Create (new files)
| File | Purpose |
|---|---|
| `supabase/migrations/20260328_company_knowledge.sql` | DB tables, RLS, storage bucket |
| `supabase/migrations/20260328_company_knowledge.md` | Migration companion doc (required by rules) |
| `docs/features/company-knowledge.md` | Gherkin scenarios |
| `lib/queries/company-knowledge.ts` | All DB queries for files and conflicts |
| `lib/company/extract-text.ts` | PDF/DOCX/TXT/MD text extraction |
| `lib/company/conflict-detect.ts` | Claude-based conflict detection between docs |
| `lib/company/suggest-field.ts` | Claude-based per-field suggestion |
| `app/api/company-knowledge/route.ts` | GET list of knowledge files for org |
| `app/api/company-knowledge/upload/route.ts` | POST: upload → extract → save → conflict check |
| `app/api/company-knowledge/[id]/route.ts` | DELETE a knowledge file |
| `app/api/company-knowledge/conflicts/route.ts` | GET active conflicts for org |
| `app/api/company-knowledge/conflicts/[id]/route.ts` | PATCH: dismiss a conflict |
| `app/api/company/suggest/route.ts` | POST: generate per-field suggestion |
| `components/company/knowledge-panel.tsx` | Upload zone + file list + conflicts panel |
| `components/company/field-suggest.tsx` | ✨ button + inline suggestion box |
| `app/dashboard/company/knowledge/page.tsx` | Company knowledge page |

### Modify (existing files)
| File | Change |
|---|---|
| `lib/types/database.ts` | Add `company_knowledge_files` and `company_knowledge_conflicts` types |
| `lib/ai/prompts.ts` | Add `buildSuggestFieldPrompt` and `buildConflictDetectPrompt` |
| `components/settings/brand-context-form.tsx` | Add `FieldSuggest` per field |
| `components/company/business-plan-form.tsx` | Add `FieldSuggest` per section |
| `components/company/product-context-form.tsx` | Add `FieldSuggest` per section |
| `components/company/company-nav.tsx` | Add "Knowledge" item under a new "Setup" group |
| `package.json` | Add `pdf-parse`, `mammoth`, `@types/pdf-parse` (`mammoth` includes its own types) |

---

## Task 1: Gherkin + Migration SQL + Companion Doc

**Files:**
- Create: `docs/features/company-knowledge.md`
- Create: `supabase/migrations/20260328_company_knowledge.sql`
- Create: `supabase/migrations/20260328_company_knowledge.md`

- [ ] **Step 1: Create the Gherkin feature file**

Create `docs/features/company-knowledge.md` with the scenarios from the Gherkin section above.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/20260328_company_knowledge.sql`:

```sql
-- Migration: Company Knowledge — org-scoped file uploads for AI field population
-- Isolated from all generate/chat endpoints. Never queried outside company/suggest routes.

-- 1. Storage bucket (private, 50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-knowledge',
  'company-knowledge',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can read/write only their org's files
CREATE POLICY "company_knowledge_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-knowledge'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. company_knowledge_files
CREATE TABLE company_knowledge_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,       -- Supabase Storage path (not a public URL)
  file_mime         TEXT NOT NULL,
  file_size_bytes   BIGINT,
  processed_text    TEXT,               -- extracted plain text; NULL until processing completes
  processing_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error  TEXT,              -- set only when processing_status = 'failed'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX company_knowledge_files_org_idx
  ON company_knowledge_files (organization_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER company_knowledge_files_updated_at
  BEFORE UPDATE ON company_knowledge_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE company_knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_knowledge_files_select"
  ON company_knowledge_files FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_insert"
  ON company_knowledge_files FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_update"
  ON company_knowledge_files FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_files_delete"
  ON company_knowledge_files FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- 3. company_knowledge_conflicts
CREATE TABLE company_knowledge_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_id_a       UUID NOT NULL REFERENCES company_knowledge_files(id) ON DELETE CASCADE,
  file_id_b       UUID NOT NULL REFERENCES company_knowledge_files(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,    -- e.g. 'vision', 'roadmap', 'target audience'
  description     TEXT NOT NULL,    -- human-readable explanation of the contradiction
  excerpt_a       TEXT,             -- relevant excerpt from file A (max ~500 chars)
  excerpt_b       TEXT,             -- relevant excerpt from file B (max ~500 chars)
  dismissed_at    TIMESTAMPTZ,      -- NULL = active conflict; set when user dismisses
  dismissed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX company_knowledge_conflicts_org_idx
  ON company_knowledge_conflicts (organization_id);

CREATE INDEX company_knowledge_conflicts_files_idx
  ON company_knowledge_conflicts (file_id_a, file_id_b);

ALTER TABLE company_knowledge_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_knowledge_conflicts_select"
  ON company_knowledge_conflicts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_conflicts_insert"
  ON company_knowledge_conflicts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "company_knowledge_conflicts_update"
  ON company_knowledge_conflicts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 3: Write the companion markdown**

Create `supabase/migrations/20260328_company_knowledge.md`:

```markdown
# 20260328_company_knowledge

## Summary
Adds `company_knowledge_files` and `company_knowledge_conflicts` tables plus a private
`company-knowledge` Supabase Storage bucket. These are strictly isolated from all generate
and chat endpoints — they are only queried from the company section suggest routes.

## Gherkin specs
See `docs/features/company-knowledge.md`

## ADRs
- **No vector embeddings in V1**: files are short enough (< 10 per org typically) that
  sending full extracted text to Claude is simpler, more accurate, and avoids an
  OpenAI API key dependency. Embeddings can be added in a future migration if needed.
- **Conflict stored as rows**: detected conflicts are persisted so they survive page refreshes
  and can be dismissed independently, not regenerated on every page load.
- **Isolation enforced at query layer**: the `search_company_knowledge_by_embedding` RPC
  (if added later) must never be called from generate or chat routes. The only consumer
  is `app/api/company/suggest/route.ts`.

## Design notes
- `processing_status` FSM: `pending → processing → ready | failed`
- `deleted_at` is soft-delete; queries always filter `WHERE deleted_at IS NULL`
- `file_url` stores the Supabase Storage path, not a public URL (signed URLs generated on demand)
- Conflicts link to specific files via `file_id_a` / `file_id_b`; they cascade-delete if either
  file is deleted
- `dismissed_at` NULL = active conflict; set = user has dismissed it
```

- [ ] **Step 4: Apply the migration**

```bash
cd /Users/benb/Documents/OS/splyts-os
npx supabase db push
```

Expected: migration applies without errors.

---

## Task 2: Install Dependencies + Text Extraction Lib

**Files:**
- Modify: `package.json` (via npm install)
- Create: `lib/company/extract-text.ts`

- [ ] **Step 1: Install packages**

`mammoth` ships its own TypeScript declarations — no `@types/mammoth` package exists on npm. Only `@types/pdf-parse` is needed:

```bash
cd /Users/benb/Documents/OS/splyts-os
npm install pdf-parse mammoth
npm install --save-dev @types/pdf-parse
```

- [ ] **Step 2: Create `lib/company/extract-text.ts`**

```typescript
// Import pdf-parse from its lib file directly to avoid Next.js module
// initialization issue where the package tries to read test files on import.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

export type SupportedMime =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown'

export const SUPPORTED_MIMES = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

export const MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
}

export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

/**
 * Extracts plain text from a file buffer.
 * Throws if the MIME type is unsupported or extraction fails.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer)
    const text = data.text?.trim() ?? ''
    if (!text) throw new Error('PDF appears to be image-based (scanned). Only text-based PDFs are supported.')
    return text
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8').trim()
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
```

---

## Task 3: Add Types to `lib/types/database.ts`

**Files:**
- Modify: `lib/types/database.ts`

> Note: Per repo rules the preferred approach is `supabase gen types typescript --local > lib/types/database.ts`, but since the local Supabase instance may not be running, add the types manually. They must match the migration SQL exactly.

- [ ] **Step 1: Read `lib/types/database.ts` and find the `Tables` section**

Locate the `Tables` block inside `Database['public']`. Add the two new table entries inside it, alongside the other table definitions.

- [ ] **Step 2: Add `company_knowledge_files` type**

Add this inside the `Tables` block:

```typescript
company_knowledge_files: {
  Row: {
    id: string
    organization_id: string
    created_by: string
    file_name: string
    file_url: string
    file_mime: string
    file_size_bytes: number | null
    processed_text: string | null
    processing_status: 'pending' | 'processing' | 'ready' | 'failed'
    processing_error: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
  }
  Insert: {
    id?: string
    organization_id: string
    created_by: string
    file_name: string
    file_url: string
    file_mime: string
    file_size_bytes?: number | null
    processed_text?: string | null
    processing_status?: 'pending' | 'processing' | 'ready' | 'failed'
    processing_error?: string | null
    created_at?: string
    updated_at?: string
    deleted_at?: string | null
  }
  Update: {
    id?: string
    organization_id?: string
    created_by?: string
    file_name?: string
    file_url?: string
    file_mime?: string
    file_size_bytes?: number | null
    processed_text?: string | null
    processing_status?: 'pending' | 'processing' | 'ready' | 'failed'
    processing_error?: string | null
    created_at?: string
    updated_at?: string
    deleted_at?: string | null
  }
  Relationships: [
    { foreignKeyName: "company_knowledge_files_organization_id_fkey"; columns: ["organization_id"]; referencedRelation: "organizations"; referencedColumns: ["id"] }
  ]
}
```

- [ ] **Step 3: Add `company_knowledge_conflicts` type**

Add this inside the `Tables` block:

```typescript
company_knowledge_conflicts: {
  Row: {
    id: string
    organization_id: string
    file_id_a: string
    file_id_b: string
    topic: string
    description: string
    excerpt_a: string | null
    excerpt_b: string | null
    dismissed_at: string | null
    dismissed_by: string | null
    created_at: string
  }
  Insert: {
    id?: string
    organization_id: string
    file_id_a: string
    file_id_b: string
    topic: string
    description: string
    excerpt_a?: string | null
    excerpt_b?: string | null
    dismissed_at?: string | null
    dismissed_by?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    organization_id?: string
    file_id_a?: string
    file_id_b?: string
    topic?: string
    description?: string
    excerpt_a?: string | null
    excerpt_b?: string | null
    dismissed_at?: string | null
    dismissed_by?: string | null
    created_at?: string
  }
  Relationships: [
    { foreignKeyName: "company_knowledge_conflicts_organization_id_fkey"; columns: ["organization_id"]; referencedRelation: "organizations"; referencedColumns: ["id"] },
    { foreignKeyName: "company_knowledge_conflicts_file_id_a_fkey"; columns: ["file_id_a"]; referencedRelation: "company_knowledge_files"; referencedColumns: ["id"] },
    { foreignKeyName: "company_knowledge_conflicts_file_id_b_fkey"; columns: ["file_id_b"]; referencedRelation: "company_knowledge_files"; referencedColumns: ["id"] }
  ]
}
```

---

## Task 4: DB Query Functions

**Files:**
- Create: `lib/queries/company-knowledge.ts`

- [ ] **Step 1: Create the query file**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type KnowledgeFileRow = Database['public']['Tables']['company_knowledge_files']['Row']
export type KnowledgeConflictRow = Database['public']['Tables']['company_knowledge_conflicts']['Row']

export type KnowledgeConflictWithFileNames = KnowledgeConflictRow & {
  file_name_a: string
  file_name_b: string
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function listKnowledgeFiles(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_name, file_mime, file_size_bytes, processing_status, processing_error, created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
}

export async function getKnowledgeFilesWithText(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_name, processed_text')
    .eq('organization_id', organizationId)
    .eq('processing_status', 'ready')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
}

export async function createKnowledgeFile(
  supabase: SupabaseClient<Database>,
  input: {
    organizationId: string
    createdBy: string
    fileName: string
    fileUrl: string
    fileMime: string
    fileSizeBytes: number
  },
) {
  return supabase
    .from('company_knowledge_files')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_mime: input.fileMime,
      file_size_bytes: input.fileSizeBytes,
      processing_status: 'processing',
    })
    .select('id, file_name, file_mime, file_size_bytes, processing_status, created_at')
    .single()
}

export async function updateKnowledgeFileProcessed(
  supabase: SupabaseClient<Database>,
  fileId: string,
  processedText: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ processed_text: processedText, processing_status: 'ready' })
    .eq('id', fileId)
    .select('id, file_name, file_mime, file_size_bytes, processing_status, created_at')
    .single()
}

export async function updateKnowledgeFileFailed(
  supabase: SupabaseClient<Database>,
  fileId: string,
  processingError: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ processing_status: 'failed', processing_error: processingError })
    .eq('id', fileId)
}

export async function getKnowledgeFileById(
  supabase: SupabaseClient<Database>,
  fileId: string,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .select('id, file_url, file_name, processing_status')
    .eq('id', fileId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()
}

export async function softDeleteKnowledgeFile(
  supabase: SupabaseClient<Database>,
  fileId: string,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
}

// ─── Conflicts ────────────────────────────────────────────────────────────────

export async function listActiveConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  return supabase
    .from('company_knowledge_conflicts')
    .select(`
      id, organization_id, file_id_a, file_id_b, topic, description,
      excerpt_a, excerpt_b, dismissed_at, created_at,
      file_a:company_knowledge_files!company_knowledge_conflicts_file_id_a_fkey(file_name),
      file_b:company_knowledge_files!company_knowledge_conflicts_file_id_b_fkey(file_name)
    `)
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
}

export async function countActiveConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<number> {
  const { count } = await supabase
    .from('company_knowledge_conflicts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
  return count ?? 0
}

export async function createConflicts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  fileIdA: string,
  fileIdB: string,
  conflicts: Array<{ topic: string; description: string; excerpt_a: string | null; excerpt_b: string | null }>,
) {
  if (conflicts.length === 0) return { error: null }
  const rows = conflicts.map((c) => ({
    organization_id: organizationId,
    file_id_a: fileIdA,
    file_id_b: fileIdB,
    topic: c.topic,
    description: c.description,
    excerpt_a: c.excerpt_a,
    excerpt_b: c.excerpt_b,
  }))
  return supabase.from('company_knowledge_conflicts').insert(rows)
}

export async function deleteConflictsForFilePair(
  supabase: SupabaseClient<Database>,
  fileIdA: string,
  fileIdB: string,
) {
  // Delete in both orderings since we always store A < B alphabetically
  await supabase
    .from('company_knowledge_conflicts')
    .delete()
    .eq('file_id_a', fileIdA)
    .eq('file_id_b', fileIdB)
  await supabase
    .from('company_knowledge_conflicts')
    .delete()
    .eq('file_id_a', fileIdB)
    .eq('file_id_b', fileIdA)
}

export async function dismissConflict(
  supabase: SupabaseClient<Database>,
  conflictId: string,
  organizationId: string,
  dismissedBy: string,
) {
  return supabase
    .from('company_knowledge_conflicts')
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by: dismissedBy,
    })
    .eq('id', conflictId)
    .eq('organization_id', organizationId)
    .is('dismissed_at', null)
    .select('id')
    .single()
}
```

---

## Task 5: Add Prompts to `lib/ai/prompts.ts`

**Files:**
- Modify: `lib/ai/prompts.ts` (append to the end of the file)

- [ ] **Step 1: Read `lib/ai/prompts.ts` to find the end of the file, then append**

Add the following two exported functions at the end of `lib/ai/prompts.ts`:

```typescript
// ─── Company Knowledge: Conflict Detection ────────────────────────────────────

export interface KnowledgeDoc {
  fileName: string
  text: string
}

/**
 * Prompt asking Claude to identify contradictions between a set of uploaded documents.
 * Returns a JSON array of conflict objects.
 */
export function buildConflictDetectPrompt(docs: KnowledgeDoc[]): string {
  const docBlocks = docs
    .map((d, i) => `DOCUMENT ${i + 1} — ${d.fileName}:\n${d.text.slice(0, 10000)}`)
    .join('\n\n---\n\n')

  return `You are reviewing a set of company documents to identify contradictions.

${docBlocks}

---

Identify any direct contradictions between these documents on topics such as:
- Company vision or long-term direction
- Strategic roadmap or priorities
- Target audience or market positioning
- Mission or company purpose
- Product capabilities or features
- Goals or success metrics

For each contradiction found, return a JSON object. If no contradictions are found, return an empty array.

Respond ONLY with a valid JSON array — no explanation, no markdown, no code fences:

[
  {
    "topic": "short topic name (e.g. 'roadmap', 'target audience')",
    "description": "One or two sentences explaining the contradiction clearly",
    "excerpt_a": "Relevant quote from ${docs[0]?.fileName ?? 'Document 1'} (max 300 chars)",
    "excerpt_b": "Relevant quote from the other document (max 300 chars)",
    "file_name_a": "${docs[0]?.fileName ?? 'Document 1'}",
    "file_name_b": "name of the other document"
  }
]`
}

// ─── Company Knowledge: Per-Field Suggestion ──────────────────────────────────

export interface FieldSuggestContext {
  fieldKey: string
  fieldLabel: string
  fieldHint: string
  currentFormValues: Record<string, string>
  knowledgeDocs: KnowledgeDoc[]
  hasActiveConflicts: boolean
}

/**
 * Prompt asking Claude to draft a value for a specific company profile field.
 * Claude is given the current form state plus any uploaded knowledge documents.
 */
export function buildSuggestFieldPrompt(ctx: FieldSuggestContext): string {
  const otherFields = Object.entries(ctx.currentFormValues)
    .filter(([k, v]) => k !== ctx.fieldKey && v?.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join('\n')

  const docsBlock = ctx.knowledgeDocs.length > 0
    ? ctx.knowledgeDocs
        .map((d) => `--- ${d.fileName} ---\n${d.text.slice(0, 8000)}`)
        .join('\n\n')
    : null

  const conflictNote = ctx.hasActiveConflicts
    ? '\nIMPORTANT: Conflicting information has been detected in the uploaded documents. ' +
      'If this topic is affected by a conflict, start your response with: ' +
      '[Conflict detected — verify with your team before accepting]\n'
    : ''

  return `You are helping a company fill in their company profile.

FIELD TO DRAFT: ${ctx.fieldLabel}
PURPOSE: ${ctx.fieldHint}
${conflictNote}
${otherFields ? `EXISTING COMPANY CONTEXT:\n${otherFields}\n` : ''}
${docsBlock ? `UPLOADED COMPANY DOCUMENTS:\n${docsBlock}\n` : ''}
---

Write a concise, specific value for the "${ctx.fieldLabel}" field. Requirements:
- Be specific to this company, not generic
- Match the expected format (a few sentences for narrative fields, comma-separated for lists)
- Reflect what you learned from the documents and context above
- Do NOT include any preamble, explanation, or label — only the field value itself

Respond with ONLY the field value.`
}
```

---

## Task 6: Conflict Detection Lib

**Files:**
- Create: `lib/company/conflict-detect.ts`

- [ ] **Step 1: Create the file**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildConflictDetectPrompt, type KnowledgeDoc } from '@/lib/ai/prompts'

export interface DetectedConflict {
  topic: string
  description: string
  excerpt_a: string | null
  excerpt_b: string | null
  file_name_a: string
  file_name_b: string
}

const ConflictSchema = {
  isValidArray(raw: unknown): raw is DetectedConflict[] {
    if (!Array.isArray(raw)) return false
    return raw.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).topic === 'string' &&
        typeof (item as Record<string, unknown>).description === 'string',
    )
  },
}

/**
 * Runs a Claude call to detect contradictions between the provided documents.
 * Returns an array of conflicts (may be empty if no contradictions found).
 * Only called from the upload route after text extraction succeeds.
 *
 * ISOLATION: This function must only be called from company-knowledge routes.
 * Never call from generate, chat, or output-related routes.
 */
export async function detectConflicts(docs: KnowledgeDoc[]): Promise<DetectedConflict[]> {
  if (docs.length < 2) return []

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[conflict-detect] ANTHROPIC_API_KEY not set')
    return []
  }

  const anthropic = new Anthropic({ apiKey })
  const prompt = buildConflictDetectPrompt(docs)

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const textBlock = message.content.find((b) => b.type === 'text')
    raw = textBlock?.type === 'text' ? textBlock.text.trim() : '[]'
  } catch (err) {
    console.error('[conflict-detect] Claude call failed:', err)
    return []
  }

  let parsed: unknown
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[conflict-detect] Could not parse Claude response as JSON:', raw)
    return []
  }

  if (!ConflictSchema.isValidArray(parsed)) {
    console.error('[conflict-detect] Unexpected response shape:', parsed)
    return []
  }

  return parsed.map((c) => ({
    topic: c.topic,
    description: c.description,
    excerpt_a: c.excerpt_a ?? null,
    excerpt_b: c.excerpt_b ?? null,
    file_name_a: c.file_name_a,
    file_name_b: c.file_name_b,
  }))
}
```

---

## Task 7: Field Suggestion Lib

**Files:**
- Create: `lib/company/suggest-field.ts`

- [ ] **Step 1: Create the file**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from '@/lib/ai/models'
import { buildSuggestFieldPrompt, type KnowledgeDoc } from '@/lib/ai/prompts'

export interface SuggestFieldInput {
  fieldKey: string
  fieldLabel: string
  fieldHint: string
  currentFormValues: Record<string, string>
  knowledgeDocs: KnowledgeDoc[]
  hasActiveConflicts: boolean
}

export interface SuggestFieldResult {
  suggestion: string
  sources: string[]  // file names of knowledge docs that were included
}

/**
 * Calls Claude to draft a value for a specific company profile field.
 *
 * ISOLATION: Only called from app/api/company/suggest/route.ts.
 * Never called from generate, chat, or output-related routes.
 */
export async function suggestField(input: SuggestFieldInput): Promise<SuggestFieldResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey })
  const prompt = buildSuggestFieldPrompt(input)

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL.id,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return {
    suggestion: textBlock.text.trim(),
    sources: input.knowledgeDocs.map((d) => d.fileName),
  }
}
```

---

## Task 8: Upload API Route

**Files:**
- Create: `app/api/company-knowledge/upload/route.ts`

This is the most complex route — it chains storage upload → text extraction → DB save → conflict detection.

- [ ] **Step 1: Create the route**

```typescript
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  createKnowledgeFile,
  updateKnowledgeFileProcessed,
  updateKnowledgeFileFailed,
  getKnowledgeFilesWithText,
  createConflicts,
  deleteConflictsForFilePair,
} from '@/lib/queries/company-knowledge'
import { extractText, SUPPORTED_MIMES, MIME_TO_EXT } from '@/lib/company/extract-text'
import { detectConflicts } from '@/lib/company/conflict-detect'

const BUCKET = 'company-knowledge'
const MAX_BYTES = 52_428_800 // 50 MiB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }

    if (!SUPPORTED_MIMES.has(file.type)) {
      return Response.json(
        { error: 'Only PDF, DOCX, TXT, and MD files are supported' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File must be 50MB or smaller' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type] ?? 'bin'
    const storagePath = `${org.id}/${randomUUID()}.${ext}`

    // 1. Upload raw file to storage
    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[company-knowledge/upload] Storage upload:', uploadError)
      return Response.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // 2. Create DB record immediately (status: processing) so UI can show it
    const { data: fileRecord, error: insertError } = await createKnowledgeFile(service, {
      organizationId: org.id,
      createdBy: user.id,
      fileName: file.name || 'upload',
      fileUrl: storagePath,
      fileMime: file.type,
      fileSizeBytes: file.size,
    })

    if (insertError || !fileRecord) {
      console.error('[company-knowledge/upload] DB insert:', insertError)
      return Response.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    // 3. Extract text
    const buffer = Buffer.from(await file.arrayBuffer())
    let processedText: string
    try {
      processedText = await extractText(buffer, file.type)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text extraction failed'
      await updateKnowledgeFileFailed(service, fileRecord.id, message)
      // Return the file record with failed status — don't 500 the whole request
      return Response.json(
        { file: { ...fileRecord, processing_status: 'failed', processing_error: message } },
        { status: 201 },
      )
    }

    // 4. Save extracted text, mark ready
    const { data: readyFile, error: updateError } = await updateKnowledgeFileProcessed(
      service,
      fileRecord.id,
      processedText,
    )

    if (updateError || !readyFile) {
      console.error('[company-knowledge/upload] DB update:', updateError)
      return Response.json({ error: 'Failed to finalize file' }, { status: 500 })
    }

    // 5. Run conflict detection against all other ready files for this org
    // This is synchronous — the response waits for it so conflicts show immediately.
    try {
      const { data: existingFiles } = await getKnowledgeFilesWithText(service, org.id)
      const otherFiles = (existingFiles ?? []).filter((f) => f.id !== fileRecord.id)

      if (otherFiles.length > 0) {
        const allDocs = [
          { fileName: readyFile.file_name, text: processedText },
          ...otherFiles
            .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
            .map((f) => ({ fileName: f.file_name, text: f.processed_text })),
        ]

        const conflicts = await detectConflicts(allDocs)

        // For each conflict pair involving the new file, clear old conflicts first
        const involvedOthers = new Set(
          conflicts.flatMap((c) => {
            const other = otherFiles.find(
              (f) => f.file_name === c.file_name_a || f.file_name === c.file_name_b,
            )
            return other ? [other.id] : []
          }),
        )
        for (const otherId of involvedOthers) {
          await deleteConflictsForFilePair(service, fileRecord.id, otherId)
        }

        // Insert new conflicts (matched to correct file IDs by name)
        for (const conflict of conflicts) {
          const otherFile = otherFiles.find(
            (f) => f.file_name === conflict.file_name_a || f.file_name === conflict.file_name_b,
          )
          if (!otherFile) continue
          await createConflicts(service, org.id, fileRecord.id, otherFile.id, [
            {
              topic: conflict.topic,
              description: conflict.description,
              excerpt_a: conflict.excerpt_a,
              excerpt_b: conflict.excerpt_b,
            },
          ])
        }
      }
    } catch (err) {
      // Conflict detection failure must not block the upload response
      console.error('[company-knowledge/upload] Conflict detection error:', err)
    }

    return Response.json({ file: readyFile }, { status: 201 })
  } catch (err) {
    console.error('[company-knowledge/upload POST]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Task 9: List, Delete, and Conflict API Routes

**Files:**
- Create: `app/api/company-knowledge/route.ts`
- Create: `app/api/company-knowledge/[id]/route.ts`
- Create: `app/api/company-knowledge/conflicts/route.ts`
- Create: `app/api/company-knowledge/conflicts/[id]/route.ts`

- [ ] **Step 1: Create `app/api/company-knowledge/route.ts`** (GET list)

```typescript
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listKnowledgeFiles } from '@/lib/queries/company-knowledge'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { data: files, error } = await listKnowledgeFiles(supabase, org.id)
    if (error) {
      console.error('[company-knowledge GET]', error)
      return Response.json({ error: 'Failed to load files' }, { status: 500 })
    }

    return Response.json({ files: files ?? [] })
  } catch (err) {
    console.error('[company-knowledge GET]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/company-knowledge/[id]/route.ts`** (DELETE)

```typescript
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getKnowledgeFileById,
  softDeleteKnowledgeFile,
} from '@/lib/queries/company-knowledge'

const BUCKET = 'company-knowledge'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params

    // Fetch file_url before soft-deleting so we can remove from storage
    const { data: file } = await getKnowledgeFileById(supabase, id, org.id)
    if (!file) return Response.json({ error: 'Not found' }, { status: 404 })

    const service = createServiceClient()

    const { error } = await softDeleteKnowledgeFile(service, id, org.id)
    if (error) {
      console.error('[company-knowledge/[id] DELETE]', error)
      return Response.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    // Best-effort storage removal — don't fail if this errors
    service.storage.from(BUCKET).remove([file.file_url]).catch((err) => {
      console.error('[company-knowledge/[id] DELETE] Storage remove:', err)
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[company-knowledge/[id] DELETE]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/company-knowledge/conflicts/route.ts`** (GET)

```typescript
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listActiveConflicts } from '@/lib/queries/company-knowledge'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { data: conflicts, error } = await listActiveConflicts(supabase, org.id)
    if (error) {
      console.error('[company-knowledge/conflicts GET]', error)
      return Response.json({ error: 'Failed to load conflicts' }, { status: 500 })
    }

    return Response.json({ conflicts: conflicts ?? [] })
  } catch (err) {
    console.error('[company-knowledge/conflicts GET]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `app/api/company-knowledge/conflicts/[id]/route.ts`** (PATCH dismiss)

```typescript
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { dismissConflict } from '@/lib/queries/company-knowledge'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    if (org.role !== 'admin') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params
    const { data, error } = await dismissConflict(supabase, id, org.id, user.id)

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[company-knowledge/conflicts/[id] PATCH]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Task 10: Per-Field Suggest API Route

**Files:**
- Create: `app/api/company/suggest/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getKnowledgeFilesWithText,
  countActiveConflicts,
} from '@/lib/queries/company-knowledge'
import { suggestField } from '@/lib/company/suggest-field'

const schema = z.object({
  field_key: z.string().min(1).max(100),
  field_label: z.string().min(1).max(200),
  field_hint: z.string().max(500).default(''),
  current_form_values: z.record(z.string(), z.string()),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { field_key, field_label, field_hint, current_form_values } = parsed.data

    const service = createServiceClient()

    // Fetch knowledge files (isolated — only used here)
    const [{ data: filesRaw }, conflictCount] = await Promise.all([
      getKnowledgeFilesWithText(service, org.id),
      countActiveConflicts(service, org.id),
    ])

    const knowledgeDocs = (filesRaw ?? [])
      .filter((f): f is typeof f & { processed_text: string } => f.processed_text !== null)
      .map((f) => ({ fileName: f.file_name, text: f.processed_text }))

    const result = await suggestField({
      fieldKey: field_key,
      fieldLabel: field_label,
      fieldHint: field_hint,
      currentFormValues: current_form_values,
      knowledgeDocs,
      hasActiveConflicts: conflictCount > 0,
    })

    return Response.json({
      suggestion: result.suggestion,
      sources: result.sources,
      has_conflicts: conflictCount > 0,
    })
  } catch (err) {
    console.error('[company/suggest POST]', err)
    return Response.json({ error: 'Suggestion failed. Please try again.' }, { status: 500 })
  }
}
```

---

## Task 11: Knowledge Panel UI Component

**Files:**
- Create: `components/company/knowledge-panel.tsx`

This component handles uploads, file list (with status badges), and conflicts panel.

- [ ] **Step 1: Create `components/company/knowledge-panel.tsx`**

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Trash2, AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeFile {
  id: string
  file_name: string
  file_mime: string
  file_size_bytes: number | null
  processing_status: 'pending' | 'processing' | 'ready' | 'failed'
  processing_error: string | null
  created_at: string
}

interface KnowledgeConflict {
  id: string
  topic: string
  description: string
  excerpt_a: string | null
  excerpt_b: string | null
  file_a: { file_name: string } | null
  file_b: { file_name: string } | null
  created_at: string
}

interface KnowledgePanelProps {
  initialFiles: KnowledgeFile[]
  initialConflicts: KnowledgeConflict[]
  isAdmin: boolean
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: KnowledgeFile['processing_status'] }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" /> Ready
      </span>
    )
  }
  if (status === 'processing' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Clock className="h-3 w-3" /> Processing…
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  )
}

export function KnowledgePanel({ initialFiles, initialConflicts, isAdmin }: KnowledgePanelProps) {
  const [files, setFiles] = useState<KnowledgeFile[]>(initialFiles)
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>(initialConflicts)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [conflictsOpen, setConflictsOpen] = useState(initialConflicts.length > 0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/company-knowledge/upload', {
      method: 'POST',
      body: formData,
    })

    setUploading(false)

    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }))
      setUploadError(body.error ?? 'Upload failed')
      return
    }

    const { file: newFile } = await res.json()
    setFiles((prev) => [newFile, ...prev])

    // Reload conflicts after upload (new conflicts may have been created)
    fetch('/api/company-knowledge/conflicts')
      .then((r) => r.json())
      .then(({ conflicts: fresh }) => {
        if (Array.isArray(fresh)) {
          setConflicts(fresh)
          if (fresh.length > 0) setConflictsOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handleDelete(fileId: string) {
    const res = await fetch(`/api/company-knowledge/${fileId}`, { method: 'DELETE' })
    if (!res.ok) return
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    // Remove conflicts involving this file
    setConflicts((prev) =>
      prev.filter((c) => {
        const aId = (c.file_a as unknown as { id?: string } | null)?.id
        const bId = (c.file_b as unknown as { id?: string } | null)?.id
        return aId !== fileId && bId !== fileId
      }),
    )
  }

  async function handleDismissConflict(conflictId: string) {
    const res = await fetch(`/api/company-knowledge/conflicts/${conflictId}`, {
      method: 'PATCH',
    })
    if (!res.ok) return
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Upload zone */}
      {isAdmin && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Upload company documents</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, DOCX, TXT, or MD · max 50MB · these files are only used to suggest field values
              and are never referenced in content generation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground',
                'hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload company knowledge file"
            />
          </div>

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-background">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <StatusBadge status={file.processing_status} />
                  {file.file_size_bytes && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size_bytes)}
                    </span>
                  )}
                  {file.processing_status === 'failed' && file.processing_error && (
                    <span className="text-xs text-destructive truncate max-w-[200px]">
                      {file.processing_error}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(file.id)}
                  aria-label={`Delete ${file.file_name}`}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdmin && (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        )
      )}

      {/* Conflicts panel */}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 overflow-hidden">
          <button
            onClick={() => setConflictsOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
              {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} detected in uploaded documents
            </span>
            {conflictsOpen ? (
              <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
          </button>

          {conflictsOpen && (
            <div className="divide-y divide-amber-200 dark:divide-amber-900 border-t border-amber-200 dark:border-amber-900">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        {conflict.topic}
                      </p>
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        {conflict.description}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDismissConflict(conflict.id)}
                        className="shrink-0 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                  {(conflict.excerpt_a || conflict.excerpt_b) && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {conflict.excerpt_a && (
                        <div className="rounded bg-amber-100 dark:bg-amber-900/40 p-2">
                          <p className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">
                            {conflict.file_a?.file_name}
                          </p>
                          <p className="text-amber-800 dark:text-amber-200 line-clamp-3">
                            {conflict.excerpt_a}
                          </p>
                        </div>
                      )}
                      {conflict.excerpt_b && (
                        <div className="rounded bg-amber-100 dark:bg-amber-900/40 p-2">
                          <p className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">
                            {conflict.file_b?.file_name}
                          </p>
                          <p className="text-amber-800 dark:text-amber-200 line-clamp-3">
                            {conflict.excerpt_b}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Task 12: Field Suggest UI Component

**Files:**
- Create: `components/company/field-suggest.tsx`

This file exports `SuggestState` type, `emptySuggestState()` factory, `SuggestButton` (the ✨ trigger), and `SuggestBox` (the suggestion preview). The parent form owns the state — no React state lives in this file.

- [ ] **Step 1: Create `components/company/field-suggest.tsx`**

```tsx
'use client'

import { Sparkles, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SuggestState = {
  loading: boolean
  suggestion: string | null
  sources: string[]
  hasConflicts: boolean
  error: string | null
}

export function emptySuggestState(): SuggestState {
  return { loading: false, suggestion: null, sources: [], hasConflicts: false, error: null }
}

interface SuggestButtonProps {
  loading: boolean
  onTrigger: () => void
  disabled?: boolean
  label: string
}

export function SuggestButton({ loading, onTrigger, disabled, label }: SuggestButtonProps) {
  return (
    <button
      type="button"
      onClick={onTrigger}
      disabled={disabled || loading}
      aria-label={`Suggest a value for ${label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        loading && 'animate-pulse',
      )}
    >
      <Sparkles className="h-3 w-3" />
      {loading ? 'Thinking…' : 'Suggest'}
    </button>
  )
}

interface SuggestBoxProps {
  state: SuggestState
  onAccept: (suggestion: string) => void
  onDismiss: () => void
}

export function SuggestBox({ state, onAccept, onDismiss }: SuggestBoxProps) {
  if (state.suggestion === null && !state.error) return null

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-2">
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : (
        <>
          {state.hasConflicts && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span aria-hidden="true">⚠</span>
              Conflicting documents detected — review the conflicts panel before accepting.
            </p>
          )}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {state.suggestion}
          </p>
          {state.sources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sources: {state.sources.join(', ')}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => state.suggestion !== null && onAccept(state.suggestion)}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
            >
              <Check className="h-3 w-3" />
              Use this
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

---

## Task 13: Wire Suggest into Brand Context Form

**Files:**
- Modify: `components/settings/brand-context-form.tsx`

The form manages suggest state as a `Record<fieldKey, SuggestState>`. `SuggestButton` renders in the label row; `SuggestBox` renders below each input.

- [ ] **Step 1: Read the full file before editing** (required by clean-changes rule)

- [ ] **Step 2: Add imports at the top of the file**

```typescript
import { SuggestButton, SuggestBox, type SuggestState, emptySuggestState } from '@/components/company/field-suggest'
```

- [ ] **Step 3: Move `allFields` declaration above the component function**

`allFields` is currently defined inside the `BrandContextForm` function body (around line 150, just before the `return`). Move it immediately after `OPTIONAL_FIELDS` so the `useState` initializer for `suggests` can reference it:

```typescript
// Move this to module scope, after OPTIONAL_FIELDS definition:
const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]
```

Then remove its original declaration from inside the function body.

- [ ] **Step 4: Add suggest state and handler inside `BrandContextForm`, after the existing `useState` calls**

```typescript
const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
  () => Object.fromEntries(allFields.map((f) => [f.key, emptySuggestState()])),
)

function setSuggest(key: string, update: Partial<SuggestState>) {
  setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
}

async function handleSuggest(field: typeof allFields[number]) {
  setSuggest(field.key, { loading: true, suggestion: null, error: null })
  const res = await fetch('/api/company/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_key: field.key,
      field_label: field.label,
      field_hint: field.hint,
      current_form_values: values,
    }),
  })
  if (!res.ok) {
    setSuggest(field.key, { loading: false, error: 'Suggestion failed. Try again.' })
    return
  }
  const data = await res.json()
  setSuggest(field.key, {
    loading: false,
    suggestion: data.suggestion,
    sources: data.sources ?? [],
    hasConflicts: data.has_conflicts ?? false,
  })
}
```

- [ ] **Step 5: Update the field render loop**

Replace the entire inner `return (...)` of the `allFields.map` callback with:

```tsx
return (
  <div key={field.key} className="space-y-1.5">
    <div className="flex items-baseline gap-2">
      <label
        htmlFor={field.key}
        className="text-sm font-medium text-foreground"
      >
        {field.label}
      </label>
      {isOptional && (
        <span className="text-xs text-muted-foreground">Optional</span>
      )}
      {isAdmin && (
        <SuggestButton
          loading={suggests[field.key].loading}
          onTrigger={() => handleSuggest(field)}
          disabled={saving}
          label={field.label}
        />
      )}
    </div>
    <p className="text-xs text-muted-foreground">{field.hint}</p>

    {field.multiline ? (
      <textarea
        id={field.key}
        value={value}
        onChange={(e) => set(field.key, e.target.value)}
        rows={3}
        disabled={!isAdmin || saving}
        readOnly={!isAdmin}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error ? 'border-destructive' : 'border-input',
        )}
      />
    ) : (
      <input
        id={field.key}
        type="text"
        value={value}
        onChange={(e) => set(field.key, e.target.value)}
        disabled={!isAdmin || saving}
        readOnly={!isAdmin}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error ? 'border-destructive' : 'border-input',
        )}
      />
    )}

    <SuggestBox
      state={suggests[field.key]}
      onAccept={(s) => { set(field.key, s); setSuggest(field.key, emptySuggestState()) }}
      onDismiss={() => setSuggest(field.key, emptySuggestState())}
    />

    {error && (
      <p className="text-xs text-destructive">{error}</p>
    )}
  </div>
)
```

## Task 14: Wire Suggest into Business Plan Form

**Files:**
- Modify: `components/company/business-plan-form.tsx`

The business plan uses an accordion. The suggest button goes next to the section title in the expanded panel header, and the suggestion box appears between the description and the textarea.

- [ ] **Step 1: Read the full file**

- [ ] **Step 2: Add import**

```typescript
import { SuggestButton, SuggestBox, SuggestState, emptySuggestState } from '@/components/company/field-suggest'
```

- [ ] **Step 3: Add suggests state**

After the existing `useState` calls, add:

```typescript
const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
  () => Object.fromEntries(BUSINESS_PLAN_SECTIONS.map((s) => [s.key, emptySuggestState()])),
)

function setSuggest(key: string, update: Partial<SuggestState>) {
  setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
}

async function handleSuggest(section: typeof BUSINESS_PLAN_SECTIONS[number]) {
  setSuggest(section.key, { loading: true, suggestion: null, error: null })
  const currentValues: Record<string, string> = {}
  BUSINESS_PLAN_SECTIONS.forEach((s) => {
    if ((sections[s.key] ?? '').trim()) currentValues[s.key] = sections[s.key]
  })
  const res = await fetch('/api/company/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_key: section.key,
      field_label: section.label,
      field_hint: section.description,
      current_form_values: currentValues,
    }),
  })
  if (!res.ok) {
    setSuggest(section.key, { loading: false, error: 'Suggestion failed. Try again.' })
    return
  }
  const data = await res.json()
  setSuggest(section.key, {
    loading: false,
    suggestion: data.suggestion,
    sources: data.sources ?? [],
    hasConflicts: data.has_conflicts ?? false,
  })
}
```

- [ ] **Step 4: Add suggest button to accordion trigger row and suggest box in expanded panel**

In the expanded panel (`{isExpanded && ...}`), add the suggest button to the panel header area alongside the existing description, and the suggest box between the description and the textarea:

```tsx
{isExpanded && (
  <div className="px-4 pb-4 pt-1">
    <div className="flex items-start justify-between gap-2 mb-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {section.description}
      </p>
      {isAdmin && (
        <SuggestButton
          loading={suggests[section.key].loading}
          onTrigger={() => handleSuggest(section)}
          disabled={saving}
          label={section.label}
        />
      )}
    </div>

    <SuggestBox
      state={suggests[section.key]}
      onAccept={(s) => {
        handleChange(section.key, s)
        setSuggest(section.key, emptySuggestState())
      }}
      onDismiss={() => setSuggest(section.key, emptySuggestState())}
    />

    {/* AI visibility toggle — unchanged */}
    {/* ... existing toggle code ... */}
    {/* Textarea — unchanged */}
  </div>
)}
```

---

## Task 15: Wire Suggest into Product Context Form

**Files:**
- Modify: `components/company/product-context-form.tsx`

Same pattern as brand context form. Product context uses `PRODUCT_SECTIONS` with `aiVisibleByDefault` split.

- [ ] **Step 1: Read the full file**

- [ ] **Step 2: Add import**

```typescript
import { SuggestButton, SuggestBox, SuggestState, emptySuggestState } from '@/components/company/field-suggest'
```

- [ ] **Step 3: Add suggests state and handler**

After existing `useState` calls (`PRODUCT_SECTIONS` is already imported at the top of the file — do not add it again):

```typescript
const allProductSections = [...PRODUCT_SECTIONS]
const [suggests, setSuggests] = useState<Record<string, SuggestState>>(
  () => Object.fromEntries(allProductSections.map((s) => [s.key, emptySuggestState()])),
)

function setSuggest(key: string, update: Partial<SuggestState>) {
  setSuggests((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }))
}

async function handleSuggest(section: typeof PRODUCT_SECTIONS[number]) {
  setSuggest(section.key, { loading: true, suggestion: null, error: null })
  const currentValues: Record<string, string> = {}
  allProductSections.forEach((s) => {
    if ((values[s.key] ?? '').trim()) currentValues[s.key] = values[s.key]
  })
  const res = await fetch('/api/company/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_key: section.key,
      field_label: section.label,
      field_hint: section.description,
      current_form_values: currentValues,
    }),
  })
  if (!res.ok) {
    setSuggest(section.key, { loading: false, error: 'Suggestion failed. Try again.' })
    return
  }
  const data = await res.json()
  setSuggest(section.key, {
    loading: false,
    suggestion: data.suggestion,
    sources: data.sources ?? [],
    hasConflicts: data.has_conflicts ?? false,
  })
}
```

- [ ] **Step 4: Add SuggestButton to label row and SuggestBox below each textarea**

For each section in both `aiVisible.map(...)` and `notVisible.map(...)`:

```tsx
<div key={section.key} className="space-y-1.5">
  <div className="flex items-baseline gap-2">
    <label htmlFor={section.key} className="text-sm font-medium text-foreground">
      {section.label}
    </label>
    {isAdmin && (
      <SuggestButton
        loading={suggests[section.key].loading}
        onTrigger={() => handleSuggest(section)}
        disabled={saving}
        label={section.label}
      />
    )}
  </div>
  <p className="text-xs text-muted-foreground">{section.description}</p>
  <textarea ... />
  <SuggestBox
    state={suggests[section.key]}
    onAccept={(s) => { set(section.key, s); setSuggest(section.key, emptySuggestState()) }}
    onDismiss={() => setSuggest(section.key, emptySuggestState())}
  />
</div>
```

---

## Task 16: Knowledge Page + Nav Update

**Files:**
- Create: `app/dashboard/company/knowledge/page.tsx`
- Modify: `components/company/company-nav.tsx`

- [ ] **Step 1: Create `app/dashboard/company/knowledge/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { listKnowledgeFiles, listActiveConflicts } from '@/lib/queries/company-knowledge'
import { KnowledgePanel } from '@/components/company/knowledge-panel'

export default async function CompanyKnowledgePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [{ data: files }, { data: conflicts }] = await Promise.all([
    listKnowledgeFiles(supabase, org.id),
    listActiveConflicts(supabase, org.id),
  ])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Company knowledge</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Upload existing company documents — business plans, brand guidelines, strategy decks.
          These are used only to suggest values for company profile fields and are never
          referenced in content generation.
        </p>
      </div>

      <KnowledgePanel
        initialFiles={files ?? []}
        initialConflicts={(conflicts ?? []) as Parameters<typeof KnowledgePanel>[0]['initialConflicts']}
        isAdmin={org.role === 'admin'}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update `components/company/company-nav.tsx`**

Add a new group at the top of `navGroups` (before "Strategy"):

```typescript
{
  label: 'Setup',
  items: [
    { name: 'Knowledge', href: '/dashboard/company/knowledge' },
  ],
},
```

---

## Task 17: Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/benb/Documents/OS/splyts-os
npx tsc --noEmit
```

Fix any type errors before proceeding.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: exits 0 with no errors. Fix any build errors.

- [ ] **Step 3: Verify key pages render**

If running locally (`npm run dev`):
- Navigate to `/dashboard/company/knowledge` — page loads, upload button visible for admin
- Navigate to `/dashboard/company/brand` — ✨ Suggest buttons visible next to each field label
- Navigate to `/dashboard/company/business-plan` — ✨ Suggest buttons visible in expanded accordion sections
- Navigate to `/dashboard/company/product` — ✨ Suggest buttons visible next to each section label

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add company knowledge uploads with per-field AI suggest and conflict detection"
```

---

## Key Isolation Reminder

The following functions are the **only** places that read `company_knowledge_files`:
- `lib/queries/company-knowledge.ts` — `getKnowledgeFilesWithText`, `listKnowledgeFiles`, etc.
- `app/api/company-knowledge/upload/route.ts` — for conflict detection
- `app/api/company/suggest/route.ts` — for field suggestion

Never add calls to `getKnowledgeFilesWithText` or any company knowledge query in:
- `app/api/generate/route.ts`
- `app/api/chat/` routes
- `lib/ai/prompts.ts` builders used by generate/chat
- Any retrieval/search function

This isolation is enforced by convention, not by code. If you're unsure whether a call belongs there, it doesn't.
