#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
MODE="${1:-all}"

pass(){ printf 'PTP-WEB.2.8.3K K6 VALIDATION PASS: %s\n' "$*"; }

run_syntax(){
  node --check assets/js/journey-contracts.js
  node --check assets/js/state-store.js
  node --check assets/js/prompt-generator.js
  node --check assets/js/employee-builder.js
  node --check api/leads.js
  pass "JavaScript syntax"
}

run_contract(){
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import json

root=Path('.')
page=root/'funcionario-ia-gratis/index.html'
text=page.read_text(encoding='utf-8')

required=[
  'data-k6-app',
  'journey-contracts.js',
  'state-store.js',
  'prompt-generator.js',
  'employee-builder.js',
  'Criar, Conhecer, Testar e Decidir'
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'K6 marker missing: {marker}')

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]
    def handle_starttag(self, tag, attrs):
        data=dict(attrs)
        if 'id' in data: self.ids.append(data['id'])

parser=Inspector(); parser.feed(text)
if len(parser.ids) != len(set(parser.ids)):
    raise SystemExit('duplicate IDs in K6 page')

catalog=json.loads((root/'assets/data/ai-employees.json').read_text(encoding='utf-8'))
if catalog.get('schemaVersion') != '2.0':
    raise SystemExit('catalog schemaVersion must be 2.0')
if catalog.get('catalogVersion') != '2.0.0':
    raise SystemExit('catalogVersion must be 2.0.0')
if len(catalog.get('employees',[])) != 10:
    raise SystemExit('catalog must preserve 10 initial employees')
for key in ['objectives','processModes','channels','desiredResults','mandatoryControls','scenarioTemplates','classificationRules']:
    if not catalog.get(key):
        raise SystemExit(f'catalog section missing: {key}')
if catalog['classificationRules']['precedence'] != [
    'NOT_ELIGIBLE_FOR_AUTOMATION',
    'NEEDS_TECHNICAL_EVALUATION',
    'NEEDS_BUSINESS_CONTENT',
    'READY_FOR_MANUAL_TEST'
]:
    raise SystemExit('readiness precedence mismatch')
print('K6_HTML_CONTRACT=PASS')
print('K6_CATALOG_CONTRACT=PASS')
PY
  pass "HTML and catalog contracts"
}

run_runtime(){
  node <<'NODE'
global.window={};
global.crypto=require('node:crypto').webcrypto;
require('./assets/js/journey-contracts.js');
require('./assets/js/prompt-generator.js');
const fs=require('node:fs');
const C=window.PredixJourneyContracts;
const G=window.PredixPromptGenerator;
const catalog=JSON.parse(fs.readFileSync('./assets/data/ai-employees.json','utf8'));

(async()=>{
  let state=C.createInitialState();
  state.versions.catalogVersion=catalog.catalogVersion;
  state=C.transition(state,C.EVENTS.START);
  state=C.transition(state,C.EVENTS.OBJECTIVE_SELECTED,{objectiveId:'atendimento'});
  state=C.transition(state,C.EVENTS.SEGMENT_CONFIRMED,{segment:'Clínica de exames'});
  state=C.transition(state,C.EVENTS.PROCESS_SELECTED,{processModeId:'one-person'});
  state=C.transition(state,C.EVENTS.CHANNELS_CONFIRMED,{channelIds:['whatsapp']});
  const recommendation=G.recommendEmployee(catalog,{...state.answers,desiredResultIds:['faster-response']});
  state=C.transition(state,C.EVENTS.RESULTS_CONFIRMED,{
    desiredResultIds:['faster-response'],
    recommendation,
    mandatoryControls:catalog.mandatoryControls.map(item=>item.label)
  });
  state=C.transition(state,C.EVENTS.RECOMMENDATION_ACCEPTED);
  state=C.transition(state,C.EVENTS.CONFIGURATION_CONFIRMED,{
    tone:'profissional, claro e respeitoso',
    additionalRules:'',
    authorizedContent:['Informações públicas do site']
  });
  const artifact=await G.generatePromptArtifact({catalog,state});
  if(!artifact.content.includes('Controles humanos obrigatórios')) throw new Error('PROMPT_CONTROLS_MISSING');
  if(!artifact.contentHash) throw new Error('PROMPT_HASH_MISSING');
  state=C.transition(state,C.EVENTS.PROMPT_PREPARED,{promptArtifact:artifact});
  const readiness=G.buildReadinessMap({catalog,state});
  const classes=new Set(readiness.capabilities.map(item=>item.classification));
  for(const expected of ['READY_FOR_MANUAL_TEST','NEEDS_TECHNICAL_EVALUATION','NOT_ELIGIBLE_FOR_AUTOMATION']){
    if(!classes.has(expected)) throw new Error(`READINESS_CLASS_MISSING:${expected}`);
  }
  if(!C.validateEnvelope(state)) throw new Error('STATE_ENVELOPE_INVALID');
  console.log('K6_TRANSITIONS=PASS');
  console.log('K6_PROMPT_ARTIFACT=PASS');
  console.log('K6_READINESS_MAP=PASS');
})().catch(error=>{console.error(error);process.exit(1);});
NODE
  pass "runtime contracts"
}

run_privacy(){
  local files=(
    assets/js/journey-contracts.js
    assets/js/state-store.js
    assets/js/prompt-generator.js
    assets/js/employee-builder.js
    funcionario-ia-gratis/index.html
  )
  for forbidden in 'localStorage' 'sessionStorage.clear(' 'gtag(' 'fbq(' 'analytics.track'; do
    if grep -Fn -- "$forbidden" "${files[@]}"; then
      echo "forbidden K6 marker: $forbidden" >&2
      exit 1
    fi
  done
  if grep -En -- 'sk-[A-Za-z0-9_-]{20,}|sb[_]secret_|SUPABASE[_]SERVICE[_]ROLE' "${files[@]}"; then
    echo 'possible secret found in K6 delivery' >&2
    exit 1
  fi
  grep -Fq 'predixai.employeeBuilder' assets/js/journey-contracts.js
  grep -Fq 'LAST_KNOWN_GOOD' docs/history/ptp/PTP-WEB/PTP-WEB.2/20260721_PTP-WEB.2.8.3K_K7_MASTER_IMPLEMENTATION.md
  pass "privacy, namespace and recovery"
}

case "${MODE}" in
  syntax) run_syntax ;;
  contract) run_contract ;;
  runtime) run_runtime ;;
  privacy) run_privacy ;;
  all) run_syntax; run_contract; run_runtime; run_privacy ;;
  *) echo "modo inválido: ${MODE}" >&2; exit 2 ;;
esac
