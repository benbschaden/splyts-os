import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getBenchmarksWithDefaults, upsertBenchmark } from '@/lib/queries/content-benchmarks'

const upsertSchema = z.object({
  platform: z.string().min(1).max(200),
  metric_name: z.string().min(1).max(200),
  benchmark_value: z.number().finite(),
  benchmark_unit: z.string().min(1).max(50),
  notes: z.string().max(5000).nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const data = await getBenchmarksWithDefaults(org.id)
    return Response.json({ data })
  } catch (e) {
    console.error('[content-benchmarks GET]', e)
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
    if (org.role !== 'admin') return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { benchmark, error } = await upsertBenchmark({
      organizationId: org.id,
      platform: parsed.data.platform,
      metricName: parsed.data.metric_name,
      benchmarkValue: parsed.data.benchmark_value,
      benchmarkUnit: parsed.data.benchmark_unit,
      notes: parsed.data.notes ?? null,
      userId: user.id,
    })

    if (error || !benchmark) return Response.json({ error: error ?? 'Failed to save' }, { status: 500 })
    return Response.json({ data: benchmark }, { status: 201 })
  } catch (e) {
    console.error('[content-benchmarks POST]', e)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
