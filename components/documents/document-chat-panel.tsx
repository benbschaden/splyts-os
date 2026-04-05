'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Check, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DocumentChatPanelProps {
  documentId: string
  onApply: (content: string) => void
}

function extractReplacement(text: string): string | null {
  const match = text.match(/<replacement>([\s\S]*?)<\/replacement>/)
  return match ? match[1].trim() : null
}

function stripReplacementTags(text: string): string {
  return text.replace(/<replacement>[\s\S]*?<\/replacement>/, '').trim()
}

export function DocumentChatPanel({ documentId, onApply }: DocumentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
        return
      }

      const data = await res.json() as { response: string }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleApply(replacement: string) {
    onApply(replacement)
    setApplied(replacement)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Discuss this document with AI</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Ask questions, request edits, or ask for a full rewrite
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-foreground px-3 py-2 text-sm text-background leading-relaxed">
                  {msg.content}
                </div>
              </div>
            )
          }

          const replacement = extractReplacement(msg.content)
          const displayText = replacement ? stripReplacementTags(msg.content) : msg.content
          const alreadyApplied = applied === replacement

          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="max-w-[92%] rounded-lg border border-border bg-background px-3 py-2">
                {displayText && (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 text-foreground text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
                  </div>
                )}
                {replacement && (
                  <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Revised document
                    </p>
                    <div className="prose prose-xs max-w-none dark:prose-invert prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 text-xs text-foreground leading-relaxed line-clamp-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{replacement}</ReactMarkdown>
                    </div>
                    <div className="mt-2">
                      {alreadyApplied ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500" />
                          Applied to document
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(replacement)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-80 transition-opacity"
                        >
                          <Check className="h-3 w-3" />
                          Apply to document
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request an edit… (Enter to send)"
          rows={2}
          disabled={loading}
          aria-label="Message to AI about this document"
          className={cn(
            'flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50',
          )}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="shrink-0 inline-flex items-center justify-center rounded-md bg-foreground p-2 text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
