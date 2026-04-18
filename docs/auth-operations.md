# Auth operational trust mechanisms

This document defines auth SLOs, stage-level observability, preview promotion gates, and incident triage/rollback procedures.

## 1) Auth SLOs

Track these indicators per 30-day window and alert on burn-rate violations:

- **Successful login completion rate** (target **>= 99.5%**)
  - Definition: `auth.callback.completed.success / auth.login.started.attempt`
  - Numerator event: callback reaches session-ready state.
  - Denominator event: any login attempt started (Google OAuth or magic-link).
- **Callback error rate** (target **<= 0.5%**)
  - Definition: `auth.callback.failed / auth.callback.received`
  - Includes callback `error` query param failures, unsupported payloads, verify failures.
- **Token exchange error rate** (target **<= 0.3%**)
  - Definition: `auth.token_exchange.failed / auth.token_exchange.attempt`
  - Covers `exchangeCodeForSession` failures on OAuth callback.

### Recommended alert thresholds

- Page on-call if any SLO has a projected 30-day burn-rate > 2x target for 15 minutes.
- Create incident ticket if projected burn-rate > 1x target for 60 minutes.

## 2) Structured stage logs (required fields)

All auth stage logs should include JSON fields:

- `scope: "auth"`
- `stage` (`start`, `redirect`, `callback`, `session_ready`, `users_me`)
- `event`
- `outcome` (`attempt`, `success`, `failure`)
- `ts` (ISO8601 timestamp)
- optional `details` object

### Stage coverage

- **start**
  - login attempt start (Google, magic-link)
  - session bootstrap start
- **redirect**
  - OAuth redirect initiated
  - magic-link send success/failure
- **callback**
  - callback received
  - callback error param
  - token exchange success/failure
  - magic-link verify success/failure
- **session_ready**
  - callback completed
  - auth state session ready/changed
- **users_me**
  - client `/api/users/me` request start/completion
  - server `/api/users/me` handler start and response mode

## 3) Preview smoke suite (must pass before production promotion)

The CI smoke script validates:

1. **guest browsing** (`/`, `/quizzes`)
2. **OAuth initiation endpoint** resolves on expected Supabase host (`/auth/v1/authorize`)
3. **callback completion** succeeds via magic-link token hash verification (`verifyOtp`)
4. **session establishment** succeeds after callback verification (`getSession` returns access token + user)
5. **member quiz access** authenticated user can fetch configured member quiz
6. **progress write/read** authenticated completion write + progress read succeed
7. `/api/users/me` authenticated response includes identity fields (`id`, `email`)

Required secrets per environment:

- `*_SMOKE_BEARER_TOKEN`
- `*_SMOKE_MAGIC_LINK_EMAIL`
- `*_SMOKE_MEMBER_QUIZ_ID`
- `*_SUPABASE_SERVICE_ROLE_KEY` (used to generate callback verification links in CI)

(`*` = `STAGING` or `PRODUCTION` in workflow secrets.)

### Required CI gates for promotion

- **Preview auth smoke gate (required for production promotion)** in `.github/workflows/deploy-production.yml` runs first and targets the **latest Ready Preview URL** from Vercel.
- **Deploy Production** is blocked unless that preview gate succeeds.
- **Production auth smoke check (post-deploy)** runs after production deploy to catch environment-specific regressions immediately.

## 4) Auth incident triage runbook

### Trigger conditions

Open an auth incident when any is true:

- SLO threshold breach.
- Login/callback failures reported by users.
- Preview smoke suite fails auth checks.

### Exact checks (in order)

1. **Confirm deploy and environment alignment**
   - Verify latest commit SHA and deployment URL.
   - Confirm environment variables use the correct Supabase project for that tier.
2. **Check callback and provider config parity**
   - Verify `/auth/callback` route resolves on affected domain.
   - Confirm provider redirect URLs include active domain callback.
   - Confirm same provider enabled in both staging and production unless intentionally different.
3. **Inspect structured auth logs**
   - Compare `start` attempts vs `callback` success/failure.
   - Check `token_exchange_failed` and `callback_error_param` frequencies.
   - Check `/users/me` stage failures for token/session drift.
4. **Run smoke suite manually on impacted deployment**
   - Execute `.github/scripts/smoke-test.sh` with environment-specific secrets.
5. **Validate client cache/session hygiene**
   - Use clean browser profile/incognito.
   - Clear site data and unregister service worker.
6. **Validate Supabase health**
   - Confirm auth API availability and quota/rate limit status.

### Rollback actions (exact)

If incident is caused by recent auth changes:

1. Roll back to the last known good production commit using the existing production workflow input SHA.
2. Redeploy the rollback commit as a **fresh production deploy** (do not rely on old edge cache state).
3. Invalidate stale client state impact:
   - bump `CACHE_VERSION` in `public/sw.js` on next forward fix,
   - instruct QA to clear site data + unregister SW,
   - retest in incognito.
4. Re-run smoke suite against rollback deployment.
5. Keep incident open until SLO error budgets stabilize for 30 minutes.

## 5) Required fresh deploy + cache/session hygiene for auth changes

For every auth-related change (login, redirect, callback, token/session bootstrap, `/users/me` behavior):

1. Deploy Preview/Staging with a new build.
2. Pass Preview auth smoke suite.
3. Clear browser site data and unregister service worker in QA.
4. Validate login in a fresh incognito/private browser session.
5. Promote to production with a fresh production deploy.
6. Re-run smoke checks in production post-deploy.

## 6) Periodic provider parity audit (staging + production)

In addition to release-time checks, run a scheduled parity audit to catch drift between Supabase projects and Vercel scopes.

- Weekly quick pass and before every auth-related release.
- Use `docs/supabase-auth-provider-audit.md` as the source checklist.

## 7) Failure visibility and response ownership

### Where to view failures

- **GitHub Actions → Deploy Production workflow**
  - `Preview auth smoke gate (required for production promotion)`
  - `Production auth smoke check (post-deploy)`
- **GitHub Actions → Deploy Staging workflow**
  - `Preview auth smoke suite (staging)`
- **Vercel deployment logs** for the resolved Preview/Production URL shown in each workflow run.

### Who owns response

- **Primary owner:** Platform / Release Engineering on-call (GitHub Actions + deployment pipeline triage).
- **Secondary owner:** Authentication feature owner (Supabase config, callback behavior, `/api/users/me` contract).
- **Escalation:** if auth smoke is red for more than 15 minutes, open an auth incident and follow Section 4 runbook.
