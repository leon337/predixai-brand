#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)";cd "${ROOT_DIR}"
pass(){ printf 'PTP-WEB.2 VALIDATION PASS: %s\n' "$*"; }
node --check assets/js/main.js;node --check assets/js/form.js;node --check api/leads.js;pass "JavaScript syntax"
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import json, xml.etree.ElementTree as ET
root=Path('.')
files=[root/'index.html',root/'solucoes/workforce/index.html',root/'solucoes/atendimento/index.html',root/'solucoes/pet/index.html',root/'solucoes/market/index.html',root/'validacao/index.html',root/'privacidade/index.html',root/'obrigado/index.html',root/'404.html']
class Inspector(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.title=False
 def handle_starttag(self,tag,attrs):
  data=dict(attrs)
  if 'id' in data:self.ids.append(data['id'])
  if tag=='title':self.title=True
for path in files:
 if not path.is_file():raise SystemExit(f'missing HTML: {path}')
 parser=Inspector();parser.feed(path.read_text(encoding='utf-8'))
 duplicates={item for item in parser.ids if parser.ids.count(item)>1}
 if duplicates:raise SystemExit(f'duplicate IDs in {path}: {sorted(duplicates)}')
 if not parser.title:raise SystemExit(f'missing title in {path}')
home=(root/'index.html').read_text(encoding='utf-8')
if 'id="workforce"' not in home:raise SystemExit('Workforce is not static in Home')
if 'installCommercialLayer' in (root/'assets/js/main.js').read_text(encoding='utf-8'):raise SystemExit('legacy runtime injection present')
workforce=(root/'solucoes/workforce/index.html').read_text(encoding='utf-8')
for term in ['Atendimento','Comercial','Administrativo','Financeiro','RH','Estoque','Logística','Documentação','Gestão','Integrações']:
 if term not in workforce:raise SystemExit(f'department missing: {term}')
manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8'))
if 'Workforce' not in manifest['name']:raise SystemExit('manifest not updated')
locations={item.text for item in ET.parse(root/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
if 'https://predixai-brand.vercel.app/solucoes/workforce/' not in locations:raise SystemExit('Workforce missing from sitemap')
api=(root/'api/leads.js').read_text(encoding='utf-8')
for term in ['workforce','sob_medida','UPSTREAM_TIMEOUT_MS','ORIGIN_NOT_ALLOWED','SERVICE_CONFIG_MISSING']:
 if term not in api:raise SystemExit(f'API contract missing: {term}')
form=(root/'validacao/index.html').read_text(encoding='utf-8')
for value in ['value="workforce"','value="pet"','value="market"','value="sob_medida"']:
 if value not in form:raise SystemExit(f'form option missing: {value}')
print('STATIC_CONTRACT=PASS')
PY
bash scripts/build_vercel_static.sh;pass "Static build and Workforce contract"
