# Vercel Environment Variable Source of Truth

_Last updated: 2026-04-18 (UTC)_

This note defines the **only approved keys** for Supabase settings in Vercel Project Settings.

## Preview scope (staging-only values)

Required keys:

- `VITE_SUPABASE_URL` = staging URL
- `VITE_SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_URL` = staging URL
- `SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service role key

Optional guard keys:

- `VITE_SUPABASE_PREVIEW_HOST` = expected preview host
- `SUPABASE_PREVIEW_HOST` = expected preview host

## Production scope (production-only values)

Required keys:

- `VITE_SUPABASE_URL` = production URL
- `VITE_SUPABASE_ANON_KEY` = production anon key
- `SUPABASE_URL` = production URL
- `SUPABASE_ANON_KEY` = production anon key
- `SUPABASE_SERVICE_ROLE_KEY` = production service role key

Optional guard keys:

- `VITE_SUPABASE_PRODUCTION_HOST` = expected production host
- `SUPABASE_PRODUCTION_HOST` = expected production host

## Disallowed / cleanup rules

Delete these if present in any scope:

- `*_STAGING_HOST` aliases
- duplicate Supabase auth variables
- unused auth variables that do not map to the approved key set above

## Change workflow (must be followed before code edits)

1. In Vercel Project Settings → Environment Variables, remove non-approved keys.
2. Re-add only the approved keys above, using scope-correct values.
3. Save changes.
4. Trigger a fresh **Preview** deployment (`Redeploy` from latest preview deployment, with cache cleared if needed).
5. Verify preview logs reference the expected Preview host and Supabase URL.
