#!/usr/bin/env bash
# Calls the expense-book Apps Script web app.
# Usage: scripts/ledger.sh <action> ['<params json>']
# Needs EXPENSE_BOOK_URL (web app /exec URL) and EXPENSE_BOOK_TOKEN in the environment.
set -euo pipefail

: "${EXPENSE_BOOK_URL:?set EXPENSE_BOOK_URL to the web app /exec URL}"
: "${EXPENSE_BOOK_TOKEN:?set EXPENSE_BOOK_TOKEN to the API_TOKEN from setup()}"

action="${1:?usage: ledger.sh <action> ['<params json>']}"
params="${2:-{\}}"

body=$(ACTION="$action" PARAMS="$params" python3 -c '
import json, os, sys
try:
    params = json.loads(os.environ["PARAMS"])
except json.JSONDecodeError as e:
    sys.exit(f"params is not valid JSON: {e}")
print(json.dumps({"token": os.environ["EXPENSE_BOOK_TOKEN"], "action": os.environ["ACTION"], "params": params}, ensure_ascii=False))
')

# Apps Script answers POST with a 302 to script.googleusercontent.com; -L follows it as GET.
curl -sS -L --max-time 90 -H 'Content-Type: application/json; charset=utf-8' --data-binary "$body" "$EXPENSE_BOOK_URL"
echo
