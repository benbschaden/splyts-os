'use client'

import { useState, useRef } from 'react'
import { User, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function ProfileForm({ initial }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initial.full_name)
  const [role, setRole] = useState(initial.role)
  const [voice, setVoice] = useState(initial.voice)
  const [tone, setTone] = useState(initial.tone)
  const [writingStyle, setWritingStyle] = useState(initial.writing_style)
  const [personalPillars, setPersonalPillars] = useState(initial.personal_pillars)
  const [platformNotes, setPlatformNotes] = useState(initial.platform_notes)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim() || null,
        role: role.trim() || null,
        voice: voice.trim() || null,
        tone: tone.trim() || null,
        writing_style: writingStyle.trim() || null,
        personal_pillars: personalPillars.trim() || null,
        platform_notes: platformNotes.trim() || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    setSaved(true)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)

    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    })

    setUploadingAvatar(false)

    if (!res.ok) {
      try {
        const json = await res.json()
        setError(typeof json.error === 'string' ? json.error : 'Failed to upload image.')
      } catch {
        setError('Failed to upload image.')
      }
      return
    }

    const json = await res.json()
    setAvatarUrl(json.data.avatar_url)
  }

  const initials = fullName?.trim()
    ? fullName.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : initial.email?.[0]?.toUpperCase() ?? '?'

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-lg">

      {/* Avatar */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Profile picture</label>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF — max 2MB</p>
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group shrink-0"
            title="Change profile picture"
          >
            <div className={cn(
              'h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center',
              'ring-2 ring-border group-hover:ring-foreground/30 transition-all',
            )}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {initials}
                </span>
              )}
            </div>
            <div className={cn(
              'absolute inset-0 rounded-full bg-black/40 flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              uploadingAvatar && 'opacity-100',
            )}>
              {uploadingAvatar ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
              )}
            </div>
          </button>

          <div className="text-sm text-muted-foreground">
            {uploadingAvatar ? 'Uploading…' : 'Click to change'}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Email — read only */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          value={initial.email}
          readOnly
          className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
        />
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <label htmlFor="full-name" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
        <input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setSaved(false) }}
          disabled={saving}
          placeholder="Your full name"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-50',
          )}
        />
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <label htmlFor="role" className="text-sm font-medium text-foreground">
            Role
          </label>
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
        <p className="text-xs text-muted-foreground">Your job title in the organisation</p>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => { setRole(e.target.value); setSaved(false) }}
          disabled={saving}
          placeholder="Your role or title"
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:opacity-50',
          )}
        />
      </div>

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
            onChange={(e) => { setVoice(e.target.value); setSaved(false) }}
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
            onChange={(e) => { setTone(e.target.value); setSaved(false) }}
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
            onChange={(e) => { setWritingStyle(e.target.value); setSaved(false) }}
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
            onChange={(e) => { setPersonalPillars(e.target.value); setSaved(false) }}
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
            onChange={(e) => { setPlatformNotes(e.target.value); setSaved(false) }}
            rows={3}
            placeholder="e.g. LinkedIn: no hashtags, no bullet lists. Email: always use a P.S."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </form>
  )
}
