# Company OS

A company operating system for teams. Manage brand voice, generate AI-powered content, and coordinate team workflows — all in one dashboard.

## What It Does
- Brand context and voice configuration
- AI-powered content generation (social posts, video scripts, emails)
- Team management with roles and permissions
- Content library for all generated outputs
- External read-only API for trusted consumers (e.g. founder's personal dashboard)

## Stack
Next.js 14 · Supabase · TypeScript · Anthropic Claude · Vercel

## Current State
Shell only. Not yet built.

## Setup
1. Create a Supabase project
2. Deploy to Vercel
3. Copy `.env.example` → `.env.local` and fill in credentials
4. Sign up through the UI — your company workspace is created automatically

## Template-Ready
This codebase is generic. All company identity lives in the database, not in code. Deploying for a new company requires zero code changes — just a fresh Supabase and Vercel deployment.
