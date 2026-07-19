#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

node --check api/leads.js
node --check assets/js/form.js
node --check assets/js/main.js
bash -n scripts/build_vercel_static.sh

python - <<'PY'
from pathlib import Path
from html.parser import HTMLParser
import json
import xml.etree.ElementTree as ET

root = Path(".")

class Parser(HTMLParser):
    pass

paths = (
    sorted(root.glob("validacao/*.html"))
    + sorted(root.glob("privacidade/*.html"))
    + sorted(root.glob("obrigado/*.html"))
    + sorted(root.glob("solucoes/*/*.html"))
)

for path in paths:
    parser = Parser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()

json.loads((root / "vercel.json").read_text(encoding="utf-8"))
ET.parse(root / "sitemap.xml")
print("STATIC_CONTRACTS=PASS")
PY

bash scripts/build_vercel_static.sh

for required in \
  dist/index.html \
  dist/validacao/index.html \
  dist/privacidade/index.html \
  dist/obrigado/index.html \
  dist/solucoes/atendimento/index.html \
  dist/solucoes/pet/index.html \
  dist/solucoes/market/index.html
do
  test -f "${required}"
done

for forbidden in docs reports .github api supabase PROJECT_STATE.md predixai_context.json README.md; do
  test ! -e "dist/${forbidden}"
done

echo "PTP-WEB.1.6.2F1_STATIC_VALIDATION=PASS"
