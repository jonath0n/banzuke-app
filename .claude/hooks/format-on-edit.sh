#!/bin/bash
# PostToolUse: run prettier + eslint --fix on the file Claude just edited,
# limited to the paths `npm run format` covers. Remaining lint errors are
# handed back to Claude (exit 2) so they get fixed now, not at `npm run check`.
f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
rel=${f#"$CLAUDE_PROJECT_DIR"/}
case "$rel" in
  src/*.ts|src/*.tsx|src/*.css|scripts/*.ts|scripts/*.mjs|e2e/*.ts|playwright.config.ts) ;;
  *) exit 0 ;;
esac
[ -f "$rel" ] || exit 0
npx prettier --write "$rel" >/dev/null 2>&1
case "$rel" in *.css) exit 0 ;; esac
out=$(npx eslint --fix --max-warnings 0 "$rel" 2>&1) || { echo "$out" >&2; exit 2; }
exit 0
