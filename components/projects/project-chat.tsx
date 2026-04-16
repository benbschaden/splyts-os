'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Plus, Loader2 } from 'lucide-react'
import type { ChatSessionRow } from '@/lib/queries/chat'

interface ProjectChatProps {
  projectId: string
  organizationId: string
  materialCount: number
}

export function ProjectChat({ projectId, organizationId, materialCount }: ProjectChatProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/sessions?project_id=${projectId}`)
      if (!res.ok) {
        setError('Failed to load assistant conversations')
        return
      }
      const data = await res.json()
      setSessions(data.sessions ?? [])
    } catch {
      setError('Failed to load assistant conversations')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  async function handleNewChat() {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          context_config: {
            brand: true,
            business_plan: true,
            personas: true,
            browser: false,
            product: true,
            product_roadmap: true,
            company_milestones: true,
            current_goals: true,
            filed_documents: true,
            competitors: true,
            social_proof: true,
            kpis: true,
            project_materials: true,
            discovery_entries: true,
            discovery_participant: null,
            customer_insights: true,
            customer_hub_contact_id: null,
            customer_hub_segment: null,
          },
        }),
      })

      if (!res.ok) {
        setError('Failed to start conversation')
        return
      }

      const data = await res.json()
      if (data.session?.id) {
        router.push(`/dashboard/chat/${data.session.id}`)
      }
    } catch {
      setError('Failed to start conversation')
    } finally {
      setCreating(false)
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  // Suppress unused var lint — organizationId reserved for future membership checks
  void organizationId

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Assistant</h3>
        <button
          onClick={handleNewChat}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          New conversation
        </button>
      </div>

      {materialCount > 0 && (
        <p className="text-xs text-muted-foreground">
          The assistant can use {materialCount} project material{materialCount !== 1 ? 's' : ''}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No conversations yet. Start one to discuss this project with the assistant.
        </p>
      ) : (
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => router.push(`/dashboard/chat/${session.id}`)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {session.title || 'New conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
