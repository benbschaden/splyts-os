# Merged Author Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate `author_profiles` table and `platform_owner` binary toggle with a single unified "author" concept — either "Company" (brand voice, company page) or a specific team member (their personal voice profile, their personal page) — sourced from `user_profiles`.

**Architecture:** Voice fields (`voice`, `tone`, `writing_style`, `personal_pillars`, `platform_notes`) move from the admin-managed `author_profiles` table into the per-user `user_profiles` table. The `content_ideas.platform_owner` ('company'|'author') column is replaced by `author_user_id` (nullable UUID — null = company, UUID = specific team member). The generation author dropdown and the backlog author selector both read from org members' user profiles, making them one consistent list. The `author_profiles` table and all associated files are deleted.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript strict, React client components, Zod validation

**⚠️ Data note:** The existing author profile(s) in `author_profiles` will be permanently deleted by the migration. The team member(s) must re-enter their voice data in Settings → Profile after deployment.

---

## File map

**Create:**
- `supabase/migrations/20260406_author_voice_to_user_profiles.sql`
- `supabase/migrations/20260406_author_voice_to_user_profiles.md`

**Modify:**
- `lib/queries/user-profile.ts` — add voice fields, add `getOrgMembersAsAuthors`
- `lib/queries/content-ideas.ts` — update `ContentIdeaRow` type, `createContentIdea` params
- `app/api/profile/route.ts` — add voice fields to schema
- `app/api/content-ideas/route.ts` — change `platformOwner` → `authorUserId`
- `app/api/generate/route.ts` — look up author from `user_profiles`, not `author_profiles`
- `components/settings/profile-form.tsx` — add voice section UI
- `components/content-studio/backlog-section.tsx` — replace binary toggle with author dropdown
- `components/content-studio/content-studio-detail.tsx` — pass `authors` to backlog, pass `initialAuthorId` to dialog
- `components/marketing/generation-session-dialog.tsx` — add `initialAuthorId` prop
- `components/company/company-nav.tsx` — remove Authors link
- `app/dashboard/settings/profile/page.tsx` — pass voice fields to `ProfileForm`
- `app/dashboard/projects/[id]/page.tsx` — replace `getAuthorProfiles` with org members

**Delete:**
- `lib/queries/author-profiles.ts`
- `app/api/author-profiles/route.ts`
- `app/api/author-profiles/[id]/route.ts`
- `components/settings/authors-list.tsx`
- `components/settings/author-profile-dialog.tsx`
- `app/dashboard/company/authors/page.tsx`

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260406_author_voice_to_user_profiles.sql`
- Create: `supabase/migrations/20260406_author_voice_to_user_profiles.md`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Author Voice → User Profiles
-- ============================================================
-- 1. Add voice fields to user_profiles (each user owns their voice)
-- 2. Add author_user_id to content_ideas (replaces platform_owner)
-- 3. Drop platform_owner from content_ideas
-- 4. Drop author_profiles table entirely
-- ============================================================

-- 1. Voice fields on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice           TEXT,
  ADD COLUMN IF NOT EXISTS tone            TEXT,
  ADD COLUMN IF NOT EXISTS writing_style   TEXT,
  ADD COLUMN IF NOT EXISTS personal_pillars TEXT,
  ADD COLUMN IF NOT EXISTS platform_notes  TEXT;

-- 2. Replace platform_owner with a nullable user reference
--    NULL = "Company" (brand voice, company page)
--    UUID = specific team member (their voice, their page)
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES auth.users(id);

-- Existing rows: platform_owner='company' → author_user_id stays NULL (correct)
-- Existing rows: platform_owner='author'  → author_user_id also NULL
--   (no real user was ever linked; the old binary flag had no FK)
-- Nothing to backfill — all existing rows correctly default to NULL.

-- 3. Drop the now-redundant platform_owner column
--    (this also drops its inline CHECK constraint automatically)
ALTER TABLE content_ideas
  DROP COLUMN IF EXISTS platform_owner;

-- 4. Drop author_profiles (RLS policies and trigger drop automatically with the table)
DROP TABLE IF EXISTS author_profiles CASCADE;
```

- [ ] **Step 2: Write the companion markdown**

