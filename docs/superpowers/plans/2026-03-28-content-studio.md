# Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Marketing Content" tool project with "Content Studio" — a tool with Backlog (ideas queue), Generate (existing content generation), and Published (org-wide performance tracker) sections.

**Architecture:** A `tool_key` column on `projects` dispatches to a custom `ContentStudioDetail` React component instead of the generic `ProjectDetail` when `tool_key === 'content_studio'`. A new `content_ideas` table backs the Backlog. Published outputs are queried org-wide from existing `outputs` table, extended with new time-windowed performance columns.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript strict, Tailwind CSS, Zod validation, existing `GenerationSessionDialog`.

---

## File Map

**Create:**
- `docs/features/content-studio.md` — Gherkin spec
- `supabase/migrations/20260328_content_studio.sql` — DB migration
- `supabase/migrations/20260328_content_studio.md` — migration companion doc
- `lib/queries/content-ideas.ts` — CRUD for content_ideas
- `app/api/content-ideas/route.ts` — GET + POST content ideas
- `app/api/content-ideas/[id]/route.ts` — PATCH + DELETE content idea
- `components/content-studio/content-studio-detail.tsx` — main 3-section UI
- `components/content-studio/backlog-section.tsx` — ideas backlog
- `components/content-studio/published-section.tsx` — org-wide published tracker

**Modify:**
- `components/company/company-nav.tsx` — remove "Calendar" nav item
- `lib/queries/projects.ts` — add `category, tool_key` to `getProjectById` select
- `lib/queries/outputs.ts` — add `getPublishedOutputsForOrg()`, extend `updateOutputPerformance` + `getTopPerformingOutputs`
- `app/api/outputs/[id]/route.ts` — add new perf fields to patchSchema
- `components/marketing/generation-session-dialog.tsx` — add `initialUserMessage?: string` prop
- `components/projects/outputs-list.tsx` — add `showPublish?: boolean` prop thread
- `app/dashboard/projects/[id]/page.tsx` — fetch content_ideas + published outputs; pass category+tool_key to ProjectDetail
- `components/projects/project-detail.tsx` — detect `tool_key === 'content_studio'`, dispatch to ContentStudioDetail; pass `showPublish` to OutputsList
- `lib/ai/prompts.ts` — include `views_30d`, `website_visits`, `email_signups` in top performers block

---

## Task 1: Gherkin Feature Doc

**Files:**
- Create: `docs/features/content-studio.md`

- [ ] **Step 1: Write Gherkin spec**

```markdown
# Feature: Content Studio

## Background
  Given I am authenticated
  And my organization has brand context configured
  And the Content Studio tool project exists for my organization

## Scenario: View Content Studio sections
  When I navigate to the Content Studio tool
  Then I see three collapsible sections: "Backlog", "Generate", "Published"

## Scenario: Add a content idea to the backlog
  Given I am on the Content Studio page
  When I open the Backlog section
  And I click "Add idea"
  And I enter a title, optional description, platform, and platform owner
  And I click "Save"
  Then the idea appears in the Backlog list

## Scenario: Build out a content idea from the backlog
  Given I have a content idea in the Backlog
  When I click "Build" on the idea
  Then the Generate section opens with the idea's text pre-filled in the chat input
  And the chat has not been submitted

## Scenario: Generate content in Content Studio
  Given I am on the Content Studio Generate section
  When I pick a content type and author and click Start
  Then I can send messages and generate content
  And I can save the output to the Content Studio project

## Scenario: Mark an output as published
  Given I have a generated output in a Marketing-category project
  When I click the "Mark as published" button on the output
  Then the output's published_at is set to now
  And it appears in the Content Studio Published section

## Scenario: Enter performance data for a published output
  Given an output appears in the Content Studio Published section
  When I click "Stats" on that output
  And I enter views after 1 day, 7 days, 30 days, website visits, email signups
  And I click "Save stats"
  Then the data is saved and visible in the Published list

## Scenario: AI uses performance data during generation
  Given some published outputs have performance data entered
  When I generate new content in any project
  Then the AI system prompt includes top-performing outputs with their performance metrics

## Scenario: Content Calendar is removed from company nav
  Given I am on any company page
  Then the "Calendar" link does not appear in the company navigation
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/content-studio.md
git commit -m "docs: add content-studio gherkin spec"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260328_content_studio.sql`
- Create: `supabase/migrations/20260328_content_studio.md`

- [ ] **Step 1: Write migration SQL**

