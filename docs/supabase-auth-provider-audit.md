# Supabase auth provider parity audit checklist

Run this checklist on a recurring cadence to keep staging (Preview) and production auth config aligned.

## Recommended cadence

- Weekly quick check (5-10 minutes).
- Full audit before every auth-related release.
- Immediate audit after any provider/callback change in either Supabase project.

## Audit checklist

1. **Project mapping and environment scope**
   - Confirm the Preview deployment points to the staging Supabase project.
   - Confirm the Production deployment points to the production Supabase project.
   - Verify `VITE_SUPABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are configured per Vercel scope (Preview vs Production), not as shared/global values.
2. **Provider enablement parity**
   - Confirm the same providers are intentionally enabled in both projects (for example, Google and/or magic link).
   - If a provider is intentionally disabled in one environment, capture the reason and expected end date in the release notes.
3. **Callback URL parity**
   - Confirm both projects include:
     - `https://<staging-domain>/auth/callback`
     - `https://<production-domain>/auth/callback`
   - Remove deprecated callbacks like `/#/auth/callback`.
4. **Client/runtime provider parity**
   - Confirm the provider used by the app sign-in flow is enabled in both Supabase projects.
   - Confirm `VITE_DEPLOYMENT_TIER` and `DEPLOYMENT_TIER` values match `VERCEL_ENV` in each scope.
5. **Server-side verification and protected action checks**
   - Call `/api/users/me` with and without an auth token and confirm the API response reflects server token verification.
   - Exercise protected writes (`/api/progress/email-opt-in`, `/api/external-reading`, `/api/progress/target`, quiz completion) and confirm they fail unauthenticated and succeed authenticated.
6. **RLS and service-role usage review**
   - Verify user-owned writes occur through token-authenticated clients (RLS-enforced paths).
   - Verify service-role access is limited to admin/aggregate workloads that require bypassing RLS.
7. **Smoke and observability**
   - Run `.github/scripts/smoke-test.sh` for staging and production.
   - Check auth stage logs for `users_me_invalid_token`, callback errors, and token exchange failures.

## Evidence to capture each run

- Audit date/time and owner.
- Supabase project IDs for staging and production.
- Screenshot or export of provider configuration pages.
- Deployment URLs + commit SHA validated.
- Any drift found, remediation owner, and due date.
