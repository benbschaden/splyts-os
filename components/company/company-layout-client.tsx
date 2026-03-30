'use client'

import { CompanyUnsavedProvider } from '@/components/company/company-unsaved-context'

export function CompanyLayoutClient({ children }: { children: React.ReactNode }) {
  return <CompanyUnsavedProvider>{children}</CompanyUnsavedProvider>
}