```sql
-- ============================================================
-- Content Studio
-- ============================================================
-- 1. Add tool_key to org_project_seeds and projects
-- 2. Rename "Marketing Content" seed → "Content Studio"
-- 3. Backfill existing project rows
-- 4. Create content_ideas table
-- 5. Add time-windowed performance columns to outputs
-- ============================================================

-- 1. tool_key column
ALTER TABLE org_project_seeds
  ADD COLUMN IF NOT EXISTS tool_key TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tool_key TEXT;

-- 2. Update seed: rename + assign tool_key
UPDATE org_project_seeds
SET
  name        = 'Content Studio',
  description = 'Plan, generate, and track the performance of all content.',
  tool_key    = 'content_studio'
WHERE name = 'Marketing Content';

-- 3. Backfill existing projects that were seeded as Marketing Content
UPDATE projects
SET
  name     = 'Content Studio',
  tool_key = 'content_studio'
WHERE name = 'Marketing Content'
  AND project_type = 'tool'
  AND deleted_at IS NULL;

-- 4. content_ideas table
CREATE TABLE public.content_ideas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description      TEXT CHECK (char_length(description) <= 2000),
  platform         TEXT NOT NULL,
  platform_owner   TEXT NOT NULL CHECK (platform_owner IN ('author', 'company')),
  status           TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'done')),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_ideas_org_members"
  ON public.content_ideas FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX content_ideas_project_idx
  ON public.content_ideas (project_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX content_ideas_org_idx
  ON public.content_ideas (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 5. New performance columns on outputs
ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS views_1d               INTEGER,
  ADD COLUMN IF NOT EXISTS views_7d               INTEGER,
  ADD COLUMN IF NOT EXISTS views_30d              INTEGER,
  ADD COLUMN IF NOT EXISTS website_visits         INTEGER,
  ADD COLUMN IF NOT EXISTS email_signups          INTEGER,
  ADD COLUMN IF NOT EXISTS performance_recorded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS outputs_published_org_idx
  ON public.outputs (organization_id, published_at DESC)
  WHERE published_at IS NOT NULL AND deleted_at IS NULL;
```

- [ ] **Step 2: Write migration companion doc**

```markdown
# 20260328_content_studio.md

## Summary
Renames the "Marketing Content" tool to "Content Studio", adds a `tool_key` identifier
column to dispatch custom UI, creates the `content_ideas` table for the content backlog,
and adds time-windowed performance columns to `outputs`.

## Gherkin specs
- `docs/features/content-studio.md`

## ADRs
- `tool_key` is a string identifier (not an enum) so new tools can be added via migrations
  without code changes to the column check constraint.
- `content_ideas.platform_owner` is `'author' | 'company'` (matches existing author_profiles
  concept of named authors vs company brand).
- New output performance columns are nullable integers — not required, filled in post-publish.
- Existing `reach`, `reach_metric`, `engagement`, `performance_notes` columns are kept;
  the new columns add time-windowed specificity rather than replacing general reach tracking.

## Design notes
- `content_ideas` is project-scoped (not org-wide) so it links to the Content Studio project.
- `platform` is free-text stored in DB; the UI enforces the allowed list.
- The new `outputs_published_org_idx` supports the Published section query without scanning
  all outputs.
```

- [ ] **Step 3: Apply migration**

```bash
supabase db push
# or: supabase migration up (local)
```

- [ ] **Step 4: Regenerate types**

```bash
supabase gen types typescript --local > lib/types/database.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260328_content_studio.sql supabase/migrations/20260328_content_studio.md lib/types/database.ts
git commit -m "chore: add content studio migration — tool_key, content_ideas, perf columns"
```

---

## Task 3: Remove Calendar from Company Nav

**Files:**
- Modify: `components/company/company-nav.tsx`

The Content group currently has 4 items. Remove the Calendar entry.

- [ ] **Step 1: Edit company-nav.tsx**

In the `navGroups` array, find the `Content` group:

```typescript
{
  label: 'Content',
  items: [
    { name: 'Content types', href: '/dashboard/company/content-types' },
    { name: 'Social proof', href: '/dashboard/company/social-proof' },
    { name: 'Content benchmarks', href: '/dashboard/company/benchmarks' },
    { name: 'Calendar', href: '/dashboard/company/calendar' },  // ← REMOVE THIS LINE
  ],
},
```

Remove only the `{ name: 'Calendar', href: '/dashboard/company/calendar' }` entry.

- [ ] **Step 2: Verify no other references to calendar in nav**

Check `components/company/company-overview.tsx` — if it has a Calendar card/link, remove that too.

```bash
rg "calendar" components/company/company-overview.tsx
```

If found, remove the Calendar card from that file.

- [ ] **Step 3: Commit**

```bash
git add components/company/company-nav.tsx components/company/company-overview.tsx
git commit -m "feat: remove content calendar from company nav"
```

---

## Task 4: Update Query Functions

**Files:**
- Modify: `lib/queries/projects.ts`
- Modify: `lib/queries/outputs.ts`
- Create: `lib/queries/content-ideas.ts`

### 4a: Add category + tool_key to getProjectById

In `lib/queries/projects.ts`, `getProjectById` currently selects:
```
'id, name, description, created_at, updated_at, created_by, visibility, status, tags, project_type, start_date, estimated_end_date'
```

- [ ] **Step 1: Add `category, tool_key` to the select string**

```typescript
// Change:
'id, name, description, created_at, updated_at, created_by, visibility, status, tags, project_type, start_date, estimated_end_date'
// To:
'id, name, description, category, tool_key, created_at, updated_at, created_by, visibility, status, tags, project_type, start_date, estimated_end_date'
```

### 4b: Add getPublishedOutputsForOrg to outputs.ts

- [ ] **Step 2: Add new type and query to `lib/queries/outputs.ts`**

Below the existing `OutputWithCreator` type, add:

