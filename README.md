# SPLYTS OS

The company operating system for SPLYTS. A single place for the team to store context, manage work, and produce outputs — replacing scattered docs, drives, and tools.

## What It Does
- Stores company knowledge: brand, strategy, projects, documents
- Generates outputs from that context: content, reports, briefs
- Gives the whole team a shared understanding of what's happening and what's been decided

## Stack
Next.js 14 · Supabase · Anthropic · TypeScript · Vercel

## Setup
1. Copy `.env.example` to `.env.local` and fill in values
2. Install dependencies: `npm install`
3. Run migrations: `supabase db push`
4. Generate types: `supabase gen types typescript --local > lib/types/database.ts`
5. Start dev server: `npm run dev`

## Structure
- `app/` — Next.js pages and API routes
- `lib/` — Supabase clients, AI logic, shared utilities
- `components/` — shared UI components
- `supabase/migrations/` — database schema (source of truth)
- `docs/` — specs, Gherkin scenarios, architecture decisions
