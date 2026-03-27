# Migration: outputs — add model_id

**File:** `20260326_outputs_model_id.sql`

## What it does

Adds a `model_id` TEXT column to the `outputs` table to record which AI model was used for each generation. Defaults to `claude-opus-4-5` for any existing rows.

## Why

Each generation can now use a different model. Storing `model_id` on the output allows the UI to display which model produced each piece of content, and enables future cost/quality comparison across models.

## How to run

Paste into the Supabase SQL editor for the splyts-os project and execute.