```markdown
# Migration: Author Voice → User Profiles

**File:** `20260406_author_voice_to_user_profiles.sql`
**Date:** 2026-04-06

## Summary

Moves voice profile fields from the admin-managed `author_profiles` table into `user_profiles` (self-managed per user). Replaces the binary `content_ideas.platform_owner` ('company'|'author') with `author_user_id` (nullable UUID), unifying the "where to publish" and "whose voice" concepts into one selection. Drops `author_profiles` entirely.

## Design notes

- `user_profiles.voice/tone/writing_style/personal_pillars/platform_notes` — all nullable; users fill these in at their own pace in Settings → Profile.
- `content_ideas.author_user_id` — NULL means "Company" (brand voice, company page). A UUID references the specific team member whose voice and page the content is for.
- Existing `platform_owner = 'author'` rows had no FK to a real user, so they safely become `author_user_id = NULL` (treated as Company). No data is silently misrepresented.
- `author_profiles` table is dropped with CASCADE. Any FK references from other tables would also drop — there are none.

## Data loss

The existing rows in `author_profiles` are permanently deleted. Team members must re-enter their voice data in Settings → Profile after deployment.
```

- [ ] **Step 3: Apply the migration to local Supabase**

```bash
supabase db push
```

Expected: migration runs without errors. Verify with:
```bash
supabase db diff
```
Expected: no pending migrations.

- [ ] **Step 4: Regenerate TypeScript types**

```bash
supabase gen types typescript --local > lib/types/database.ts
```

Expected: `lib/types/database.ts` updated — `user_profiles` Row now includes voice fields, `content_ideas` Row no longer has `platform_owner`, now has `author_user_id`. The `author_profiles` table type is gone.

---

## Task 2: User profile query layer

**Files:**
- Modify: `lib/queries/user-profile.ts`

- [ ] **Step 1: Replace the entire file contents**

Replace `lib/queries/user-profile.ts` with:

```typescript
import { createServiceClient } from '@/lib/supabase/service'

export interface UserProfileData {
  full_name: string | null
  role: string | null
  avatar_url: string | null
  voice: string | null
  tone: string | null
  writing_style: string | null
  personal_pillars: string | null
  platform_notes: string | null
}

const VOICE_COLUMNS = 'id, full_name, role, avatar_url, voice, tone, writing_style, personal_pillars, platform_notes, updated_at'

export async function getUserProfile(userId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select(VOICE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return data
}

/** Display names for outputs / activity lists (user id → full_name). */
export async function getUserDisplayNamesByIds(userIds: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', unique)

  if (error || !data) return {}
  return Object.fromEntries(data.map((p) => [p.id, p.full_name]))
}

export type UserProfileSummary = { full_name: string | null; avatar_url: string | null }

/** Names + avatars for message streams (user id → { full_name, avatar_url }). */
export async function getUserDisplayNamesAndAvatarsByIds(
  userIds: string[],
): Promise<Record<string, UserProfileSummary>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url')
    .in('id', unique)

  if (error || !data) return {}
  return Object.fromEntries(
    data.map((p) => [p.id, { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null }]),
  )
}

export async function upsertUserProfile(userId: string, profile: UserProfileData) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select(VOICE_COLUMNS)
    .single()

  if (error) return { profile: null, error: 'Failed to save profile' }
  return { profile: data, error: null }
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) return { error: 'Failed to update avatar' }
  return { error: null }
}

/** All org members as author options for generation dialogs and backlog.
 *  Returns { id: user_id, name: full_name } for every member with a profile. */
export async function getOrgMembersAsAuthors(
  organizationId: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createServiceClient()

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)

  if (error || !members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', userIds)
    .not('full_name', 'is', null)

  if (!profiles) return []

  return profiles
    .filter((p) => p.full_name)
    .map((p) => ({ id: p.id, name: p.full_name! }))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/user-profile.ts
git commit -m "feat: add voice fields and getOrgMembersAsAuthors to user-profile queries"
```

---

## Task 3: Profile API route

**Files:**
- Modify: `app/api/profile/route.ts`

- [ ] **Step 1: Update schema and handler to include voice fields**