```typescript
export type PublishedOutput = {
  id: string
  brief: string
  content: string
  content_type_id: string
  model_id: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  published_at: string
  reach: number | null
  reach_metric: string | null
  engagement: number | null
  performance_notes: string | null
  views_1d: number | null
  views_7d: number | null
  views_30d: number | null
  website_visits: number | null
  email_signups: number | null
  performance_recorded_at: string | null
  content_types: { name: string } | null
  projects: { name: string } | null
  creator_full_name: string | null
}

export async function getPublishedOutputsForOrg(
  organizationId: string,
  limit = 100,
): Promise<PublishedOutput[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select(
      'id, brief, content, content_type_id, model_id, project_id, created_by, created_at, updated_at, published_at, reach, reach_metric, engagement, performance_notes, views_1d, views_7d, views_30d, website_visits, email_signups, performance_recorded_at, content_types(name), projects(name)',
    )
    .eq('organization_id', organizationId)
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const rows = (data ?? []) as unknown as Array<Omit<PublishedOutput, 'creator_full_name'>>
  const ids = rows.map((r) => r.created_by)
  const names = await getUserDisplayNamesByIds(ids)
  return rows.map((r) => ({ ...r, creator_full_name: names[r.created_by] ?? null }))
}
```

### 4c: Extend updateOutputPerformance with new fields

- [ ] **Step 3: Update `updateOutputPerformance` signature and body**

```typescript
export async function updateOutputPerformance(
  id: string,
  organizationId: string,
  params: {
    reach: number | null
    reach_metric: string | null
    engagement: number | null
    performance_notes: string | null
    views_1d?: number | null
    views_7d?: number | null
    views_30d?: number | null
    website_visits?: number | null
    email_signups?: number | null
    performance_recorded_at?: string | null
  },
) {
  const supabase = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    ...params,
    updated_at: new Date().toISOString(),
  }
  // Set performance_recorded_at to now if any metric is provided and not explicitly passed
  if (
    params.performance_recorded_at === undefined &&
    (params.views_1d != null || params.views_7d != null || params.views_30d != null ||
     params.website_visits != null || params.email_signups != null)
  ) {
    updatePayload.performance_recorded_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('outputs')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, reach, reach_metric, engagement, performance_notes, views_1d, views_7d, views_30d, website_visits, email_signups, performance_recorded_at, updated_at')
    .single()

  if (error) return { output: null, error: 'Failed to update performance stats' }
  return { output: data, error: null }
}
```

### 4d: Update getTopPerformingOutputs to include new fields

- [ ] **Step 4: Update `getTopPerformingOutputs` to include `views_30d` and `website_visits`**

```typescript
export async function getTopPerformingOutputs(
  organizationId: string,
  limit = 3,
): Promise<{
  id: string
  brief: string
  content: string
  reach: number | null
  reach_metric: string | null
  views_30d: number | null
  website_visits: number | null
  email_signups: number | null
}[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('outputs')
    .select('id, brief, content, reach, reach_metric, views_30d, website_visits, email_signups')
    .eq('organization_id', organizationId)
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .order('views_30d', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as {
    id: string
    brief: string
    content: string
    reach: number | null
    reach_metric: string | null
    views_30d: number | null
    website_visits: number | null
    email_signups: number | null
  }[]
}
```

### 4e: Create content-ideas.ts

- [ ] **Step 5: Create `lib/queries/content-ideas.ts`**

```typescript
import { createServiceClient } from '@/lib/supabase/service'

export type ContentIdeaRow = {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string | null
  platform: string
  platform_owner: 'author' | 'company'
  status: 'idea' | 'in_progress' | 'done'
  created_by: string
  created_at: string
  updated_at: string
}

export async function getContentIdeasForProject(
  projectId: string,
  organizationId: string,
): Promise<ContentIdeaRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .select('id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at')
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ContentIdeaRow[]
}

export async function createContentIdea(params: {
  organizationId: string
  projectId: string
  title: string
  description: string | null
  platform: string
  platformOwner: 'author' | 'company'
  userId: string
}): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .insert({
      organization_id: params.organizationId,
      project_id: params.projectId,
      title: params.title,
      description: params.description,
      platform: params.platform,
      platform_owner: params.platformOwner,
      created_by: params.userId,
    })
    .select('id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at')
    .single()

  if (error) return { idea: null, error: 'Failed to create content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function updateContentIdea(
  id: string,
  organizationId: string,
  params: Partial<Pick<ContentIdeaRow, 'title' | 'description' | 'platform' | 'platform_owner' | 'status'>>,
): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id, organization_id, project_id, title, description, platform, platform_owner, status, created_by, created_at, updated_at')
    .single()

  if (error) return { idea: null, error: 'Failed to update content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function deleteContentIdea(
  id: string,
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('content_ideas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: 'Failed to delete content idea' }
  return { error: null }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/queries/projects.ts lib/queries/outputs.ts lib/queries/content-ideas.ts
git commit -m "feat: add content-ideas queries and extend output performance fields"
```

---

## Task 5: API Routes

**Files:**
- Modify: `app/api/outputs/[id]/route.ts`
- Create: `app/api/content-ideas/route.ts`
- Create: `app/api/content-ideas/[id]/route.ts`

### 5a: Extend outputs PATCH schema

In `app/api/outputs/[id]/route.ts`, update the `patchSchema` and the handler:

- [ ] **Step 1: Update patchSchema to include new perf fields**

```typescript
const patchSchema = z.object({
  content: z.string().min(1).optional(),
  publish: z.boolean().optional(),
  reach: z.number().int().min(0).nullable().optional(),
  reach_metric: z.enum(['impressions', 'views', 'opens', 'plays', 'other']).nullable().optional(),
  engagement: z.number().int().min(0).nullable().optional(),
  performance_notes: z.string().max(2000).nullable().optional(),
  // New time-windowed fields
  views_1d: z.number().int().min(0).nullable().optional(),
  views_7d: z.number().int().min(0).nullable().optional(),
  views_30d: z.number().int().min(0).nullable().optional(),
  website_visits: z.number().int().min(0).nullable().optional(),
  email_signups: z.number().int().min(0).nullable().optional(),
})
```

