#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# release.sh — bump version, tag, and push to trigger deploy
#
# Usage:
#   ./scripts/release.sh patch     # 10.0.1 → 10.0.2
#   ./scripts/release.sh minor     # 10.0.1 → 10.1.0
#   ./scripts/release.sh major     # 10.0.1 → 11.0.0
#   ./scripts/release.sh 10.0.5    # exact version
# ─────────────────────────────────────────────────────────
set -e

BUMP=${1:-patch}

# Make sure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌  Uncommitted changes detected. Commit or stash first."
  exit 1
fi

# Make sure we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌  Releases must be cut from main (currently on '$BRANCH')"
  exit 1
fi

# Pull latest
git pull --rebase origin main

# Bump version in package.json and create git tag
if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  # Exact version provided
  NEW_VERSION="$BUMP"
  npm version "$NEW_VERSION" --no-git-tag-version
  git add package.json package-lock.json
  git commit -m "chore: release v${NEW_VERSION}"
  git tag "v${NEW_VERSION}"
else
  # patch / minor / major
  NEW_VERSION=$(npm version "$BUMP" -m "chore: release v%s")
  # npm version already committed and tagged
fi

echo "✅  Tagged $NEW_VERSION"
echo "⬆️   Pushing to GitHub — this will trigger the deploy pipeline..."
git push origin main --follow-tags

echo ""
echo "🚀  GitHub Actions is now building and deploying v${NEW_VERSION/v/}"
echo "    Watch: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
