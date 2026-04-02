import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { deleteBenchmark } from '@/lib/queries/content-benchmarks'
import { isAtLeastAdmin } from '@/lib/auth/roles'

export async function DELETE(
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
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    const { error } = await deleteBenchmark(id, org.id)
    if (error) return Response.json({ error }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch (e) {
    console.error('[content-benchmarks DELETE]', e)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
