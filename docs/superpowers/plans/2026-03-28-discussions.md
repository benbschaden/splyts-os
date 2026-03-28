# Discussions System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete project-centric discussion system — multi-participant structured discussions anchored to projects and documents, with AI-powered resolution that extracts decisions/learnings/next-steps, and document generation from discussions.

**Architecture:** Discussions are a new first-class entity alongside projects, documents, and outputs. They are NOT the existing `chat_sessions` AI chat system. Discussions are team conversations anchored to a parent (project or document). They follow a create → message → resolve lifecycle. At resolution, AI compresses the conversation into structured outputs (summary, decisions, learnings, next steps). A document can be generated from any discussion. The system is built as a reusable `DiscussionsPanel` component that is dropped into the project page (replacing the "coming soon" placeholder) and the document viewer.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), Anthropic Claude, TypeScript strict, Zod validation, existing component patterns from `components/projects/` and `components/documents/`

---

## Codebase Context

Before starting, understand these existing patterns:

- **Auth pattern**: `createClient()` → `supabase.auth.getUser()` → `getOrganizationForUser(user.id)` → check membership
- **Query functions**: All in `lib/queries/<domain>.ts`, use `createServiceClient()`, always scope by `organization_id`
- **AI calls**: Always in API routes, prompts always in `lib/ai/prompts.ts`, model is `DEFAULT_MODEL` from `lib/ai/models`
- **Existing AI doc generation pattern**: See `app/api/chat/sessions/[id]/capture/route.ts` — same pattern for discussion doc creation
- **Project tabs**: `components/projects/project-detail.tsx` line 104 — `type Tab`, line 124 — `TABS`, line 486 — `{activeTab === 'chat' && (` — this is the "coming soon" block to replace
- **Document viewer**: `components/documents/document-viewer.tsx` — single-page viewer, needs a discussions tab added

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `docs/features/discussions.md` | Gherkin spec (required before code) |
| `supabase/migrations/20260330_discussions.sql` | 5 new tables + RLS |
| `supabase/migrations/20260330_discussions.md` | Migration companion doc |
| `lib/queries/discussions.ts` | All discussion query functions |
| `app/api/discussions/route.ts` | GET list + POST create |
| `app/api/discussions/[id]/route.ts` | GET detail + PATCH update |
| `app/api/discussions/[id]/messages/route.ts` | GET list + POST send |
| `app/api/discussions/[id]/resolve/preview/route.ts` | POST — AI generates draft resolution (no save) |
| `app/api/discussions/[id]/resolve/route.ts` | POST — save final resolution |
| `app/api/discussions/[id]/create-document/route.ts` | POST — AI generates doc + saves |
| `components/discussions/discussions-panel.tsx` | Container: list + detail side-by-side |
| `components/discussions/discussion-list.tsx` | List of discussions with filters |
| `components/discussions/create-discussion-dialog.tsx` | Create discussion dialog |
| `components/discussions/discussion-detail.tsx` | Selected discussion: messages + actions |
| `components/discussions/discussion-message-stream.tsx` | Message list rendering |
| `components/discussions/resolve-discussion-dialog.tsx` | AI resolution review + save flow |
| `components/discussions/create-doc-from-discussion-dialog.tsx` | AI doc generation flow |

### Modified files
| File | Change |
|------|--------|
| `lib/ai/prompts.ts` | Add `buildDiscussionResolutionPrompt` and `buildDiscussionDocumentPrompt` |
| `components/projects/project-detail.tsx` | Replace 'chat' tab "coming soon" with `<DiscussionsPanel>` |
| `components/documents/document-viewer.tsx` | Add Discussions tab |

---

## Task 1: Gherkin Spec

**Files:**
- Create: `docs/features/discussions.md`

- [ ] **Write the spec**

```markdown
# Feature: Discussions

## Scenario: Create a lightweight discussion on a project
  Given I am on a project page and click the Discussions tab
  When I click "New Discussion", enter a title, select Lightweight, and click Create
  Then the discussion appears in the list with status Active and mode Lightweight

## Scenario: Create a structured discussion
  Given I am on a project page
  When I create a discussion with mode Structured
  Then the discussion appears with a Structured badge

## Scenario: Send a message in a discussion
  Given I have an active discussion open
  When I type a message and click Send
  Then my message appears in the message stream with my name and timestamp

## Scenario: Promote lightweight discussion to structured
  Given I have an active lightweight discussion
  When I click "Make Structured"
  Then the mode badge changes to Structured

## Scenario: Resolve a discussion with AI
  Given I have an active discussion with at least one message
  When I click "Resolve"
  Then AI generates a summary, decisions, learnings, and next steps
  And I can edit those outputs before saving
  When I click "Save Resolution"
  Then the discussion status becomes Resolved
  And the summary, decisions, and learnings are displayed

## Scenario: View resolved discussions
  Given a project has active and resolved discussions
  When I view the discussions list
  Then active discussions show normally
  And resolved discussions appear visually distinct (compressed)
  And I can filter by Active or Resolved

## Scenario: Create a document from a discussion
  Given I have a discussion with at least one message
  When I click "Create Document" and choose a document type
  Then AI generates a document draft from the discussion messages
  And the document is saved as Shared visibility
  And a link appears in the discussion pointing to the new document

## Scenario: View discussions on a document
  Given I am viewing a document
  When I click the Discussions tab
  Then I see discussions anchored to this document
  And I can create, view, and resolve them the same as project discussions
```

- [ ] **Commit**
```bash
git add docs/features/discussions.md
git commit -m "docs: add discussions Gherkin spec"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260330_discussions.sql`
- Create: `supabase/migrations/20260330_discussions.md`

- [ ] **Write migration SQL**

