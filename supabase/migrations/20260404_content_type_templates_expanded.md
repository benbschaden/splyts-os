# Migration: content_type_templates_expanded

## Summary
Adds three new global content type templates: Email Newsletter, Podcast Script, and Case Study.

## Gherkin specs
- Feature: Content Studio backlog uses org content types
  - Scenario: Admin sets up content types
    - Given the org has no content types configured
    - When the admin visits the content types settings page
    - Then they see Email Newsletter, Podcast Script, and Case Study available as templates to add

## ADRs
- Templates are global (not per-org) so all orgs benefit immediately
- `ON CONFLICT (slug) DO NOTHING` makes this idempotent

## Design notes
- Templates define the structural AI prompt — the "how to write it" layer
- Custom rules at the org content type level override or extend the base prompt
- These three fill the most common B2B content gaps not covered by the existing five templates
