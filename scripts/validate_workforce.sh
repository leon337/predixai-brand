#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)";cd "${ROOT_DIR}"
pass(){ printf 'PTP-WEB.2 VALIDATION PASS: %s\n' "$*"; }
node --check assets/js/main.js
node --check assets/js/form.js
node --check assets/js/prompt-generator.js
node --check assets/js/employee-builder.js
node --check api/leads.js
pass "JavaScript syntax"

bash scripts/validate_employee_builder.sh

python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import json, xml.etree.ElementTree as ET
root=Path('.')
files=[root/'index.html',root/'solucoes/workforce/index.html',root/'solucoes/atendimento/index.html',root/'solucoes/pet/index.html',root/'solucoes/market/index.html',root/'funcionario-ia-gratis/index.html',root/'validacao/index.html',root/'privacidade/index.html',root/'obrigado/index.html',root/'404.html']
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
required_home=[
 'PredixAI Workforce — plataforma de funcionários de IA',
 'Funcionários de IA para',
 'Criar meu funcionário de IA grátis',
 'Todos os departamentos disponíveis',
 'id="como-funciona"','id="departamentos"','id="seguranca"',
 'href="/funcionario-ia-gratis/"','assets/css/home-commercial.css'
]
for term in required_home:
    if term not in home:raise SystemExit(f'commercial Home contract missing: {term}')
for forbidden in ['href="/solucoes/pet/"','href="/solucoes/market/"','PredixAI Pet','PredixAI Market','>Soluções<','>Produtos<','ENGINEERING','EDUCATION','RESEARCH']:
    if forbidden in home:raise SystemExit(f'legacy or ambiguous public term in Home: {forbidden}')
if 'installCommercialLayer' in (root/'assets/js/main.js').read_text(encoding='utf-8'):raise SystemExit('legacy runtime injection present')

for css in ['assets/css/workforce-base.css','assets/css/home-commercial.css','assets/css/employee-builder.css']:
    if not (root/css).is_file():raise SystemExit(f'missing modular CSS: {css}')
workforce_css=(root/'assets/css/workforce.css').read_text(encoding='utf-8')
if 'workforce-base.css' not in workforce_css:raise SystemExit('Workforce base CSS import missing')
if 'home-commercial.css' in workforce_css:raise SystemExit('Home CSS must not load on internal pages')

workforce=(root/'solucoes/workforce/index.html').read_text(encoding='utf-8')
for term in ['Atendimento','Administrativo','Financeiro','Comercial','Estoque','Logística','Recursos Humanos','Documentação','Gestão','Integrações e automações','Todos os departamentos estão disponíveis','Criar funcionário grátis']:
    if term not in workforce:raise SystemExit(f'workforce contract missing: {term}')
for forbidden in ['stage-badge','Em validação','Planejado','Sob medida','Em pesquisa']:
    if forbidden in workforce:raise SystemExit(f'public maturity status must not appear in Workforce catalog: {forbidden}')

form=(root/'validacao/index.html').read_text(encoding='utf-8')
for value in ['value="workforce"','value="sob_medida"','Departamento prioritário','Todos os departamentos estão disponíveis']:
    if value not in form:raise SystemExit(f'form contract missing: {value}')
for forbidden in ['value="pet"','value="market"','PredixAI Pet','PredixAI Market']:
    if forbidden in form:raise SystemExit(f'legacy product remains in form: {forbidden}')

for legacy in ['pet','market']:
    text=(root/f'solucoes/{legacy}/index.html').read_text(encoding='utf-8')
    if 'noindex,follow' not in text or 'canonical" href="https://predixai-brand.vercel.app/solucoes/workforce/' not in text:
        raise SystemExit(f'legacy route not safely repositioned: {legacy}')

manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8'))
if 'Workforce' not in manifest['name']:raise SystemExit('manifest not updated')
locations={item.text for item in ET.parse(root/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
required_locations={'https://predixai-brand.vercel.app/solucoes/workforce/','https://predixai-brand.vercel.app/funcionario-ia-gratis/'}
if not required_locations.issubset(locations):raise SystemExit('Workforce or employee builder missing from sitemap')
for old in ['https://predixai-brand.vercel.app/solucoes/pet/','https://predixai-brand.vercel.app/solucoes/market/']:
    if old in locations:raise SystemExit(f'legacy product route remains in sitemap: {old}')

api=(root/'api/leads.js').read_text(encoding='utf-8')
for term in ['workforce','sob_medida','UPSTREAM_TIMEOUT_MS','ORIGIN_NOT_ALLOWED','SERVICE_CONFIG_MISSING']:
    if term not in api:raise SystemExit(f'API contract missing: {term}')
form_js=(root/'assets/js/form.js').read_text(encoding='utf-8')
for marker in ['leon337.github.io','https://predixai-brand.vercel.app/api/leads','/predixai-brand','"workforce","sob_medida"']:
    if marker not in form_js:raise SystemExit(f'form compatibility missing: {marker}')
print('STATIC_CONTRACT=PASS')
print('BRAZILIAN_COMMUNICATION=PASS')
print('AI_EMPLOYEE_HOME=PASS')
print('ALL_DEPARTMENTS_AVAILABLE=PASS')
print('LEGACY_PRODUCTS_REMOVED=PASS')
print('GITHUB_PAGES_FORM_COMPATIBILITY=PASS')
PY

bash scripts/build_vercel_static.sh
for required in dist/index.html dist/funcionario-ia-gratis/index.html dist/assets/css/employee-builder.css dist/assets/js/employee-builder.js dist/assets/js/prompt-generator.js dist/assets/data/ai-employees.json;do
  [[ -e "$required" ]]||{ echo "missing build output: $required" >&2;exit 1; }
done
pass "Static build, commercial Home, Workforce and employee builder contract"
