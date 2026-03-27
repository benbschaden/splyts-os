# Migration: content_types_platform

Adds a `platform TEXT` column to `content_types`.

When a content type has a `platform` set (e.g. "LinkedIn"), the generation routes will look up a matching `platform_guidelines` row for that organisation and inject it into the AI prompt. This allows per-platform rules to be automatically applied without the user having to specify them in the brief.
