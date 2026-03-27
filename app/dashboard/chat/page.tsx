export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { getChatSessions } from '@/lib/queries/chat'
import { ChatSessionsList } from '@/components/chat/chat-sessions-list'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const org = await getOrganizationForUser(user.id)
  if (!org) redirect('/setup')

  const sessions = await getChatSessions(org.id, user.id)

  return <ChatSessionsList sessions={sessions} />
}
