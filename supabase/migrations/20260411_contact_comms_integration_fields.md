# 20260411 — Contact Communications Integration Fields

## Summary
Adds `message_id`, `loops_email_id`, and `metadata` columns to `contact_communications` to support the Loops webhook integration (Phase 3) and Resend inbound email capture.

## Gherkin Specs

```gherkin
Feature: Loops email auto-logging
  Scenario: Campaign email sent via Loops
    Given Loops sends a campaign email to a contact
    When the loop.email.sent webhook fires
    Then a contact_communications record is created with the subject and loops_email_id

  Scenario: Contact opens the email
    When the email.opened webhook fires for that email
    Then the existing communication record is updated with metadata.opened_at

  Scenario: Full email content captured via BCC
    Given Loops BCCs the Resend capture address
    When Resend fires the inbound webhook
    Then the contact_communications record is upserted by message_id
    And the full email body is stored in the content field
    And no duplicate record is created if the webhook is retried
```

## Design Notes

- **`metadata` JSONB not individual columns** — Engagement fields (opened_at, clicked_at, delivered_at, bounced) are stored as a JSONB object rather than separate columns. This keeps the schema simple for data that only applies to Loops-sourced records and makes it easy to add new engagement fields without further migrations.
- **UNIQUE on `message_id`** — Partial unique index (where message_id IS NOT NULL) guarantees idempotency when Resend retries inbound webhook delivery.
- **Non-unique on `loops_email_id`** — A single Loops email send results in one `loop.email.sent` record; multiple engagement events (open, click) update that same record. The non-unique index supports the lookup without enforcing uniqueness.