Replace the entire file:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, upsertUserProfile } from '@/lib/queries/user-profile'

const updateProfileSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  voice: z.string().max(1000).nullable().optional(),
  tone: z.string().max(1000).nullable().optional(),
  writing_style: z.string().max(2000).nullable().optional(),
  personal_pillars: z.string().max(2000).nullable().optional(),
  platform_notes: z.string().max(2000).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserProfile(user.id)
  return NextResponse.json({
    data: {
      ...profile,
      email: user.email,
    },
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await getUserProfile(user.id)

  const { profile, error } = await upsertUserProfile(user.id, {
    full_name: parsed.data.full_name ?? existing?.full_name ?? null,
    role: parsed.data.role ?? existing?.role ?? null,
    avatar_url: existing?.avatar_url ?? null,
    voice: parsed.data.voice ?? existing?.voice ?? null,
    tone: parsed.data.tone ?? existing?.tone ?? null,
    writing_style: parsed.data.writing_style ?? existing?.writing_style ?? null,
    personal_pillars: parsed.data.personal_pillars ?? existing?.personal_pillars ?? null,
    platform_notes: parsed.data.platform_notes ?? existing?.platform_notes ?? null,
  })

  if (error || !profile) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: profile })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add voice fields to profile API route"
```

---

## Task 4: Profile settings UI

**Files:**
- Modify: `app/dashboard/settings/profile/page.tsx`
- Modify: `components/settings/profile-form.tsx`

- [ ] **Step 1: Update the profile page to pass voice fields**

Replace `app/dashboard/settings/profile/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/queries/user-profile'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your personal details. Visible to everyone in your organisation.
        </p>
      </div>

      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? '',
          role: profile?.role ?? '',
          avatar_url: profile?.avatar_url ?? null,
          email: user.email ?? '',
          voice: profile?.voice ?? '',
          tone: profile?.tone ?? '',
          writing_style: profile?.writing_style ?? '',
          personal_pillars: profile?.personal_pillars ?? '',
          platform_notes: profile?.platform_notes ?? '',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Read the full existing ProfileForm to understand its structure before editing**

Read `components/settings/profile-form.tsx` lines 1–222.

- [ ] **Step 3: Update ProfileForm to include voice fields**

In `components/settings/profile-form.tsx`:

**Update the props interface** (replace the existing `ProfileFormProps`):

```typescript
interface ProfileFormProps {
  initial: {
    full_name: string
    role: string
    avatar_url: string | null
    email: string
    voice: string
    tone: string
    writing_style: string
    personal_pillars: string
    platform_notes: string
  }
}
```

**Add voice state** (after the existing `role` state line):

```typescript
const [voice, setVoice] = useState(initial.voice)
const [tone, setTone] = useState(initial.tone)
const [writingStyle, setWritingStyle] = useState(initial.writing_style)
const [personalPillars, setPersonalPillars] = useState(initial.personal_pillars)
const [platformNotes, setPlatformNotes] = useState(initial.platform_notes)
```

**Update `handleSave` to include voice fields** (replace the `body` passed to `fetch`):

```typescript
body: JSON.stringify({
  full_name: fullName.trim() || null,
  role: role.trim() || null,
  voice: voice.trim() || null,
  tone: tone.trim() || null,
  writing_style: writingStyle.trim() || null,
  personal_pillars: personalPillars.trim() || null,
  platform_notes: platformNotes.trim() || null,
}),
```

**Add a "Content voice" section** to the JSX, after the existing role field and before the submit button:

