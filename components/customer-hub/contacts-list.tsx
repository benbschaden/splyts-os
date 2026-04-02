'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow, ContactSegment } from '@/lib/queries/contacts'
import { AddContactDialog } from './add-contact-dialog'

interface ContactsListProps {
  contacts: ContactRow[]
  selectedId: string | null
  onSelect: (contact: ContactRow) => void
  onContactCreated: (contact: ContactRow) => void
  onContactDeleted: (id: string) => void
}

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  beta_user: 'Beta User',
  prospect: 'Prospect',
  customer: 'Customer',
  churned: 'Churned',
  investor: 'Investor',
  partner: 'Partner',
  other: 'Other',
}

const SEGMENT_BADGE_CLASSES: Record<ContactSegment, string> = {
  beta_user: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  customer: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800',
  prospect: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
  churned: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  investor: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
  partner: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800',
  other: 'bg-muted text-muted-foreground border-border',
}

const HEALTH_DOT_CLASSES = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

const SEGMENT_FILTER_OPTIONS: Array<{ value: ContactSegment | 'all'; label: string }> = [
  { value: 'all', label: 'All segments' },
  { value: 'beta_user', label: 'Beta User' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'churned', label: 'Churned' },
  { value: 'investor', label: 'Investor' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
]

export function ContactsList({
  contacts,
  selectedId,
  onSelect,
  onContactCreated,
  onContactDeleted,
}: ContactsListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<ContactSegment | 'all'>('all')

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())

    const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter

    return matchesSearch && matchesSegment
  })

  const isFiltering = search.trim() !== '' || segmentFilter !== 'all'

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {contacts.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="Add contact"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="px-3 py-2.5 space-y-2 border-b border-border">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-full rounded-md border border-input bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as ContactSegment | 'all')}
          className="w-full rounded-md border border-input bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SEGMENT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border mx-3 my-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No contacts yet</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Add your first contact
            </button>
          </div>
        )}

        {contacts.length > 0 && filtered.length === 0 && isFiltering && (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">No contacts match</p>
          </div>
        )}

        {filtered.map((contact) => {
          const isSelected = contact.id === selectedId
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={cn(
                'group w-full text-left px-3 py-3 border-b border-border/60 transition-colors hover:bg-muted/30',
                isSelected && 'bg-primary/5 border-l-2 border-l-primary/60',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground truncate">{contact.name}</span>
                    {contact.health && (
                      <span
                        className={cn('h-2 w-2 shrink-0 rounded-full', HEALTH_DOT_CLASSES[contact.health])}
                        title={contact.health}
                      />
                    )}
                  </div>
                  {(contact.company || contact.role) && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {[contact.role, contact.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {contact.email && (
                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{contact.email}</p>
                  )}
                </div>
                {contact.segment && (
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      SEGMENT_BADGE_CLASSES[contact.segment],
                    )}
                  >
                    {SEGMENT_LABELS[contact.segment]}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <AddContactDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(contact) => {
          onContactCreated(contact)
          setAddOpen(false)
        }}
      />
    </div>
  )
}
