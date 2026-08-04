#!/usr/bin/env bash
# TextileHub E2E harness — API suite + browser suite + auto-cleanup.
# Usage:  ./e2e/run.sh            (targets production; set env vars to override)
# Env:    E2E_API_URL   (default https://textilehub-api.vercel.app)
#         E2E_BASE_URL  (default https://textilehub.vercel.app)
#         DATABASE_URL  (required for cleanup; falls back to e2e/.env)
set -u
cd "$(dirname "$0")/.."

PY="backend/.venv/bin/python"
[ -x "$PY" ] || PY="python3"

echo "==> [1/3] API suite"
"$PY" e2e/api_tests.py
API_EXIT=$?

echo
echo "==> [2/3] Browser suite (Playwright, chromium, 1 worker)"
(cd frontend && npx playwright test --config ../frontend/e2e/playwright.config.js)
BROWSER_EXIT=$?

echo
echo "==> [3/3] DB cleanup (restore seeded baseline)"
"$PY" e2e/cleanup_db.py
CLEAN_EXIT=$?

echo
echo "======================================================"
echo " API suite:     $([ $API_EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo " Browser suite: $([ $BROWSER_EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo " Cleanup:       $([ $CLEAN_EXIT -eq 0 ] && echo OK || echo FAILED)"
echo "======================================================"
[ $API_EXIT -ne 0 ] && exit $API_EXIT
[ $BROWSER_EXIT -ne 0 ] && exit $BROWSER_EXIT
exit 0
