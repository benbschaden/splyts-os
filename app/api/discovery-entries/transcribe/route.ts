import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import type { DeepgramWord } from '@/lib/discovery/speaker-metrics'

// Extend timeout to 60s — Deepgram processing of long audio can take 20–40s
export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json() as { storagePath?: unknown }
    const storagePath = typeof body.storagePath === 'string' ? body.storagePath : null

    if (!storagePath) {
      return Response.json({ error: 'storagePath is required' }, { status: 400 })
    }

    // Verify path belongs to this org — prevents one org accessing another's audio
    if (!storagePath.startsWith(`${org.id}/`)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      console.error('[transcribe] DEEPGRAM_API_KEY not set')
      return Response.json({ error: 'Transcription service not configured' }, { status: 500 })
    }

    // Generate a short-lived signed URL so Deepgram can fetch the file directly.
    // 10 minutes is enough for Deepgram to start the download.
    const serviceClient = createUntypedServiceClient()
    const { data: signedData, error: signedError } = await serviceClient.storage
      .from('discovery-audio')
      .createSignedUrl(storagePath, 600)

    if (signedError || !signedData?.signedUrl) {
      console.error('[transcribe] Failed to create signed download URL:', signedError?.message)
      return Response.json({ error: 'Failed to access audio file' }, { status: 500 })
    }

    // Store bucket-relative path — used to generate signed playback URLs later
    const audioStoragePath = `discovery-audio/${storagePath}`

    // Deepgram URL-based transcription: Deepgram fetches the file itself.
    // No audio bytes pass through this server — works for any file size.
    const deepgramRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&diarize=true&punctuate=true&utterances=false&words=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: signedData.signedUrl }),
    })

    if (!deepgramRes.ok) {
      const errText = await deepgramRes.text().catch(() => '')
      console.error('[transcribe] Deepgram error:', deepgramRes.status, errText)
      return Response.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const dgJson = await deepgramRes.json() as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            words?: DeepgramWord[]
          }>
        }>
      }
    }

    const words = dgJson.results?.channels?.[0]?.alternatives?.[0]?.words
    if (!words || words.length === 0) {
      return Response.json({ error: 'No transcript returned from Deepgram' }, { status: 502 })
    }

    return Response.json({
      data: {
        audio_url: audioStoragePath,
        words,
      },
    })
  } catch (err) {
    console.error('[transcribe] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
