# Migration: brand_narratives

## Summary

Adds the `brand_narratives` table for 3–5 core company stories used in messaging and AI context, with RLS and soft deletes.

## Gherkin specs

- Supports company settings: Brand narratives CRUD (member read, admin write).

## ADRs

- Soft delete via `deleted_at` for audit and recovery.
- `include_in_ai` gates which narratives are injected into generation prompts.

## Design notes

- `sort_order` supports manual ordering; default `0` until UI sets explicit order.
- `usage_context` is optional guidance (e.g. pitch vs. social) without enforcing enums.