```tsx
{/* Content voice section */}
<div className="space-y-4 border-t border-border pt-4">
  <div className="space-y-1">
    <h3 className="text-sm font-semibold text-foreground">Content voice</h3>
    <p className="text-xs text-muted-foreground">
      Used when generating content in your voice. The more detail you add, the more accurate the output.
    </p>
  </div>

  <div className="space-y-1.5">
    <label htmlFor="profile-voice" className="text-sm font-medium text-foreground">
      Voice
    </label>
    <input
      id="profile-voice"
      type="text"
      value={voice}
      onChange={(e) => setVoice(e.target.value)}
      placeholder="e.g. Direct, curious, no jargon"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
    />
  </div>

  <div className="space-y-1.5">
    <label htmlFor="profile-tone" className="text-sm font-medium text-foreground">
      Tone
    </label>
    <input
      id="profile-tone"
      type="text"
      value={tone}
      onChange={(e) => setTone(e.target.value)}
      placeholder="e.g. Conversational but sharp"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
    />
  </div>

  <div className="space-y-1.5">
    <label htmlFor="profile-writing-style" className="text-sm font-medium text-foreground">
      Writing style
    </label>
    <textarea
      id="profile-writing-style"
      value={writingStyle}
      onChange={(e) => setWritingStyle(e.target.value)}
      rows={3}
      placeholder="e.g. Short punchy paragraphs. Stories before data. Always ends with a question."
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
    />
  </div>

  <div className="space-y-1.5">
    <label htmlFor="profile-personal-pillars" className="text-sm font-medium text-foreground">
      Personal pillars
    </label>
    <textarea
      id="profile-personal-pillars"
      value={personalPillars}
      onChange={(e) => setPersonalPillars(e.target.value)}
      rows={3}
      placeholder="e.g. B2B GTM, founder mental health, honest marketing"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
    />
  </div>

  <div className="space-y-1.5">
    <label htmlFor="profile-platform-notes" className="text-sm font-medium text-foreground">
      Platform notes
    </label>
    <textarea
      id="profile-platform-notes"
      value={platformNotes}
      onChange={(e) => setPlatformNotes(e.target.value)}
      rows={3}
      placeholder="e.g. LinkedIn: no hashtags, no bullet lists. Email: always use a P.S."
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
    />
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/settings/profile/page.tsx components/settings/profile-form.tsx
git commit -m "feat: add content voice section to profile settings"
```

---

## Task 5: Generate API route — author lookup

**Files:**
- Modify: `app/api/generate/route.ts`

The only change is lines 308–325 (the "Resolve author" block). Replace the `author_profiles` lookup with a `user_profiles` lookup, verifying org membership via `organization_members`.

- [ ] **Step 1: Replace the author resolution block**

Find this block in `app/api/generate/route.ts`:

```typescript
  // Resolve author
  let authorParam: AuthorParam

  if (authorId === 'company') {
    authorParam = { type: 'company' }
  } else {
    const { data: authorProfile } = await db
      .from('author_profiles')
      .select('name, role, voice, tone, writing_style, personal_pillars, platform_notes')
      .eq('id', authorId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!authorProfile) return Response.json({ error: 'Author not found' }, { status: 404 })

    authorParam = { type: 'named', ...authorProfile }
  }
```

Replace it with:

```typescript
  // Resolve author
  let authorParam: AuthorParam

  if (authorId === 'company') {
    authorParam = { type: 'company' }
  } else {
    // Verify the user is a member of this org, then fetch their voice profile
    const { data: membership } = await db
      .from('organization_members')
      .select('user_id')
      .eq('user_id', authorId)
      .eq('organization_id', org.id)
      .maybeSingle()

    if (!membership) return Response.json({ error: 'Not found' }, { status: 404 })

    const { data: authorProfile } = await db
      .from('user_profiles')
      .select('full_name, role, voice, tone, writing_style, personal_pillars, platform_notes')
      .eq('id', authorId)
      .maybeSingle()

    if (!authorProfile) return Response.json({ error: 'Not found' }, { status: 404 })

    authorParam = {
      type: 'named',
      name: authorProfile.full_name ?? 'Unknown',
      role: authorProfile.role,
      voice: authorProfile.voice,
      tone: authorProfile.tone,
      writing_style: authorProfile.writing_style,
      personal_pillars: authorProfile.personal_pillars,
      platform_notes: authorProfile.platform_notes,
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: resolve generation author from user_profiles instead of author_profiles"
```

---

## Task 6: Content ideas query layer

