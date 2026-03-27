'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Lock, Users, Building2 } from 'lucide-react'
import type { DocumentRow, DocumentVisibility } from '@/lib/queries/documents'

interface DocumentsListProps {
  documents: DocumentRow[]
}

const VISIBILITY_META: Record<
  DocumentVisibility,
  { label: string; icon: React.ElementType; className: string }
> = {
  private: { label: 'Private', icon: Lock, className: 'text-muted-foreground' },
  shared: { label: 'Shared', icon: Users, className: 'text-blue-600' },
  filed: { label: 'Filed', icon: Building2, className: 'text-green-600' },
}

export function DocumentsList({ documents: initialDocuments }: DocumentsListProps) {
  const [documents] = useState(initialDocuments)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">My Documents</h1>
          <p className="text-sm text-muted-foreground">
            Documents captured from your chat sessions
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Capture a document from a chat session to see it here
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {documents.map((doc) => {
              const meta = VISIBILITY_META[doc.visibility]
              const Icon = meta.icon
              return (
                <li key={doc.id}>
                  <Link
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.doc_type} · {new Date(doc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`flex shrink-0 items-center gap-1 text-xs font-medium ${meta.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
