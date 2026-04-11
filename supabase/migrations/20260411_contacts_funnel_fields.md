# 20260411 — Contacts Funnel Fields

## Summary
Adds funnel lifecycle tracking columns to the `contacts` table to support an auto-computed conversion funnel strip in Customer Hub, and lays the groundwork for webhook-driven stage automation in later phases.

## Gherkin Specs

```gherkin
Feature: Customer Hub funnel strip
  Scenario: Viewing the funnel strip in Customer Hub
    Given I am on the Customer Hub contacts tab
    Then I see a row of clickable stage counts above the contacts list
    And each stage shows the current count and contacts added this week

  Scenario: Filtering contacts by funnel stage
    Given the funnel strip is visible
    When I click "Form Completed (41)"
    Then the contacts list filters to show only contacts at that stage
    When I click the same stage again
    Then the filter is cleared

  Scenario: Adding a contact with funnel stage
    Given I open the Add Contact dialog
    When I fill in name, email, funnel stage and acquisition source
    Then the contact is created with the correct stage and source
    And the funnel strip count for that stage increases by one
```

## ADRs

- **Ordered enum via CHECK constraint** — `funnel_stage` uses a CHECK constraint rather than a Postgres enum type because adding values to an enum type requires a table rewrite in older Postgres versions; a CHECK constraint can be widened with a simple ALTER.
- **`tally_submission_id` and `loops_contact_id` UNIQUE** — External deduplication keys are unique to prevent double-creation from webhook retries.
- **`funnel_stage_updated_at` vs per-stage timestamps** — Only `first_session_at` and `activated_at` get dedicated timestamp columns (they are the two stages that benefit from precise, queryable timestamps for activation-rate analysis). Earlier stages use `funnel_stage_updated_at` which is set automatically whenever the stage changes.

## Design Notes

- All new columns are nullable — existing contacts are unaffected and continue to work without a stage set.
- The funnel strip in the UI only shows contacts that have a non-null `funnel_stage`; contacts without a stage are still visible in the unfiltered list.
- `loops_contact_id` and `tally_submission_id` are write-once from webhooks (Phases 2–3); they are not exposed in the manual add/edit dialog.
