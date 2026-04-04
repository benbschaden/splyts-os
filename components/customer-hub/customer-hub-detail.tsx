'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => { setContacts(initialContacts) }, [initialContacts])
  useEffect(() => { setCommunications(initialCommunications) }, [initialCommunications])
  useEffect(() => { setInsights(initialInsights) }, [initialInsights])
  useEffect(() => { setCohortDocuments(initialCohortDocuments) }, [initialCohortDocuments])
  useEffect(() => { setPersonas(initialPersonas) }, [initialPersonas])

  const refresh = useCallback(() => router.refresh(), [router])

  const allTags = useMemo(
    () => [...new Set(contacts.flatMap((c) => c.tags))].sort(),
    [contacts],
  )

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
    const affected = contacts.filter((c) => c.tags.includes(tag))
    await Promise.all(
      affected.map((c) =>
        fetch(`/api/contacts/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: c.tags.filter((t) => t !== tag) }),
        }),
      ),
    )
    setContacts((prev) =>
      prev.map((c) =>
        c.tags.includes(tag) ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c,
      ),
    )
    if (selectedContact?.tags.includes(tag)) {
      setSelectedContact((prev) =>
        prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : null,
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
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <h1 className="text-sm font-semibold text-foreground">{project.name}</h1>
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
