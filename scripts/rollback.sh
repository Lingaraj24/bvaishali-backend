#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# rollback.sh — switch the running API to the previous version
#
# Run this ON THE SERVER:  bash /opt/bvaishali-api/scripts/rollback.sh
#
# Or pass a specific version:
#   bash scripts/rollback.sh v10.0.1
# ─────────────────────────────────────────────────────────
set -e

DEPLOY_DIR="/opt/bvaishali-api"
VERSIONS_FILE="$DEPLOY_DIR/.versions"

if [ ! -f "$VERSIONS_FILE" ]; then
  echo "❌  No version history found at $VERSIONS_FILE"
  echo "    At least one deploy must have run before rollback is possible."
  exit 1
fi

CURRENT=$(grep "^current=" "$VERSIONS_FILE" | cut -d= -f2)
PREVIOUS=$(grep "^previous=" "$VERSIONS_FILE" | cut -d= -f2)

# Allow overriding with explicit version argument
TARGET=${1:-$PREVIOUS}

if [ -z "$TARGET" ]; then
  echo "❌  No previous version recorded. Cannot rollback."
  exit 1
fi

echo "📋  Current version:  $CURRENT"
echo "⏪   Rolling back to:  $TARGET"
echo ""

cd "$DEPLOY_DIR"

# Update .env to point to the target image
sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$TARGET|" .env

# Pull and restart
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Update version file: previous becomes current, target becomes current
echo "current=$TARGET" > "$VERSIONS_FILE"
echo "previous=$CURRENT" >> "$VERSIONS_FILE"

echo ""
echo "✅  Rolled back to $TARGET"
echo "    Run: docker compose -f docker-compose.prod.yml ps"
