#!/usr/bin/env bash
# Packt die .app aus dem Xcode-Archiv von `tauri ios build --no-sign --archive-only` in eine
# unsignierte .ipa (Ordner "Payload" als ZIP). Tauri selbst erwartet die .app unter einem anderen
# Namen, als Xcode sie ablegt; deshalb wird sie hier gesucht statt über den Produktnamen ermittelt.
# Läuft nur unter macOS (GitHub Actions: macos-latest).
set -euo pipefail

OUT="${1:-ios-build}"
NAME="${2:-plugged}"

APP=$(find src-tauri/gen/apple/build -path "*.xcarchive/Products/Applications/*.app" -maxdepth 5 -type d | head -n 1)
if [ -z "$APP" ]; then
  echo "Keine .app im Xcode-Archiv gefunden." >&2
  find src-tauri/gen/apple/build -maxdepth 4 >&2 || true
  exit 1
fi
echo "App: $APP"

WORK="$(mktemp -d)"
mkdir -p "$WORK/Payload" "$OUT"
cp -R "$APP" "$WORK/Payload/"
(cd "$WORK" && zip -qry "ipa.zip" Payload)
mv "$WORK/ipa.zip" "$OUT/$NAME.ipa"
ls -l "$OUT"
