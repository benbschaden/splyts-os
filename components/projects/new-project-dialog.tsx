'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Globe, Users, Lock, UserCheck, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Visibility = 'private' | 'organization' | 'team' | 'specific_users'

interface Team {
  id: string
  name: string
}

interface OrgMember {
  user_id: string
  full_name: string | null
}

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  defaultCategory?: string
  currentUserId?: string
}

const KNOWN_CATEGORIES = [
  'Growth',
  'Product',
  'Engineering',
  'Design',
  'Customer Success',
  'Data & Analytics',
  'Marketing',
  'Operations',
  'Finance',
  'People',
]

const VISIBILITY_OPTIONS: Array<{
  value: Visibility
  label: string
  description: string
  icon: typeof Globe
}> = [
  {
    value: 'organization',
    label: 'Whole company',
    description: 'All org members can see this',
    icon: Globe,
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Only selected teams',
    icon: Users,
  },
  {
    value: 'specific_users',
    label: 'Specific people',
    description: 'Only selected individuals',
    icon: UserCheck,
  },
  {
    value: 'private',
    label: 'Only me',
    description: 'Just you',
    icon: Lock,
  },
]

export function NewProjectDialog({
  open,
  onClose,
  defaultCategory,
  currentUserId,
}: NewProjectDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(defaultCategory ?? '')
  const [visibility, setVisibility] = useState<Visibility>('organization')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [estimatedEndDate, setEstimatedEndDate] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loadingPicker, setLoadingPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setCategory(defaultCategory ?? '')
      setVisibility('organization')
      setSelectedTeamIds([])
      setSelectedMemberIds([])
      setStartDate('')
      setEstimatedEndDate('')
    }
  }, [open, defaultCategory])

  // Load teams/members when team or specific_users visibility is selected
  useEffect(() => {
    if (!open) return
    if (visibility !== 'team' && visibility !== 'specific_users') return
    if (teams.length > 0 || members.length > 0) return // already loaded

    setLoadingPicker(true)
    Promise.all([fetch('/api/teams'), fetch('/api/org-members')])
      .then(async ([teamsRes, membersRes]) => {
        if (teamsRes.ok) {
          const json = await teamsRes.json()
          setTeams(json.data ?? [])
        }
        if (membersRes.ok) {
          const json = await membersRes.json()
          const allMembers: OrgMember[] = json.data ?? []
          setMembers(currentUserId ? allMembers.filter((m) => m.user_id !== currentUserId) : allMembers)
        }
      })
      .finally(() => setLoadingPicker(false))
  }, [visibility, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    )
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (visibility === 'team' && selectedTeamIds.length === 0) {
      setError('Select at least one team.')
      return
    }
    if (visibility === 'specific_users' && selectedMemberIds.length === 0) {
      setError('Select at least one person.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          category: category || null,
          visibility,
          tags: tagsInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          teamIds: visibility === 'team' ? selectedTeamIds : [],
          memberIds: visibility === 'specific_users' ? selectedMemberIds : [],
          startDate: startDate || null,
          estimatedEndDate,
        }),
      })

      if (!res.ok) {
        let message = 'Something went wrong. Please try again.'
        try {
          const json = await res.json()
          if (typeof json.error === 'string') message = json.error
        } catch {}
        setError(message)
        setLoading(false)
        return
      }

      const json = await res.json()
      handleClose()
      router.push(`/dashboard/projects/${json.data.id}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setName('')
    setDescription('')
    setCategory('')
    setTagsInput('')
    setVisibility('organization')
    setSelectedTeamIds([])
    setSelectedMemberIds([])
    setStartDate('')
    setEstimatedEndDate('')
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">New project</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Q2 Growth Campaign"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label htmlFor="project-category" className="text-sm font-medium text-foreground">
              Category
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="project-category"
              type="text"
              list="project-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Growth, Engineering"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
            <datalist id="project-categories">
              {KNOWN_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="project-start-date" className="text-sm font-medium text-foreground">
                Start date
                <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="project-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'disabled:opacity-50',
                )}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="project-end-date" className="text-sm font-medium text-foreground">
                Estimated end
              </label>
              <input
                id="project-end-date"
                type="date"
                value={estimatedEndDate}
                onChange={(e) => setEstimatedEndDate(e.target.value)}
                required
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'disabled:opacity-50',
                )}
                disabled={loading}
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Visibility</span>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = visibility === option.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-accent/30',
                      loading && 'opacity-50 pointer-events-none',
                    )}
                  >
                    <input
                      type="radio"
                      name="project-visibility"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => {
                        setVisibility(option.value)
                        setError(null)
                      }}
                      disabled={loading}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                      <span className="text-xs font-medium text-foreground">{option.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {option.description}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Team picker */}
          {visibility === 'team' && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">Select teams</span>
              {loadingPicker ? (
                <p className="text-xs text-muted-foreground">Loading teams…</p>
              ) : teams.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No teams found. Ask an admin to set up teams first.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {teams.map((team) => {
                    const checked = selectedTeamIds.includes(team.id)
                    return (
                      <label
                        key={team.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(team.id)}
                          disabled={loading}
                          className="h-3.5 w-3.5 rounded border-input text-primary"
                        />
                        <span className="text-sm text-foreground">{team.name}</span>
                        {checked && (
                          <Check
                            className="ml-auto h-3.5 w-3.5 text-primary shrink-0"
                            aria-hidden
                          />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Specific users picker */}
          {visibility === 'specific_users' && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">Select people</span>
              <p className="text-[11px] text-muted-foreground">
                You always have access as the creator.
              </p>
              {loadingPicker ? (
                <p className="text-xs text-muted-foreground">Loading members…</p>
              ) : members.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No other members in this organisation yet.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {members.map((member) => {
                    const checked = selectedMemberIds.includes(member.user_id)
                    const displayName = member.full_name?.trim() || 'Unknown user'
                    return (
                      <label
                        key={member.user_id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(member.user_id)}
                          disabled={loading}
                          className="h-3.5 w-3.5 rounded border-input text-primary"
                        />
                        <span className="text-sm text-foreground">{displayName}</span>
                        {checked && (
                          <Check
                            className="ml-auto h-3.5 w-3.5 text-primary shrink-0"
                            aria-hidden
                          />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-1.5">
            <label htmlFor="project-tags" className="text-sm font-medium text-foreground">
              Tags
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="project-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. campaign, q2, launch"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="project-description" className="text-sm font-medium text-foreground">
              Description
              <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:opacity-50',
              )}
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !estimatedEndDate}
              className={cn(
                'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
