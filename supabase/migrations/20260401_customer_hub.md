# 20260401_customer_hub

## Summary

Adds three tables (`contacts`, `contact_communications`, `customer_insights`) that power the Customer Hub tool, plus a seed project and backfill for existing organisations.

## Gherkin specs

Supports all scenarios in `docs/features/customer-hub.md`:
- Add a contact
- Log an inbound email from a contact
- Draft a reply (AI chat with contact history as context)
- Extract an insight from a communication
- View all recent communications in Inbox
- Filter insights by category
- Include customer insights in AI context across the OS

## ADRs

- **Org-scoped, not project-scoped.** Contacts, communications, and insights belong to the organisation, not to a specific project. The Customer Hub project is purely the UI entry point. This allows contacts and insights to be surfaced across all projects via AI context.
- **Soft deletes everywhere.** All three tables use `deleted_at TIMESTAMPTZ`. Contacts should never be permanently lost — deletion should be reversible.
- **`include_in_ai` on insights only.** Unlike `discovery_entries` where individual entries can be toggled into AI context, Customer Hub uses a higher-level abstraction: insights are the curated distillation of raw communications. Only insights flow into the OS-wide AI context, not raw email content.
- **FK from insights to both contacts and communications.** `source_contact_id` and `source_communication_id` are both nullable FKs. An insight can be standalone, linked to just a contact, or traced back to a specific communication. This preserves provenance without requiring it.

## Design notes

- `contacts.health` (green/yellow/red) is set manually. Automated health scoring is a future phase.
- `contact_communications.is_draft` allows saving reply drafts before sending. Draft emails are visible in the UI but excluded from analytics.
- `customer_insights.status` progression: `new` → `validated` → `actioned` → `archived`. This gives the CEO a processing workflow: capture raw signal, validate it matters, act on it, then archive.
- The backfill uses the same `CROSS JOIN LATERAL` admin-first pattern as `20260329_customer_discovery.sql` to ensure the hub project is created under the org's admin user.