```sql
-- ============================================================
-- Discussions System
-- ============================================================
-- Team conversations anchored to projects or documents.
-- Separate from chat_sessions (AI assistant chat).
-- Follows a create → message → resolve lifecycle.
-- AI extracts decisions/learnings/next-steps at resolution.
-- ============================================================

-- -------------------------------------------------------
-- 1. discussions
-- -------------------------------------------------------
CREATE TABLE discussions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_type     TEXT NOT NULL CHECK (parent_type IN ('project', 'document', 'section')),
  parent_id       UUID NOT NULL,
  section_key     TEXT,
  mode            TEXT NOT NULL DEFAULT 'lightweight'
                  CHECK (mode IN ('lightweight', 'structured')),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'resolved')),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_summary      TEXT,
  CONSTRAINT section_key_matches_parent CHECK (
    (parent_type = 'section') = (section_key IS NOT NULL)
  )
);

CREATE INDEX discussions_parent_idx
  ON discussions (organization_id, parent_type, parent_id, status);

CREATE TRIGGER discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussions_select" ON discussions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "discussions_insert" ON discussions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "discussions_update" ON discussions FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "discussions_delete" ON discussions FOR DELETE
  USING (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. discussion_messages
-- -------------------------------------------------------
CREATE TABLE discussion_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  content       TEXT NOT NULL,
  message_type  TEXT NOT NULL DEFAULT 'user'
                CHECK (message_type IN ('user', 'system')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX discussion_messages_idx
  ON discussion_messages (discussion_id, created_at)
  WHERE deleted_at IS NULL;

CREATE TRIGGER discussion_messages_updated_at
  BEFORE UPDATE ON discussion_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_messages_select" ON discussion_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND discussion_id IN (
      SELECT d.id FROM discussions d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "discussion_messages_insert" ON discussion_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND discussion_id IN (
      SELECT d.id FROM discussions d
      JOIN organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. discussion_decisions
-- -------------------------------------------------------
CREATE TABLE discussion_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_decisions_idx ON discussion_decisions (discussion_id);

ALTER TABLE discussion_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_decisions_select" ON discussion_decisions FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_decisions_insert" ON discussion_decisions FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 4. discussion_learnings
-- -------------------------------------------------------
CREATE TABLE discussion_learnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_learnings_idx ON discussion_learnings (discussion_id);

ALTER TABLE discussion_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_learnings_select" ON discussion_learnings FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_learnings_insert" ON discussion_learnings FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 5. discussion_next_steps
-- -------------------------------------------------------
CREATE TABLE discussion_next_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discussion_next_steps_idx ON discussion_next_steps (discussion_id);

ALTER TABLE discussion_next_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_next_steps_select" ON discussion_next_steps FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_next_steps_insert" ON discussion_next_steps FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_next_steps_update" ON discussion_next_steps FOR UPDATE
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- -------------------------------------------------------
-- 6. discussion_document_links
-- -------------------------------------------------------
CREATE TABLE discussion_document_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id     UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'created_from'
                    CHECK (relationship_type IN ('created_from', 'references')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, document_id)
);

CREATE INDEX discussion_doc_links_idx ON discussion_document_links (discussion_id);

ALTER TABLE discussion_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_doc_links_select" ON discussion_document_links FOR SELECT
  USING (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "discussion_doc_links_insert" ON discussion_document_links FOR INSERT
  WITH CHECK (discussion_id IN (
    SELECT d.id FROM discussions d
    JOIN organization_members om ON om.organization_id = d.organization_id
    WHERE om.user_id = auth.uid()
  ));
```

- [ ] **Write companion doc** (`20260330_discussions.md`)

```markdown
## Summary
Creates the discussions system: 6 new tables (discussions, discussion_messages, discussion_decisions, discussion_learnings, discussion_next_steps, discussion_document_links) with full RLS.

## Gherkin
docs/features/discussions.md

## ADRs
ADR-003: Discussions as project features, not standalone products

## Design notes
- `parent_type IN ('project', 'document', 'section')` — section uses section_key for business plan sections
- Participants derived from message authors — no separate participants table
- Decisions/learnings/next_steps are normalized tables, not JSONB — enables future querying
- RLS: org-member access. App layer enforces parent-level access (e.g. private projects)
- `discussion_document_links` links discussions to docs they created or reference
```

- [ ] **Commit**
```bash
git add supabase/migrations/20260330_discussions.sql supabase/migrations/20260330_discussions.md
git commit -m "chore: add discussions schema migration"
```

---

## Task 3: Query Functions

**Files:**
- Create: `lib/queries/discussions.ts`

- [ ] **Write the file**