- [ ] **Step 2: Update the perf branch to pass new fields**

```typescript
const {
  content, publish,
  reach, reach_metric, engagement, performance_notes,
  views_1d, views_7d, views_30d, website_visits, email_signups,
} = parsed.data

// Performance check: include new fields
if (
  reach !== undefined || reach_metric !== undefined ||
  engagement !== undefined || performance_notes !== undefined ||
  views_1d !== undefined || views_7d !== undefined || views_30d !== undefined ||
  website_visits !== undefined || email_signups !== undefined
) {
  const { output, error } = await updateOutputPerformance(id, org.id, {
    reach: reach ?? null,
    reach_metric: reach_metric ?? null,
    engagement: engagement ?? null,
    performance_notes: performance_notes ?? null,
    views_1d: views_1d,
    views_7d: views_7d,
    views_30d: views_30d,
    website_visits: website_visits,
    email_signups: email_signups,
  })
  if (error || !output) return Response.json({ error }, { status: 500 })
  return Response.json({ output })
}
```

### 5b: Create content-ideas route (GET + POST)

- [ ] **Step 3: Create `app/api/content-ideas/route.ts`**

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentIdeasForProject, createContentIdea } from '@/lib/queries/content-ideas'

const ALLOWED_PLATFORMS = [
  'LinkedIn', 'Email Newsletter', 'Blog / Website', 'Instagram',
  'Twitter / X', 'YouTube', 'TikTok', 'Podcast', 'Other',
]

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  platform: z.string().refine((v) => ALLOWED_PLATFORMS.includes(v) || v.length <= 100, {
    message: 'Invalid platform',
  }),
  platformOwner: z.enum(['author', 'company']),
})

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) return Response.json({ error: 'projectId is required' }, { status: 400 })

    const ideas = await getContentIdeasForProject(projectId, org.id)
    return Response.json({ ideas })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { projectId, title, description, platform, platformOwner } = parsed.data
    const { idea, error } = await createContentIdea({
      organizationId: org.id,
      projectId,
      title,
      description: description ?? null,
      platform,
      platformOwner,
      userId: user.id,
    })

    if (error || !idea) return Response.json({ error: 'Failed to create idea' }, { status: 500 })
    return Response.json({ idea }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### 5c: Create content-ideas/[id] route (PATCH + DELETE)

- [ ] **Step 4: Create `app/api/content-ideas/[id]/route.ts`**

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { updateContentIdea, deleteContentIdea } from '@/lib/queries/content-ideas'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  platform: z.string().max(100).optional(),
  platform_owner: z.enum(['author', 'company']).optional(),
  status: z.enum(['idea', 'in_progress', 'done']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { idea, error } = await updateContentIdea(id, org.id, parsed.data)
    if (error || !idea) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ idea })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteContentIdea(id, org.id)
    if (error) return Response.json({ error: 'Not found' }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/outputs/[id]/route.ts app/api/content-ideas/route.ts app/api/content-ideas/[id]/route.ts
git commit -m "feat: extend output perf PATCH and add content-ideas API routes"
```

---

## Task 6: Update GenerationSessionDialog

**Files:**
- Modify: `components/marketing/generation-session-dialog.tsx`

Add `initialUserMessage?: string` prop. When the dialog opens with this prop set, after the user clicks "Start" and enters the chat phase, the `input` state is pre-populated with the initial message text. The user sees it in the textarea and must manually send it.

- [ ] **Step 1: Add prop to interface and use in state**

```typescript
interface GenerationSessionDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: GeneratedOutputPayload) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  initialUserMessage?: string   // ← ADD THIS
}
```

- [ ] **Step 2: Use initialUserMessage in handleStart**

In the `useEffect` that runs on `open`, reset state as before but also store the `initialUserMessage` in a ref or state so `handleStart` can use it:

```typescript
// At top of component, alongside other state:
const [pendingInitialMessage, setPendingInitialMessage] = useState('')

// In the open useEffect, add:
setPendingInitialMessage(initialUserMessage ?? '')
```

- [ ] **Step 3: Set input when transitioning to chat phase**

In `handleStart`:
```typescript
function handleStart() {
  if (!contentTypeId) return
  setPhase('chat')
  if (pendingInitialMessage) {
    setInput(pendingInitialMessage)
    setPendingInitialMessage('')
  }
  setTimeout(() => inputRef.current?.focus(), 50)
}
```

This means the user arrives in chat with the idea text already in the input box, ready to review and send.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/generation-session-dialog.tsx
git commit -m "feat: add initialUserMessage prop to GenerationSessionDialog"
```

---

## Task 7: Gate Mark-as-Published by Project Category

**Files:**
- Modify: `components/projects/outputs-list.tsx`

The `OutputCard` already has a "Mark as published" button. We need to hide it when the project is not Marketing-category. Add a `showPublish` boolean prop.

- [ ] **Step 1: Add showPublish to OutputCard and OutputsList props**

In `OutputCard` function signature, add `showPublish: boolean`:

```typescript
function OutputCard({
  output,
  attachments,
  onUpdated,
  onDeleted,
  showPublish,         // ← ADD
}: {
  output: Output
  attachments?: OutputCardAttachment[]
  onUpdated: (updated: Output) => void
  onDeleted: (id: string) => void
  showPublish: boolean  // ← ADD
}) {
```

