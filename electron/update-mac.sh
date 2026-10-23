#!/bin/sh
set -eu
pid=$1
target=$2
staged=$3
backup=$4
receipt=$5
failed() {
  if [ ! -e "$target" ] && [ -d "$backup" ]; then /bin/mv "$backup" "$target"; fi
  printf '%s\n' '{"status":"error","error":"updateInstallError"}' > "$receipt"
  if [ -d "$target" ]; then /usr/bin/open "$target" || true; fi
  exit 1
}
# All paths are generated and checked by the main process. Never evaluate arguments.
[ "$(dirname "$target")" = "$(dirname "$staged")" ] || exit 1
[ "$(dirname "$target")" = "$(dirname "$backup")" ] || exit 1
i=0
while kill -0 "$pid" 2>/dev/null; do
  i=$((i+1)); [ "$i" -lt 450 ] || exit 1
  sleep .2
done
/usr/bin/codesign --verify --deep --strict "$staged" || failed
if ! /bin/mv "$target" "$backup"; then failed; fi
if ! /bin/mv "$staged" "$target"; then
  /bin/mv "$backup" "$target"
  failed
fi
if ! /usr/bin/open "$target"; then
  /bin/mv "$target" "$staged"
  /bin/mv "$backup" "$target"
  failed
fi
