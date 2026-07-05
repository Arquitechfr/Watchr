#!/usr/bin/env bash
# EAS Build pre-install hook
# Recreates Firebase config files from EAS secrets (raw file content) since they
# are not tracked by git.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  printf '%s' "$GOOGLE_SERVICES_JSON" > google-services.json
  echo "✅ google-services.json restored from EAS secret"
else
  echo "⚠️  GOOGLE_SERVICES_JSON secret not set — Android Firebase/Google Sign-In may not work"
fi

if [ -n "${GOOGLE_SERVICES_PLIST:-}" ]; then
  printf '%s' "$GOOGLE_SERVICES_PLIST" > GoogleService-Info.plist
  echo "✅ GoogleService-Info.plist restored from EAS secret"
else
  echo "⚠️  GOOGLE_SERVICES_PLIST secret not set — iOS Firebase/Google Sign-In may not work"
fi
