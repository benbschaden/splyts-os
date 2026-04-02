import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getKpiSnapshots, upsertSnapshot } from '@/lib/queries/kpi-snapshots'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const createSchema = z.object({
  snapshot_date: z.string().min(1, 'Date is required'),
  values: z.record(z.string(), z.number()),
  notes: z.string().max(10000).nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const snapshots = await getKpiSnapshots(org.id)
    return Response.json({ data: snapshots })
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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { snapshot, error } = await upsertSnapshot(
      org.id,
      parsed.data.snapshot_date,
      parsed.data.values,
      parsed.data.notes ?? null,
      user.id,
    )

    if (error || !snapshot) return Response.json({ error }, { status: 500 })
    return Response.json({ data: snapshot }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
