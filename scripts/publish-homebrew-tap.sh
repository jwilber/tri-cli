#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
	printf 'Usage: %s <formula-path> [commit-message]\n' "$0" >&2
	exit 1
fi

FORMULA_PATH="$1"
COMMIT_MESSAGE="${2:-Update tri-cli Homebrew formula}"
TAP_REPOSITORY="${HOMEBREW_TAP_REPOSITORY:-jwilber/homebrew-tap}"
TAP_BRANCH="${HOMEBREW_TAP_BRANCH:-main}"
TAP_FORMULA_PATH="${HOMEBREW_TAP_FORMULA_PATH:-Formula/tri-cli.rb}"

if [[ ! -f "$FORMULA_PATH" ]]; then
	printf 'Formula file not found: %s\n' "$FORMULA_PATH" >&2
	exit 1
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
	printf 'Set GH_TOKEN to a token with Contents read/write access to %s.\n' "$TAP_REPOSITORY" >&2
	exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
	printf 'Missing required command: gh\n' >&2
	exit 1
fi

CONTENT="$(base64 < "$FORMULA_PATH" | tr -d '\n')"
EXISTING_SHA="$(
	gh api "repos/$TAP_REPOSITORY/contents/$TAP_FORMULA_PATH?ref=$TAP_BRANCH" \
		--jq .sha 2>/dev/null || true
)"

ARGS=(
	api
	--method PUT
	"repos/$TAP_REPOSITORY/contents/$TAP_FORMULA_PATH"
	-f "message=$COMMIT_MESSAGE"
	-f "content=$CONTENT"
	-f "branch=$TAP_BRANCH"
)
if [[ -n "$EXISTING_SHA" ]]; then
	ARGS+=(-f "sha=$EXISTING_SHA")
fi

gh "${ARGS[@]}"
printf 'Published %s to %s on %s.\n' "$TAP_FORMULA_PATH" "$TAP_REPOSITORY" "$TAP_BRANCH"
