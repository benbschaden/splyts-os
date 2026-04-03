export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessionById, getChatMessages } from '@/lib/queries/chat'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ prompt?: string }>
}) {
  const [{ id }, { prompt }] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const [session, messages] = await Promise.all([
    getChatSessionById(id, user.id),
    getChatMessages(id),
  ])

  if (!session || session.organization_id !== org.id) notFound()

  return <ChatInterface session={session} initialMessages={messages} initialPrompt={prompt} />
}
