# Migration: content_type_templates — add base_prompt

**File:** `20260323_content_type_base_prompt.sql`

## What it does

Adds a `base_prompt` TEXT column to `content_type_templates` and populates each built-in template with a structural AI prompt block.

## Why

Previously, templates carried only a `name` and a short `description`. That gave the UI a label to display but added no real value to AI generation — admins had to write all prompt logic themselves in `custom_rules`.

The `base_prompt` field is the structural foundation of every generation request. It tells the AI *how to build* the output (structure, format, sections, length constraints). The admin's `custom_rules` then layers platform-specific or brand-specific overrides on top.

## Prompt assembly (at generation time)

```
1. Brand context    — who the company is, voice, tone, pillars (from brand_context table)
2. base_prompt      — structural contract for this format (from content_type_templates)
3. custom_rules     — org-specific overrides written by the admin (from content_types table)
```

## Templates updated

| slug | base_prompt summary |
|---|---|
| `social-post` | Hook + 2–3 body sentences + CTA. Plain prose, single scroll. |
| `video-script` | Cold open + 3–4 labelled sections + spoken CTA. Formatted for speech. |
| `long-form` | Headline + intro + 3–5 subheaded sections + conclusion. Article structure. |

## How to run

Paste the SQL into the Supabase SQL editor for the splyts-os project and execute.
