# 20260402_customer_hub_saas_segments

## Summary

Refocuses Customer Hub on SaaS user segments: replaces investor/partner with free_user and power_user, and adds `source_segment` to customer_insights for segment-level signal capture (e.g. a survey completed by beta users as a group).

## Gherkin specs

Supports `docs/features/customer-hub.md` — specifically the segment-level insight entry scenario.

## Design notes

- `investor` and `partner` removed from the segment enum — these belong in a different context (investors are tracked in the business plan, partners are outside the SaaS customer loop).
- `free_user` and `power_user` added — directly relevant SaaS activation and retention signals.
- `source_segment` on `customer_insights` is nullable. When set, it means the insight came from that segment as a whole (e.g. a batch survey) rather than from a specific individual. A single insight can have both `source_contact_id` and `source_segment` set at the same time (e.g. one user whose segment is known).
- Any existing contacts with `investor` or `partner` segments are nulled out rather than deleted.
