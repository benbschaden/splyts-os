# Migration: delete_unconfirmed_user_by_email

## Why

Supabase's PostgREST API only exposes the `public` schema. The `auth` schema
is not accessible via `.from()` in the JavaScript client, even with the service
role key. This means the invite API cannot directly query `auth.users` to detect
or delete ghost users (users who were invited but never confirmed their email).

## What

Creates a `SECURITY DEFINER` Postgres function that runs inside the database
where `auth.users` is accessible. The function:

1. Looks up a user by email in `auth.users`
2. Returns `'not_found'` if the email doesn't exist
3. Returns `'confirmed'` if the user has `email_confirmed_at` set — they have a
   real account and must not be deleted
4. Deletes the ghost user and returns `'deleted'` if they never confirmed

## Usage

Called from `app/api/invites/route.ts` via `db.rpc('delete_unconfirmed_user_by_email', { p_email: email })`
when `inviteUserByEmail` returns a 422 (user already exists in Supabase Auth).

## Permissions

`REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role` ensures only
the backend service role can call this function. Authenticated users cannot.

## How to apply

Run this SQL in the Supabase SQL editor for your project.
