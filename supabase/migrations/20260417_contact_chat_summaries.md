# Migration: contact_chat_summaries

## Summary
Creates a table to store AI-generated prose summaries of customer hub chat sessions, scoped to a contact or cohort segment.

## Gherkin specs

```gherkin
Feature: Contact chat summary

  Scenario: Summarize a chat about a contact
    Given I am in the Chat tab on a contact detail page
    And the chat has messages
    When I click "Summarize chat"
    Then a prose summary doc appears pinned in the Chat tab
    And it shows what was learned, decisions made, and key context
    And the summary persists if I close and reopen the contact

  Scenario: Re-summarizing replaces the previous summary
    Given a summary already exists in the Chat tab
    When I continue chatting and click "Summarize chat" again
    Then the new summary replaces the old one
```

## ADRs

- **One summary per session** (`session_id UNIQUE`): Re-summarizing overwrites the previous summary via upsert. Simple, expected UX — the latest summary is always the authoritative one.
- **`contact_id` denormalized on the summary**: Allows future querying of all summaries for a contact without joining through `chat_sessions`. Nullable because segment-scoped summaries have no contact.
- **No `deleted_at`**: Summaries are replaced, not archived. If a user wants to remove a summary, the session itself would be cleared. Hard delete is fine for this type of content.

## Design notes

- `segment` stores the cohort segment key (e.g. `'beta_user'`) for segment-scoped chat summaries. Mirrors `context_config.customer_hub_segment` on the chat session.
- The `UNIQUE` constraint on `session_id` enables a clean `ON CONFLICT (session_id) DO UPDATE` upsert — no separate "check if exists" query needed.
- RLS scopes by `organization_id` through `organization_members`, consistent with all other content tables.
