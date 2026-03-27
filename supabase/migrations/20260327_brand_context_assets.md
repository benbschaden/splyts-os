# Migration: brand_context brand_assets

## Summary

Adds a `brand_assets` JSONB column on `brand_context` for org-scoped visual identity reference (logos, colors, typography, image style, social handles).

## Gherkin specs

Supports the Brand assets dashboard page: members read; admins update.

## ADRs

- **JSONB on existing row:** Keeps one row per org with brand context; avoids a separate table for a single document-shaped blob.
- **Default `{}`:** Empty object when not yet configured; application merges PATCH payloads into stored JSON.

## Design notes

- Keys are optional strings at the application layer; validation is Zod in the API route.
- RLS on `brand_context` continues to scope by organization; updates use the service client from trusted query helpers with `organization_id` filtering.
