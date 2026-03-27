# Migration: get_auth_user_by_email

## Why

Replaces `delete_unconfirmed_user_by_email`. Directly deleting from `auth.users`
via SQL is unsafe — Supabase has internal triggers on that table that can cause
silent failures. The correct approach is to look up the user ID via SQL (since
`auth.users` isn't accessible through PostgREST), then call
`db.auth.admin.deleteUser(userId)` from the API route.

## What

Creates a `SECURITY DEFINER` function that queries `auth.users` by email and
returns `(user_id UUID, is_confirmed BOOLEAN)`. Returns an empty row set if
the email doesn't exist.

## Usage

Called from `app/api/invites/route.ts` via:
```ts
db.rpc('get_auth_user_by_email', { p_email: email })
```

The API route then calls `db.auth.admin.deleteUser(user_id)` if the user is
unconfirmed, then retries `inviteUserByEmail`.

## How to apply

Run this SQL in the Supabase SQL editor for your project.
