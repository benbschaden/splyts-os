'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CalendarItemDrawer } from './calendar-item-drawer'

interface CalendarItem {
  id: string
  title: string
  description: string | null
  scheduled_date: string
  platform: string | null
  status: 'idea' | 'planned' | 'in_progress' | 'generated' | 'published' | 'cancelled'
  notes: string | null
  output_id: string | null
  content_type?: { name: string } | null
  assigned_user?: { full_name: string | null; email: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  idea: 'bg-muted text-muted-foreground',
  planned: 'bg-sky-500/10 text-sky-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  generated: 'bg-violet-500/10 text-violet-600',
  published: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-destructive/10 text-destructive',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ContentCalendar({ isAdmin }: { isAdmin: boolean }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarItem | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/content-calendar?year=${year}&month=${month + 1}`)
    if (res.ok) {
      const { data } = await res.json()
      setItems(data ?? [])
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
    setSelectedDay(null)
  }

  function openNew(dayNum?: number) {
    setEditing(null)
    if (dayNum) {
      const d = String(dayNum).padStart(2, '0')
      const m = String(month + 1).padStart(2, '0')
      setDefaultDate(`${year}-${m}-${d}`)
    } else {
      setDefaultDate(null)
    }
    setDrawerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this calendar item?')) return
    await fetch(`/api/content-calendar/${id}`, { method: 'DELETE' })
    load()
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const itemsByDay: Record<number, CalendarItem[]> = {}
  for (const item of items) {
    const d = new Date(item.scheduled_date)
    const day = d.getDate()
    if (!itemsByDay[day]) itemsByDay[day] = []
    itemsByDay[day].push(item)
  }

  const selectedItems = selectedDay ? (itemsByDay[selectedDay] ?? []) : []
  const todayDate = new Date()
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold text-foreground min-w-[140px] text-center">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          )}
        </div>

        {/* Calendar grid */}
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-border bg-muted/10 h-24" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayItems = itemsByDay[dayNum] ?? []
                const isToday = isCurrentMonth && todayDate.getDate() === dayNum
                const isSelected = selectedDay === dayNum

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                    className={cn(
                      'border-b border-r border-border h-24 p-1.5 cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/20',
                      (firstDay + i + 1) % 7 === 0 ? 'border-r-0' : '',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                      )}>
                        {dayNum}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openNew(dayNum) }}
                          className="rounded p-0.5 opacity-0 hover:opacity-100 text-muted-foreground hover:bg-accent transition-all group-hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium truncate', STATUS_STYLES[item.status])}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <p className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        {selectedDay !== null && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {MONTH_NAMES[month]} {selectedDay}, {year}
              </h3>
              {isAdmin && (
                <button onClick={() => openNew(selectedDay)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLES[item.status])}>
                          {item.status}
                        </span>
                        {item.platform && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{item.platform}</span>
                        )}
                        {item.output_id && (
                          <span className="flex items-center gap-0.5 text-[10px] text-violet-600">
                            <Link2 className="h-2.5 w-2.5" /> linked output
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      )}
                      {item.content_type && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{item.content_type.name}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(item); setDrawerOpen(true) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CalendarItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
        editing={editing}
        defaultDate={defaultDate}
      />
    </>
  )
}