```typescript
import { createServiceClient } from '@/lib/supabase/service'

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type DiscussionParentType = 'project' | 'document' | 'section'
export type DiscussionMode = 'lightweight' | 'structured'
export type DiscussionStatus = 'active' | 'resolved'

export interface DiscussionRow {
  id: string
  organization_id: string
  parent_type: DiscussionParentType
  parent_id: string
  section_key: string | null
  mode: DiscussionMode
  title: string
  status: DiscussionStatus
  created_by: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
  ai_summary: string | null
}

export interface DiscussionMessageRow {
  id: string
  discussion_id: string
  user_id: string
  content: string
  message_type: 'user' | 'system'
  created_at: string
  updated_at: string
}

export interface DiscussionDecisionRow {
  id: string
  discussion_id: string
  text: string
  sort_order: number
  created_at: string
}

export interface DiscussionLearningRow {
  id: string
  discussion_id: string
  text: string
  sort_order: number
  created_at: string
}

export interface DiscussionNextStepRow {
  id: string
  discussion_id: string
  text: string
  owner_id: string | null
  status: 'open' | 'done'
  sort_order: number
  created_at: string
}

export interface DiscussionDocumentLinkRow {
  id: string
  discussion_id: string
  document_id: string
  relationship_type: 'created_from' | 'references'
  created_at: string
}

export interface DiscussionResolutionData {
  decisions: DiscussionDecisionRow[]
  learnings: DiscussionLearningRow[]
  nextSteps: DiscussionNextStepRow[]
}

const DISCUSSION_SELECT =
  'id, organization_id, parent_type, parent_id, section_key, mode, title, status, created_by, created_at, updated_at, resolved_at, resolved_by, ai_summary'

// -------------------------------------------------------
// Discussions CRUD
// -------------------------------------------------------

export async function createDiscussion(input: {
  organizationId: string
  userId: string
  parentType: DiscussionParentType
  parentId: string
  sectionKey?: string
  mode: DiscussionMode
  title: string
}): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      parent_type: input.parentType,
      parent_id: input.parentId,
      section_key: input.sectionKey ?? null,
      mode: input.mode,
      title: input.title,
    })
    .select(DISCUSSION_SELECT)
    .single()
  if (error) return { discussion: null, error: 'Failed to create discussion' }
  return { discussion: data as DiscussionRow, error: null }
}

export async function getDiscussionById(
  id: string,
  organizationId: string,
): Promise<DiscussionRow | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .select(DISCUSSION_SELECT)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error || !data) return null
  return data as DiscussionRow
}

export async function getDiscussionsForParent(
  parentType: DiscussionParentType,
  parentId: string,
  organizationId: string,
  options?: { status?: DiscussionStatus | 'all'; sectionKey?: string },
): Promise<DiscussionRow[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from('discussions')
    .select(DISCUSSION_SELECT)
    .eq('organization_id', organizationId)
    .eq('parent_type', parentType)
    .eq('parent_id', parentId)
    .order('updated_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.sectionKey) {
    query = query.eq('section_key', options.sectionKey)
  }

  const { data, error } = await query
  if (error) return []
  return data as DiscussionRow[]
}

export async function updateDiscussion(
  id: string,
  organizationId: string,
  updates: Partial<Pick<DiscussionRow, 'title' | 'mode' | 'status'>>,
): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(DISCUSSION_SELECT)
    .single()
  if (error) return { discussion: null, error: 'Failed to update discussion' }
  return { discussion: data as DiscussionRow, error: null }
}

// -------------------------------------------------------
// Messages
// -------------------------------------------------------

export async function createDiscussionMessage(input: {
  discussionId: string
  userId: string
  content: string
  messageType?: 'user' | 'system'
}): Promise<{ message: DiscussionMessageRow | null; error: string | null }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_messages')
    .insert({
      discussion_id: input.discussionId,
      user_id: input.userId,
      content: input.content,
      message_type: input.messageType ?? 'user',
    })
    .select('id, discussion_id, user_id, content, message_type, created_at, updated_at')
    .single()
  if (error) return { message: null, error: 'Failed to send message' }
  // Bump discussion updated_at
  await supabase
    .from('discussions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.discussionId)
  return { message: data as DiscussionMessageRow, error: null }
}

export async function getDiscussionMessages(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionMessageRow[]> {
  // Verify discussion belongs to org before returning messages
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_messages')
    .select('id, discussion_id, user_id, content, message_type, created_at, updated_at')
    .eq('discussion_id', discussionId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) return []
  return data as DiscussionMessageRow[]
}

// -------------------------------------------------------
// Resolution
// -------------------------------------------------------

export async function resolveDiscussion(input: {
  id: string
  organizationId: string
  resolvedBy: string
  aiSummary: string
  decisions: string[]
  learnings: string[]
  nextSteps: Array<{ text: string; ownerId?: string }>
}): Promise<{ discussion: DiscussionRow | null; error: string | null }> {
  const supabase = createServiceClient()

  // 1. Update discussion to resolved
  const { data, error } = await supabase
    .from('discussions')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      ai_summary: input.aiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('organization_id', input.organizationId)
    .select(DISCUSSION_SELECT)
    .single()

  if (error || !data) return { discussion: null, error: 'Failed to resolve discussion' }

  // 2. Insert decisions
  if (input.decisions.length > 0) {
    await supabase.from('discussion_decisions').insert(
      input.decisions.map((text, i) => ({
        discussion_id: input.id,
        text,
        sort_order: i,
      })),
    )
  }

  // 3. Insert learnings
  if (input.learnings.length > 0) {
    await supabase.from('discussion_learnings').insert(
      input.learnings.map((text, i) => ({
        discussion_id: input.id,
        text,
        sort_order: i,
      })),
    )
  }

  // 4. Insert next steps
  if (input.nextSteps.length > 0) {
    await supabase.from('discussion_next_steps').insert(
      input.nextSteps.map((step, i) => ({
        discussion_id: input.id,
        text: step.text,
        owner_id: step.ownerId ?? null,
        sort_order: i,
      })),
    )
  }

  return { discussion: data as DiscussionRow, error: null }
}

export async function getDiscussionResolution(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionResolutionData | null> {
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return null

  const supabase = createServiceClient()
  const [decisionsRes, learningsRes, nextStepsRes] = await Promise.all([
    supabase
      .from('discussion_decisions')
      .select('id, discussion_id, text, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
    supabase
      .from('discussion_learnings')
      .select('id, discussion_id, text, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
    supabase
      .from('discussion_next_steps')
      .select('id, discussion_id, text, owner_id, status, sort_order, created_at')
      .eq('discussion_id', discussionId)
      .order('sort_order'),
  ])

  return {
    decisions: (decisionsRes.data ?? []) as DiscussionDecisionRow[],
    learnings: (learningsRes.data ?? []) as DiscussionLearningRow[],
    nextSteps: (nextStepsRes.data ?? []) as DiscussionNextStepRow[],
  }
}

// -------------------------------------------------------
// Document links
// -------------------------------------------------------

export async function createDiscussionDocumentLink(input: {
  discussionId: string
  documentId: string
  relationshipType: 'created_from' | 'references'
}): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('discussion_document_links').upsert(
    {
      discussion_id: input.discussionId,
      document_id: input.documentId,
      relationship_type: input.relationshipType,
    },
    { onConflict: 'discussion_id,document_id' },
  )
}

export async function getDiscussionDocumentLinks(
  discussionId: string,
  organizationId: string,
): Promise<DiscussionDocumentLinkRow[]> {
  const discussion = await getDiscussionById(discussionId, organizationId)
  if (!discussion) return []

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discussion_document_links')
    .select('id, discussion_id, document_id, relationship_type, created_at')
    .eq('discussion_id', discussionId)
    .order('created_at')
  if (error) return []
  return data as DiscussionDocumentLinkRow[]
}
```

- [ ] **Commit**
```bash
git add lib/queries/discussions.ts
git commit -m "feat: add discussion query functions"
```

---

## Task 4: AI Prompts

**Files:**
- Modify: `lib/ai/prompts.ts` (add two functions at the end of the file)

- [ ] **Add `buildDiscussionResolutionPrompt`**

```typescript
export function buildDiscussionResolutionPrompt(params: {
  title: string
  messageStream: string
}): string {
  return `You are analysing a team discussion to extract structured knowledge from it.

Discussion title: "${params.title}"

Messages:
${params.messageStream}

Extract the following from this discussion and respond with ONLY valid JSON — no markdown, no explanation, just the JSON object:

{
  "summary": "A concise 2-4 sentence summary of what was discussed and concluded.",
  "decisions": ["Decision 1", "Decision 2"],
  "learnings": ["Learning 1", "Learning 2"],
  "nextSteps": ["Action item 1", "Action item 2"]
}

