'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ContactRow } from '@/lib/queries/contacts'
import type { ContactCommunicationRow } from '@/lib/queries/contact-communications'
import type { CustomerInsightRow } from '@/lib/queries/customer-insights'
import type { ContextConfig } from '@/lib/queries/chat'
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
}

type HubTab = 'contacts' | 'inbox' | 'insights' | 'cohorts'

export function CustomerHubDetail({
  project,
  initialContacts,
  initialCommunications,
  initialInsights,
  initialCohortDocuments,
}: CustomerHubDetailProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts)
  const [communications, setCommunications] = useState<ContactCommunicationRow[]>(initialCommunications)
  const [insights, setInsights] = useState<CustomerInsightRow[]>(initialInsights)
  const [cohortDocuments, setCohortDocuments] = useState<CohortDocumentRow[]>(initialCohortDocuments)
  const [activeTab, setActiveTab] = useState<HubTab>('contacts')
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null)

  useEffect(() => { setContacts(initialContacts) }, [initialContacts])
  useEffect(() => { setCommunications(initialCommunications) }, [initialCommunications])
  useEffect(() => { setInsights(initialInsights) }, [initialInsights])
  useEffect(() => { setCohortDocuments(initialCohortDocuments) }, [initialCohortDocuments])

  const refresh = useCallback(() => router.refresh(), [router])

  const selectedContactComms = selectedContact
    ? communications.filter((c) => c.contact_id === selectedContact.id)
    : []

  const selectedContactInsights = selectedContact
    ? insights.filter((i) => i.source_contact_id === selectedContact.id)
    : []

  async function handleChatWithContact(contact: ContactRow) {
    const contextConfig: ContextConfig = {
      brand: true,
      business_plan: false,
      personas: false,
      product: false,
      product_roadmap: false,
      company_milestones: false,
      current_goals: false,
      filed_documents: false,
      competitors: false,
      social_proof: false,
      kpis: false,
      browser: false,
      project_materials: false,
      discovery_entries: false,
      discovery_participant: null,
      customer_insights: true,
      customer_hub_contact_id: contact.id,
    }
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          title: `Reply · ${contact.name}`,
          context_config: contextConfig,
        }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        const prompt = encodeURIComponent(`Draft a reply to ${contact.name}.`)
        router.push(`/dashboard/chat/${data.session.id}?prompt=${prompt}`)
      }
    } catch {
      // navigation failure is non-critical
    }
  }

  function handleContactCreated(contact: ContactRow) {
    setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedContact(contact)
  }

  function handleContactDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id))
    if (selectedContact?.id === id) setSelectedContact(null)
    refresh()
  }

  function handleCommunicationAdded(comm: ContactCommunicationRow) {
    setCommunications((prev) => [comm, ...prev])
  }

  function handleCommunicationDeleted(id: string) {
    setCommunications((prev) => prev.filter((c) => c.id !== id))
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
              />
            </div>

            {/* Right panel: contact detail */}
            <div className="flex-1 overflow-y-auto">
              {selectedContact ? (
                <ContactDetail
                  contact={selectedContact}
                  communications={selectedContactComms}
                  insights={selectedContactInsights}
                  onCommunicationAdded={handleCommunicationAdded}
                  onCommunicationDeleted={handleCommunicationDeleted}
                  onInsightAdded={handleInsightAdded}
                  onInsightDeleted={handleInsightDeleted}
                  onChatWithContact={() => handleChatWithContact(selectedContact)}
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
            />
          </div>
        )}
      </div>
    </div>
  )
}
