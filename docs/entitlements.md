# Entitlement model (billing-ready, auth-decoupled)

This app now separates:

- **Identity**: who the user is (Supabase Auth user/session).
- **Entitlement**: what the user can access (`free`, `trial`, `pro`).

Current behavior is intentionally unchanged because all protected endpoints allow `free` for now.

## Data model

Preferred table: `user_entitlements` (one row per user).

Suggested columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `entitlement_tier text not null default 'free'` (`free` | `trial` | `pro`)
- `trial_ends_at timestamptz null`
- `current_period_ends_at timestamptz null`
- `updated_at timestamptz not null default now()`

Backward compatibility:

- Server helper reads `user_entitlements` first.
- If not available, it falls back to `profiles.entitlement_tier` shape.
- If neither exists (or data unavailable), it safely defaults to `free`.

## Server integration points

Implemented in `src/server/entitlements.ts`:

- `getUserEntitlement(userId)` → resolves `free`/`trial`/`pro` with a safe `free` default.
- `requireEntitlement({ userId, allowedTiers })` → endpoint-level gate.

Used from API endpoints in `api/[...path].ts` for auth-protected routes, while still allowing all tiers today.

## Billing webhook handoff (future)

When Stripe/billing is added, webhook handlers should be the **only writer** of paid state:

1. Receive billing events (`checkout.session.completed`, subscription updates/cancellations, trial start/end).
2. Map billing customer/subscription to app user id.
3. Upsert `user_entitlements`:
   - active paid subscription → `pro`
   - active trial → `trial`
   - expired/canceled/unpaid → `free`
4. Set `current_period_ends_at` / `trial_ends_at` and `updated_at`.

Recommended placement:

- Add a dedicated route like `api/billing/webhook.ts`.
- Keep entitlement writes centralized there to avoid auth/business-logic coupling.
