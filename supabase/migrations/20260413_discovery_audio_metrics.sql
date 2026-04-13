-- ============================================================
-- Discovery: audio transcription + speaker metrics + AI signals
-- ============================================================
-- Extends discovery_entries with:
--   • Audio storage URL and raw Deepgram diarized output
--   • Conversation metrics computed from diarized timestamps
--     (TypeScript port of analyze_speakers.py)
--   • Content signals extracted by Claude Opus
-- ============================================================

-- Audio source
ALTER TABLE public.discovery_entries
  ADD COLUMN IF NOT EXISTS audio_url           TEXT,
  ADD COLUMN IF NOT EXISTS diarized_transcript JSONB;

-- Conversation metrics (computed from Deepgram timestamps)
ALTER TABLE public.discovery_entries
  ADD COLUMN IF NOT EXISTS interviewer_talk_pct  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS interviewee_talk_pct  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS interviewer_wpm        NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS interviewee_wpm        NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS interviewer_turns      INTEGER,
  ADD COLUMN IF NOT EXISTS interviewee_turns      INTEGER,
  ADD COLUMN IF NOT EXISTS total_interruptions    INTEGER,
  ADD COLUMN IF NOT EXISTS ijl_median_s           NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS ijl_mean_s             NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS isr_pct                NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS spr_pct                NUMERIC(5,1);

-- Content signals (Claude Opus extracted)
ALTER TABLE public.discovery_entries
  ADD COLUMN IF NOT EXISTS wtp_signal           TEXT
    CHECK (wtp_signal IN ('strong', 'moderate', 'weak', 'none')),
  ADD COLUMN IF NOT EXISTS wtp_price_points     JSONB,
  ADD COLUMN IF NOT EXISTS problem_severity     SMALLINT
    CHECK (problem_severity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS adoption_willingness SMALLINT
    CHECK (adoption_willingness BETWEEN 1 AND 5);
