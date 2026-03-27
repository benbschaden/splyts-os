# Migration: content_benchmarks

## Summary

Adds `content_benchmarks` for per-organization overrides of industry-default content performance targets; defaults live in application code.

## Gherkin specs

Supports a future “Content benchmarks” feature: users view merged defaults and org-specific values, and admins can customize or reset to defaults.

## ADRs

- **Soft-delete**: Clearing a custom row removes the override and the UI falls back to code defaults (`deleted_at` set).
- **Unique (org, platform, metric)**: One active row per metric per platform per org, enabling upsert by natural key.

## Design notes

- `benchmark_value` is `NUMERIC` for fractional percentages and large counts.
- RLS mirrors other company tables: all members read; admins insert/update/delete.
