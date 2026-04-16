# Migration: discovery_entries persona match columns

## Summary
Adds four columns to `discovery_entries` to store the result of a Claude-powered persona assessment, matching the same pattern used by the `contacts` table.

## Gherkin specs
```gherkin
Feature: Assess persona for discovery entry
  Scenario: User assesses persona for an existing discovery entry
    Given an existing discovery entry with raw_content
    And at least one persona exists in the organization
    When the user clicks "Assess persona"
    Then Claude matches the entry to the closest persona
    And the match result (persona_id, score, reasoning) is saved to the entry
    And the result is shown inline in the drawer

  Scenario: No strong match found
    Given an existing discovery entry
    And no personas closely match the entry
    When the user clicks "Assess persona"
    Then Claude returns a score below 45
    And a suggested new persona draft is shown
    And the user can click "Create persona in Company" to save it
```

## ADRs
- Mirrors the exact columns used on the `contacts` table (`persona_id`, `persona_match_score`, `persona_match_reasoning`, `persona_matched_at`) for consistency.
- `persona_id` uses `ON DELETE SET NULL` so deleting a persona doesn't orphan discovery entries.

## Design notes
- `persona_match_name TEXT` is a denormalized copy of the persona name at match time. Stored alongside `persona_id` so the list card can display the name without requiring a join or prop-threading through 4 component layers. If a persona is renamed, the stored name reflects what it was called at the time of assessment.
- `persona_match_score` is an INTEGER (0–100) not FLOAT — whole number percentage is precise enough and simpler to display.
- Index on `persona_id` added to support future queries like "all entries matched to persona X".
- No RLS change needed — discovery_entries already has org-scoped RLS; the new columns inherit it.