**Files:**
- Modify: `lib/queries/content-ideas.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { createServiceClient } from '@/lib/supabase/service'

export type ContentIdeaRow = {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string | null
  platform: string | null
  author_user_id: string | null
  content_type_id: string | null
  status: 'idea' | 'in_progress' | 'done'
  created_by: string
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  'id, organization_id, project_id, title, description, platform, author_user_id, content_type_id, status, created_by, created_at, updated_at'

export async function getContentIdeasForProject(
  projectId: string,
  organizationId: string,
): Promise<ContentIdeaRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .select(SELECT_COLUMNS)
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
  contentTypeId: string
  authorUserId: string | null
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
      content_type_id: params.contentTypeId,
      author_user_id: params.authorUserId,
      created_by: params.userId,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) return { idea: null, error: 'Failed to create content idea' }
  return { idea: data as ContentIdeaRow, error: null }
}

export async function updateContentIdea(
  id: string,
  organizationId: string,
  params: Partial<Pick<ContentIdeaRow, 'title' | 'description' | 'content_type_id' | 'author_user_id' | 'status'>>,
): Promise<{ idea: ContentIdeaRow | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('content_ideas')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select(SELECT_COLUMNS)
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

- [ ] **Step 2: Commit**

```bash
git add lib/queries/content-ideas.ts
git commit -m "feat: replace platform_owner with author_user_id in content-ideas queries"
```

---

## Task 7: Content ideas API route

**Files:**
- Modify: `app/api/content-ideas/route.ts`

- [ ] **Step 1: Replace the schema and POST handler**

Replace the entire file:

```typescript
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getContentIdeasForProject, createContentIdea } from '@/lib/queries/content-ideas'
import { getActiveContentTypes } from '@/lib/queries/content-types'
import { indexContent } from '@/lib/indexing/index-content'

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  contentTypeId: z.string().uuid(),
  // null = Company, UUID = specific team member
  authorUserId: z.string().uuid().nullable().optional(),
})

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { projectId, title, description, contentTypeId, authorUserId } = parsed.data

    // Verify the content type belongs to this org
    const orgContentTypes = await getActiveContentTypes(org.id)
    const validContentType = orgContentTypes.find((ct) => ct.id === contentTypeId)
    if (!validContentType) {
      return Response.json({ error: 'Invalid content type' }, { status: 400 })
    }

    const { idea, error } = await createContentIdea({
      organizationId: org.id,
      projectId,
      title,
      description: description ?? null,
      contentTypeId,
      authorUserId: authorUserId ?? null,
      userId: user.id,
    })

    if (error || !idea) return Response.json({ error: 'Failed to create idea' }, { status: 500 })

    indexContent('content_idea', idea, org.id).catch(err =>
      console.error('[content-index] Index failed:', err)
    )

    return Response.json({ idea }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/content-ideas/route.ts
git commit -m "feat: replace platformOwner with authorUserId in content-ideas API"
```

---

## Task 8: Project page — replace author source

**Files:**
- Modify: `app/dashboard/projects/[id]/page.tsx`

- [ ] **Step 1: Swap the import**

Remove:
```typescript
import { getAuthorProfiles } from '@/lib/queries/author-profiles'
```

Add:
```typescript
import { getOrgMembersAsAuthors } from '@/lib/queries/user-profile'
```

- [ ] **Step 2: Replace the `authors` fetch in the Promise.all**

Change:
```typescript
    getAuthorProfiles(org.id),
```
to:
```typescript
    getOrgMembersAsAuthors(org.id),
```

- [ ] **Step 3: Update the authors prop passed to ProjectDetail**

Change:
```typescript
      authors={authors.map((a) => ({ id: a.id, name: a.name }))}
```
to:
```typescript
      authors={authors}
```

(Because `getOrgMembersAsAuthors` already returns `{ id, name }[]`.)

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/projects/[id]/page.tsx
git commit -m "feat: source generation authors from org members instead of author_profiles"
```

---

## Task 9: Backlog section — author dropdown

**Files:**
- Modify: `components/content-studio/backlog-section.tsx`

The backlog section needs:
1. A new `authors` prop (the same `{ id, name }[]` list used by generation dialogs)
2. Replace the binary Company/Author toggle with a proper author dropdown
3. Send `authorUserId` (null or UUID) instead of `platformOwner`

- [ ] **Step 1: Replace the entire file**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, Plus, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentIdeaRow } from '@/lib/queries/content-ideas'

interface Author {
  id: string
  name: string
}

interface ContentType {
  id: string
  name: string
}

