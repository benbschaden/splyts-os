# Discovery Chunked Analysis — Design

**Status:** Approved (in-conversation)
**Author:** AI agent + Ben
**Date:** 2026-04-28

## Why

Today's per-entry analyse path slices `raw_content` to 30,000 characters and
sends one call. The cross-study synthesis path sends a 500-character excerpt
of each entry. For 60–90 minute interviews and studies of 10–20 such
interviews, both paths discard most of the transcript. The model has been
telling the user it cannot read content that wasn't in fact sent to it.

This design replaces both paths with a chunked map → verify → reduce
pipeline that processes every byte of every transcript and verifies every
quote it surfaces.

## Hard guarantees

1. **Full coverage.** Every byte of `raw_content` is sent to an LLM at
   least once during analysis (via its chunk).
2. **No invented quotes.** Quotes returned by the LLM that do not match
   their source chunk verbatim (whitespace-normalised) are dropped before
   reaching the user.
3. **Provenance.** Every claim in a study synthesis traces back to specific
   chunks of specific entries via a `discovery_study_synthesis_runs` row.

## Architecture

### Data model (new)

- `discovery_entry_chunks`
  - `id UUID` PK
  - `entry_id UUID` FK → `discovery_entries(id)` ON DELETE CASCADE
  - `organization_id UUID` (denormalised for RLS)
  - `chunk_index INTEGER` (0-based, ordered)
  - `start_offset INTEGER` (in `raw_content`)
  - `end_offset INTEGER`
  - `text TEXT`
  - `findings_json JSONB` (verified findings; null while pending)
  - `verification_stats JSONB` (counts of returned/dropped/kept per category)
  - `status TEXT CHECK (status IN ('pending','succeeded','failed'))`
  - `error TEXT` (when failed)
  - `model_id TEXT` (which model produced findings)
  - `prompt_version TEXT`
  - `created_at`, `updated_at`
  - Unique: `(entry_id, chunk_index)`
  - Index: `(entry_id)`, `(organization_id)`

- `discovery_study_synthesis_runs`
  - `id UUID` PK
  - `study_id UUID` FK → `discovery_studies(id)` ON DELETE CASCADE
  - `organization_id UUID`
  - `model_id TEXT`
  - `prompt_version TEXT`
  - `entries_included INTEGER`
  - `chunks_consulted INTEGER`
  - `quotes_dropped INTEGER`
  - `status TEXT CHECK (status IN ('running','succeeded','failed'))`
  - `analysis_markdown TEXT`
  - `error TEXT`
  - `started_at`, `completed_at`
  - Index: `(study_id)`, `(organization_id)`

- `discovery_entries.analysis_json JSONB` (new column)
  - The verified entry-level digest produced by the reduce step.
  - `analysis_markdown` (existing column on `discovery_studies`) is the human-facing render.

- `discovery_entries.raw_content_hash TEXT` (new column)
  - sha256 of `raw_content`. Used to short-circuit re-analysis when content
    hasn't changed.

All new tables enable RLS with the same `organization_members` policy used
by existing discovery tables. All queries scope by `organization_id`.

### Pipeline

```
raw_content (canonical, never modified)
   │
   ▼
[1] chunker (lib/discovery/chunking.ts) — deterministic, no AI
   │
   ▼
discovery_entry_chunks rows (status='pending')
   │
   ▼
[2] map (parallel) — Anthropic call per chunk
   │
   ▼
chunk findings (raw)
   │
   ▼
[3] verifier (lib/discovery/verification.ts) — string-match
   │
   ▼
chunk findings (verified, status='succeeded')
   │
   ▼
[4] reduce-1 (per entry)
   │
   ▼
discovery_entries.analysis_json + analysis_markdown
   │
   ▼
[5] reduce-2 (per study, on synthesise)
   │
   ▼
discovery_studies.analysis_markdown + synthesis run row
```

### Chunking rules (deterministic)

- Target chunk size: **12,000 characters**.
- Overlap: **1,000 characters** (so a thought spanning a boundary is
  visible in two chunks; the verifier dedupes by quote text).
- Boundary preference: split on **double newline** (paragraph), then
  **single newline**, then **sentence end** (`. ! ?` followed by space),
  then hard cut.
- A transcript with no internal newlines still chunks correctly — fall
  through to sentence then hard-cut.
- Offsets are byte offsets into `raw_content` and remain valid as long as
  `raw_content` does not change.

### Map prompt (chunk extraction)

Inputs: chunk text, entry type, available tags, study goal (optional).

Output: strict JSON.

```ts
{
  themes: { quote: string, start_offset?: number, end_offset?: number }[]
  jtbd_signals: { quote: string, ... }[]
  pains: { quote: string, severity_1_5: number | null }[]
  wtp_signals: { quote: string, signal: 'strong'|'moderate'|'weak'|'none', prices: number[] }[]
  objections: { quote: string }[]
  decisions: { quote: string }[]
  open_questions: { question: string }[]
  notes: string | null   // brief researcher-style note for THIS chunk only
}
```

Prompt rules:
- "Only output what is explicitly present in this chunk."
- "Quotes MUST be exact verbatim text from the chunk above. Never paraphrase."
- "If a field is empty, return `[]`. Do not invent."
- "If a quote is not a complete standalone statement, expand it until it is — but it must still be exact verbatim text."

### Verification

For each `quote` in the map output:

1. Whitespace-normalise the chunk text and the quote (collapse runs of
   whitespace to a single space, trim).
2. If the quote is found in the normalised chunk → **kept**, attach
   `start_offset` / `end_offset` mapped back to the original chunk text.
3. If not found → **dropped**, increment `verification_stats.dropped`.

