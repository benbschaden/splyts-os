import { redirect } from 'next/navigation'

export default function MarketingAuthorsRedirect() {
  redirect('/dashboard/settings/profile')
}
