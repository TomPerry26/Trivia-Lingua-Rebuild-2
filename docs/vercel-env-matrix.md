# Vercel Environment Variable Source of Truth

_Last updated: 2026-04-19 (UTC)_

This note defines the **only approved keys** for Supabase settings in Vercel Project Settings.

## Preview scope (staging-only values)

Required keys:

- `VITE_SUPABASE_URL` = staging URL
- `VITE_SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_URL` = staging URL
- `SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service role key

## Production scope (production-only values)

Required keys:

- `VITE_SUPABASE_URL` = production URL
- `VITE_SUPABASE_ANON_KEY` = production anon key
- `SUPABASE_URL` = production URL
- `SUPABASE_ANON_KEY` = production anon key
- `SUPABASE_SERVICE_ROLE_KEY` = production service role key

## Retired variables

The previous tier/host guard variables were retired after deployment pipeline stabilization and should remain unset.

## Change workflow

1. In Vercel Project Settings → Environment Variables, remove non-approved keys.
2. Re-add only the required keys above, using scope-correct values.
3. Save changes.
4. Trigger a fresh **Preview** deployment (`Redeploy` from latest preview deployment, with cache cleared if needed).
5. Trigger a fresh **Production** deployment.

> Reminder: Vite client variables (`VITE_*`) are compiled at build time, so deployments must be rebuilt after any env edit.
