'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircle, Mail, Crown, User, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Member {
  userId: string
  role: 'admin' | 'member'
  fullName: string | null
  createdAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

interface TeamManagerProps {
  members: Member[]
  pendingInvites: PendingInvite[]
  currentUserId: string
  reviewerTeams: ReviewerTeam[]
}

interface ReviewerTeamMember {
  user_id: string
  role: 'member' | 'reviewer'
  full_name: string | null
}

interface ReviewerTeam {
  id: string
  name: string
  members: ReviewerTeamMember[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TeamManager({ members, pendingInvites, currentUserId, reviewerTeams }: TeamManagerProps) {
  const router = useRouter()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [localMembers, setLocalMembers] = useState<Member[]>(members)
  const [localInvites, setLocalInvites] = useState<PendingInvite[]>(pendingInvites)
  const [localReviewerTeams, setLocalReviewerTeams] = useState<ReviewerTeam[]>(reviewerTeams)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })

    const data = await res.json()
    setInviting(false)

    if (!res.ok) {
      setInviteError(data.error ?? 'Failed to send invite. Please try again.')
      return
    }

    setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`)
    setInviteEmail('')
    setInviteRole('member')
    router.refresh()
  }

  async function handleRoleChange(userId: string, newRole: 'admin' | 'member') {
    setActionError(null)
    const res = await fetch(`/api/team/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to update role.')
      return
    }

    setLocalMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
    )
  }

  async function handleRemoveMember(userId: string) {
    setActionError(null)
    const res = await fetch(`/api/team/${userId}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to remove member.')
      return
    }

    setLocalMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  async function handleRevokeInvite(inviteId: string) {
    setActionError(null)
    const res = await fetch(`/api/invites/${inviteId}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to revoke invite.')
      return
    }

    setLocalInvites((prev) => prev.filter((i) => i.id !== inviteId))
    router.refresh()
  }

  async function handleReviewerRoleChange(
    teamId: string,
    userId: string,
    role: 'member' | 'reviewer',
  ) {
    setActionError(null)
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to update reviewer role.')
      return
    }

    setLocalReviewerTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team
        return {
          ...team,
          members: team.members.map((m) => (m.user_id === userId ? { ...m, role } : m)),
        }
      }),
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Invite form */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">Invite a team member</h2>
          <p className="text-sm text-muted-foreground">
            They will receive an email with a link to join your workspace.
          </p>
        </div>

        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(null) }}
            placeholder="colleague@company.com"
            disabled={inviting}
            className={cn(
              'flex-1 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50',
              inviteError ? 'border-destructive' : 'border-input',
            )}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
            disabled={inviting}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>

        {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-green-600 dark:text-green-400">{inviteSuccess}</p>}
      </div>

      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {/* Current members */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Members <span className="font-normal text-muted-foreground">({localMembers.length})</span>
        </h3>
        <div className="divide-y divide-border rounded-lg border border-border">
          {localMembers.map((member) => {
            const isCurrentUser = member.userId === currentUserId
            const displayName = member.fullName ?? 'Unknown user'
            return (
              <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(member.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isCurrentUser ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {member.role === 'admin' ? (
                        <><Crown className="h-3 w-3" /> Admin</>
                      ) : (
                        <><User className="h-3 w-3" /> Member</>
                      )}
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'member')}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {!isCurrentUser && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      title="Remove member"
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending invites */}
      {localInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Pending invites <span className="font-normal text-muted-foreground">({localInvites.length})</span>
          </h3>
          <div className="divide-y divide-border rounded-lg border border-border">
            {localInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDate(invite.expires_at)} · {invite.role}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeInvite(invite.id)}
                  title="Revoke invite"
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team reviewer controls */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Team reviewers
          <span className="ml-1 font-normal text-muted-foreground">
            (who can approve team documents for filing)
          </span>
        </h3>

        {localReviewerTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams found.</p>
        ) : (
          <div className="space-y-3">
            {localReviewerTeams.map((team) => (
              <div key={team.id} className="rounded-lg border border-border">
                <div className="border-b border-border px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">{team.name}</p>
                </div>
                {team.members.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No members assigned to this team.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {team.members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-foreground">{member.full_name ?? 'Unknown user'}</span>
                        <select
                          value={member.role}
                          onChange={(e) => handleReviewerRoleChange(team.id, member.user_id, e.target.value as 'member' | 'reviewer')}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="member">Member</option>
                          <option value="reviewer">Reviewer</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
