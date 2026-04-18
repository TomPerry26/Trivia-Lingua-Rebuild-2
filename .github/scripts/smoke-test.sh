#!/usr/bin/env bash
set -euo pipefail

: "${APP_BASE_URL:?APP_BASE_URL is required}"
: "${EXPECTED_SUPABASE_URL:?EXPECTED_SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"
: "${SMOKE_BEARER_TOKEN:?SMOKE_BEARER_TOKEN is required}"

OAUTH_PROVIDER="${OAUTH_PROVIDER:-google}"

echo "Running smoke tests against: ${APP_BASE_URL}"

# 1) /auth/callback route resolves (non-404)
callback_status="$(curl -sS -o /tmp/auth-callback.out -w '%{http_code}' "${APP_BASE_URL%/}/auth/callback")"
if [[ "${callback_status}" == "404" || "${callback_status}" == "000" ]]; then
  echo "❌ /auth/callback did not resolve (HTTP ${callback_status})"
  exit 1
fi
echo "✅ /auth/callback resolves (HTTP ${callback_status})"

# 2) OAuth authorize URL host matches expected environment Supabase host
expected_host="$(node -e "console.log(new URL(process.env.EXPECTED_SUPABASE_URL).host)")"
authorize_url="${EXPECTED_SUPABASE_URL%/}/auth/v1/authorize?provider=${OAUTH_PROVIDER}&redirect_to=${APP_BASE_URL%/}/auth/callback&skip_http_redirect=true"
authorize_status="$(curl -sS -o /tmp/oauth-authorize.out -w '%{http_code}' -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" "${authorize_url}")"
authorize_host="$(node -e "console.log(new URL(process.argv[1]).host)" "${authorize_url}")"

if [[ "${authorize_host}" != "${expected_host}" ]]; then
  echo "❌ OAuth authorize host mismatch. expected=${expected_host} actual=${authorize_host}"
  exit 1
fi
if [[ "${authorize_status}" == "000" || "${authorize_status}" == "404" ]]; then
  echo "❌ OAuth authorize endpoint did not resolve (HTTP ${authorize_status})"
  exit 1
fi
echo "✅ OAuth authorize host matches expected Supabase host (${authorize_host}); endpoint HTTP ${authorize_status}"

# 3) /api/users/me returns authenticated user with bearer token
users_me_payload="$(curl -sS -H "Authorization: Bearer ${SMOKE_BEARER_TOKEN}" "${APP_BASE_URL%/}/api/users/me")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.id){console.error('❌ /api/users/me did not return an authenticated user:', p); process.exit(1);} console.log('✅ /api/users/me returned authenticated user', p.id);" "${users_me_payload}"

echo "Smoke tests passed."
