# Migration: content_idea_content_type

## Summary
Adds a `content_type_id` foreign key to `content_ideas` so backlog ideas can reference the org's configured content types instead of a free-text platform string.

## Gherkin specs
- Feature: Content Studio backlog matches content types
  - Scenario: User adds a backlog idea
    - Given the org has content types configured
    - When the user adds a new idea to the backlog
    - Then they select a content type from the org's type list
    - And the idea is stored with a content_type_id reference

## ADRs
- `platform` is made nullable rather than removed — existing backlog ideas carry their legacy platform string and display it as a fallback badge
- `content_type_id` is nullable so existing rows are not broken by the migration
- `ON DELETE SET NULL` means deleting a content type does not cascade-delete backlog ideas

## Design notes
- New ideas use content_type_id; the platform column becomes legacy-only
- The backlog UI resolves the content type name from the passed contentTypes prop, avoiding a join in the query for the display case
