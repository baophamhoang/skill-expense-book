#!/usr/bin/env bash
# Calls the expense-book Apps Script web app.
# Usage: scripts/ledger.sh <action> ['<params json>']
# Needs EXPENSE_BOOK_URL (web app /exec URL) and EXPENSE_BOOK_TOKEN, from the environment or ~/.config/expense-book/env.
set -euo pipefail

# Local machines keep both values in a private env file; cloud sessions set them directly.
env_file="${EXPENSE_BOOK_ENV:-$HOME/.config/expense-book/env}"
if [[ -z "${EXPENSE_BOOK_URL:-}" || -z "${EXPENSE_BOOK_TOKEN:-}" ]] && [[ -f "$env_file" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi

: "${EXPENSE_BOOK_URL:?set EXPENSE_BOOK_URL to the web app /exec URL}"
: "${EXPENSE_BOOK_TOKEN:?set EXPENSE_BOOK_TOKEN to the API_TOKEN from setup()}"

action="${1:?usage: ledger.sh <action> ['<params json>']}"
params="${2:-}"
[[ -n "$params" ]] || params='{}'

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
