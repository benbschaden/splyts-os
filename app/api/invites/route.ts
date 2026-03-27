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
  const redirectTo = `${appUrl}/auth/confirm?invite_token=${invite.token}`

  const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (inviteError) {
    const status = (inviteError as { status?: number }).status

    // 422 = user already exists in Supabase Auth from a previous invite.
    // If they never confirmed their email, delete the ghost user and re-invite.
    // If they're a confirmed user, they already have an account.
    if (status === 422) {
      // auth.users is not accessible via PostgREST — use a SECURITY DEFINER
      // function to look up the user, then delete via the admin API (safe way).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (db as any).rpc('get_auth_user_by_email', {
        p_email: email,
      })

      const existing = Array.isArray(rows) ? rows[0] : null

      if (existing?.is_confirmed) {
        return Response.json(
          { error: 'This person already has an account. Ask them to log in directly.' },
          { status: 409 },
        )
      }

      if (existing?.user_id) {
        const { error: deleteError } = await db.auth.admin.deleteUser(existing.user_id)
        if (deleteError) {
          return Response.json({ error: 'Failed to send invite email. Please try again.' }, { status: 500 })
        }
      }

      // Ghost deleted (or was not found) — safe to re-invite
      const { error: retryError } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      })

      if (retryError) {
        return Response.json({ error: 'Failed to send invite email. Please try again.' }, { status: 500 })
      }
    } else {
      return Response.json({ error: 'Failed to send invite email. Please try again.' }, { status: 500 })
    }
  }

  return Response.json({ message: `Invite sent to ${email}` }, { status: 201 })
}
