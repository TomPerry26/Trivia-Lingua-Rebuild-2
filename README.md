## Trivia Lingua

Trivia Lingua is a Vite + React app deployed on Vercel with Supabase for auth/data.

## Entitlements and future billing

Entitlements are modeled separately from auth identity so future paywall logic can evolve without changing login/session handling. See `docs/entitlements.md` for the data model, current no-op defaults, and billing webhook integration plan.

For auth reliability controls (SLOs, stage logs, preview smoke gate, and incident runbook), see `docs/auth-operations.md`.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example and set your Supabase values:

```bash
cp .env.example .env
```

Required client variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL` (for canonical/meta URLs, e.g. `https://www.trivialingua.com`)
- `VITE_OG_IMAGE_URL` (optional override for social preview image)

> `VITE_` variables are bundled into browser code by Vite, so only the **anon** key should use this prefix.

3. Run the app:

```bash
npm run dev
```

## Auth invariants

- **One callback route:** `/auth/callback`
- **One auth flow:** Supabase SDK OAuth PKCE (`signInWithOAuth` + `exchangeCodeForSession`)
- **One environment mapping rule:** Vercel Preview maps to **staging**, and Vercel Production maps to **production**

## Vercel deployment notes

- Set the Vercel **Build Command** to `npm run build` (or leave it empty so Vercel uses the package script default).
- Keep `SUPABASE_SERVICE_ROLE_KEY` **server-only** (Vercel function environment variables only).
- Never prefix the service role key with `VITE_`, or it will be exposed to browser bundles.
- Startup/build fails fast for missing required Supabase vars, invalid Supabase URLs, and `DEPLOYMENT_TIER` vs `VERCEL_ENV` mismatches.

### Final minimal environment matrix

Do **not** set Supabase credentials as global/shared values. Scope them in Vercel by environment.

| Variable | Preview scope (staging) | Production scope |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | staging project URL | production project URL |
| `VITE_SUPABASE_ANON_KEY` | staging anon key | production anon key |
| `VITE_PUBLIC_SITE_URL` | staging public URL | production public URL |
| `VITE_OG_IMAGE_URL` | optional | optional |
| `SUPABASE_URL` | staging project URL | production project URL |
| `SUPABASE_ANON_KEY` | staging anon key | production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service-role key (if preview server functions need it) | production service-role key |

> Tier resolution rule: rely on Vercel environment context (`VERCEL_ENV`) and keep the mapping **Preview → staging** and **Production → production**.

After updating values in Project Settings, trigger fresh deploys for both environments so bundles are rebuilt with the correct `VITE_*` values:

```bash
# Preview redeploy (new build using Preview-scoped env vars)
vercel --prod=false

# Production redeploy (new build using Production-scoped env vars)
vercel --prod
```

## Auth flow release step (required when auth logic changes)

When auth flow logic changes (sign-in, callback handling, token/session bootstrap, or provider redirects), include this release procedure:

1. Bump `CACHE_VERSION` in `public/sw.js` so existing clients evict legacy cached assets on next service worker activation.
2. Redeploy staging/Preview with a fresh build and run the preview auth smoke suite (`.github/scripts/smoke-test.sh`).
3. In browser QA for the staging domain, clear site data and unregister the service worker before testing.
4. Re-test sign-in in a fresh incognito/private window to eliminate stale cache/session influence.
5. Promote and redeploy production with a fresh build, then re-run smoke checks.

The detailed required auth change procedure and rollback/triage runbook are in `docs/auth-operations.md`.

## Supabase Auth parity checklist (staging + production)

In **both** Supabase projects (staging and production), keep auth provider settings aligned:

1. Enable the same OAuth provider in both projects (for this app, `google`), or intentionally disable it in both.
2. In the provider callback/redirect settings, include every active callback URL:
   - `https://<staging-domain>/auth/callback`
   - `https://<production-domain>/auth/callback`
   - any active preview/alias QA domains that sign in users

This app uses path-based callback routing at `/auth/callback`.

For a recurring operational cadence (weekly audit + pre-release full audit), use `docs/supabase-auth-provider-audit.md`.
