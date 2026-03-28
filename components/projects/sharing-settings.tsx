'use client'

import { useState, useEffect } from 'react'
import { Globe, Users, Lock, UserCheck, ChevronDown, X, Check } from 'lucide-react'
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

interface SharingSettingsProps {
  projectId: string
  currentVisibility: Visibility
  currentTeamIds: string[]
  currentMemberIds: string[]
  currentUserId: string
  onSaved?: (newVisibility: Visibility) => void
}

const VISIBILITY_OPTIONS: Array<{
  value: Visibility
  label: string
  description: string
  icon: typeof Globe
}> = [
  {
    value: 'organization',
    label: 'Whole company',
    description: 'All org members can see this project',
    icon: Globe,
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Only selected teams can see this project',
    icon: Users,
  },
  {
    value: 'specific_users',
    label: 'Specific people',
    description: 'Only selected individuals can see this project',
    icon: UserCheck,
  },
  {
    value: 'private',
    label: 'Only me',
    description: 'Only you can see this project',
    icon: Lock,
  },
]

export function SharingSettings({
  projectId,
  currentVisibility,
  currentTeamIds,
  currentMemberIds,
  currentUserId,
  onSaved,
}: SharingSettingsProps) {
  const [open, setOpen] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>(currentVisibility)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(currentTeamIds)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(currentMemberIds)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset to current values when dialog opens
  useEffect(() => {
    if (open) {
      setVisibility(currentVisibility)
      setSelectedTeamIds(currentTeamIds)
      setSelectedMemberIds(currentMemberIds)
      setError(null)
      fetchPickerData()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPickerData() {
    setLoadingData(true)
    try {
      const [teamsRes, membersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/org-members'),
      ])
      if (teamsRes.ok) {
        const json = await teamsRes.json()
        setTeams(json.data ?? [])
      }
      if (membersRes.ok) {
        const json = await membersRes.json()
        // Exclude current user from specific_users picker (they always have access as creator)
        setMembers((json.data ?? []).filter((m: OrgMember) => m.user_id !== currentUserId))
      }
    } finally {
      setLoadingData(false)
    }
  }

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

  async function handleSave() {
    if (visibility === 'team' && selectedTeamIds.length === 0) {
      setError('Select at least one team.')
      return
    }
    if (visibility === 'specific_users' && selectedMemberIds.length === 0) {
      setError('Select at least one person.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility,
          teamIds: visibility === 'team' ? selectedTeamIds : [],
          memberIds: visibility === 'specific_users' ? selectedMemberIds : [],
        }),
      })

      if (!res.ok) {
        let message = 'Failed to save sharing settings.'
        try {
          const json = await res.json()
          if (typeof json.error === 'string') message = json.error
        } catch {}
        setError(message)
        return
      }

      setOpen(false)
      onSaved?.(visibility)
    } finally {
      setSaving(false)
    }
  }

  const currentOption = VISIBILITY_OPTIONS.find((o) => o.value === currentVisibility)
  const CurrentIcon = currentOption?.icon ?? Globe

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
        )}
        title="Edit sharing settings"
      >
        <CurrentIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{currentOption?.label ?? 'Shared'}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !saving && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Sharing settings</h2>
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = visibility === option.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-accent/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="sharing-visibility"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => {
                        setVisibility(option.value)
                        setError(null)
                      }}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-input bg-background',
                      )}
                      aria-hidden
                    >
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Team picker */}
            {visibility === 'team' && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Select teams</p>
                {loadingData ? (
                  <p className="text-xs text-muted-foreground">Loading teams…</p>
                ) : teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teams found. Ask an admin to create teams.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {teams.map((team) => {
                      const checked = selectedTeamIds.includes(team.id)
                      return (
                        <label
                          key={team.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTeam(team.id)}
                            className="h-3.5 w-3.5 rounded border-input text-primary"
                          />
                          <span className="text-sm text-foreground">{team.name}</span>
                          {checked && <Check className="ml-auto h-3.5 w-3.5 text-primary shrink-0" aria-hidden />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Specific users picker */}
            {visibility === 'specific_users' && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Select people</p>
                <p className="text-xs text-muted-foreground">You always have access as the project creator.</p>
                {loadingData ? (
                  <p className="text-xs text-muted-foreground">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No other members in this organisation yet.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {members.map((member) => {
                      const checked = selectedMemberIds.includes(member.user_id)
                      const displayName = member.full_name?.trim() || 'Unknown user'
                      return (
                        <label
                          key={member.user_id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(member.user_id)}
                            className="h-3.5 w-3.5 rounded border-input text-primary"
                          />
                          <span className="text-sm text-foreground">{displayName}</span>
                          {checked && <Check className="ml-auto h-3.5 w-3.5 text-primary shrink-0" aria-hidden />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium text-muted-foreground',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
