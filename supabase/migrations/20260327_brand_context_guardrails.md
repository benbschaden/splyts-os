# Migration: brand_context_guardrails

Adds a `guardrails TEXT` column to `brand_context`. 

Guardrails are hard rules the AI must never violate — e.g. "never claim competitor X does Y", "always include a disclaimer for health claims". Always injected into AI prompts when present.
