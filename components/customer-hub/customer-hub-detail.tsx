'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageCircleWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactRow } from '@/lib/queries/contacts'
import type { ContactCommunicationRow } from '@/lib/queries/contact-communications'
import type { CustomerInsightRow } from '@/lib/queries/customer-insights'
import type { PersonaRow } from '@/lib/queries/personas'
import { ContactsList } from './contacts-list'
import { ContactDetail } from './contact-detail'
import { InboxView } from './inbox-view'
import { InsightsBoard } from './insights-board'
import { CohortsView } from './cohorts-view'
import type { CohortDocumentRow } from '@/lib/queries/cohort-documents'
import { normalizeContactLabel, normalizeTagList } from '@/lib/contact-labels'

interface Project {
  id: string
  name: string
  description: string | null
}

interface CustomerHubDetailProps {
  project: Project
  initialContacts: ContactRow[]
  initialCommunications: ContactCommunicationRow[]
  initialInsights: CustomerInsightRow[]
  initialCohortDocuments: CohortDocumentRow[]
  initialPersonas: PersonaRow[]
}

type HubTab = 'contacts' | 'inbox' | 'insights' | 'cohorts'

export function CustomerHubDetail({
  project,
  initialContacts,
  initialCommunications,
  initialInsights,
  initialCohortDocuments,
  initialPersonas,
}: CustomerHubDetailProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts)
  const [communications, setCommunications] = useState<ContactCommunicationRow[]>(initialCommunications)
  const [insights, setInsights] = useState<CustomerInsightRow[]>(initialInsights)
  const [cohortDocuments, setCohortDocuments] = useState<CohortDocumentRow[]>(initialCohortDocuments)
  const [personas, setPersonas] = useState<PersonaRow[]>(initialPersonas)
  const [activeTab, setActiveTab] = useState<HubTab>('contacts')
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null)
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => { setContacts(initialContacts) }, [initialContacts])
  useEffect(() => { setCommunications(initialCommunications) }, [initialCommunications])
  useEffect(() => { setInsights(initialInsights) }, [initialInsights])
  useEffect(() => { setCohortDocuments(initialCohortDocuments) }, [initialCohortDocuments])
  useEffect(() => { setPersonas(initialPersonas) }, [initialPersonas])

  const refresh = useCallback(() => router.refresh(), [router])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const c of contacts) {
      for (const t of c.tags) {
        const n = normalizeContactLabel(t)
        if (n) s.add(n)
      }
    }
    return [...s].sort()
  }, [contacts])

  const allAcquisitionSources = useMemo(() => {
    const s = new Set<string>()
    for (const c of contacts) {
      const n = normalizeContactLabel(c.acquisition_source ?? '')
      if (n) s.add(n)
    }
    return [...s].sort()
  }, [contacts])

  const selectedContactComms = selectedContact
    ? communications.filter((c) => c.contact_id === selectedContact.id)
    : []

  const selectedContactInsights = selectedContact
    ? insights.filter((i) => i.source_contact_id === selectedContact.id)
    : []

  function handleContactCreated(contact: ContactRow) {
    setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedContact(contact)
  }

  function handleContactUpdated(contact: ContactRow) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? contact : c)).sort((a, b) => a.name.localeCompare(b.name)),
    )
    setSelectedContact(contact)
  }

  function handleContactDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id))
    if (selectedContact?.id === id) setSelectedContact(null)
    refresh()
  }

  async function handleDeleteTag(tag: string) {
    const affected = contacts.filter((c) =>
      c.tags.some((t) => normalizeContactLabel(t) === tag),
    )
    await Promise.all(
      affected.map((c) =>
        fetch(`/api/contacts/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tags: normalizeTagList(c.tags.filter((t) => normalizeContactLabel(t) !== tag)),
          }),
        }),
      ),
    )
    setContacts((prev) =>
      prev.map((c) =>
        c.tags.some((t) => normalizeContactLabel(t) === tag)
          ? { ...c, tags: normalizeTagList(c.tags.filter((t) => normalizeContactLabel(t) !== tag)) }
          : c,
      ),
    )
    if (selectedContact?.tags.some((t) => normalizeContactLabel(t) === tag)) {
      setSelectedContact((prev) =>
        prev
          ? {
              ...prev,
              tags: normalizeTagList(prev.tags.filter((t) => normalizeContactLabel(t) !== tag)),
            }
          : null,
      )
    }
  }

  function handleCommunicationAdded(comm: ContactCommunicationRow) {
    setCommunications((prev) => [comm, ...prev])
  }

  function handleCommunicationDeleted(id: string) {
    setCommunications((prev) => prev.filter((c) => c.id !== id))
  }

  function handleCommunicationUpdated(comm: ContactCommunicationRow) {
    setCommunications((prev) => prev.map((c) => (c.id === comm.id ? comm : c)))
  }

  function handleInsightAdded(insight: CustomerInsightRow) {
    setInsights((prev) => [insight, ...prev])
  }

  function handleInsightUpdated(insight: CustomerInsightRow) {
    setInsights((prev) => prev.map((i) => (i.id === insight.id ? insight : i)))
  }

  function handleInsightDeleted(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id))
  }

  async function scanAllResponses() {
    const scannable = contacts.filter((c) =>
      communications.some((comm) => comm.contact_id === c.id),
    )
    if (scannable.length === 0) return

    setScanProgress({ done: 0, total: scannable.length })

    const BATCH_SIZE = 5
    for (let i = 0; i < scannable.length; i += BATCH_SIZE) {
      const batch = scannable.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (c) => {
          try {
            const res = await fetch(`/api/contacts/${c.id}/scan-response`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
              const updated = {
                ...c,
                response_status: data.status,
                response_status_reason: data.reason ?? null,
              }
              setContacts((prev) => prev.map((contact) => (contact.id === c.id ? updated : contact)))
              setSelectedContact((prev) => (prev?.id === c.id ? updated : prev))
            }
          } catch {
            // non-blocking — individual scan failures don't stop the batch
          }
          setScanProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null))
        }),
      )
    }
    setScanProgress(null)
  }

  const tabs: Array<{ id: HubTab; label: string }> = [
    {
      id: 'contacts',
      label: `Contacts${contacts.length > 0 ? ` (${contacts.length})` : ''}`,
    },
    {
      id: 'inbox',
      label: `Inbox${communications.length > 0 ? ` (${communications.length})` : ''}`,
    },
    {
      id: 'insights',
      label: `Insights${insights.length > 0 ? ` (${insights.length})` : ''}`,
    },
    {
      id: 'cohorts',
      label: `Cohorts${cohortDocuments.length > 0 ? ` (${cohortDocuments.length})` : ''}`,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">{project.name}</h1>
        <button
          type="button"
          onClick={scanAllResponses}
          disabled={scanProgress !== null}
          className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors dark:border-amber-700 dark:bg-amber-900/10 dark:text-amber-300"
        >
          {scanProgress !== null ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning {scanProgress.done}/{scanProgress.total}…
            </>
          ) : (
            <>
              <MessageCircleWarning className="h-3.5 w-3.5" />
              Scan responses
            </>
          )}
        </button>
      </div>

      {/* Tab bar */}
      <nav className="flex shrink-0 border-b border-border px-6" aria-label="Customer Hub views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'contacts' && (
          <>
            {/* Left panel: contacts list */}
            <div className="w-64 shrink-0 overflow-y-auto border-r border-border">
              <ContactsList
                contacts={contacts}
                selectedId={selectedContact?.id ?? null}
                onSelect={setSelectedContact}
                onContactCreated={handleContactCreated}
                onContactDeleted={handleContactDeleted}
                allTags={allTags}
                allAcquisitionSources={allAcquisitionSources}
                onDeleteTag={handleDeleteTag}
              />
            </div>

            {/* Right panel: contact detail */}
            <div className="flex-1 overflow-y-auto">
              {selectedContact ? (
                <ContactDetail
                  contact={selectedContact}
                  communications={selectedContactComms}
                  insights={selectedContactInsights}
                  personas={personas}
                  allTags={allTags}
                  allAcquisitionSources={allAcquisitionSources}
                  onCommunicationAdded={handleCommunicationAdded}
                  onCommunicationDeleted={handleCommunicationDeleted}
                  onCommunicationUpdated={handleCommunicationUpdated}
                  onInsightAdded={handleInsightAdded}
                  onInsightDeleted={handleInsightDeleted}
                  onContactUpdated={handleContactUpdated}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Select a contact</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose a contact from the list to view their history.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'inbox' && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <InboxView
              communications={communications}
              contacts={contacts}
              onCommunicationAdded={handleCommunicationAdded}
              onCommunicationDeleted={handleCommunicationDeleted}
            />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <InsightsBoard
              insights={insights}
              contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
              onInsightAdded={handleInsightAdded}
              onInsightUpdated={handleInsightUpdated}
              onInsightDeleted={handleInsightDeleted}
            />
          </div>
        )}

        {activeTab === 'cohorts' && (
          <div className="flex-1 overflow-y-auto">
            <CohortsView
              projectId={project.id}
              initialDocuments={cohortDocuments}
              contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
              onInsightsAdded={(newInsights) => {
                newInsights.forEach(handleInsightAdded)
                setCohortDocuments((prev) =>
                  prev.map((d) => {
                    const matching = newInsights.filter((i) => i.source_segment === d.segment)
                    return matching.length > 0
                      ? { ...d, insights_extracted: d.insights_extracted + matching.length }
                      : d
                  }),
                )
              }}
              onDocumentDeleted={(id) => setCohortDocuments((prev) => prev.filter((d) => d.id !== id))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