In `OutputsListProps`, add:
```typescript
interface OutputsListProps {
  projectId: string
  initialOutputs: Output[]
  outputAttachmentsByOutputId: Record<string, OutputCardAttachment[]>
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  showPublish?: boolean   // ← ADD (defaults to false)
}
```

- [ ] **Step 2: Thread showPublish down to OutputCard**

In `OutputsList`, pass `showPublish={showPublish ?? false}` to each `OutputCard`.

- [ ] **Step 3: Gate the publish button in OutputCard**

```typescript
{showPublish && !output.published_at && (
  <button
    onClick={handlePublish}
    disabled={publishing}
    title="Mark as published"
    className="..."
  >
    <Send className="h-3.5 w-3.5" />
  </button>
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/projects/outputs-list.tsx
git commit -m "feat: gate Mark as Published button by showPublish prop"
```

---

## Task 8: Update Project Page and ProjectDetail

**Files:**
- Modify: `app/dashboard/projects/[id]/page.tsx`
- Modify: `components/projects/project-detail.tsx`
- Modify: `lib/queries/projects.ts` (already done in Task 4a)

### 8a: Project page — fetch extra data for Content Studio

- [ ] **Step 1: Import new queries in the page**

```typescript
import { getContentIdeasForProject } from '@/lib/queries/content-ideas'
import { getPublishedOutputsForOrg } from '@/lib/queries/outputs'
```

- [ ] **Step 2: Extend the parallel fetch**

```typescript
const [
  project,
  outputs,
  contentTypes,
  authors,
  brandContext,
  materials,
  discoveryEntries,
  orgTeams,
  orgMembers,
  contentIdeas,         // ← ADD
  publishedOutputs,     // ← ADD
] = await Promise.all([
  getProjectById(id, org.id, user.id),
  getOutputsForProject(id, org.id),
  getActiveContentTypes(org.id),
  getAuthorProfiles(org.id),
  getBrandContext(org.id),
  getProjectMaterials(id, org.id),
  getDiscoveryEntries(id, org.id),
  getTeamsForOrg(org.id),
  getOrgMembersWithProfiles(org.id),
  getContentIdeasForProject(id, org.id),       // ← ADD
  getPublishedOutputsForOrg(org.id),           // ← ADD
])
```

- [ ] **Step 3: Pass new props to ProjectDetail**

```typescript
return (
  <ProjectDetail
    project={project}
    organizationId={org.id}
    currentUserId={user.id}
    isAdmin={org.role === 'admin'}
    isCreator={project.created_by === user.id}
    outputs={outputs}
    outputAttachmentsByOutputId={outputAttachmentsByOutputId}
    contentTypes={contentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
    authors={authors.map((a) => ({ id: a.id, name: a.name }))}
    hasBrandContext={!!(brandContext?.mission && brandContext?.company_name)}
    materials={materials}
    discoveryEntries={discoveryEntries}
    orgTeams={orgTeams.map((t) => ({ id: t.id, name: t.name }))}
    orgMembers={orgMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
    projectTeams={projectTeams}
    projectMembers={projectMembers.map((m) => ({ user_id: m.user_id, full_name: m.full_name }))}
    contentIdeas={contentIdeas}           // ← ADD
    publishedOutputs={publishedOutputs}   // ← ADD
  />
)
```

### 8b: ProjectDetail — detect tool_key and dispatch

- [ ] **Step 4: Update the Project interface in project-detail.tsx**

```typescript
interface Project {
  id: string
  name: string
  description: string | null
  category?: string | null       // ← ADD
  tool_key?: string | null       // ← ADD
  created_by: string
  status?: string | null
  visibility?: string | null
  tags?: string[] | null
}
```

- [ ] **Step 5: Add new props to ProjectDetailProps**

Import types and add:
```typescript
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'
import type { PublishedOutput } from '@/lib/queries/outputs'
import { ContentStudioDetail } from '@/components/content-studio/content-studio-detail'

interface ProjectDetailProps {
  // ... existing props ...
  contentIdeas: ContentIdeaRow[]
  publishedOutputs: PublishedOutput[]
}
```

- [ ] **Step 6: Early-return ContentStudioDetail for tool_key === 'content_studio'**

At the top of the `ProjectDetail` component function body, before any other rendering logic:

```typescript
// Dispatch tool-specific views
if (project.tool_key === 'content_studio') {
  return (
    <ContentStudioDetail
      project={project}
      organizationId={organizationId}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      contentIdeas={contentIdeas}
      publishedOutputs={publishedOutputs}
      outputs={outputs}
      outputAttachmentsByOutputId={outputAttachmentsByOutputId}
      contentTypes={contentTypes}
      authors={authors}
      hasBrandContext={hasBrandContext}
    />
  )
}
```

- [ ] **Step 7: Pass showPublish to OutputsList in the standard project view**

