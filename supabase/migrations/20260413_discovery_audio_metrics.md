# Migration: discovery_audio_metrics

## Summary
Extends `discovery_entries` with audio transcription storage, speaker conversation metrics (computed from Deepgram diarized output), and AI-extracted content signals.

## Gherkin specs
- `docs/features/discovery-voice-analysis.md`

## ADRs
- Audio is stored in Supabase Storage (`discovery-audio` private bucket); only the URL is stored here.
- Diarized transcript JSON is stored as JSONB for reprocessing if metrics need recalculation.
- Speaker metrics are computed in TypeScript (port of `analyze_speakers.py`) rather than in SQL or a separate table, keeping the entry self-contained.
- Content signals (WTP, severity, adoption) live on the entry rather than a separate table — each entry is a single research unit; splitting would add joins with no benefit.

## Design notes
- `interviewer_talk_pct` + `interviewee_talk_pct` do not necessarily sum to 100 because overlaps (interruptions) mean both speakers are speaking simultaneously during those windows. The Python script computes per-speaker duration independently.
- `ijl_median_s`: Interviewer Jump-in Latency — median gap in seconds between an interviewee finishing a turn and the interviewer next speaking. Low IJL (<0.75s) indicates the interviewer may be cutting off the interviewee.
- `isr_pct`: Interviewee Self-Continuation Rate — % of interviewee turns immediately followed by another interviewee turn (not the interviewer). High ISR indicates the interviewer is leaving space.
- `spr_pct`: Short-Preemption Rate — % of interviewee turns where the interviewer jumps in within 0.5s. High SPR indicates interruption behaviour.
- `wtp_price_points` is JSONB (array of numbers) to allow filtering and aggregation across studies without parsing strings.
- All new columns are nullable; entries created before this migration or without audio upload remain fully functional.

## Manual steps after applying
1. Create a private Supabase Storage bucket named `discovery-audio`.
2. Regenerate TypeScript types: `npx supabase gen types typescript --project-id <ref> > lib/types/database.ts`
