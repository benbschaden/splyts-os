import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  'video/webm',
])

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json() as { contentType?: unknown }
    const contentType = typeof body.contentType === 'string' ? body.contentType : ''

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return Response.json({ error: 'Unsupported file type. Use mp3, m4a, wav, or webm.' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[contentType] ?? 'audio'
    const storagePath = `${org.id}/${crypto.randomUUID()}.${ext}`

    const serviceClient = createUntypedServiceClient()
    const { data, error } = await serviceClient.storage
      .from('discovery-audio')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('[upload-url] Failed to create signed upload URL:', error?.message)
      return Response.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return Response.json({
      data: {
        signedUrl: data.signedUrl,
        storagePath,
      },
    })
  } catch (err) {
    console.error('[upload-url] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