In the standard project view within ProjectDetail, find where `OutputsList` is rendered and pass:
```typescript
<OutputsList
  projectId={project.id}
  initialOutputs={outputs}
  outputAttachmentsByOutputId={outputAttachmentsByOutputId}
  authors={authors}
  contentTypes={contentTypes}
  hasBrandContext={hasBrandContext}
  showPublish={project.category === 'Marketing'}   // ← ADD
/>
```

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/projects/[id]/page.tsx components/projects/project-detail.tsx
git commit -m "feat: dispatch content-studio tool view from project detail"
```

---

## Task 9: Content Studio UI Components

**Files:**
- Create: `components/content-studio/content-studio-detail.tsx`
- Create: `components/content-studio/backlog-section.tsx`
- Create: `components/content-studio/published-section.tsx`

### 9a: BacklogSection

- [ ] **Step 1: Create `components/content-studio/backlog-section.tsx`**

The Backlog section is a collapsible toggle with:
- A list of `ContentIdeaRow` cards
- An "Add idea" inline form (title, description optional, platform select, platform_owner toggle)
- Each idea card shows title, platform, owner badge, and a "Build →" button
- "Build →" calls `onBuildIdea(idea)` which opens the Generate section pre-filled

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, Plus, X, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'

const PLATFORMS = [
  'LinkedIn', 'Email Newsletter', 'Blog / Website', 'Instagram',
  'Twitter / X', 'YouTube', 'TikTok', 'Podcast', 'Other',
]

interface BacklogSectionProps {
  projectId: string
  initialIdeas: ContentIdeaRow[]
  onBuildIdea: (idea: ContentIdeaRow) => void
}

export function BacklogSection({ projectId, initialIdeas, onBuildIdea }: BacklogSectionProps) {
  const [open, setOpen] = useState(true)
  const [ideas, setIdeas] = useState<ContentIdeaRow[]>(initialIdeas)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [platformOwner, setPlatformOwner] = useState<'author' | 'company'>('company')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        platform,
        platformOwner,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to save idea.'); return }
    const { idea } = await res.json()
    setIdeas((prev) => [idea, ...prev])
    setTitle('')
    setDescription('')
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content-ideas/${id}`, { method: 'DELETE' })
    if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <section className="border-t border-border">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Backlog</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {ideas.length}
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open ? 'rotate-0' : '-rotate-90')} />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {/* Add idea button */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add idea
            </button>
          )}

          {/* Add form */}
          {showForm && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="idea-title" className="text-xs font-medium text-foreground">Idea</label>
                <input
                  id="idea-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's the content idea?"
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="idea-desc" className="text-xs font-medium text-foreground">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="idea-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Any context, angle, or talking points…"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="idea-platform" className="text-xs font-medium text-foreground">Platform</label>
                  <select
                    id="idea-platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Published on</label>
                  <div className="flex rounded-md border border-input overflow-hidden">
                    {(['company', 'author'] as const).map((owner) => (
                      <button
                        key={owner}
                        type="button"
                        onClick={() => setPlatformOwner(owner)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-medium transition-colors',
                          platformOwner === owner
                            ? 'bg-foreground text-background'
                            : 'bg-background text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {owner === 'company' ? 'Company' : 'Author'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!title.trim() || saving}
                  className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save idea'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setError(null) }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Ideas list */}
          {ideas.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground py-4 text-center">No ideas yet. Add the first one.</p>
          )}
          <div className="flex flex-col gap-2">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{idea.title}</p>
                  {idea.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {idea.platform}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {idea.platform_owner === 'company' ? 'Company page' : 'Author page'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onBuildIdea(idea)}
                    title="Build this idea"
                    className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                  >
                    Build
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idea.id)}
                    title="Delete idea"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
```

### 9b: PublishedSection

- [ ] **Step 2: Create `components/content-studio/published-section.tsx`**

Collapsible section showing org-wide published outputs. Each card shows:
- Content type badge, platform (from project name), published date
- Performance summary row (views 1d/7d/30d, visits, signups)
- Expand to enter/edit performance stats

Note: `Output` type here uses `PublishedOutput` from queries (always has `published_at`). The stats panel extends the existing pattern from `outputs-list.tsx` but with the new fields.

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, BarChart2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublishedOutput } from '@/lib/queries/outputs'
import { getModelById } from '@/lib/ai/models'

interface PublishedSectionProps {
  initialOutputs: PublishedOutput[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PublishedCard({ output: initial }: { output: PublishedOutput }) {
  const [output, setOutput] = useState(initial)
  const [showStats, setShowStats] = useState(false)
  const [form, setForm] = useState({
    views_1d: output.views_1d?.toString() ?? '',
    views_7d: output.views_7d?.toString() ?? '',
    views_30d: output.views_30d?.toString() ?? '',
    website_visits: output.website_visits?.toString() ?? '',
    email_signups: output.email_signups?.toString() ?? '',
    reach: output.reach?.toString() ?? '',
    engagement: output.engagement?.toString() ?? '',
    performance_notes: output.performance_notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSaveStats() {
    setSaving(true)
    const res = await fetch(`/api/outputs/${output.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        views_1d: form.views_1d ? parseInt(form.views_1d, 10) : null,
        views_7d: form.views_7d ? parseInt(form.views_7d, 10) : null,
        views_30d: form.views_30d ? parseInt(form.views_30d, 10) : null,
        website_visits: form.website_visits ? parseInt(form.website_visits, 10) : null,
        email_signups: form.email_signups ? parseInt(form.email_signups, 10) : null,
        reach: form.reach ? parseInt(form.reach, 10) : null,
        engagement: form.engagement ? parseInt(form.engagement, 10) : null,
        performance_notes: form.performance_notes.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) return
    const { output: updated } = await res.json()
    setOutput((prev) => ({ ...prev, ...updated }))
    setShowStats(false)
  }

  const hasStats = output.views_30d != null || output.website_visits != null || output.email_signups != null || output.reach != null
  const modelLabel = getModelById(output.model_id)?.label ?? output.model_id

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {output.content_types?.name ?? 'Unknown type'}
          </span>
          {output.projects?.name && (
            <span className="text-xs text-muted-foreground">
              {output.projects.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Published {formatDate(output.published_at)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          title="Performance stats"
          className={cn(
            'rounded-md p-1.5 transition-colors',
            hasStats ? 'text-violet-600 hover:bg-violet-500/10' : 'text-muted-foreground hover:bg-accent',
          )}
        >
          <BarChart2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Performance summary strip */}
      {!showStats && hasStats && (
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-2 bg-violet-500/5">
          {output.views_1d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.views_1d.toLocaleString()}</span> views (1d)
            </p>
          )}
          {output.views_7d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.views_7d.toLocaleString()}</span> views (7d)
            </p>
          )}
          {output.views_30d != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.views_30d.toLocaleString()}</span> views (30d)
            </p>
          )}
          {output.website_visits != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.website_visits.toLocaleString()}</span> site visits
            </p>
          )}
          {output.email_signups != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{output.email_signups.toLocaleString()}</span> signups
            </p>
          )}
        </div>
      )}

      {/* Stats form */}
      {showStats && (
        <div className="border-b border-border bg-muted/10 px-4 py-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600">Performance</p>
          <div className="grid grid-cols-3 gap-3">
            {([['views_1d', 'Views after 1 day'], ['views_7d', 'Views after 7 days'], ['views_30d', 'Views after 30 days']] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{label}</label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Website visits</label>
              <input
                type="number"
                value={form.website_visits}
                onChange={(e) => setForm((f) => ({ ...f, website_visits: e.target.value }))}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email signups</label>
              <input
                type="number"
                value={form.email_signups}
                onChange={(e) => setForm((f) => ({ ...f, email_signups: e.target.value }))}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Notes</label>
            <textarea
              value={form.performance_notes}
              onChange={(e) => setForm((f) => ({ ...f, performance_notes: e.target.value }))}
              rows={2}
              placeholder="What worked, what didn't…"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveStats}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save stats'}
            </button>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Brief */}
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Brief</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{output.brief}</p>
      </div>
    </div>
  )
}

