import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { createInvite } from '@/lib/queries/team'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await getOrganizationForUser(user.id)
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 })
  if (org.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { email, role } = parsed.data

  const db = createServiceClient()

  // Create invite record
  const { invite, error } = await createInvite({
    organizationId: org.id,
    email,
    role,
    invitedBy: user.id,
  })

  if (error || !invite) {
    return Response.json({ error }, { status: 500 })
  }

  // Send invite email via Supabase Auth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://splyts-os.vercel.app'
  const redirectTo = `${appUrl}/auth/callback?invite_token=${invite.token}`

  const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (inviteError) {
    // 422 means the user already exists in Supabase Auth (previously invited or signed up).
    // That's fine — they can log in with the magic link or their existing credentials.
    // Any other error is a real failure.
    const status = (inviteError as { status?: number }).status
    if (status !== 422) {
      return Response.json({ error: 'Failed to send invite email. Please try again.' }, { status: 500 })
    }
  }

  return Response.json({ message: `Invite sent to ${email}` }, { status: 201 })
}
