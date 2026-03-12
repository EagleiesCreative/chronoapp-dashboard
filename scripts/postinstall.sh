#!/bin/sh
# Patch @clerk/nextjs keyless-custom-headers.js
# Next.js 16 Turbopack requires all functions in "use server" files to be async.
# This patches the non-async functions in the Clerk file.

CLERK_FILE="node_modules/@clerk/nextjs/dist/esm/server/keyless-custom-headers.js"

if [ -f "$CLERK_FILE" ]; then
  # Use sed without -i '' (macOS-only) — write to temp file for cross-platform compat
  sed \
    -e 's/^function detectCIEnvironment/async function detectCIEnvironment/' \
    -e 's/^function getNextVersion/async function getNextVersion/' \
    -e 's/^function formatMetadataHeaders/async function formatMetadataHeaders/' \
    "$CLERK_FILE" > "${CLERK_FILE}.tmp" && mv "${CLERK_FILE}.tmp" "$CLERK_FILE"
  echo "✓ Patched $CLERK_FILE (async functions for Next.js 16 compat)"
else
  echo "⚠ Clerk file not found at $CLERK_FILE — skipping patch"
fi
