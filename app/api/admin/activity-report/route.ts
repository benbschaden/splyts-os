import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getUserDisplayNamesByIds } from '@/lib/queries/user-profile'
import { isOwner } from '@/lib/auth/roles'
import { DEFAULT_MODEL } from '@/lib/ai/models'

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const org = await getOrganizationForUser(user.id)
  if (!org || !isOwner(org.role)) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const query = (body.query as string | undefined)?.trim()
  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  const dateFrom = body.date_from as string | undefined
  const dateTo = body.date_to as string | undefined
  const userIds = body.user_ids as string[] | undefined
  const teamId = body.team_id as string | undefined

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  const activityData = await fetchActivityData({
    organizationId: org.id,
    dateFrom,
    dateTo,
    userIds,
    teamId,
  })

  if (activityData.totalItems === 0) {
    return Response.json({
      report: 'No activity found for the specified criteria.',
      activity: activityData,
    })
  }

  const anthropic = new Anthropic({ apiKey, maxRetries: 4 })
  const systemPrompt = buildSystemPrompt(org.name)
  const userPrompt = buildUserPrompt(query, activityData)

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL.id,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const report = textBlock?.type === 'text' ? textBlock.text : 'Failed to generate report.'

  return Response.json({ report, activity: activityData })
}

interface ActivityData {
  totalItems: number
  dateRange: { from: string; to: string }
  byUser: Record<string, { name: string; items: ActivityItem[] }>
  byType: Record<string, number>
}

interface ActivityItem {
  content_type: string
  title: string
  summary: string
  created_at: string
}

async function fetchActivityData(params: {
  organizationId: string
  dateFrom?: string
  dateTo?: string
  userIds?: string[]
  teamId?: string
}): Promise<ActivityData> {
  const service = createUntypedServiceClient()

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const from = params.dateFrom || defaultFrom
  const to = params.dateTo || now.toISOString()

  let query = service
    .from('content_index')
    .select('content_type, title, summary, created_by, created_at')
    .eq('organization_id', params.organizationId)
    .gte('created_at', from)
    .lte('created_at', to)
    .not('created_by', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (params.userIds && params.userIds.length > 0) {
    query = query.in('created_by', params.userIds)
  }

  if (params.teamId) {
    const { data: teamMembers } = await service
      .from('team_members')
      .select('user_id')
      .eq('team_id', params.teamId)

    if (teamMembers && teamMembers.length > 0) {
      const memberIds = teamMembers.map((m: { user_id: string }) => m.user_id)
      query = query.in('created_by', memberIds)
    }
  }

  const { data: rows, error } = await query
  if (error || !rows) {
    return { totalItems: 0, dateRange: { from, to }, byUser: {}, byType: {} }
  }

  const userIdSet = new Set<string>()
  for (const row of rows) {
    if (row.created_by) userIdSet.add(row.created_by as string)
  }

  const nameMap = await getUserDisplayNamesByIds([...userIdSet])

  const byUser: Record<string, { name: string; items: ActivityItem[] }> = {}
  const byType: Record<string, number> = {}

  for (const row of rows) {
    const userId = row.created_by as string
    const contentType = row.content_type as string

    if (!byUser[userId]) {
      byUser[userId] = {
        name: nameMap[userId] || 'Unknown',
        items: [],
      }
    }
    byUser[userId].items.push({
      content_type: contentType,
      title: row.title as string,
      summary: row.summary as string,
      created_at: row.created_at as string,
    })

    byType[contentType] = (byType[contentType] || 0) + 1
  }

  return {
    totalItems: rows.length,
    dateRange: { from, to },
    byUser,
    byType,
  }
}

function buildSystemPrompt(orgName: string): string {
  return `You are the activity report generator for ${orgName}. You receive structured data about what team members have created and produce clear, professional reports.

Rules:
- Format the report based on what the user asks for (SR&ED, investor update, team summary, etc.)
- Use the actual data provided — never make up or assume activity
- Group by person when relevant
- Include dates when relevant
- Be concise but comprehensive
- Use markdown formatting for readability`
}

function buildUserPrompt(query: string, data: ActivityData): string {
  const parts: string[] = []

  parts.push(`Report request: ${query}`)
  parts.push(`\nDate range: ${data.dateRange.from.slice(0, 10)} to ${data.dateRange.to.slice(0, 10)}`)
  parts.push(`Total items: ${data.totalItems}`)

  parts.push('\n## Activity by type')
  for (const [type, count] of Object.entries(data.byType).sort((a, b) => b[1] - a[1])) {
    parts.push(`- ${type.replace(/_/g, ' ')}: ${count}`)
  }

  parts.push('\n## Activity by person')
  for (const [, userData] of Object.entries(data.byUser)) {
    parts.push(`\n### ${userData.name} (${userData.items.length} items)`)
    for (const item of userData.items.slice(0, 50)) {
      const date = item.created_at.slice(0, 10)
      parts.push(`- [${date}] ${item.content_type.replace(/_/g, ' ')}: ${item.title || 'Untitled'} — ${item.summary.slice(0, 200)}`)
    }
  }

  return parts.join('\n')
}