Rules:
- summary: always present, 2-4 sentences
- decisions: concrete choices that were made; empty array [] if none
- learnings: insights, realisations, or knowledge gained; empty array [] if none  
- nextSteps: specific action items mentioned or implied; empty array [] if none
- Keep each item concise (one sentence)
- Do not fabricate items not present in the discussion`
}
```

- [ ] **Add `buildDiscussionDocumentPrompt`**

```typescript
export function buildDiscussionDocumentPrompt(params: {
  discussionTitle: string
  documentType: string
  messageStream: string
  orgName: string
}): string {
  return `You are drafting a ${params.documentType} document from a team discussion.

Organisation: ${params.orgName}
Discussion title: "${params.discussionTitle}"
Document type: ${params.documentType}

Discussion messages:
${params.messageStream}

Write a well-structured ${params.documentType} document that captures the key content, decisions, and insights from this discussion. The document should:
- Have a clear, informative title on the first line (as a # heading)
- Be structured with ## headings for major sections
- Include a brief summary or executive summary section
- Capture all key points, decisions, and recommendations discussed
- Be written in professional prose, not as a transcript
- Omit conversational filler, keep only the substance

Write the document now:`
}
```

- [ ] **Commit**
```bash
git add lib/ai/prompts.ts
git commit -m "feat: add discussion resolution and document generation prompts"
```

---

## Task 5: API Routes — Core CRUD + Messages

**Files:**
- Create: `app/api/discussions/route.ts`
- Create: `app/api/discussions/[id]/route.ts`
- Create: `app/api/discussions/[id]/messages/route.ts`

### `app/api/discussions/route.ts`

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  createDiscussion,
  getDiscussionsForParent,
  type DiscussionParentType,
  type DiscussionMode,
  type DiscussionStatus,
} from '@/lib/queries/discussions'

const CreateSchema = z.object({
  parent_type: z.enum(['project', 'document', 'section']),
  parent_id: z.string().uuid(),
  section_key: z.string().min(1).optional(),
  mode: z.enum(['lightweight', 'structured']),
  title: z.string().min(1).max(300),
})

const ListSchema = z.object({
  parent_type: z.enum(['project', 'document', 'section']),
  parent_id: z.string().uuid(),
  status: z.enum(['active', 'resolved', 'all']).optional().default('all'),
  section_key: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    const parsed = ListSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { parent_type, parent_id, status, section_key } = parsed.data
    const discussions = await getDiscussionsForParent(
      parent_type as DiscussionParentType,
      parent_id,
      org.id,
      { status: status as DiscussionStatus | 'all', sectionKey: section_key },
    )

    return Response.json({ discussions })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { parent_type, parent_id, section_key, mode, title } = parsed.data
    const { discussion, error } = await createDiscussion({
      organizationId: org.id,
      userId: user.id,
      parentType: parent_type as DiscussionParentType,
      parentId: parent_id,
      sectionKey: section_key,
      mode: mode as DiscussionMode,
      title,
    })

    if (error || !discussion) {
      return Response.json({ error: 'Failed to create discussion' }, { status: 500 })
    }

    return Response.json({ discussion }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### `app/api/discussions/[id]/route.ts`

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionResolution,
  updateDiscussion,
} from '@/lib/queries/discussions'

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  mode: z.enum(['lightweight', 'structured']).optional(),
}).refine((d) => d.title !== undefined || d.mode !== undefined, {
  message: 'At least one field required',
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const resolution = discussion.status === 'resolved'
      ? await getDiscussionResolution(id, org.id)
      : null

    return Response.json({ discussion, resolution })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const existing = await getDiscussionById(id, org.id)
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { discussion, error } = await updateDiscussion(id, org.id, parsed.data)
    if (error || !discussion) {
      return Response.json({ error: 'Failed to update discussion' }, { status: 500 })
    }

    return Response.json({ discussion })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### `app/api/discussions/[id]/messages/route.ts`

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionMessages,
  createDiscussionMessage,
} from '@/lib/queries/discussions'

const SendSchema = z.object({
  content: z.string().min(1).max(10000),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const messages = await getDiscussionMessages(id, org.id)
    return Response.json({ messages })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Cannot message a resolved discussion' }, { status: 422 })
    }

    const body = await request.json()
    const parsed = SendSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { message, error } = await createDiscussionMessage({
      discussionId: id,
      userId: user.id,
      content: parsed.data.content,
    })

    if (error || !message) {
      return Response.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return Response.json({ message }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Commit**
```bash
git add app/api/discussions/
git commit -m "feat: add discussions CRUD and messages API routes"
```

---

## Task 6: API Routes — Resolution

**Files:**
- Create: `app/api/discussions/[id]/resolve/preview/route.ts`
- Create: `app/api/discussions/[id]/resolve/route.ts`

### `app/api/discussions/[id]/resolve/preview/route.ts`

Calls AI, returns draft resolution. Does NOT save to DB.

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionById, getDiscussionMessages } from '@/lib/queries/discussions'
import { buildDiscussionResolutionPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const ResolutionSchema = require('zod').z.object({
  summary: require('zod').z.string(),
  decisions: require('zod').z.array(require('zod').z.string()),
  learnings: require('zod').z.array(require('zod').z.string()),
  nextSteps: require('zod').z.array(require('zod').z.string()),
})
// Note: use proper imports at top of file, not inline requires. Written inline here for plan readability only.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Already resolved' }, { status: 422 })
    }

    const messages = await getDiscussionMessages(id, org.id)
    if (messages.length === 0) {
      return Response.json({ error: 'No messages to summarise' }, { status: 422 })
    }

    const messageStream = messages
      .map((m) => `[${m.created_at.slice(0, 10)}] ${m.user_id}: ${m.content}`)
      .join('\n\n')

    const prompt = buildDiscussionResolutionPrompt({
      title: discussion.title,
      messageStream,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'AI generation failed' }, { status: 500 })
    }

    let parsed: { summary: string; decisions: string[]; learnings: string[]; nextSteps: string[] }
    try {
      parsed = JSON.parse(textBlock.text.trim())
    } catch {
      return Response.json({ error: 'AI returned invalid response' }, { status: 500 })
    }

    return Response.json({
      summary: parsed.summary ?? '',
      decisions: parsed.decisions ?? [],
      learnings: parsed.learnings ?? [],
      nextSteps: parsed.nextSteps ?? [],
    })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### `app/api/discussions/[id]/resolve/route.ts`

Saves the final (possibly user-edited) resolution.

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getDiscussionById, resolveDiscussion } from '@/lib/queries/discussions'

const ResolveSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string().min(1)),
  learnings: z.array(z.string().min(1)),
  nextSteps: z.array(z.object({
    text: z.string().min(1),
    ownerId: z.string().uuid().optional(),
  })),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (discussion.status === 'resolved') {
      return Response.json({ error: 'Already resolved' }, { status: 422 })
    }

    const body = await request.json()
    const parsed = ResolveSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { discussion: resolved, error } = await resolveDiscussion({
      id,
      organizationId: org.id,
      resolvedBy: user.id,
      aiSummary: parsed.data.summary,
      decisions: parsed.data.decisions,
      learnings: parsed.data.learnings,
      nextSteps: parsed.data.nextSteps,
    })

    if (error || !resolved) {
      return Response.json({ error: 'Failed to resolve discussion' }, { status: 500 })
    }

    return Response.json({ discussion: resolved })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Commit**
