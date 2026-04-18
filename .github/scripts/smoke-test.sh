#!/usr/bin/env bash
set -euo pipefail

: "${APP_BASE_URL:?APP_BASE_URL is required}"
: "${EXPECTED_SUPABASE_URL:?EXPECTED_SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"
: "${SMOKE_BEARER_TOKEN:?SMOKE_BEARER_TOKEN is required}"
: "${SMOKE_MAGIC_LINK_EMAIL:?SMOKE_MAGIC_LINK_EMAIL is required}"
: "${SMOKE_MEMBER_QUIZ_ID:?SMOKE_MEMBER_QUIZ_ID is required}"

OAUTH_PROVIDER="${OAUTH_PROVIDER:-google}"

echo "Running preview auth smoke suite against: ${APP_BASE_URL}"

# 1) Guest browsing
home_status="$(curl -sS -o /tmp/home.out -w '%{http_code}' "${APP_BASE_URL%/}/")"
quizzes_status="$(curl -sS -o /tmp/quizzes.out -w '%{http_code}' "${APP_BASE_URL%/}/quizzes")"
if [[ "${home_status}" == "000" || "${home_status}" == "404" ]]; then
  echo "❌ Guest browsing failed: / returned HTTP ${home_status}"
  exit 1
fi
if [[ "${quizzes_status}" == "000" || "${quizzes_status}" == "404" ]]; then
  echo "❌ Guest browsing failed: /quizzes returned HTTP ${quizzes_status}"
  exit 1
fi
echo "✅ guest browsing: / (${home_status}), /quizzes (${quizzes_status})"

# 2) Google login redirect sanity
expected_host="$(node -e "console.log(new URL(process.env.EXPECTED_SUPABASE_URL).host)")"
authorize_url="${EXPECTED_SUPABASE_URL%/}/auth/v1/authorize?provider=${OAUTH_PROVIDER}&redirect_to=${APP_BASE_URL%/}/auth/callback&skip_http_redirect=true"
authorize_status="$(curl -sS -o /tmp/oauth-authorize.out -w '%{http_code}' -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" "${authorize_url}")"
authorize_host="$(node -e "console.log(new URL(process.argv[1]).host)" "${authorize_url}")"

if [[ "${authorize_host}" != "${expected_host}" ]]; then
  echo "❌ Google login check failed: expected Supabase host ${expected_host}, got ${authorize_host}"
  exit 1
fi
if [[ "${authorize_status}" == "000" || "${authorize_status}" == "404" ]]; then
  echo "❌ Google login check failed: authorize endpoint HTTP ${authorize_status}"
  exit 1
fi
echo "✅ google login: authorize endpoint resolved on ${authorize_host} (HTTP ${authorize_status})"

# 3) Magic-link login initiation
magic_payload="$(printf '{"email":"%s","create_user":false,"email_redirect_to":"%s/auth/callback"}' "${SMOKE_MAGIC_LINK_EMAIL}" "${APP_BASE_URL%/}")"
magic_status="$(curl -sS -o /tmp/magic-link.out -w '%{http_code}' \
  -X POST "${EXPECTED_SUPABASE_URL%/}/auth/v1/otp" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "${magic_payload}")"
if [[ "${magic_status}" != "200" ]]; then
  echo "❌ magic-link login initiation failed (HTTP ${magic_status})"
  cat /tmp/magic-link.out
  exit 1
fi
echo "✅ magic-link login: OTP request accepted (HTTP ${magic_status})"

# 4) Access to member quiz (authenticated)
member_quiz_payload="$(curl -sS -H "Authorization: Bearer ${SMOKE_BEARER_TOKEN}" "${APP_BASE_URL%/}/api/quizzes/${SMOKE_MEMBER_QUIZ_ID}")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(p.access_required || p.is_locked || !Array.isArray(p.questions)){console.error('❌ member quiz access check failed:', p); process.exit(1);} console.log('✅ member quiz access: authenticated user received quiz with', p.questions.length, 'questions');" "${member_quiz_payload}"

# 5) Progress write + read
progress_write_payload="$(curl -sS -X POST \
  -H "Authorization: Bearer ${SMOKE_BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"score":1,"words_read":12}' \
  "${APP_BASE_URL%/}/api/quizzes/${SMOKE_MEMBER_QUIZ_ID}/complete")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.success){console.error('❌ progress write failed:', p); process.exit(1);} console.log('✅ progress write succeeded');" "${progress_write_payload}"

progress_read_payload="$(curl -sS -H "Authorization: Bearer ${SMOKE_BEARER_TOKEN}" "${APP_BASE_URL%/}/api/progress")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(typeof p.total_words_read !== 'number' || typeof p.daily_words_read !== 'number'){console.error('❌ progress read failed:', p); process.exit(1);} console.log('✅ progress read succeeded total_words_read=' + p.total_words_read);" "${progress_read_payload}"

# 6) /api/users/me returns authenticated user with bearer token
users_me_payload="$(curl -sS -H "Authorization: Bearer ${SMOKE_BEARER_TOKEN}" "${APP_BASE_URL%/}/api/users/me")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.id){console.error('❌ /api/users/me did not return an authenticated user:', p); process.exit(1);} console.log('✅ /api/users/me returned authenticated user', p.id);" "${users_me_payload}"

echo "Preview auth smoke suite passed."