interface BacklogSectionProps {
  projectId: string
  initialIdeas: ContentIdeaRow[]
  contentTypes: ContentType[]
  authors: Author[]
  onBuildIdea: (idea: ContentIdeaRow) => void
}

export function BacklogSection({ projectId, initialIdeas, contentTypes, authors, onBuildIdea }: BacklogSectionProps) {
  const [open, setOpen] = useState(true)
  const [ideas, setIdeas] = useState<ContentIdeaRow[]>(initialIdeas)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentTypeId, setContentTypeId] = useState(contentTypes[0]?.id ?? '')
  // 'company' sentinel or a user UUID
  const [authorValue, setAuthorValue] = useState<string>('company')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAuthorOptions = [
    { id: 'company', name: 'Company page' },
    ...authors.map((a) => ({ id: a.id, name: `${a.name}'s page` })),
  ]

  function resolveContentTypeName(idea: ContentIdeaRow): string {
    if (idea.content_type_id) {
      return contentTypes.find((ct) => ct.id === idea.content_type_id)?.name ?? 'Unknown type'
    }
    return idea.platform ?? 'No type'
  }

  function resolveAuthorName(idea: ContentIdeaRow): string {
    if (!idea.author_user_id) return 'Company page'
    const author = authors.find((a) => a.id === idea.author_user_id)
    return author ? `${author.name}'s page` : 'Personal page'
  }

  async function handleAdd() {
    if (!title.trim() || !contentTypeId) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/content-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        contentTypeId,
        authorUserId: authorValue === 'company' ? null : authorValue,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save idea. Please try again.')
      return
    }

    const { idea } = await res.json()
    setIdeas((prev) => [idea, ...prev])
    setTitle('')
    setDescription('')
    setContentTypeId(contentTypes[0]?.id ?? '')
    setAuthorValue('company')
    setShowForm(false)
  }

  function handleCancel() {
    setShowForm(false)
    setTitle('')
    setDescription('')
    setContentTypeId(contentTypes[0]?.id ?? '')
    setAuthorValue('company')
    setError(null)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content-ideas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setIdeas((prev) => prev.filter((i) => i.id !== id))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <section className="border-t border-border">
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
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add idea
            </button>
          )}

          {showForm && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="idea-title" className="text-xs font-medium text-foreground">
                  Idea
                </label>
                <input
                  id="idea-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's the content idea?"
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="idea-desc" className="text-xs font-medium text-foreground">
                  Notes{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="idea-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Any angle, talking points, or context…"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="idea-content-type" className="text-xs font-medium text-foreground">
                    Content type
                  </label>
                  {contentTypes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      No content types configured.{' '}
                      <a href="/dashboard/company/content-types" className="underline">Set up content types</a>
                    </p>
                  ) : (
                    <select
                      id="idea-content-type"
                      value={contentTypeId}
                      onChange={(e) => setContentTypeId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {contentTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="idea-author" className="text-xs font-medium text-foreground">
                    Publish on
                  </label>
                  <select
                    id="idea-author"
                    value={authorValue}
                    onChange={(e) => setAuthorValue(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {allAuthorOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!title.trim() || !contentTypeId || saving}
                  className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save idea'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ideas.length === 0 && !showForm && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No ideas yet. Add the first one.
            </p>
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
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {idea.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {resolveContentTypeName(idea)}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {resolveAuthorName(idea)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onBuildIdea(idea)}
                    title="Build this idea"
                    className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                  >
                    Build
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idea.id)}
                    title="Delete idea"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
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

- [ ] **Step 2: Commit**

```bash
git add components/content-studio/backlog-section.tsx
git commit -m "feat: replace binary platform_owner toggle with author dropdown in backlog"
```

---

## Task 10: ContentStudioDetail — wire authors to backlog and initialAuthorId to dialog

**Files:**
- Modify: `components/content-studio/content-studio-detail.tsx`

Three changes:
1. Add `initialAuthorId` state
2. Pass `authors` to `BacklogSection`
3. Pass `initialAuthorId` to `GenerationSessionDialog`
4. Update `handleBuildIdea` to set `initialAuthorId` from the idea

- [ ] **Step 1: Add `initialAuthorId` state**

After the existing state declarations (after `const [initialMessage, setInitialMessage] = useState('')`), add:

```typescript
const [initialAuthorId, setInitialAuthorId] = useState<string>('company')
```

- [ ] **Step 2: Update `handleBuildIdea` to set author**

Replace the existing `handleBuildIdea` function:

```typescript
function handleBuildIdea(idea: ContentIdeaRow) {
  const contentTypeName = idea.content_type_id
    ? (contentTypes.find((ct) => ct.id === idea.content_type_id)?.name ?? 'content')
    : (idea.platform ?? 'content')

  const authorLabel = idea.author_user_id
    ? (authors.find((a) => a.id === idea.author_user_id)?.name
        ? `${authors.find((a) => a.id === idea.author_user_id)!.name}'s personal page`
        : 'a personal page')
    : 'the company page'

  const parts = [
    `Write ${contentTypeName} content for ${authorLabel}.`,
    `Idea: ${idea.title}`,
    idea.description ? `Context: ${idea.description}` : '',
  ].filter(Boolean)

  setInitialMessage(parts.join('\n'))
  setInitialAuthorId(idea.author_user_id ?? 'company')
  setGenerateSectionOpen(true)
  setGenerateOpen(true)

  setTimeout(() => {
    generateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}
```

- [ ] **Step 3: Pass `authors` to BacklogSection**

Find:
```tsx
      <BacklogSection
        projectId={project.id}
        initialIdeas={contentIdeas}
        contentTypes={contentTypes}
        onBuildIdea={handleBuildIdea}
      />
```

Replace with:
```tsx
      <BacklogSection
        projectId={project.id}
        initialIdeas={contentIdeas}
        contentTypes={contentTypes}
        authors={authors}
        onBuildIdea={handleBuildIdea}
      />
```

- [ ] **Step 4: Pass `initialAuthorId` to GenerationSessionDialog**

Find:
```tsx
      <GenerationSessionDialog
        open={generateOpen}
        onClose={handleCloseDialog}
        onGenerated={handleGenerated}
        projectId={project.id}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
        initialUserMessage={initialMessage}
      />
```

Replace with:
```tsx
      <GenerationSessionDialog
        open={generateOpen}
        onClose={handleCloseDialog}
        onGenerated={handleGenerated}
        projectId={project.id}
        authors={authors}
        contentTypes={contentTypes}
        hasBrandContext={hasBrandContext}
        initialUserMessage={initialMessage}
        initialAuthorId={initialAuthorId}
      />
```

- [ ] **Step 5: Commit**

```bash
git add components/content-studio/content-studio-detail.tsx
git commit -m "feat: wire author pre-selection from backlog Build button to generation dialog"
```

---

## Task 11: GenerationSessionDialog — initialAuthorId prop

**Files:**
- Modify: `components/marketing/generation-session-dialog.tsx`

- [ ] **Step 1: Add `initialAuthorId` to the props interface**

Find:
```typescript
interface GenerationSessionDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: GeneratedOutputPayload) => void
  onDraftDiscarded?: (id: string) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  initialUserMessage?: string
  resumeDraft?: ResumeDraft | null
}
```

Replace with:
```typescript
interface GenerationSessionDialogProps {
  open: boolean
  onClose: () => void
  onGenerated: (output: GeneratedOutputPayload) => void
  onDraftDiscarded?: (id: string) => void
  projectId: string
  authors: Author[]
  contentTypes: ContentType[]
  hasBrandContext: boolean
  initialUserMessage?: string
  initialAuthorId?: string
  resumeDraft?: ResumeDraft | null
}
```

- [ ] **Step 2: Add `initialAuthorId` to the destructured props**

Find:
```typescript
export function GenerationSessionDialog({
  open,
  onClose,
  onGenerated,
  onDraftDiscarded,
  projectId,
  authors,
  contentTypes,
  hasBrandContext,
  initialUserMessage,
  resumeDraft,
}: GenerationSessionDialogProps) {
```

Replace with:
```typescript
export function GenerationSessionDialog({
  open,
  onClose,
  onGenerated,
  onDraftDiscarded,
  projectId,
  authors,
  contentTypes,
  hasBrandContext,
  initialUserMessage,
  initialAuthorId,
  resumeDraft,
}: GenerationSessionDialogProps) {
```

- [ ] **Step 3: Use `initialAuthorId` when the dialog opens**

Find the `useEffect` that resets state when `open` changes. It will look similar to:

```typescript
  useEffect(() => {
    if (open) {
      if (resumeDraft) {
        // ... resume logic sets authorId from resumeDraft.authorId
      } else {
        setAuthorId('company')
        // ... other resets
      }
    }
  }, [open, resumeDraft])
```

In the `else` branch (new session, not a resume), replace `setAuthorId('company')` with:

```typescript
        setAuthorId(initialAuthorId ?? 'company')
```

Also add `initialAuthorId` to the dependency array:

```typescript
  }, [open, resumeDraft, initialAuthorId])
```

- [ ] **Step 4: Commit**

```bash
git add components/marketing/generation-session-dialog.tsx
git commit -m "feat: add initialAuthorId prop to GenerationSessionDialog"
```

---

## Task 12: Remove Authors from company nav and settings

**Files:**
- Modify: `components/company/company-nav.tsx`
- Delete: `app/dashboard/company/authors/page.tsx`
- Delete: `lib/queries/author-profiles.ts`
- Delete: `app/api/author-profiles/route.ts`
- Delete: `app/api/author-profiles/[id]/route.ts`
- Delete: `components/settings/authors-list.tsx`
- Delete: `components/settings/author-profile-dialog.tsx`

- [ ] **Step 1: Remove Authors from company nav**

In `components/company/company-nav.tsx`, remove this line from `COMPANY_ITEMS`:

```typescript
  { name: 'Authors', href: '/dashboard/company/authors' },
```

- [ ] **Step 2: Delete all author_profiles files**

```bash
rm app/dashboard/company/authors/page.tsx
rm lib/queries/author-profiles.ts
rm app/api/author-profiles/route.ts
rm "app/api/author-profiles/[id]/route.ts"
rm components/settings/authors-list.tsx
rm components/settings/author-profile-dialog.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove author_profiles system — replaced by user profile voice fields"
```

---

## Task 13: Build verification

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Common issues to watch for:
- Any remaining import of `getAuthorProfiles` or `author-profiles` (grep for it: `rg "author-profiles|getAuthorProfiles|author_profiles" --type ts`)
- Any remaining reference to `platform_owner` in TypeScript files (grep: `rg "platform_owner|platformOwner" --type ts`)
- Type mismatch on `ContentIdeaRow` where old code references `platform_owner`

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: builds successfully, zero errors.

- [ ] **Step 3: Manual smoke test**

1. Go to Settings → Profile — verify the Content Voice section appears with all 5 fields
2. Fill in voice/tone/writing style for your user — save — reload — verify fields persist
3. Go to Content Studio → Backlog → Add idea — verify the "Publish on" field is now a dropdown showing "Company page" and your name
4. Create an idea assigned to yourself — verify the idea card shows your name
5. Click "Build →" on that idea — verify the generation dialog opens with your name pre-selected in the Author dropdown
6. Generate content — verify it succeeds (the author lookup now hits user_profiles)
7. Verify Company nav no longer has "Authors" link
8. Verify `/dashboard/company/authors` returns 404

---

## Self-review

**Spec coverage:**
- ✅ Voice fields moved to user_profiles
- ✅ `platform_owner` replaced by `author_user_id` (unified concept)
- ✅ Backlog "Publish on" is now a proper author dropdown
- ✅ "Build →" pre-selects the correct author in the generation dialog
- ✅ Generate API reads from user_profiles
- ✅ Profile settings UI has voice section
- ✅ author_profiles table dropped
- ✅ Company > Authors page removed
- ✅ All author_profiles code deleted

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:**
- `ContentIdeaRow.author_user_id: string | null` — consistent through query layer, API route, BacklogSection, ContentStudioDetail
- `getOrgMembersAsAuthors` returns `{ id: string; name: string }[]` — matches the `Author` interface used by BacklogSection and GenerationSessionDialog
- `initialAuthorId?: string` — undefined defaults to 'company' consistently in GenerationSessionDialog
