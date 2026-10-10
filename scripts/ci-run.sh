#!/usr/bin/env bash
# Führt einen Befehl in GitHub Actions aus und meldet bei einem Fehler die letzten Logzeilen als
# Fehler-Annotation. Annotationen sind bei öffentlichen Repositories ohne Login lesbar (API:
# /check-runs/<job-id>/annotations), die vollständigen Job-Logs dagegen nicht.
#
# Aufruf: bash scripts/ci-run.sh "<Titel>" <befehl> [argumente...]
set -uo pipefail

TITLE="$1"
shift
LOG="$(mktemp)"

"$@" 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}

if [ "$STATUS" -ne 0 ]; then
  # Annotationen werden bei ca. 4 KB abgeschnitten: Farbcodes und die lange xcodebuild-Geräteliste
  # entfernen, zuerst die Fehlerzeilen, dann das Ende des Logs.
  CLEAN="$(mktemp)"
  sed -e 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -v '^{ platform:' | grep -v '^\s*$' > "$CLEAN"
  {
    echo "--- Fehlerzeilen:"
    grep -iE 'error|failed|fatal|cannot|could not' "$CLEAN" | grep -viE 'warning:' | tail -n 15
    echo "--- Log-Ende:"
    tail -n 20 "$CLEAN"
  } | cut -c1-300 > "$LOG.summary"
  # %, CR und LF für Workflow-Kommandos escapen.
  MSG=$(sed -e 's/%/%25/g' -e 's/\r/%0D/g' "$LOG.summary" | awk '{printf "%s%%0A", $0}')
  echo "::error title=${TITLE} (Exit ${STATUS})::${MSG}"
fi
exit "$STATUS"
