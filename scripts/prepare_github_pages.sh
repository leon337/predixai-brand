#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
PREFIX="/predixai-brand"

[[ -d "${DIST_DIR}" ]] || { echo "dist/ ausente; execute o build antes." >&2; exit 1; }

python3 - "${DIST_DIR}" "${PREFIX}" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
prefix = sys.argv[2].rstrip('/')

for path in root.rglob('*.html'):
    text = path.read_text(encoding='utf-8')
    for attr in ('href', 'src', 'action'):
        text = text.replace(f'{attr}="/', f'{attr}="{prefix}/')
    path.write_text(text, encoding='utf-8')

print('GITHUB_PAGES_HTML_PREFIX=PASS')
PY

grep -q 'href="/predixai-brand/solucoes/workforce/"' "${DIST_DIR}/index.html" || {
  echo "link Workforce não foi adaptado ao GitHub Pages" >&2
  exit 1
}

echo "GITHUB_PAGES_PREPARE=PASS"
