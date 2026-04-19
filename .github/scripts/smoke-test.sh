#!/usr/bin/env bash
set -euo pipefail

: "${APP_BASE_URL:?APP_BASE_URL is required}"
: "${EXPECTED_SUPABASE_URL:?EXPECTED_SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${SMOKE_BEARER_TOKEN:?SMOKE_BEARER_TOKEN is required}"
: "${SMOKE_MAGIC_LINK_EMAIL:?SMOKE_MAGIC_LINK_EMAIL is required}"
: "${SMOKE_MEMBER_QUIZ_ID:?SMOKE_MEMBER_QUIZ_ID is required}"

OAUTH_PROVIDER="${OAUTH_PROVIDER:-google}"

echo "Running auth smoke suite against: ${APP_BASE_URL}"

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

# 2) OAuth initiation endpoint reachable + expected host
expected_host="$(node -e "console.log(new URL(process.env.EXPECTED_SUPABASE_URL).host)")"
authorize_url="${EXPECTED_SUPABASE_URL%/}/auth/v1/authorize?provider=${OAUTH_PROVIDER}&redirect_to=${APP_BASE_URL%/}/auth/callback&skip_http_redirect=true"
authorize_status="$(curl -sS -o /tmp/oauth-authorize.out -w '%{http_code}' -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" "${authorize_url}")"
authorize_host="$(node -e "console.log(new URL(process.argv[1]).host)" "${authorize_url}")"

if [[ "${authorize_host}" != "${expected_host}" ]]; then
  echo "❌ OAuth initiation check failed: expected Supabase host ${expected_host}, got ${authorize_host}"
  exit 1
fi
if [[ "${authorize_status}" == "000" || "${authorize_status}" == "404" ]]; then
  echo "❌ OAuth initiation check failed: authorize endpoint HTTP ${authorize_status}"
  exit 1
fi
echo "✅ oauth initiation: authorize endpoint resolved on ${authorize_host} (HTTP ${authorize_status})"

# 3) Callback completion + session establishment via magic-link token_hash verification
generate_link_payload="$(printf '{"type":"magiclink","email":"%s","options":{"redirectTo":"%s/auth/callback"}}' "${SMOKE_MAGIC_LINK_EMAIL}" "${APP_BASE_URL%/}")"
generate_link_json="$(curl -sS -X POST \
  "${EXPECTED_SUPABASE_URL%/}/auth/v1/admin/generate_link" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "${generate_link_payload}")"

callback_session_json="$(node --input-type=module -e "
import { createClient } from '@supabase/supabase-js';

const generateLink = JSON.parse(process.env.GENERATE_LINK_JSON || '{}');
const properties = generateLink.properties || {};
const actionLink = properties.action_link || '';
const tokenHash = properties.hashed_token || (() => {
  try {
    return new URL(actionLink).searchParams.get('token_hash');
  } catch {
    return null;
  }
})();

if (!tokenHash) {
  console.error('❌ callback completion check failed: admin generate_link response missing token_hash');
  process.exit(1);
}

const client = createClient(process.env.EXPECTED_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const { error: verifyError } = await client.auth.verifyOtp({
  token_hash: tokenHash,
  type: 'email',
});

if (verifyError) {
  console.error('❌ callback completion check failed: verifyOtp error', verifyError.message);
  process.exit(1);
}

const { data: sessionData, error: sessionError } = await client.auth.getSession();
if (sessionError) {
  console.error('❌ session establishment check failed:', sessionError.message);
  process.exit(1);
}
if (!sessionData.session?.access_token || !sessionData.session.user?.id) {
  console.error('❌ session establishment check failed: missing access token or user identity');
  process.exit(1);
}

console.log(JSON.stringify({
  accessToken: sessionData.session.access_token,
  userId: sessionData.session.user.id,
  email: sessionData.session.user.email ?? null,
}));
" )"

smoke_session_access_token="$(node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.accessToken){process.exit(1)} process.stdout.write(p.accessToken);" "${callback_session_json}")"
callback_user_id="$(node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.userId){process.exit(1)} process.stdout.write(p.userId);" "${callback_session_json}")"
callback_user_email="$(node -e "const p=JSON.parse(process.argv[1]||'{}'); process.stdout.write(p.email || 'unknown-email');" "${callback_session_json}")"

callback_route_status="$(curl -sS -o /tmp/auth-callback.out -w '%{http_code}' "${APP_BASE_URL%/}/auth/callback")"
if [[ "${callback_route_status}" == "000" || "${callback_route_status}" == "404" ]]; then
  echo "❌ callback route reachability failed: /auth/callback returned HTTP ${callback_route_status}"
  exit 1
fi
echo "✅ callback completion/session: verifyOtp succeeded for ${callback_user_id} (${callback_user_email}); /auth/callback reachable (HTTP ${callback_route_status})"

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

# 6) /api/users/me returns callback-authenticated identity
users_me_payload="$(curl -sS -H "Authorization: Bearer ${smoke_session_access_token}" "${APP_BASE_URL%/}/api/users/me")"
node -e "const p=JSON.parse(process.argv[1]||'{}'); if(!p.id || !p.email){console.error('❌ /api/users/me identity check failed:', p); process.exit(1);} console.log('✅ /api/users/me returned authenticated identity', p.id, p.email);" "${users_me_payload}"

echo "Auth smoke suite passed."
