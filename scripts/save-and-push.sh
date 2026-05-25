#!/usr/bin/env bash
# Save local work and push to GitHub — run after major revisions, before pausing dev.
# Usage:
#   npm run save:push
#   npm run save:push -- "Phase 3: candidate accept/decline portal"
#   ./scripts/save-and-push.sh "optional commit message"

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}▸${NC} $*"; }
warn()  { echo -e "${YELLOW}▸${NC} $*"; }
error() { echo -e "${RED}✖${NC} $*" >&2; }

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  error "Not a git repository. Run from the election portal root."
  exit 1
fi

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  error "Detached HEAD — checkout a branch before pushing."
  exit 1
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  error "Remote '$REMOTE' not configured."
  error "  git remote add origin https://github.com/nmatunog/aia-pama-election-portal.git"
  exit 1
fi

REMOTE_URL="$(git remote get-url "$REMOTE")"
info "Repository: $ROOT"
info "Remote:     $REMOTE → $REMOTE_URL"
info "Branch:     $BRANCH"

# Block secrets from ever being staged
is_forbidden_path() {
  local path="$1"
  [[ "$path" == *".example"* ]] && return 1
  [[ "$path" == */.env.local ]] && return 0
  [[ "$path" == */.env ]] && return 0
  [[ "$path" == */apps/api/.dev.vars ]] && return 0
  [[ "$path" == *"credentials.json"* ]] && return 0
  [[ "$path" == *"service-account"* ]] && return 0
  return 1
}

while IFS= read -r line; do
  path="${line:3}"
  if is_forbidden_path "$path" && [[ -f "$path" ]] && ! git check-ignore -q "$path" 2>/dev/null; then
    error "Refusing to commit — sensitive path not ignored: $path"
    error "Add it to .gitignore or remove from the working tree."
    exit 1
  fi
done < <(git status --porcelain 2>/dev/null || true)

# Optional quick typecheck (skip with SKIP_TYPECHECK=1)
if [[ "${SKIP_TYPECHECK:-}" != "1" ]]; then
  if command -v npm >/dev/null 2>&1 && [[ -f package.json ]]; then
    info "Running typecheck…"
    if ! npm run typecheck --silent 2>/dev/null; then
      warn "Typecheck failed. Fix errors or run: SKIP_TYPECHECK=1 npm run save:push"
      exit 1
    fi
  fi
fi

COMMIT_MSG="${*:-}"
if [[ -z "$COMMIT_MSG" ]]; then
  COMMIT_MSG="chore: save work before pause ($(date '+%Y-%m-%d %H:%M'))"
fi

HAS_CHANGES=false
if [[ -n "$(git status --porcelain)" ]]; then
  HAS_CHANGES=true
  info "Staging changes…"
  git add -A

  # Double-check staged files for secrets
  while IFS= read -r staged; do
    [[ -z "$staged" ]] && continue
    if is_forbidden_path "$staged"; then
      error "Refusing to commit staged secret file: $staged"
      git reset HEAD -- "$staged" 2>/dev/null || true
      exit 1
    fi
  done < <(git diff --cached --name-only)

  info "Committing: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
else
  warn "No local file changes to commit."
fi

AHEAD="$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)"
if [[ "$HAS_CHANGES" == "false" && "$AHEAD" -eq 0 ]]; then
  info "Already up to date with $REMOTE/$BRANCH — nothing to push."
  exit 0
fi

info "Pushing to $REMOTE/$BRANCH…"
if ! git push -u "$REMOTE" "$BRANCH"; then
  error "Push failed. Finish GitHub login if needed:"
  error "  gh auth login"
  error "  git push -u $REMOTE $BRANCH"
  exit 1
fi

info "Done. Remote: ${REMOTE_URL%.git}/tree/$BRANCH"
