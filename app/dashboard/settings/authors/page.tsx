import { redirect } from 'next/navigation'

export default function OldAuthorsPage() {
  redirect('/dashboard/settings/profile')
}
