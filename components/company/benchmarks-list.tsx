'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, RotateCcw } from 'lucide-react'
import type { BenchmarkWithDefault } from '@/lib/queries/content-benchmarks'
import { BenchmarkDrawer } from './benchmark-drawer'

function groupByPlatform(items: BenchmarkWithDefault[]): Map<string, BenchmarkWithDefault[]> {
  const map = new Map<string, BenchmarkWithDefault[]>()
  for (const item of items) {
    const list = map.get(item.platform) ?? []
    list.push(item)
    map.set(item.platform, list)
  }
  return map
}

export function BenchmarksList({
  benchmarks: initialBenchmarks,
  isAdmin,
}: {
  benchmarks: BenchmarkWithDefault[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [benchmarks, setBenchmarks] = useState<BenchmarkWithDefault[]>(initialBenchmarks)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<BenchmarkWithDefault | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)

  useEffect(() => {
    setBenchmarks(initialBenchmarks)
  }, [initialBenchmarks])

  const grouped = useMemo(() => groupByPlatform(benchmarks), [benchmarks])
  const platformOrder = useMemo(() => Array.from(grouped.keys()), [grouped])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function openEdit(b: BenchmarkWithDefault) {
    setEditing(b)
    setDrawerOpen(true)
  }

  async function handleReset(id: string) {
    if (!confirm('Reset this metric to the industry default?')) return
    setResetting(id)
    const res = await fetch(`/api/content-benchmarks/${id}`, { method: 'DELETE' })
    setResetting(null)
    if (res.ok) refresh()
  }

  function formatValue(b: BenchmarkWithDefault) {
    const v = b.benchmark_value
    if (b.benchmark_unit === 'count') {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v)
    }
    return String(v)
  }

  return (
    <>
      <div className="space-y-8">
        {platformOrder.map((platform) => {
          const rows = grouped.get(platform) ?? []
          return (
            <section key={platform}>
              <h2 className="text-sm font-semibold text-foreground mb-3">{platform}</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Metric</th>
                      <th className="px-4 py-2.5 font-medium">Target</th>
                      <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Notes</th>
                      {isAdmin && <th className="px-4 py-2.5 font-medium w-[100px] text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={`${b.platform}-${b.metric_name}`} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 align-top text-foreground">{b.metric_name}</td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={
                              b.isCustom
                                ? 'text-foreground tabular-nums'
                                : 'text-muted-foreground italic tabular-nums'
                            }
                          >
                            {formatValue(b)} {b.benchmark_unit}
                          </span>
                          {!b.isCustom && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                              default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground text-xs hidden sm:table-cell max-w-[240px]">
                          {b.notes ? b.notes : '—'}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(b)}
                                className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {b.isCustom && b.id && (
                                <button
                                  type="button"
                                  onClick={() => handleReset(b.id!)}
                                  disabled={resetting === b.id}
                                  className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                                  title="Reset to default"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>

      <BenchmarkDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditing(null)
        }}
        onSaved={refresh}
        benchmark={editing}
      />
    </>
  )
}
