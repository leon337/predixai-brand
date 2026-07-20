#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
MODE="${1:-all}"
pass(){ printf 'PTP-WEB.2.8.3J VALIDATION PASS: %s\n' "$*"; }

run_syntax(){
  node --check assets/js/prompt-generator.js
  node --check assets/js/employee-builder.js
  pass "JavaScript syntax"
}

run_contract(){
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import json
root=Path('.')
page=root/'funcionario-ia-gratis/index.html'
class Inspector(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.steps=0
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if 'id' in data:self.ids.append(data['id'])
        if 'data-builder-step' in data:self.steps+=1
parser=Inspector();parser.feed(page.read_text(encoding='utf-8'))
if len(parser.ids)!=len(set(parser.ids)):raise SystemExit('duplicate IDs in employee builder')
if parser.steps!=3:raise SystemExit(f'expected 3 builder steps, got {parser.steps}')
text=page.read_text(encoding='utf-8')
for marker in ['data-employee-builder','data-employee-grid','data-prompt-output','data-copy-prompt','data-diagnosis-integrations','data-implementation-link','Crie seu','Funcionário de IA grátis']:
    if marker not in text:raise SystemExit(f'builder marker missing: {marker}')
if '/api/leads' in text:raise SystemExit('prompt generation must not be gated by lead API')
catalog=json.loads((root/'assets/data/ai-employees.json').read_text(encoding='utf-8'))
employees=catalog.get('employees')
if not isinstance(employees,list) or len(employees)!=10:raise SystemExit('catalog must contain exactly 10 initial employees')
ids=[item.get('id') for item in employees]
if len(ids)!=len(set(ids)):raise SystemExit('duplicate employee IDs')
required={'id','nome','departamento','descricao','gatilhos','tarefas','fontes','resultados','integracoes','limites','exemplos'}
for item in employees:
    missing=required-set(item)
    if missing:raise SystemExit(f"employee {item.get('id')} missing fields: {sorted(missing)}")
    for field in ['gatilhos','tarefas','fontes','resultados','integracoes','limites','exemplos']:
        if not isinstance(item[field],list) or not item[field]:raise SystemExit(f"employee {item['id']} has empty {field}")
print('EMPLOYEE_CATALOG=PASS')
print('BUILDER_HTML=PASS')
PY
}

run_runtime(){
node <<'NODE'
global.window={};
require('./assets/js/prompt-generator.js');
const fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('./assets/data/ai-employees.json','utf8'));
const employee=catalog.employees[0];
const input={employee,company:'Empresa Teste',segment:'Serviços',tone:'profissional',triggers:[employee.gatilhos[0]],tasks:employee.tarefas.slice(0,2),sources:employee.fontes.slice(0,2),results:employee.resultados.slice(0,1),handoffs:['Informação não encontrada'],notes:'Teste controlado'};
const prompt=window.PredixPromptGenerator.generatePrompt(input);
const diagnosis=window.PredixPromptGenerator.buildDiagnosis(input);
for(const marker of ['FUNCIONÁRIO DE IA','Empresa Teste','Controle humano','Não solicite senhas','Cenários para teste']){
  if(!prompt.includes(marker)) throw new Error(`PROMPT_MARKER_MISSING:${marker}`);
}
if(!Array.isArray(diagnosis.integrations)||!diagnosis.integrations.length)throw new Error('DIAGNOSIS_INTEGRATIONS_EMPTY');
console.log('PROMPT_GENERATION=PASS');
console.log('AUTOMATION_DIAGNOSIS=PASS');
NODE
}

run_privacy(){
  local files=(assets/js/employee-builder.js assets/js/prompt-generator.js funcionario-ia-gratis/index.html)
  for forbidden in 'localStorage' 'sessionStorage' 'gtag(' 'fbq(' 'analytics.track' 'SUPABASE_SERVICE_ROLE';do
    if grep -Fn -- "$forbidden" "${files[@]}";then
      echo "forbidden builder marker: $forbidden" >&2
      exit 1
    fi
  done
  if grep -En -- 'sk-[A-Za-z0-9_-]{20,}' "${files[@]}";then
    echo 'possible API secret found in employee builder delivery' >&2
    exit 1
  fi
  pass "local generation, privacy and no lead gate"
}

case "${MODE}" in
  syntax) run_syntax ;;
  contract) run_contract ;;
  runtime) run_runtime ;;
  privacy) run_privacy ;;
  all) run_syntax;run_contract;run_runtime;run_privacy ;;
  *) echo "modo inválido: ${MODE}" >&2;exit 2 ;;
esac
