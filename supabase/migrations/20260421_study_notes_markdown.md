# Migration: 20260421_study_notes_markdown

## Summary
Adds `notes_markdown` (freeform notes field) to `discovery_studies` so researchers can record hypotheses, stakeholder context, and study goals in a dedicated place separate from the interview script and AI analysis.

## Gherkin specs
Supports: `docs/features/customer-discovery.md` — Notes tab on study detail.

## ADRs
- Separate from `script_markdown` (interview guide) and `analysis_markdown` (AI synthesis) to keep concerns clear.
- Nullable so existing studies are unaffected.

## Design notes
- Content flows into the AI synthesis prompt as research context and into the vector index summary so all AI tool paths can see it.