```bash
git add app/api/discussions/[id]/resolve/
git commit -m "feat: add discussion resolution API (preview + save)"
```

---

## Task 7: API Route — Create Document from Discussion

**Files:**
- Create: `app/api/discussions/[id]/create-document/route.ts`

```typescript
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getDiscussionById,
  getDiscussionMessages,
  createDiscussionDocumentLink,
} from '@/lib/queries/discussions'
import { createDocument } from '@/lib/queries/documents'
import { buildDiscussionDocumentPrompt } from '@/lib/ai/prompts'
import { DEFAULT_MODEL } from '@/lib/ai/models'

const Schema = z.object({
  document_type: z.string().min(1).max(100),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const discussion = await getDiscussionById(id, org.id)
    if (!discussion) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const messages = await getDiscussionMessages(id, org.id)
    if (messages.length === 0) {
      return Response.json({ error: 'No messages to generate document from' }, { status: 422 })
    }

    const messageStream = messages
      .map((m) => `[${m.created_at.slice(0, 10)}] ${m.user_id}: ${m.content}`)
      .join('\n\n')

    const prompt = buildDiscussionDocumentPrompt({
      discussionTitle: discussion.title,
      documentType: parsed.data.document_type,
      messageStream,
      orgName: org.name,
    })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'AI not configured' }, { status: 503 })

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL.id,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Document generation failed' }, { status: 500 })
    }

    const content = textBlock.text.trim()

    // Extract title from first # heading if present, otherwise use discussion title
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const docTitle = titleMatch ? titleMatch[1].trim() : discussion.title

    // Create document as 'shared' so all org members can access
    const { document, error: docError } = await createDocument({
      organizationId: org.id,
      userId: user.id,
      title: docTitle,
      content,
      docType: parsed.data.document_type,
      visibility: 'shared',
    })

    if (docError || !document) {
      return Response.json({ error: 'Failed to save document' }, { status: 500 })
    }

    // Link document back to discussion
    await createDiscussionDocumentLink({
      discussionId: id,
      documentId: document.id,
      relationshipType: 'created_from',
    })

    return Response.json({ document }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Commit**
```bash
git add app/api/discussions/[id]/create-document/route.ts
git commit -m "feat: add create-document-from-discussion API route"
```

---

## Task 8: DiscussionsPanel + DiscussionList

**Files:**
- Create: `components/discussions/discussions-panel.tsx`
- Create: `components/discussions/discussion-list.tsx`

### `components/discussions/discussions-panel.tsx`

The container component. Renders list + detail side-by-side.

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DiscussionRow, DiscussionParentType } from '@/lib/queries/discussions'
import { DiscussionList } from './discussion-list'
import { CreateDiscussionDialog } from './create-discussion-dialog'
import { DiscussionDetail } from './discussion-detail'

interface DiscussionsPanelProps {
  parentType: DiscussionParentType
  parentId: string
  organizationId: string
  sectionKey?: string
}

export function DiscussionsPanel({
  parentType,
  parentId,
  organizationId,
  sectionKey,
}: DiscussionsPanelProps) {
  const [discussions, setDiscussions] = useState<DiscussionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({
      parent_type: parentType,
      parent_id: parentId,
      status: statusFilter,
    })
    if (sectionKey) params.set('section_key', sectionKey)

    const res = await fetch(`/api/discussions?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDiscussions(data.discussions ?? [])
    }
    setIsLoading(false)
  }, [parentType, parentId, statusFilter, sectionKey])

  useEffect(() => { load() }, [load])

  const selectedDiscussion = discussions.find((d) => d.id === selectedId) ?? null

  function handleCreated(discussion: DiscussionRow) {
    setDiscussions((prev) => [discussion, ...prev])
    setSelectedId(discussion.id)
    setShowCreate(false)
  }

  function handleUpdated(updated: DiscussionRow) {
    setDiscussions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  return (
    <div className="flex h-full">
      {/* Left: list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col">
        <DiscussionList
          discussions={discussions}
          isLoading={isLoading}
          selectedId={selectedId}
          statusFilter={statusFilter}
          onSelect={setSelectedId}
          onFilterChange={setStatusFilter}
          onCreateNew={() => setShowCreate(true)}
        />
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-hidden">
        {selectedDiscussion ? (
          <DiscussionDetail
            key={selectedDiscussion.id}
            discussion={selectedDiscussion}
            organizationId={organizationId}
            onUpdated={handleUpdated}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {discussions.length === 0 && !isLoading
                ? 'No discussions yet. Start one.'
                : 'Select a discussion'}
            </p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDiscussionDialog
          parentType={parentType}
          parentId={parentId}
          sectionKey={sectionKey}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
```

### `components/discussions/discussion-list.tsx`

```typescript
'use client'

import { MessageCircle, Plus, CheckCircle2, Loader2 } from 'lucide-react'
import type { DiscussionRow } from '@/lib/queries/discussions'

interface DiscussionListProps {
  discussions: DiscussionRow[]
  isLoading: boolean
  selectedId: string | null
  statusFilter: 'all' | 'active' | 'resolved'
  onSelect: (id: string) => void
  onFilterChange: (filter: 'all' | 'active' | 'resolved') => void
  onCreateNew: () => void
}

const MODE_LABELS = { lightweight: 'Light', structured: 'Structured' }
const FILTERS: Array<{ id: 'all' | 'active' | 'resolved'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
]

export function DiscussionList({
  discussions,
  isLoading,
  selectedId,
  statusFilter,
  onSelect,
  onFilterChange,
  onCreateNew,
}: DiscussionListProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Discussions</h3>
        <button
          onClick={onCreateNew}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="New discussion"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              statusFilter === f.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No discussions</p>
            <button
              onClick={onCreateNew}
              className="mt-2 text-xs text-foreground underline underline-offset-2"
            >
              Start one
            </button>
          </div>
        ) : (
          discussions.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${
                selectedId === d.id ? 'bg-accent' : 'hover:bg-accent/50'
              } ${d.status === 'resolved' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                  {d.title}
                </p>
                {d.status === 'resolved' && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  d.mode === 'structured'
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {MODE_LABELS[d.mode]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.updated_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}
```

- [ ] **Commit**
```bash
git add components/discussions/discussions-panel.tsx components/discussions/discussion-list.tsx
git commit -m "feat: add DiscussionsPanel and DiscussionList components"
```

---

## Task 9: CreateDiscussionDialog

**Files:**
- Create: `components/discussions/create-discussion-dialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { DiscussionRow, DiscussionParentType, DiscussionMode } from '@/lib/queries/discussions'

interface CreateDiscussionDialogProps {
  parentType: DiscussionParentType
  parentId: string
  sectionKey?: string
  onCreated: (discussion: DiscussionRow) => void
  onClose: () => void
}

export function CreateDiscussionDialog({
  parentType,
  parentId,
  sectionKey,
  onCreated,
  onClose,
}: CreateDiscussionDialogProps) {
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<DiscussionMode>('lightweight')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    setError(null)

    const res = await fetch('/api/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_type: parentType,
        parent_id: parentId,
        section_key: sectionKey,
        mode,
        title: title.trim(),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create discussion')
      setIsSubmitting(false)
      return
    }

    onCreated(data.discussion as DiscussionRow)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">New Discussion</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="disc-title" className="mb-1.5 block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              id="disc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this discussion about?"
              autoFocus
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          <div>
            <p className="mb-1.5 block text-sm font-medium text-foreground">Type</p>
            <div className="flex gap-2">
              {(['lightweight', 'structured'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  {m === 'lightweight' ? 'Lightweight' : 'Structured'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === 'lightweight'
                ? 'Quick question or clarification. Can be promoted later.'
                : 'Decision, strategy, or important topic. Expected to resolve.'}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Discussion'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add components/discussions/create-discussion-dialog.tsx
git commit -m "feat: add CreateDiscussionDialog component"
```

---

## Task 10: DiscussionDetail + MessageStream

**Files:**
- Create: `components/discussions/discussion-message-stream.tsx`
- Create: `components/discussions/discussion-detail.tsx`

### `components/discussions/discussion-message-stream.tsx`

```typescript
'use client'

import type { DiscussionMessageRow } from '@/lib/queries/discussions'

interface DiscussionMessageStreamProps {
  messages: DiscussionMessageRow[]
  currentUserId: string
}

export function DiscussionMessageStream({ messages, currentUserId }: DiscussionMessageStreamProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No messages yet. Start the discussion.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {messages.map((msg) => {
        const isOwn = msg.user_id === currentUserId
        return (
          <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
              {msg.user_id.slice(0, 2).toUpperCase()}
            </div>
            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  isOwn
                    ? 'bg-foreground text-background'
                    : 'bg-accent text-foreground'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

### `components/discussions/discussion-detail.tsx`

This is the largest component. It shows the full discussion view with messages, actions, and resolution summary.

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowUpRight, CheckCircle2, ChevronUp, FileText, Loader2,
} from 'lucide-react'
import type { DiscussionRow, DiscussionMessageRow, DiscussionResolutionData } from '@/lib/queries/discussions'
import { DiscussionMessageStream } from './discussion-message-stream'
import { ResolveDiscussionDialog } from './resolve-discussion-dialog'
import { CreateDocFromDiscussionDialog } from './create-doc-from-discussion-dialog'

interface DiscussionDetailProps {
  discussion: DiscussionRow
  organizationId: string
  onUpdated: (discussion: DiscussionRow) => void
}

export function DiscussionDetail({ discussion: initialDiscussion, organizationId, onUpdated }: DiscussionDetailProps) {
  const [discussion, setDiscussion] = useState(initialDiscussion)
  const [messages, setMessages] = useState<DiscussionMessageRow[]>([])
  const [resolution, setResolution] = useState<DiscussionResolutionData | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [showCreateDoc, setShowCreateDoc] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get current user id from session
  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      if (d.user?.id) setCurrentUserId(d.user.id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadMessages()
  }, [discussion.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    setIsLoadingMessages(true)
    const res = await fetch(`/api/discussions/${discussion.id}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages ?? [])
    }

    if (discussion.status === 'resolved') {
      const detailRes = await fetch(`/api/discussions/${discussion.id}`)
      if (detailRes.ok) {
        const data = await detailRes.json()
        setResolution(data.resolution ?? null)
      }
    }

    setIsLoadingMessages(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!messageText.trim() || isSending) return
    setIsSending(true)

    const res = await fetch(`/api/discussions/${discussion.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageText.trim() }),
    })

    if (res.ok) {
      const data = await res.json()
      setMessages((prev) => [...prev, data.message])
      setMessageText('')
    }
    setIsSending(false)
  }

  async function handlePromote() {
    setIsPromoting(true)
    const res = await fetch(`/api/discussions/${discussion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'structured' }),
    })
    if (res.ok) {
      const data = await res.json()
      setDiscussion(data.discussion)
      onUpdated(data.discussion)
    }
    setIsPromoting(false)
  }

  function handleResolved(resolved: DiscussionRow, resolutionData: DiscussionResolutionData) {
    setDiscussion(resolved)
    setResolution(resolutionData)
    setShowResolve(false)
    onUpdated(resolved)
  }

  const isResolved = discussion.status === 'resolved'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">{discussion.title}</h2>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
              discussion.mode === 'structured'
                ? 'bg-foreground/10 text-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {discussion.mode === 'structured' ? 'Structured' : 'Lightweight'}
            </span>
            {isResolved && (
              <span className="shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Started {new Date(discussion.created_at).toLocaleDateString()}
            {discussion.resolved_at && ` · Resolved ${new Date(discussion.resolved_at).toLocaleDateString()}`}
          </p>
        </div>

        {/* Actions */}
        {!isResolved && (
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {discussion.mode === 'lightweight' && (
              <button
                onClick={handlePromote}
                disabled={isPromoting}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Make Structured
              </button>
            )}
            <button
              onClick={() => setShowCreateDoc(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Create Doc
            </button>
            <button
              onClick={() => setShowResolve(true)}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </button>
          </div>
        )}
        {isResolved && (
          <button
            onClick={() => setShowCreateDoc(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Create Doc
          </button>
        )}
      </div>

      {/* Resolution summary (if resolved) */}
      {isResolved && resolution && (
        <div className="border-b border-border bg-accent/30 px-4 py-3 space-y-3">
          {discussion.ai_summary && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Summary</p>
              <p className="text-xs text-muted-foreground">{discussion.ai_summary}</p>
            </div>
          )}
          {resolution.decisions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Decisions</p>
              <ul className="space-y-0.5">
                {resolution.decisions.map((d) => (
                  <li key={d.id} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {d.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolution.learnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Learnings</p>
              <ul className="space-y-0.5">
                {resolution.learnings.map((l) => (
                  <li key={l.id} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {l.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolution.nextSteps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Next Steps</p>
              <ul className="space-y-0.5">
                {resolution.nextSteps.map((ns) => (
                  <li key={ns.id} className="text-xs text-muted-foreground flex gap-1.5">
                    <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    {ns.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DiscussionMessageStream messages={messages} currentUserId={currentUserId} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input (only if active) */}
      {!isResolved && (
        <form onSubmit={handleSend} className="border-t border-border px-4 py-3 flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Add to the discussion…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </button>
        </form>
      )}

      {showResolve && (
        <ResolveDiscussionDialog
          discussion={discussion}
          onResolved={handleResolved}
          onClose={() => setShowResolve(false)}
        />
      )}

      {showCreateDoc && (
        <CreateDocFromDiscussionDialog
          discussion={discussion}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
    </div>
  )
}
```

**Note on `currentUserId`:** The `DiscussionDetail` calls `/api/profile` to get the current user id for rendering own messages differently. Verify this endpoint returns `{ user: { id: string } }` — if the response shape differs, update accordingly. Alternative: pass `userId` as a prop from a server component parent.

- [ ] **Commit**
```bash
git add components/discussions/discussion-message-stream.tsx components/discussions/discussion-detail.tsx
git commit -m "feat: add DiscussionDetail and DiscussionMessageStream components"
```

---

## Task 11: ResolveDiscussionDialog

**Files:**
- Create: `components/discussions/resolve-discussion-dialog.tsx`

Three states: loading (AI generates), editing (user reviews/edits), saving.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import type { DiscussionRow, DiscussionResolutionData } from '@/lib/queries/discussions'

interface ResolveDiscussionDialogProps {
  discussion: DiscussionRow
  onResolved: (discussion: DiscussionRow, resolution: DiscussionResolutionData) => void
  onClose: () => void
}

type Phase = 'loading' | 'editing' | 'saving' | 'error'

export function ResolveDiscussionDialog({ discussion, onResolved, onClose }: ResolveDiscussionDialogProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [summary, setSummary] = useState('')
  const [decisions, setDecisions] = useState<string[]>([])
  const [learnings, setLearnings] = useState<string[]>([])
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { generatePreview() }, [])

  async function generatePreview() {
    setPhase('loading')
    const res = await fetch(`/api/discussions/${discussion.id}/resolve/preview`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to generate summary')
      setPhase('error')
      return
    }
    setSummary(data.summary ?? '')
    setDecisions(data.decisions ?? [])
    setLearnings(data.learnings ?? [])
    setNextSteps(data.nextSteps ?? [])
    setPhase('editing')
  }

  async function handleSave() {
    setPhase('saving')
    const res = await fetch(`/api/discussions/${discussion.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        decisions: decisions.filter((d) => d.trim()),
        learnings: learnings.filter((l) => l.trim()),
        nextSteps: nextSteps.filter((ns) => ns.trim()).map((text) => ({ text })),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to save resolution')
      setPhase('editing')
      return
    }

    // Fetch the resolution data to pass back
    const detailRes = await fetch(`/api/discussions/${discussion.id}`)
    const detailData = await detailRes.json()
    onResolved(data.discussion, detailData.resolution ?? { decisions: [], learnings: [], nextSteps: [] })
  }

  function addItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => [...prev, ''])
  }

  function updateItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) {
    setter((prev) => prev.map((item, i) => (i === idx ? val : item)))
  }

  function removeItem(setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) {
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Resolve Discussion</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating summary…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive mb-3">{errorMsg}</p>
              <button onClick={generatePreview} className="text-sm underline">Try again</button>
            </div>
          )}

          {(phase === 'editing' || phase === 'saving') && (
            <div className="space-y-5">
              {/* Summary */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Summary</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>

              {/* Decisions */}
              <EditableList
                label="Decisions"
                items={decisions}
                onAdd={() => addItem(setDecisions)}
                onChange={(i, v) => updateItem(setDecisions, i, v)}
                onRemove={(i) => removeItem(setDecisions, i)}
                placeholder="A decision that was made"
              />

              {/* Learnings */}
              <EditableList
                label="Learnings"
                items={learnings}
                onAdd={() => addItem(setLearnings)}
                onChange={(i, v) => updateItem(setLearnings, i, v)}
                onRemove={(i) => removeItem(setLearnings, i)}
                placeholder="An insight or realisation"
              />

              {/* Next steps */}
              <EditableList
                label="Next Steps"
                items={nextSteps}
                onAdd={() => addItem(setNextSteps)}
                onChange={(i, v) => updateItem(setNextSteps, i, v)}
                onRemove={(i) => removeItem(setNextSteps, i)}
                placeholder="An action item"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'editing' || phase === 'saving') && (
          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              onClick={handleSave}
              disabled={!summary.trim() || phase === 'saving'}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {phase === 'saving' ? 'Saving…' : 'Save Resolution'}
            </button>
            <button
              onClick={onClose}
              disabled={phase === 'saving'}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditableList({
  label,
  items,
  onAdd,
  onChange,
  onRemove,
  placeholder,
}: {
  label: string
  items: string[]
  onAdd: () => void
  onChange: (i: number, v: string) => void
  onRemove: (i: number) => void
  placeholder: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None identified</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => onChange(i, e.target.value)}
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
              <button
                onClick={() => onRemove(i)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add components/discussions/resolve-discussion-dialog.tsx
git commit -m "feat: add ResolveDiscussionDialog component"
```

---

## Task 12: CreateDocFromDiscussionDialog

**Files:**
- Create: `components/discussions/create-doc-from-discussion-dialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { DiscussionRow } from '@/lib/queries/discussions'

const DOC_TYPES = [
  'brief', 'report', 'strategy', 'note', 'decision record', 'research', 'plan',
]

interface CreateDocFromDiscussionDialogProps {
  discussion: DiscussionRow
  onClose: () => void
}

export function CreateDocFromDiscussionDialog({ discussion, onClose }: CreateDocFromDiscussionDialogProps) {
  const router = useRouter()
  const [docType, setDocType] = useState('brief')
  const [customType, setCustomType] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)

  async function handleGenerate() {
    const type = customType.trim() || docType
    setIsGenerating(true)
    setError(null)

    const res = await fetch(`/api/discussions/${discussion.id}/create-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type: type }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate document')
      setIsGenerating(false)
      return
    }

    setCreatedDocId(data.document.id)
    setIsGenerating(false)
  }

  if (createdDocId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400 mx-auto">
            <ExternalLink className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Document Created</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Saved as shared. All org members can access it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/documents/${createdDocId}`)}
              className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80"
            >
              View Document
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Document</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          AI will draft a document from <span className="font-medium text-foreground">"{discussion.title}"</span>.
        </p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-foreground">Document type</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setDocType(t); setCustomType('') }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  docType === t && !customType
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Or type a custom document type…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Document'
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add components/discussions/create-doc-from-discussion-dialog.tsx
git commit -m "feat: add CreateDocFromDiscussionDialog component"
```

---

## Task 13: Wire into Project Page

**Files:**
- Modify: `components/projects/project-detail.tsx`

Three changes:
1. Change `type Tab` to include `'discussions'` instead of `'chat'`
2. Change `TABS` entry: `id: 'discussions'`, `label: 'Discussions'`, icon `MessageSquare` (or keep `MessageCircle`)
3. Replace the `{activeTab === 'chat' && ...}` block with `<DiscussionsPanel>`

- [ ] **Make the changes**

```typescript
// At top, add import:
import { DiscussionsPanel } from '@/components/discussions/discussions-panel'

// Change type Tab:
type Tab = 'content' | 'discovery' | 'materials' | 'discussions'

// Change TABS entry (currently line ~128):
{ id: 'discussions', label: 'Discussions', icon: MessageCircle },

// Replace the activeTab === 'chat' block (currently ~line 486):
{activeTab === 'discussions' && (
  <div className="flex h-[calc(100vh-200px)]">
    <DiscussionsPanel
      parentType="project"
      parentId={project.id}
      organizationId={project.organization_id}
    />
  </div>
)}
```

You need access to `project.organization_id` in the tab content block. Check if this is available in scope — if not, it may need to be passed as a prop or accessed from existing project data.

- [ ] **Commit**
```bash
git add components/projects/project-detail.tsx
git commit -m "feat: replace project Chat tab with Discussions panel"
```

---

## Task 14: Wire into Document Viewer

**Files:**
- Modify: `components/documents/document-viewer.tsx`

Add a tab to the document viewer to show discussions. The viewer currently has a header toolbar and a single content area. Add a simple tab switcher between "Content" and "Discussions".

- [ ] **Make the changes**

```typescript
// Add import at top:
import { DiscussionsPanel } from '@/components/discussions/discussions-panel'

// Add state:
const [activeView, setActiveView] = useState<'content' | 'discussions'>('content')

// Add tab bar inside the document body area (after the header, before the content scroll area):
<div className="flex border-b border-border px-6">
  {(['content', 'discussions'] as const).map((v) => (
    <button
      key={v}
      onClick={() => setActiveView(v)}
      className={`mr-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
        activeView === v
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {v}
    </button>
  ))}
</div>

// Wrap existing content in conditional + add discussions view:
{activeView === 'content' && (
  // ... existing content area ...
)}
{activeView === 'discussions' && (
  <div className="flex h-[calc(100vh-160px)]">
    <DiscussionsPanel
      parentType="document"
      parentId={document.id}
      organizationId={document.organization_id}
    />
  </div>
)}
```

Note: `document.organization_id` is already in the `DocumentRow` type and returned by the query. Verify it's included in `DOCUMENT_SELECT` in `lib/queries/documents.ts` — if not, add it.

- [ ] **Commit**
```bash
git add components/documents/document-viewer.tsx
git commit -m "feat: add Discussions tab to document viewer"
```

---

## Final: Build Verification

- [ ] **Run build**
```bash
npm run build
```
Expected: zero errors. Fix any TypeScript errors before claiming done.

- [ ] **Check for linter errors** on all modified files

- [ ] **Manual smoke test**
1. Navigate to a project → Discussions tab → Create a discussion → Send a message
2. Click Resolve → verify AI generates summary → edit one item → Save Resolution → verify resolved state
3. Create Document → verify doc appears in `/dashboard/documents`
4. Navigate to a document → Discussions tab → create and message a discussion
5. Verify "Make Structured" promotion works on a lightweight discussion

---

## Notes

- **User display in messages**: `DiscussionMessageStream` shows `user_id.slice(0,2)` as avatar initials. For a better experience, join with `user_profiles` in the messages query to get names — but this is a follow-up enhancement, not a blocker.
- **Real-time**: Messages are not real-time (no Supabase Realtime subscription). Users need to reload to see others' messages. Real-time is a follow-up enhancement.
- **Section discussions**: Schema fully supports `parent_type = 'section'`. UI entry point (on business plan section pages) is deferred until the business plan editor is updated to surface discussion buttons per section.
- **`/api/profile` dependency**: `DiscussionDetail` calls this to get current user ID. Verify this endpoint exists and returns `{ user: { id } }`. If it returns a different shape, adjust the fetch or pass userId from a server component.
