# Supabase Auth Parity Check - 2026-04-18

- **Date (UTC):** 2026-04-18
- **Owner:** Codex agent run
- **Scope requested:** staging + production Supabase auth provider parity

## Result summary

Status: **Blocked (missing Supabase project admin/API access in this execution environment).**

I could validate repository-side expectations (callback route and parity checklist), but I could not read live Supabase Auth provider settings for either project from this container.

## Checks requested and current status

1. **Google provider enabled in both projects (or intentionally disabled in both)**
   - **Status:** Not verifiable from this environment.
   - **Reason:** No Supabase CLI, no Supabase Management API token, and no exposed project-level auth settings.

2. **Redirect URLs include active domains with `/auth/callback` (staging/preview + production)**
   - **Status:** Not verifiable against live project config.
   - **Repository expectation confirmed:** app uses path callback `/auth/callback` and documents parity requirement for staging + production callback URLs.

3. **Remove legacy callback forms like `/#/auth/callback`**
   - **Status:** Not verifiable against live project config.
   - **Repository expectation confirmed:** docs explicitly require avoiding hash-route callbacks.

4. **Confirm Site URL values are sensible for each project**
   - **Status:** Not verifiable against live project config.
   - **Reason:** Site URL is configured in Supabase project auth settings, which are not accessible here.

5. **Save screenshots/notes of final provider and redirect config**
   - **Status:** **Notes saved** (this file). **Screenshots not captured** because dashboard access was unavailable.

## Evidence gathered from repository

- Auth route is path-based and includes `/auth/callback`.
- Auth callback handling normalizes history to `/auth/callback`.
- Operational docs require parity across staging + production and removal of `/#/auth/callback`.

## What is needed to complete the live parity check

Provide one of the following so the live Supabase project settings can be read and audited in a follow-up run:

- Supabase dashboard access for both projects, or
- Supabase Management API token + project refs for staging and production.

With that access, the following items can be captured as final evidence:

- Google provider enabled/disabled state in each project.
- Exact redirect URL lists (confirming active domains with `/auth/callback`, and no `/#/auth/callback`).
- Site URL value per project (staging pointing to staging domain, production pointing to production domain).
- Screenshots of provider and URL configuration pages for both projects.
