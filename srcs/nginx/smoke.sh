#!/usr/bin/env bash
# Checks the proxy against a running stack: ./srcs/nginx/smoke.sh
# Exits 0 if every check passes, 1 if any fails, and 0 with a SKIP notice if
# the stack is not up.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

from_env_file() {
	local key="$1" value
	[ -f "$ROOT/.env" ] || return 1
	value="$(grep -E "^${key}=" "$ROOT/.env" | tail -1 | cut -d= -f2-)"
	[ -n "$value" ] || return 1
	printf '%s' "$value"
}

HTTP_PORT="${HTTP_PORT:-$(from_env_file HTTP_PORT || echo 8080)}"
HTTPS_PORT="${HTTPS_PORT:-$(from_env_file HTTPS_PORT || echo 8443)}"
MAX_UPLOAD_MB="${MAX_UPLOAD_MB:-$(from_env_file MAX_UPLOAD_MB || echo 50)}"

BACKEND_PORT="${BACKEND_PORT:-9000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

BASE="https://localhost:${HTTPS_PORT}"
CURL=(curl -sk --max-time 10)

passed=0
failed=0

pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; passed=$((passed + 1)); }
fail() {
	printf '  \033[31mFAIL\033[0m %s\n' "$1"
	printf '       expected: %s\n       actual:   %s\n' "$2" "$3"
	failed=$((failed + 1))
}

check_equal() {
	local what="$1" expected="$2" actual="$3"
	if [ "$expected" = "$actual" ]; then pass "$what"; else fail "$what" "$expected" "$actual"; fi
}

check_contains() {
	local what="$1" needle="$2" haystack="$3"
	if printf '%s' "$haystack" | grep -qi -- "$needle"; then
		pass "$what"
	else
		fail "$what" "output containing '$needle'" "$(printf '%s' "$haystack" | head -c 200)"
	fi
}

check_absent() {
	local what="$1" needle="$2" haystack="$3"
	if printf '%s' "$haystack" | grep -qi -- "$needle"; then
		fail "$what" "no '$needle'" "$(printf '%s' "$haystack" | head -c 200)"
	else
		pass "$what"
	fi
}

section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if ! "${CURL[@]}" -o /dev/null "$BASE/health" 2>/dev/null; then
	printf '\033[33mSKIP\033[0m the stack is not reachable at %s\n' "$BASE"
	printf "     start it with 'make up'.\n"
	exit 0
fi

printf '\033[1mProxy smoke test\033[0m  %s\n' "$BASE"

section "TLS"

tls_version="$(curl -sk --max-time 10 -v -o /dev/null "$BASE/health" 2>&1 |
	sed -n 's/.*SSL connection using \([^ ]*\).*/\1/p' | head -1)"
case "$tls_version" in
	TLSv1.2 | TLSv1.3) pass "negotiates a modern TLS version ($tls_version)" ;;
	*) fail "negotiates a modern TLS version" "TLSv1.2 or TLSv1.3" "$tls_version" ;;
esac

if curl -sk --max-time 10 --tls-max 1.1 -o /dev/null "$BASE/health" 2>/dev/null; then
	fail "refuses TLS 1.1 and below" "connection refused" "connected"
else
	pass "refuses TLS 1.1 and below"
fi

section "Plain HTTP"

redirect_status="$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "http://localhost:${HTTP_PORT}/gigs")"
check_equal "port ${HTTP_PORT} answers a redirect" "301" "$redirect_status"

redirect_target="$(curl -s --max-time 10 -o /dev/null -w '%{redirect_url}' "http://localhost:${HTTP_PORT}/gigs")"
check_equal "the redirect keeps the path and lands on the published HTTPS port" \
	"https://localhost:${HTTPS_PORT}/gigs" "$redirect_target"

section "Security headers"

headers="$("${CURL[@]}" -D - -o /dev/null "$BASE/health")"
check_contains "Strict-Transport-Security"           "strict-transport-security: max-age=31536000"      "$headers"
check_contains "X-Content-Type-Options: nosniff"     "x-content-type-options: nosniff"                  "$headers"
check_contains "X-Frame-Options: DENY"               "x-frame-options: DENY"                            "$headers"
check_contains "Referrer-Policy"                     "referrer-policy: strict-origin-when-cross-origin" "$headers"
check_contains "Cross-Origin-Opener-Policy"          "cross-origin-opener-policy: same-origin"          "$headers"
check_contains "Content-Security-Policy-Report-Only" "content-security-policy-report-only:"             "$headers"

error_headers="$("${CURL[@]}" -D - -o /dev/null "$BASE/api/definitely-not-a-route")"
check_contains "headers are present on an error response too" "x-frame-options: DENY" "$error_headers"

check_absent "the Server banner carries no version" "server: nginx/" "$headers"

section "Routing"

health_body="$("${CURL[@]}" "$BASE/health")"
check_contains "/health reaches express" '"status":"ok"' "$health_body"

app_status="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/")"
check_equal "/ reaches the vite dev server" "200" "$app_status"

app_body="$("${CURL[@]}" "$BASE/")"
check_contains "/ serves the app's HTML shell" "<div id=\"root\">" "$app_body"

api_status="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/categories")"
check_equal "/api reaches express" "200" "$api_status"

section "WebSocket upgrade"

ws_status="$(curl -sk --max-time 10 --http1.1 -o /dev/null -w '%{http_code}' \
	-H "Connection: Upgrade" \
	-H "Upgrade: websocket" \
	-H "Sec-WebSocket-Version: 13" \
	-H "Sec-WebSocket-Key: c21va2UtdGVzdC0xMjM0NQ==" \
	"$BASE/socket.io/?EIO=4&transport=websocket")"
check_equal "/socket.io upgrades to a WebSocket" "101" "$ws_status"

section "Body size ceiling"

oversize_status="$(head -c $(( (MAX_UPLOAD_MB + 1) * 1024 * 1024 )) /dev/zero |
	curl -sk --max-time 60 -o /dev/null -w '%{http_code}' \
		-X POST -H "Content-Type: application/octet-stream" \
		--data-binary @- "$BASE/api/files" 2>/dev/null)"
check_equal "a body past ${MAX_UPLOAD_MB}MB is refused by the proxy" "413" "$oversize_status"

section "Ports behind the proxy"

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
	if timeout 2 bash -c "exec 3<>/dev/tcp/127.0.0.1/${port}" 2>/dev/null; then
		fail "port ${port} is closed to the host" "connection refused" "connected"
	else
		pass "port ${port} is closed to the host"
	fi
done

section "Error contract through the proxy"

malformed="$("${CURL[@]}" -X POST -H "Content-Type: application/json" \
	--data-binary '{"broken":' "$BASE/api/auth/login")"
check_contains "a malformed JSON body is answered MALFORMED_JSON" '"error":"MALFORMED_JSON"' "$malformed"

unauthorized="$("${CURL[@]}" "$BASE/api/users")"
check_contains "an unauthenticated call names its error code" '"error":' "$unauthorized"

not_found="$("${CURL[@]}" "$BASE/api/definitely-not-a-route")"
check_contains "an unmatched API route answers JSON, not HTML" '"error":"NOT_FOUND"' "$not_found"
check_absent  "an unmatched API route does not answer Express's HTML page" "<!DOCTYPE html>" "$not_found"

printf '\n\033[1m%d passed, %d failed\033[0m\n' "$passed" "$failed"
[ "$failed" -eq 0 ] || exit 1
