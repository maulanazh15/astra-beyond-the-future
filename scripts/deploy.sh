#!/usr/bin/env bash
# Deploy ASTRA to the homelab (Termux + nginx behind a Cloudflare tunnel).
#
# Usage:
#   scripts/deploy.sh             build, test, upload, swap atomically, verify
#   scripts/deploy.sh --rollback  restore the previous release
#
# Overridable env vars: DEPLOY_HOST, DEPLOY_DIR, DEPLOY_URL, SKIP_CHECKS=1
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-j2-ssh}"
DEPLOY_DIR="${DEPLOY_DIR:-homelab/sites/astra}"   # relative to the remote $HOME
DEPLOY_URL="${DEPLOY_URL:-https://astra-beyond-future.homelabchester.my.id}"

cd "$(dirname "$0")/.."

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# Restricted path charset so values interpolated into the remote shell stay safe.
[[ "$DEPLOY_DIR" =~ ^[A-Za-z0-9._/-]+$ && "$DEPLOY_DIR" != *..* ]] \
  || fail "DEPLOY_DIR contains unsafe characters: $DEPLOY_DIR"

SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$DEPLOY_HOST")

verify() {
  log "Verifying $DEPLOY_URL"
  local code
  for path in / /deep/link/check; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$DEPLOY_URL$path") || code=000
    [[ "$code" == 200 ]] || { printf "\033[1;31mERROR:\033[0m %s returned HTTP %s\n" "$path" "$code" >&2; return 1; }
  done
  log "Live and healthy."
}

if [[ "${1:-}" == "--rollback" ]]; then
  log "Rolling back on $DEPLOY_HOST"
  "${SSH[@]}" "set -e; cd ~/$DEPLOY_DIR
    [ -d public.prev ] || { echo 'No previous release to restore' >&2; exit 1; }
    mv public public.failed && mv public.prev public && rm -rf public.failed"
  verify
  exit 0
fi
[[ $# -eq 0 ]] || fail "Unknown argument: $1"

if [[ -n "$(git status --porcelain)" ]]; then
  printf '\033[1;33mWARN:\033[0m working tree has uncommitted changes.\n'
fi

if [[ "${SKIP_CHECKS:-0}" != 1 ]]; then
  log "Build, lint, test"
  npm run build && npm run lint && npm test
else
  log "SKIP_CHECKS=1: build only"
  npm run build
fi
[[ -f dist/index.html ]] || fail "dist/index.html missing; build failed?"

log "Checking connection to $DEPLOY_HOST"
"${SSH[@]}" true || fail "Cannot SSH to $DEPLOY_HOST"

REV=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
log "Uploading release $REV to staging dir"
"${SSH[@]}" "set -e; mkdir -p ~/$DEPLOY_DIR; rm -rf ~/$DEPLOY_DIR/public.new; mkdir ~/$DEPLOY_DIR/public.new"
tar -C dist -czf - . | "${SSH[@]}" "tar -xzf - -C ~/$DEPLOY_DIR/public.new"

log "Swapping release (previous kept as public.prev)"
"${SSH[@]}" "set -e; cd ~/$DEPLOY_DIR
  [ -f public.new/index.html ] || { echo 'Upload incomplete' >&2; exit 1; }
  echo '$REV' > public.new/.release
  rm -rf public.prev
  if [ -d public ]; then mv public public.prev; fi
  mv public.new public"

if ! verify; then
  log "Verification failed; rolling back"
  "${SSH[@]}" "cd ~/$DEPLOY_DIR && [ -d public.prev ] && mv public public.failed && mv public.prev public && rm -rf public.failed"
  exit 1
fi