export function PublishedSection({ initialOutputs }: PublishedSectionProps) {
  const [open, setOpen] = useState(true)
  const outputs = initialOutputs

  return (
    <section className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Published</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {outputs.length}
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open ? 'rotate-0' : '-rotate-90')} />
      </button>

      {open && (
        <div className="px-6 pb-6">
          {outputs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No published content yet. Mark an output as published from any Marketing project.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {outputs.map((o) => (
                <PublishedCard key={o.id} output={o} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
```

### 9c: ContentStudioDetail

- [ ] **Step 3: Create `components/content-studio/content-studio-detail.tsx`**

The top-level component for Content Studio. Renders 3 collapsible sections. Manages the "Build idea" state — when triggered, scrolls to Generate section and opens the dialog with pre-filled message.

```typescript
'use client'

import { useState, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { BacklogSection } from './backlog-section'
import { PublishedSection } from './published-section'
import { OutputsList } from '@/components/projects/outputs-list'
import {
  GenerationSessionDialog,
  type GeneratedOutputPayload,
} from '@/components/marketing/generation-session-dialog'
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'
import type { PublishedOutput, OutputWithCreator } from '@/lib/queries/outputs'
import type { OutputCardAttachment } from '@/components/projects/outputs-list'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
}

interface Author { id: string; name: string }
interface ContentType { id: string; name: string }

interface ContentStudioDetailProps {
  project: Project
  organizationId: string
  currentUserId: string
  isAdmin: boolean
  contentIdeas: ContentIdeaRow[]
  publishedOutputs: PublishedOutput[]
  outputs: OutputWithCreator[]
  outputAttachmentsByOutputId: Record<string, OutputCardAttachment[]>
  contentTypes: ContentType[]
  authors: Author[]
  hasBrandContext: boolean
}

export function ContentStudioDetail({
  project,
  organizationId,
  currentUserId,
  isAdmin,
  contentIdeas,
  publishedOutputs,
  outputs: initialOutputs,
  outputAttachmentsByOutputId,
  contentTypes,
  authors,
  hasBrandContext,
}: ContentStudioDetailProps) {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateSectionOpen, setGenerateSectionOpen] = useState(true)
  const [initialMessage, setInitialMessage] = useState('')
  const [outputs, setOutputs] = useState(initialOutputs)
  const generateRef = useRef<HTMLDivElement>(null)

  function handleBuildIdea(idea: ContentIdeaRow) {
    const msg = [
      `Write ${idea.platform} content for the ${idea.platform_owner === 'company' ? 'company page' : 'author page'}.`,
      `Idea: ${idea.title}`,
      idea.description ? `Context: ${idea.description}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    setInitialMessage(msg)
    setGenerateSectionOpen(true)
    setGenerateOpen(true)
    setTimeout(() => {
      generateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  function handleGenerated(newOutput: GeneratedOutputPayload) {
    const ct = contentTypes.find((c) => c.id === newOutput.content_type_id) ?? contentTypes[0]
    setOutputs((prev) => [
      {
        ...newOutput,
        project_id: project.id,
        published_at: null,
        reach: null,
        reach_metric: null,
        engagement: null,
        performance_notes: null,
        metadata: null,
        content_types: ct ? { name: ct.name } : null,
        projects: { name: project.name },
      },
      ...prev,
    ])
    setInitialMessage('')
  }

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-border px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">{project.name}</h1>
        {project.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Backlog section */}
      <BacklogSection
        projectId={project.id}
        initialIdeas={contentIdeas}
        onBuildIdea={handleBuildIdea}
      />

      {/* Generate section */}
      <section ref={generateRef} className="border-t border-border">
        <button
          type="button"
          onClick={() => setGenerateSectionOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Generate</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {outputs.length}
            </span>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', generateSectionOpen ? 'rotate-0' : '-rotate-90')} />
        </button>

        {generateSectionOpen && (
          <div className="px-6 pb-6">
            <OutputsList
              projectId={project.id}
              initialOutputs={outputs}
              outputAttachmentsByOutputId={outputAttachmentsByOutputId}
              authors={authors}
              contentTypes={contentTypes}
              hasBrandContext={hasBrandContext}
              showPublish
            />
          </div>
        )}
      </section>

      {/* Published section */}
      <PublishedSection initialOutputs={publishedOutputs} />

      {/* Generation dialog — opened from Backlog "Build" or Generate "Generate" button */}
      <GenerationSessionDialog
        open={generateOpen}
        onClose={() => { setGenerateOpen(false); setInitialMessage('') }}
        onGenerated={handleGenerated}
        projectId={project.id}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
        initialUserMessage={initialMessage}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/content-studio/
git commit -m "feat: add ContentStudio UI — BacklogSection, PublishedSection, ContentStudioDetail"
```

---

## Task 10: Update AI Prompts with New Performance Fields

**Files:**
- Modify: `lib/ai/prompts.ts`

`getTopPerformingOutputs` now returns `views_30d`, `website_visits`, `email_signups`. The prompt builder receives `topPerformers` — update the section that formats them.

- [ ] **Step 1: Find the top performers section in buildGenerationSystemPrompt**

Search `lib/ai/prompts.ts` for where `topPerformers` is used. It likely builds a block like:
```
Top performing content (for reference):
1. [brief] — reach: X views
```

- [ ] **Step 2: Update to include new fields**

```typescript
// In the top performers block:
topPerformers.map((p, i) => {
  const stats: string[] = []
  if (p.views_30d != null) stats.push(`${p.views_30d.toLocaleString()} views (30d)`)
  else if (p.reach != null) stats.push(`${p.reach.toLocaleString()} ${p.reach_metric ?? 'reach'}`)
  if (p.website_visits != null) stats.push(`${p.website_visits.toLocaleString()} site visits`)
  if (p.email_signups != null) stats.push(`${p.email_signups.toLocaleString()} signups`)
  const statsStr = stats.length > 0 ? ` — ${stats.join(', ')}` : ''
  return `${i + 1}. Brief: "${p.brief}"${statsStr}`
}).join('\n')
```

- [ ] **Step 3: Update the TypeScript type for topPerformers in the prompt builder interface**

The `buildGenerationSystemPrompt` function accepts `topPerformers`. Add the new fields to the type it expects:

```typescript
topPerformers: Array<{
  id: string
  brief: string
  content: string
  reach: number | null
  reach_metric: string | null
  views_30d?: number | null
  website_visits?: number | null
  email_signups?: number | null
}> | null
```

Use `?` so it's backward-compatible during the transition.

- [ ] **Step 4: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat: include time-windowed perf metrics in AI top-performers context"
```

---

## Task 11: Build Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: zero TypeScript errors, zero build errors.

- [ ] **Step 2: Fix any type errors**

Common issues to watch for:
- `getProjectById` return type now includes `category` and `tool_key` — ProjectDetail's Project interface must match
- `OutputsList` now requires `showPublish` — all existing call sites must pass it (default to false for non-Marketing)
- `GenerationSessionDialog` new `initialUserMessage` prop is optional — no changes needed at existing call sites
- `getTopPerformingOutputs` return type changed — `buildGenerationSystemPrompt` type must accept new fields

- [ ] **Step 3: Final commit (if any fixes)**

```bash
git add .
git commit -m "fix: type errors from content studio feature"
```

---

## Manual Test Checklist

After deployment (or local dev server):

1. **Calendar removed** — Go to `/dashboard/company` → Company nav → Content group should have no Calendar link
2. **Content Studio in tools** — Go to `/dashboard/projects` → Tools strip should show "Content Studio" (not "Marketing Content")
3. **Backlog** — Click Content Studio → Backlog section visible → Add idea with all fields → Idea appears in list
4. **Build flow** — Click "Build →" on a backlog idea → GenerationSessionDialog opens in setup phase → Click Start → Chat input pre-filled with idea text (not sent)
5. **Generate** — Complete a generation session in Content Studio → Output appears in Generate section → "Mark as published" button visible (showPublish=true)
6. **Mark as Published** — Click publish button → Output moves to Published section in Content Studio
7. **Performance stats** — Click stats button on Published item → Enter 1d/7d/30d views, visits, signups → Save → Summary strip appears
8. **Other projects** — Open a non-Marketing project → Generate content → No "Mark as Published" button visible
9. **Marketing project** — Open any other Marketing-category project → Generate content → "Mark as Published" button visible → Mark it → Appears in Content Studio Published list
10. **AI context** — Start a generation session → AI system prompt includes top performers with performance data (verify via console/logs if needed)
