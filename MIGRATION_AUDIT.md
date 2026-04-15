# Trivia Lingua Migration Status (Mocha ➜ Vercel + GitHub + Supabase)

Date: 2026-04-15

This file now separates:
1) what has been fixed directly in this repo, and
2) what still must be done in external systems (Vercel/Supabase/domain settings).

## ✅ Fixed directly in code

### 1) Supabase RPC calls now execute
- Implemented real `rpc()` HTTP calls in the custom Supabase client (`POST /rest/v1/rpc/<fn>`), replacing the previous no-op behavior.

### 2) Server now fails fast if service role key is missing
- Removed silent fallback from `supabaseAdmin` to anon credentials.
- Server startup now throws if `SUPABASE_SERVICE_ROLE_KEY` is missing.

### 3) Login provider no longer hardcoded to Google
- `redirectToLogin()` now uses `VITE_SUPABASE_OAUTH_PROVIDER` default path consistently.

### 4) Mocha domain references removed from runtime app metadata paths
- Replaced hardcoded `*.mocha.app` / `*.mochausercontent.com` in:
  - `index.html`
  - `public/manifest.json`
  - `public/robots.txt`
  - `src/worker/sitemap.ts`
  - `src/react-app/pages/Login.tsx`
  - `src/react-app/pages/Quiz.tsx`
  - `src/react-app/components/LoginPageSchema.tsx`
  - `src/react-app/components/AboutMetaTags.tsx`
  - `src/react-app/components/QuizSchema.tsx`
- Added shared client-side site config values in `src/react-app/lib/site.ts` using:
  - `VITE_PUBLIC_SITE_URL`
  - `VITE_OG_IMAGE_URL`

### 5) Service worker Mocha-specific caching removed
- Removed `mochausercontent.com` special-case logic.

### 6) Vercel SPA routing hardening added
- Added rewrite rules in `vercel.json` for API passthrough and SPA fallback.

### 7) Project metadata cleanup
- Renamed package from `mocha-app` ➜ `trivia-lingua`.
- Removed stale `@getmocha/*` dev dependencies and knip ignores.
- Updated README and `.env.example` with current env requirements.

---

## 🧭 You still need to do these (external configuration)

### A) Supabase Auth provider setup
- Ensure your provider(s) (Google/GitHub/etc.) are enabled in Supabase Auth.
- Confirm callback/redirect URLs include **all** domains you use:
  - `https://www.trivialingua.com/auth/callback`
  - `https://<your-vercel-project>.vercel.app/auth/callback`
  - Any preview domains you actually test with.

### B) Vercel environment variables
Set these in Vercel Project Settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_OG_IMAGE_URL` (optional)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### C) Domain + asset verification
- Confirm these assets exist at your configured domain values:
  - `${VITE_PUBLIC_SITE_URL}/pwa-icon.png`
  - `VITE_OG_IMAGE_URL` (or default `${VITE_PUBLIC_SITE_URL}/Open-Graph-(Home-1200).jpg`)
- If they do not exist yet, upload them or change env vars to valid URLs.

### D) Database/RLS sanity checks
- Validate RPC functions exist and are callable:
  - `increment_quiz_completions`
  - `increment`
- Validate table policies for anon vs authenticated access align with expected app behavior.

---

## Recommended validation checklist after deploy

1. Guest user can open quizzes and submit guest results.
2. OAuth login redirects correctly and returns to `/auth/callback`.
3. Authenticated quiz submissions update attempts/progress/completions.
4. Admin-only routes behave correctly for admin and non-admin users.
5. Deep links (`/login`, `/es/...`, `/blog/...`) work on hard refresh.
6. `robots.txt` and sitemap URLs resolve on production domain.

