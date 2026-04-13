import { createClient } from '@/lib/supabase/server'
import { createUntypedServiceClient } from '@/lib/supabase/service'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import { computeSpeakerMetrics, buildPlainTranscript } from '@/lib/discovery/speaker-metrics'
import type { DeepgramWord } from '@/lib/discovery/speaker-metrics'

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
  'video/webm', // browser MediaRecorder sometimes uses this MIME for audio-only webm
])

const MAX_FILE_BYTES = 500 * 1024 * 1024 // 500 MB

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file')
    const interviewerSpeakerRaw = formData.get('interviewer_speaker')

    if (!(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }
    if (!interviewerSpeakerRaw || isNaN(Number(interviewerSpeakerRaw))) {
      return Response.json({ error: 'interviewer_speaker (0 or 1) is required' }, { status: 400 })
    }
    const interviewerSpeaker = Number(interviewerSpeakerRaw)

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Response.json({ error: 'Unsupported file type. Use mp3, m4a, wav, or webm.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ error: 'File too large (max 500 MB).' }, { status: 400 })
    }

    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      console.error('[transcribe] DEEPGRAM_API_KEY not set')
      return Response.json({ error: 'Transcription service not configured' }, { status: 500 })
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() ?? 'audio'
    const storagePath = `${org.id}/${crypto.randomUUID()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const serviceClient = createUntypedServiceClient()
    const { error: uploadError } = await serviceClient.storage
      .from('discovery-audio')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[transcribe] Storage upload failed:', uploadError.message)
      return Response.json({ error: 'Failed to store audio file' }, { status: 500 })
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from('discovery-audio')
      .getPublicUrl(storagePath)

    // Call Deepgram Nova-3 with diarization
    const deepgramRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&diarize=true&punctuate=true&utterances=false&words=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': file.type,
      },
      body: buffer,
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

    const transcript = buildPlainTranscript(words, interviewerSpeaker)
    const metrics = computeSpeakerMetrics(words, interviewerSpeaker)

    return Response.json({
      data: {
        transcript,
        audio_url: publicUrl,
        diarized_transcript: words,
        metrics,
      },
    })
  } catch (err) {
    console.error('[transcribe] Unexpected error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
