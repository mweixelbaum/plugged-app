#!/usr/bin/env bash
# Startet den Simulator-Build (tauri ios build --target aarch64-sim) in einem iPhone-Simulator
# und speichert Screenshots. So lässt sich das Layout (Notch, Home-Leiste) ohne eigenen Mac prüfen.
# Läuft nur unter macOS (GitHub Actions: macos-latest).
set -euo pipefail

OUT="${1:-ios-screenshots}"
BUNDLE_ID="host.plugged.app"
mkdir -p "$OUT"

# Simulator-Build per `tauri ios build --no-sign --archive-only --target aarch64-sim`.
APP=$(find src-tauri/gen/apple/build -path "*.xcarchive/Products/Applications/*.app" -maxdepth 5 -type d | head -n 1)
if [ -z "$APP" ]; then
  echo "Kein Simulator-Build (.app) gefunden." >&2
  exit 1
fi
echo "App: $APP"

# Ein iPhone mit Notch/Dynamic Island bevorzugen ("Pro"-Modelle), sonst das letzte iPhone.
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
phones = [d for runtime, ds in devices.items() if "iOS" in runtime for d in ds if d["name"].startswith("iPhone")]
pro = [d for d in phones if "Pro" in d["name"]]
pick = (pro or phones)[-1]
print(pick["udid"])
print(pick["name"], file=sys.stderr)
')

xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BUNDLE_ID"

# plugged.host laden lassen, dann mehrere Screenshots (Hoch- und Querformat).
sleep 25
xcrun simctl io "$UDID" screenshot "$OUT/1-start.png"
sleep 10
xcrun simctl io "$UDID" screenshot "$OUT/2-loaded.png"

xcrun simctl shutdown "$UDID" || true
ls -l "$OUT"
