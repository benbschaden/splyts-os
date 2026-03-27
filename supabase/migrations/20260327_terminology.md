# Migration: terminology

## Summary

Adds the `terminology` table for org-scoped glossary rules (preferred vs avoided wording) with soft deletes and admin-only writes.

## Gherkin specs

Supports company settings for consistent AI and human copy: members read; admins create, update, and soft-delete entries.

## ADRs

- **Soft delete:** `deleted_at` preserves audit history and matches other company content tables.
- **RLS:** Same four-policy pattern as competitors and brand narratives — members select, admins mutate.

## Design notes

- `category` is a lowercase key (`product`, `brand`, `audience`, `general`); the UI maps to display labels.
- All non-deleted rows are intended for AI context (`getTerminologyForAi` mirrors the full list).
