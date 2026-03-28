'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DiscussionRow, DiscussionParentType } from '@/lib/queries/discussions'
import { DiscussionList } from './discussion-list'
import { CreateDiscussionDialog } from './create-discussion-dialog'
import { DiscussionDetail } from './discussion-detail'

interface DiscussionsPanelProps {
  parentType: DiscussionParentType
  parentId: string
  organizationId: string
  sectionKey?: string
  currentUserId?: string
}

export function DiscussionsPanel({
  parentType,
  parentId,
  organizationId,
  sectionKey,
  currentUserId,
}: DiscussionsPanelProps) {
  const [discussions, setDiscussions] = useState<DiscussionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({
      parent_type: parentType,
      parent_id: parentId,
      status: statusFilter,
    })
    if (sectionKey) params.set('section_key', sectionKey)

    const res = await fetch(`/api/discussions?${params}`)
    if (res.ok) {
      const data = await res.json() as { discussions?: DiscussionRow[] }
      setDiscussions(data.discussions ?? [])
    }
    setIsLoading(false)
  }, [parentType, parentId, statusFilter, sectionKey])

  useEffect(() => { void load() }, [load])

  const selectedDiscussion = discussions.find((d) => d.id === selectedId) ?? null

  function handleCreated(discussion: DiscussionRow) {
    setDiscussions((prev) => [discussion, ...prev])
    setSelectedId(discussion.id)
    setShowCreate(false)
  }

  function handleUpdated(updated: DiscussionRow) {
    setDiscussions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r border-border flex flex-col">
        <DiscussionList
          discussions={discussions}
          isLoading={isLoading}
          selectedId={selectedId}
          statusFilter={statusFilter}
          onSelect={setSelectedId}
          onFilterChange={setStatusFilter}
          onCreateNew={() => setShowCreate(true)}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedDiscussion ? (
          <DiscussionDetail
            key={selectedDiscussion.id}
            discussion={selectedDiscussion}
            organizationId={organizationId}
            currentUserId={currentUserId}
            onUpdated={handleUpdated}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {discussions.length === 0 && !isLoading
                ? 'No discussions yet. Start one.'
                : 'Select a discussion'}
            </p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDiscussionDialog
          parentType={parentType}
          parentId={parentId}
          sectionKey={sectionKey}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
