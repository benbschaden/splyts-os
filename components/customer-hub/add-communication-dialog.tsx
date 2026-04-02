'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ContactCommunicationRow,
  CommunicationDirection,
  CommunicationChannel,
  CommunicationSentiment,
} from '@/lib/queries/contact-communications'

interface AddCommunicationDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (comm: ContactCommunicationRow) => void
  contactId: string
  contactName: string
}

interface FormData {
  direction: CommunicationDirection
  channel: CommunicationChannel
  subject: string
  content: string
  sent_at: string
  is_draft: boolean
  sentiment: CommunicationSentiment | ''
  tags: string
}

const EMPTY: FormData = {
  direction: 'outbound',
  channel: 'email',
  subject: '',
  content: '',
  sent_at: '',
  is_draft: false,
  sentiment: '',
  tags: '',
}

const DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  internal_note: 'Internal note',
}

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  chat: 'Chat',
  sms: 'SMS',
  other: 'Other',
}

const SENTIMENT_LABELS: Record<CommunicationSentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  mixed: 'Mixed',
}

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function AddCommunicationDialog({
  open,
  onClose,
  onSaved,
  contactId,
  contactName,
}: AddCommunicationDialogProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) {
      setError('Content is required.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/contact-communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        direction: form.direction,
        channel: form.channel,
        subject: form.subject.trim() || null,
        content: form.content.trim(),
        sent_at: form.sent_at || null,
        is_draft: form.is_draft,
        sentiment: form.sentiment || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Failed to save. Please try again.')
      return
    }

    const data = await res.json()
    onSaved(data.data)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add communication</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{contactName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="comm-direction" className="block text-xs font-medium text-foreground mb-1">
                  Direction
                </label>
                <select
                  id="comm-direction"
                  value={form.direction}
                  onChange={(e) => set('direction', e.target.value as CommunicationDirection)}
                  className={INPUT_CLASS}
                >
                  {(Object.keys(DIRECTION_LABELS) as CommunicationDirection[]).map((d) => (
                    <option key={d} value={d}>
                      {DIRECTION_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="comm-channel" className="block text-xs font-medium text-foreground mb-1">
                  Channel
                </label>
                <select
                  id="comm-channel"
                  value={form.channel}
                  onChange={(e) => set('channel', e.target.value as CommunicationChannel)}
                  className={INPUT_CLASS}
                >
                  {(Object.keys(CHANNEL_LABELS) as CommunicationChannel[]).map((c) => (
                    <option key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="comm-subject" className="block text-xs font-medium text-foreground mb-1">
                Subject
              </label>
              <input
                id="comm-subject"
                type="text"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="Re: Onboarding call follow-up"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="comm-content" className="block text-xs font-medium text-foreground mb-1">
                Content <span className="text-destructive">*</span>
              </label>
              <textarea
                id="comm-content"
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                rows={5}
                placeholder="What was communicated…"
                className={cn(INPUT_CLASS, 'resize-none')}
              />
            </div>

            <div>
              <label htmlFor="comm-sent-at" className="block text-xs font-medium text-foreground mb-1">
                Date &amp; time
              </label>
              <input
                id="comm-sent-at"
                type="datetime-local"
                value={form.sent_at}
                onChange={(e) => set('sent_at', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="comm-sentiment" className="block text-xs font-medium text-foreground mb-1">
                  Sentiment
                </label>
                <select
                  id="comm-sentiment"
                  value={form.sentiment}
                  onChange={(e) => set('sentiment', e.target.value as CommunicationSentiment | '')}
                  className={INPUT_CLASS}
                >
                  <option value="">No sentiment</option>
                  {(Object.keys(SENTIMENT_LABELS) as CommunicationSentiment[]).map((s) => (
                    <option key={s} value={s}>
                      {SENTIMENT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="comm-tags" className="block text-xs font-medium text-foreground mb-1">
                  Tags
                </label>
                <input
                  id="comm-tags"
                  type="text"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="follow-up, demo (comma-separated)"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_draft}
                onChange={(e) => set('is_draft', e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Save as draft</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add communication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
