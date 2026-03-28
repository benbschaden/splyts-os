'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { DiscoveryStudyRow } from '@/lib/queries/discovery-studies'
import type { DiscoveryEntryRow } from '@/lib/queries/discovery-entries'
import { DiscoveryStudiesList } from './discovery-studies-list'
import { DiscoveryStudyDetail } from './discovery-study-detail'
import { DiscoveryFeed } from './discovery-feed'

interface DiscoveryHubProps {
  projectId: string
  initialStudies: DiscoveryStudyRow[]
  initialEntries: DiscoveryEntryRow[]
}

type HubTab = 'studies' | 'all'

export function DiscoveryHub({ projectId, initialStudies, initialEntries }: DiscoveryHubProps) {
  const router = useRouter()
  const [studies, setStudies] = useState<DiscoveryStudyRow[]>(initialStudies)
  const [entries, setEntries] = useState<DiscoveryEntryRow[]>(initialEntries)
  const [activeTab, setActiveTab] = useState<HubTab>('studies')
  const [selectedStudy, setSelectedStudy] = useState<DiscoveryStudyRow | null>(null)

  useEffect(() => {
    setStudies(initialStudies)
  }, [initialStudies])

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const refresh = useCallback(() => router.refresh(), [router])

  const studyEntries = selectedStudy
    ? entries.filter((e) => e.study_id === selectedStudy.id)
    : []

  function handleStudyUpdated(updated: DiscoveryStudyRow) {
    setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    if (selectedStudy?.id === updated.id) setSelectedStudy(updated)
  }

  function handleStudyCreated(created: DiscoveryStudyRow) {
    setStudies((prev) => [...prev, created])
    setSelectedStudy(created)
  }

  function handleStudyDeleted(id: string) {
    setStudies((prev) => prev.filter((s) => s.id !== id))
    refresh()
  }

  if (selectedStudy) {
    return (
      <DiscoveryStudyDetail
        study={selectedStudy}
        entries={studyEntries}
        onBack={() => setSelectedStudy(null)}
        onStudyUpdated={handleStudyUpdated}
        onEntriesChanged={refresh}
      />
    )
  }

  return (
    <div className="space-y-4">
      <nav className="flex gap-0 border-b border-border -mt-2" aria-label="Discovery views">
        {(['studies', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              activeTab === tab
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {tab === 'studies'
              ? `Studies${studies.length > 0 ? ` (${studies.length})` : ''}`
              : 'All Entries'}
          </button>
        ))}
      </nav>

      {activeTab === 'studies' && (
        <DiscoveryStudiesList
          projectId={projectId}
          studies={studies}
          entries={entries}
          onSelect={setSelectedStudy}
          onStudyCreated={handleStudyCreated}
          onStudyUpdated={handleStudyUpdated}
          onStudyDeleted={handleStudyDeleted}
        />
      )}

      {activeTab === 'all' && (
        <DiscoveryFeed projectId={projectId} initialEntries={entries} />
      )}
    </div>
  )
}
