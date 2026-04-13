// TypeScript port of analyze_speakers.py
// Computes per-speaker and conversation-level metrics from a Deepgram
// diarized transcript. Mirrors the exact algorithm from the Python script:
//   - Pass 1: duration, word count, turns per speaker
//   - Pass 2: overlaps (interruptions)
//   - Pass 3: turn-link metrics (IJL, ISR, SPR)

export type DeepgramWord = {
  word: string
  start: number
  end: number
  speaker: number
  punctuated_word?: string
}

export type SpeakerMetrics = {
  interviewer_talk_pct: number
  interviewee_talk_pct: number
  interviewer_wpm: number
  interviewee_wpm: number
  interviewer_turns: number
  interviewee_turns: number
  total_interruptions: number
  // Interviewer Jump-in Latency: gap from interviewee end to interviewer start
  ijl_median_s: number
  ijl_mean_s: number
  // Interviewee Self-Continuation Rate: % of interviewee turns followed by interviewee again
  isr_pct: number
  // Short-Preemption Rate: % of interviewee turns where interviewer jumps in ≤0.5s
  spr_pct: number
}

type Segment = {
  speaker: number
  start: number
  end: number
  words: string[]
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function buildSegments(words: DeepgramWord[]): Segment[] {
  if (words.length === 0) return []

  const segments: Segment[] = []
  let current: Segment = {
    speaker: words[0].speaker,
    start: words[0].start,
    end: words[0].end,
    words: [words[0].punctuated_word ?? words[0].word],
  }

  for (let i = 1; i < words.length; i++) {
    const w = words[i]
    if (w.speaker === current.speaker) {
      current.end = w.end
      current.words.push(w.punctuated_word ?? w.word)
    } else {
      segments.push(current)
      current = {
        speaker: w.speaker,
        start: w.start,
        end: w.end,
        words: [w.punctuated_word ?? w.word],
      }
    }
  }
  segments.push(current)
  return segments
}

export function computeSpeakerMetrics(
  words: DeepgramWord[],
  interviewerSpeaker: number,
): SpeakerMetrics {
  const segments = buildSegments(words)

  // --- Pass 1: basic tallies per speaker ---
  const durBySpeaker = new Map<number, number>()
  const wordsBySpeaker = new Map<number, number>()
  const turnsBySpeaker = new Map<number, number>()

  for (const seg of segments) {
    const dur = Math.max(0, seg.end - seg.start)
    durBySpeaker.set(seg.speaker, (durBySpeaker.get(seg.speaker) ?? 0) + dur)
    wordsBySpeaker.set(seg.speaker, (wordsBySpeaker.get(seg.speaker) ?? 0) + seg.words.length)
    turnsBySpeaker.set(seg.speaker, (turnsBySpeaker.get(seg.speaker) ?? 0) + 1)
  }

  const totalDur = Array.from(durBySpeaker.values()).reduce((s, v) => s + v, 0)

  // --- Pass 2: overlaps (interruptions) ---
  let totalInterruptions = 0
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]
    const cur = segments[i]
    if (prev.speaker !== cur.speaker && cur.start < prev.end) {
      totalInterruptions++
    }
  }

  // --- Pass 3: turn-link metrics ---
  const ijlGaps: number[] = []  // gap after interviewee → interviewer
  const iscGaps: number[] = []  // gap after interviewee → interviewee (self-continue)
  let ieeTurns = 0              // total interviewee end events
  let sprFast = 0               // interviewer jumps in ≤ 0.5s

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]
    const cur = segments[i]
    const prevRole = prev.speaker === interviewerSpeaker ? 'interviewer' : 'interviewee'
    const curRole = cur.speaker === interviewerSpeaker ? 'interviewer' : 'interviewee'
    const gap = cur.start - prev.end

    if (gap > 0 && prevRole === 'interviewee') {
      ieeTurns++
      if (curRole === 'interviewer') {
        ijlGaps.push(gap)
        if (gap <= 0.5) sprFast++
      } else {
        iscGaps.push(gap)
      }
    }
  }

  // --- Compute role totals ---
  const interviewerDur = durBySpeaker.get(interviewerSpeaker) ?? 0
  const interviewerWords = wordsBySpeaker.get(interviewerSpeaker) ?? 0
  const interviewerTurns = turnsBySpeaker.get(interviewerSpeaker) ?? 0

  let intervieweeDur = 0
  let intervieweeWords = 0
  let intervieweeTurns = 0
  for (const [spk, dur] of durBySpeaker) {
    if (spk !== interviewerSpeaker) {
      intervieweeDur += dur
      intervieweeWords += wordsBySpeaker.get(spk) ?? 0
      intervieweeTurns += turnsBySpeaker.get(spk) ?? 0
    }
  }

  const wpm = (words: number, durS: number): number =>
    durS > 0 ? Math.round((words / durS) * 60 * 10) / 10 : 0

  return {
    interviewer_talk_pct: totalDur > 0 ? Math.round((interviewerDur / totalDur) * 1000) / 10 : 0,
    interviewee_talk_pct: totalDur > 0 ? Math.round((intervieweeDur / totalDur) * 1000) / 10 : 0,
    interviewer_wpm: wpm(interviewerWords, interviewerDur),
    interviewee_wpm: wpm(intervieweeWords, intervieweeDur),
    interviewer_turns: interviewerTurns,
    interviewee_turns: intervieweeTurns,
    total_interruptions: totalInterruptions,
    ijl_median_s: Math.round(median(ijlGaps) * 1000) / 1000,
    ijl_mean_s: Math.round(mean(ijlGaps) * 1000) / 1000,
    isr_pct: ieeTurns > 0 ? Math.round((iscGaps.length / ieeTurns) * 1000) / 10 : 0,
    spr_pct: ieeTurns > 0 ? Math.round((sprFast / ieeTurns) * 1000) / 10 : 0,
  }
}

export function buildPlainTranscript(words: DeepgramWord[], interviewerSpeaker: number): string {
  const segments = buildSegments(words)
  return segments
    .map((seg) => {
      const role = seg.speaker === interviewerSpeaker ? 'Interviewer' : 'Interviewee'
      return `${role}: ${seg.words.join(' ')}`
    })
    .join('\n')
}
