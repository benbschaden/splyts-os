'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CompanyUnsavedHandlers = {
  isDirty: () => boolean
  save: () => Promise<void>
  /**
   * If false, "Save and leave" is omitted — user can only stay or leave without saving
   * (e.g. a draft create flow that has no intermediate save).
   */
  supportsSaveAndLeave?: boolean
}

const CompanyUnsavedContext = createContext<{
  register: (h: CompanyUnsavedHandlers) => () => void
} | null>(null)

export function CompanyUnsavedProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const handlersMapRef = useRef(new Map<number, CompanyUnsavedHandlers>())
  const seqRef = useRef(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [savingNav, setSavingNav] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const register = useCallback((h: CompanyUnsavedHandlers) => {
    const id = ++seqRef.current
    handlersMapRef.current.set(id, h)
    return () => {
      handlersMapRef.current.delete(id)
    }
  }, [])

  const isAnyDirty = useCallback(() => {
    for (const h of handlersMapRef.current.values()) {
      if (h.isDirty()) return true
    }
    return false
  }, [])

  const saveAllDirty = useCallback(async () => {
    for (const h of handlersMapRef.current.values()) {
      if (h.isDirty() && h.supportsSaveAndLeave !== false) {
        await h.save()
      }
    }
  }, [])

  const canSaveAndLeave = useCallback(() => {
    for (const h of handlersMapRef.current.values()) {
      if (h.isDirty() && h.supportsSaveAndLeave !== false) return true
    }
    return false
  }, [])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyDirty()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isAnyDirty])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isAnyDirty()) return

      const el = (e.target as Element | null)?.closest?.('a[href]')
      if (!el) return
      const a = el as HTMLAnchorElement
      if (a.target === '_blank' || a.hasAttribute('download')) return

      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url: URL
      try {
        url = new URL(href, window.location.origin)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const nextPath = url.pathname + url.search
      const herePath = window.location.pathname + window.location.search
      if (nextPath === herePath) return

      e.preventDefault()
      e.stopPropagation()
      setSaveError(null)
      setPendingHref(url.pathname + url.search + url.hash)
      setDialogOpen(true)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isAnyDirty])

  async function handleSaveAndLeave() {
    if (!pendingHref || !canSaveAndLeave()) return
    setSavingNav(true)
    setSaveError(null)
    try {
      await saveAllDirty()
      setDialogOpen(false)
      const href = pendingHref
      setPendingHref(null)
      router.push(href)
    } catch {
      setSaveError('Could not save. Fix any errors and try again.')
    } finally {
      setSavingNav(false)
    }
  }

  function handleLeaveWithoutSaving() {
    if (!pendingHref) return
    setDialogOpen(false)
    const href = pendingHref
    setPendingHref(null)
    setSaveError(null)
    router.push(href)
  }

  function handleCancelNavigation() {
    setPendingHref(null)
    setDialogOpen(false)
    setSaveError(null)
  }

  return (
    <CompanyUnsavedContext.Provider value={{ register }}>
      {children}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="company-unsaved-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label="Dismiss dialog"
            onClick={handleCancelNavigation}
          />
          <div
            className={cn(
              'relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg',
            )}
          >
            <h2 id="company-unsaved-title" className="text-sm font-semibold text-foreground">
              Unsaved changes
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              You have unsaved changes on this page. Save before leaving, or discard them.
            </p>
            {saveError && (
              <p className="mt-3 text-sm text-destructive">{saveError}</p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={handleCancelNavigation}
                disabled={savingNav}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Stay on page
              </button>
              <button
                type="button"
                onClick={handleLeaveWithoutSaving}
                disabled={savingNav}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              >
                Leave without saving
              </button>
              {canSaveAndLeave() && (
                <button
                  type="button"
                  onClick={handleSaveAndLeave}
                  disabled={savingNav}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingNav ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save and leave'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyUnsavedContext.Provider>
  )
}

export function useRegisterCompanyUnsaved(
  isDirty: boolean,
  save: () => Promise<void>,
  options?: { supportsSaveAndLeave?: boolean },
) {
  const ctx = useContext(CompanyUnsavedContext)
  const isDirtyRef = useRef(isDirty)
  const saveRef = useRef(save)
  isDirtyRef.current = isDirty
  saveRef.current = save

  const supportsSaveAndLeave = options?.supportsSaveAndLeave !== false

  useEffect(() => {
    if (!ctx) return
    return ctx.register({
      isDirty: () => isDirtyRef.current,
      save: () => saveRef.current(),
      supportsSaveAndLeave,
    })
  }, [ctx, isDirty, supportsSaveAndLeave])
}