The verifier is the single source of "is this real". The LLM cannot
override it.

### Reduce 1 — entry digest

Inputs: all `succeeded` chunks for one entry + study notes/goal.

A second Anthropic call summarises the entry from the verified findings
only (never from raw_content directly). Output is a small Markdown digest
+ structured fields:

- `sentiment`: positive | neutral | negative | mixed
- `tags`: string[] from available tags
- `key_quote_1/2/3`: top three verified quotes by importance
- `jtbd`: "Help me … so I can …"
- `wtp_signal` + `wtp_price_points`
- `problem_severity` (1–5)
- `adoption_willingness` (1–5)
- `analysis_markdown`: scannable per-entry summary

These structured fields keep backwards compatibility with everything in
the codebase that already reads them (e.g. `buildChatSystemPrompt`).

### Reduce 2 — study synthesis

Inputs: each entry's `analysis_json` + `analysis_markdown` (small).

Single Anthropic call writes the study report.

Prompt rule:
"Every direct quote in your output MUST appear in at least one of the
provided entry digests. If you want to make a claim that is not supported
by a verified quote in the digests, prefix it with 'Inferred from
patterns:' or omit it."

A `discovery_study_synthesis_runs` row is created at start (status
`running`), updated on completion. Even if the LLM call fails, the row
records what was attempted.

### API contract

- `POST /api/discovery-entries/analyse`
  - Body: `{ entry_id: string }` (changed — was raw_content + entry_type;
    we now require the entry to be saved first, which matches the existing
    drawer flow that creates the entry on save and re-analyses on edit).
  - **Backward compatibility**: if `raw_content` + `entry_type` are passed
    instead, run the pipeline against an in-memory transient entry and
    return only the structured fields (no chunk persistence).
  - Returns: `{ data: { sentiment, tags, key_quote_1/2/3, jtbd, wtp_signal,
    wtp_price_points, problem_severity, adoption_willingness,
    analysis_markdown, chunks_total, chunks_succeeded, chunks_failed,
    quotes_dropped } }`
  - Errors: `{ error: string }`

  This change keeps the existing drawer call working: it currently passes
  `raw_content` + `entry_type` for new entries (which we treat as transient)
  and would also work in a saved-entry flow if we updated the drawer to
  call analyse after save.

- `POST /api/discovery-studies/[id]/synthesise`
  - Body: `{ model_id?: string }`
  - For any included entry without chunks, run the per-entry pipeline first.
  - Creates a `discovery_study_synthesis_runs` row.
  - Returns: `{ data: { analysis_markdown, run: { id, entries_included,
    chunks_consulted, quotes_dropped } } }`

### UI

- `discovery-drawer.tsx` analyse panel:
  - Show "Chunking…" → "Analysing N chunks…" (with N) → "Reducing…" → results.
  - After analysis, show a small line: "Analysed N chunks · M quotes verified · K dropped".
  - If any chunk failed, show a non-blocking warning.

- `discovery-study-detail.tsx` Analysis tab:
  - On synthesise, show "Analysing entries (N/M)…" then "Synthesising…".
  - Below the analysis card, show the latest run row: timestamp, entries
    included, chunks consulted, quotes dropped during entry analysis.

### Performance

- Per-chunk extraction Anthropic calls run in parallel with concurrency 5
  (cap to avoid rate-limit storms; tune later if needed).
- A 100k transcript = ~9 chunks × ~5–10s ≈ 10–20s wall time at concurrency 5.
- A 20-entry study where all are pre-analysed: synthesis is one LLM call
  on small digests (~10–30s).
- A 20-entry study where none are pre-analysed: the `synthesise` endpoint
  must handle this in <60s on hobby Vercel or <300s on pro. We do entries
  in parallel with concurrency 3 to stay under timeout. If we cannot
  finish in time, return the partial result + a 202 status with the run
  marked `running` for the next poll. **For v1, we accept the constraint
  that the user clicks Synthesise on a study where all entries already
  have chunks**, i.e. analyse-on-create remains the default path.

### Backwards compatibility

- Existing `discovery_entries` rows continue to work. They have no chunks
  and no `analysis_json` until the user clicks Analyse on each.
- Existing `analysis_markdown` on studies remains valid; it is overwritten
  next time the user clicks Synthesise.
- Existing structured fields (`sentiment`, `key_quote_*`, `jtbd`, etc.)
  are now derived from verified findings on next analyse but still readable
  by all current callers (chat prompts, etc.) without changes.
- The old `buildStudySynthesisPrompt` is replaced; the file size grows
  bounded.

## Out of scope (not in this pass)

- Chunk-level embeddings / RAG. Current entry-level embeddings keep working.
- Study chat / per-entry-discuss prompt rewrites. Those flows still
  truncate (12k / 150k respectively) — separate follow-up.
- A "click a quote in the report → jump to source span" UI affordance.
  Citations are visible as text only for now.
- Streaming progress over SSE; UI uses simple polling/loaders.
- Auto-backfill of all existing entries. Users re-analyse on demand.

## Risk / mitigation

- **Anthropic call failures** — partial completion still produces a digest
  from successful chunks; failure counts surface in UI.
- **Drift in raw_content vs chunks** — we hash `raw_content`; mismatch
  triggers a clean re-chunk.
- **Cost** — per-chunk calls are small (one chunk's worth of tokens) so
  total cost scales linearly with transcript length, which is what the
  user is paying for anyway.
- **Vercel timeout** — entry analyse is bounded (~20–30s typical, ~60s
  worst case for very long transcripts). Study synthesise is bounded if
  entries are pre-analysed; otherwise see Performance note above.
