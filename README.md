## Trivia Lingua

Trivia Lingua is a Vite + React app deployed on Vercel with Supabase for auth/data.

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
- `VITE_SUPABASE_OAUTH_PROVIDER` (e.g. `google` or `github`; must be enabled in Supabase Auth)
- `VITE_PUBLIC_SITE_URL` (for canonical/meta URLs, e.g. `https://www.trivialingua.com`)
- `VITE_OG_IMAGE_URL` (optional override for social preview image)

> `VITE_` variables are bundled into browser code by Vite, so only the **anon** key should use this prefix.

3. Run the app:

```bash
npm run dev
```

## Vercel deployment notes

- Set the Vercel **Build Command** to `npm run build` (or leave it empty so Vercel uses the package script default).
- Configure the following environment variables in your Vercel project settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_OAUTH_PROVIDER`
  - `VITE_PUBLIC_SITE_URL`
  - `VITE_OG_IMAGE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Keep `SUPABASE_SERVICE_ROLE_KEY` **server-only** (Vercel function environment variables only).
- Never prefix the service role key with `VITE_`, or it will be exposed to browser bundles.

### Required environment scoping (Preview vs Production)

Do **not** set Supabase credentials as global/shared values. Assign them explicitly by Vercel environment scope:

- **Preview** (staging Supabase project)
  - `VITE_SUPABASE_URL` = staging project URL
  - `VITE_SUPABASE_ANON_KEY` = staging anon key
  - `SUPABASE_URL` = staging project URL
  - `SUPABASE_ANON_KEY` = staging anon key
  - `SUPABASE_SERVICE_ROLE_KEY` = staging service role key
- **Production** (production Supabase project)
  - same variable names, with production values

After updating values in Project Settings, trigger fresh deploys for both environments so bundles are rebuilt with the correct `VITE_*` values:

```bash
# Preview redeploy (new build using Preview-scoped env vars)
vercel --prod=false

# Production redeploy (new build using Production-scoped env vars)
vercel --prod
```

## Supabase Auth parity checklist (staging + production)

In **both** Supabase projects (staging and production), keep auth provider settings aligned:

1. Enable the same OAuth provider in both projects (for this app, usually `google`), or intentionally disable it in both.
2. In the provider callback/redirect settings, include every active callback URL:
   - `https://<staging-domain>/auth/callback`
   - `https://<production-domain>/auth/callback`
   - any active preview/alias QA domains that sign in users
3. Ensure `VITE_SUPABASE_OAUTH_PROVIDER` in each deployment scope matches a provider that is enabled in that Supabase project.

Important:

- Do **not** leave legacy hash-route callbacks (for example `/#/auth/callback`) in provider configuration.
- This app uses path-based callback routing: `/auth/callback`.
