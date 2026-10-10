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
  # Farbcodes entfernen; %, CR und LF für Workflow-Kommandos escapen.
  TAIL=$(tail -n 60 "$LOG" | sed -e 's/\x1b\[[0-9;]*m//g' | sed -e 's/%/%25/g' -e 's/\r/%0D/g' | awk '{printf "%s%%0A", $0}')
  echo "::error title=${TITLE} (Exit ${STATUS})::${TAIL}"
fi
exit "$STATUS"
