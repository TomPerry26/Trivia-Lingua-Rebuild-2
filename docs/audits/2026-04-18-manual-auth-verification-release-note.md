# Manual Auth Verification Release Note — 2026-04-18

- **Run date (UTC):** 2026-04-18
- **Requested by:** release verification task
- **Method requested:** identical manual pass in fresh incognito windows for staging + production

## Scope and execution constraints

This container does not provide an interactive browser session, Google account interaction, or access to existing browser devtools consoles for the deployed environments. Because of that, the required incognito + OAuth redirect verification could not be executed end-to-end from this run.

## Environment results

| Environment | Timestamp (UTC) | 1) Guest public pages | 2) Sign in via Google OAuth | 3) Session persists after hard refresh | 4) Protected routes while authed | 5) Sign out clears session + redirects | Overall |
|---|---|---|---|---|---|---|---|
| Staging | 2026-04-18T17:36:32Z | FAIL (blocked: no interactive browser target) | FAIL (blocked: no OAuth interaction capability) | FAIL (dependent on step 2) | FAIL (dependent on step 2) | FAIL (dependent on step 2) | **FAIL / BLOCKED** |
| Production | 2026-04-18T17:36:32Z | FAIL (blocked: no interactive browser target) | FAIL (blocked: no OAuth interaction capability) | FAIL (dependent on step 2) | FAIL (dependent on step 2) | FAIL (dependent on step 2) | **FAIL / BLOCKED** |

## Console telemetry capture (callback/session events)

Expected telemetry format in app code is emitted as:

- prefix: `[auth]`
- payload fields: `scope`, `ts`, `stage`, `event`, `outcome`, `details`

No live callback/session telemetry lines were captured for staging or production during this run, because OAuth callback/session events could not be executed in a browser.

| Environment | Timestamp (UTC) | Captured lines |
|---|---|---|
| Staging | 2026-04-18T17:36:32Z | None (blocked) |
| Production | 2026-04-18T17:36:32Z | None (blocked) |

## Short release note

- **Staging:** FAIL / BLOCKED — manual incognito OAuth/session verification did not run in this execution environment.
- **Production:** FAIL / BLOCKED — manual incognito OAuth/session verification did not run in this execution environment.

## Follow-up required to complete requested verification

Run the same six-step checklist in a real browser (fresh incognito window per environment) with valid Google test credentials and capture `[auth]` console lines at:

1. login redirect initiation,
2. callback return,
3. session ready after hard refresh,
4. sign out + protected-route redirect.
