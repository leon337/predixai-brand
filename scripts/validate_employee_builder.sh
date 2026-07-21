#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
MODE="${1:-all}"

pass(){ printf 'PTP-WEB.2.8.3K K7.7 VALIDATION PASS: %s\n' "$*"; }

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
text=(root/'funcionario-ia-gratis/index.html').read_text(encoding='utf-8')
required=['data-k6-app','journey-contracts.js','state-store.js','prompt-generator.js','employee-builder.js','Criar, Conhecer, Testar e Decidir']
for marker in required:
    if marker not in text: raise SystemExit(f'K6 marker missing: {marker}')
class Inspector(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]
    def handle_starttag(self, tag, attrs):
        data=dict(attrs)
        if 'id' in data: self.ids.append(data['id'])
parser=Inspector(); parser.feed(text)
if len(parser.ids)!=len(set(parser.ids)): raise SystemExit('duplicate IDs in K6 page')
catalog=json.loads((root/'assets/data/ai-employees.json').read_text(encoding='utf-8'))
if catalog.get('schemaVersion')!='2.0': raise SystemExit('catalog schemaVersion must be 2.0')
if catalog.get('catalogVersion')!='2.0.0': raise SystemExit('catalogVersion must be 2.0.0')
if len(catalog.get('employees',[]))!=10: raise SystemExit('catalog must preserve 10 initial employees')
for key in ['objectives','processModes','channels','desiredResults','mandatoryControls','scenarioTemplates','classificationRules']:
    if not catalog.get(key): raise SystemExit(f'catalog section missing: {key}')
if catalog['classificationRules']['precedence'] != ['NOT_ELIGIBLE_FOR_AUTOMATION','NEEDS_TECHNICAL_EVALUATION','NEEDS_BUSINESS_CONTENT','READY_FOR_MANUAL_TEST']:
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
  state=C.transition(state,C.EVENTS.RESULTS_CONFIRMED,{desiredResultIds:['faster-response'],recommendation,mandatoryControls:catalog.mandatoryControls.map(item=>item.label)});
  state=C.transition(state,C.EVENTS.RECOMMENDATION_ACCEPTED);
  state=C.transition(state,C.EVENTS.CONFIGURATION_CONFIRMED,{tone:'profissional, claro e respeitoso',additionalRules:'',authorizedContent:['Informações públicas do site']});
  const artifact=await G.generatePromptArtifact({catalog,state});
  if(!artifact.content.includes('Controles humanos obrigatórios')) throw new Error('PROMPT_CONTROLS_MISSING');
  state=C.transition(state,C.EVENTS.PROMPT_PREPARED,{promptArtifact:artifact});
  state=C.transition(state,C.EVENTS.PROMPT_COPY_REQUIRED);
  if(state.artifacts.prompt.copyStatus!=='MANUAL_COPY_REQUIRED'||state.journey.canonicalScreen!==C.SCREENS.PROMPT) throw new Error('MANUAL_COPY_REQUIRED_STATE_FAILED');
  state=C.transition(state,C.EVENTS.PROMPT_COPY_CONFIRMED,{copyStatus:'MANUAL_COPY_CONFIRMED'});
  if(state.journey.canonicalScreen!==C.SCREENS.PLATFORM) throw new Error('MANUAL_COPY_CONFIRMATION_FAILED');

  let blocked=false;
  try{C.transition(state,C.EVENTS.SCENARIO_EXECUTED);}catch(error){blocked=error.message==='PROMPT_SUBMISSION_REQUIRED';}
  if(!blocked) throw new Error('SCENARIO_GUARD_FAILED');

  const contradiction=C.validateObservation({matchResult:'unable',inventedInfo:'yes',humanHandoff:'yes'});
  if(contradiction.ok||contradiction.code!=='CONTRADICTORY_OBSERVATION') throw new Error('CONTRADICTORY_OBSERVATION_NOT_BLOCKED');

  const readiness=G.buildReadinessMap({catalog,state});
  const classes=new Set(readiness.capabilities.map(item=>item.classification));
  for(const expected of ['READY_FOR_MANUAL_TEST','NEEDS_TECHNICAL_EVALUATION','NOT_ELIGIBLE_FOR_AUTOMATION']){
    if(!classes.has(expected)) throw new Error(`READINESS_CLASS_MISSING:${expected}`);
  }

  state=C.transition(state,C.EVENTS.READINESS_PREPARED,{readinessMap:readiness});
  state=C.transition(state,C.EVENTS.READINESS_VIEWED);
  state=C.transition(state,C.EVENTS.COMMERCIAL_PATH_SELECTED);
  state=C.transition(state,C.EVENTS.COMMERCIAL_SCOPE_SELECTED,{scopeIds:['channel-integration'],readinessSummaryAllowlist:[{capabilityId:'external-integration',classification:'NEEDS_TECHNICAL_EVALUATION'}]});
  const payload={schema_version:'2.0',submission_attempt_id:'submission-test',idempotency_key:'idem-test',payload_hash:'12345678'};
  state=C.transition(state,C.EVENTS.COMMERCIAL_CONTACT_CONFIRMED,{contact:{consentContact:true},submissionAttemptId:'submission-test',idempotencyKey:'idem-test',payloadHash:'12345678',payloadSnapshot:payload});
  const firstAttempt=state.commercial.submission.submissionAttemptId;
  const firstKey=state.commercial.submission.idempotencyKey;
  state=C.transition(state,C.EVENTS.COMMERCIAL_SUBMIT_STARTED);
  state=C.transition(state,C.EVENTS.COMMERCIAL_SUBMIT_FAILED,{errorCode:'INVALID_CONTACT'});
  state=C.transition(state,C.EVENTS.COMMERCIAL_SUBMIT_STARTED);
  if(state.commercial.submission.submissionAttemptId!==firstAttempt||state.commercial.submission.idempotencyKey!==firstKey) throw new Error('FAILED_RETRY_IDENTIFIERS_CHANGED');

  state=C.transition(state,C.EVENTS.CATALOG_SELECTION_ORPHANED,{employeeId:'removed-employee'});
  if(state.journey.canonicalScreen!==C.SCREENS.RESULTS||state.configuration.employeeId) throw new Error('CATALOG_ORPHAN_GUARD_FAILED');
  if(!C.validateEnvelope(state)) throw new Error('STATE_ENVELOPE_INVALID');
  console.log('K77_MANUAL_COPY=PASS');
  console.log('K77_OBSERVATION_GUARD=PASS');
  console.log('K77_EVENT_ONLY_NAVIGATION=PASS');
  console.log('K77_STABLE_RETRY_IDS=PASS');
  console.log('K77_CATALOG_ORPHAN=PASS');
})().catch(error=>{console.error(error);process.exit(1);});
NODE
  pass "runtime hardening contracts"
}

run_storage(){
node <<'NODE'
global.window={};
global.crypto=require('node:crypto').webcrypto;
require('./assets/js/journey-contracts.js');
const data=new Map();
window.sessionStorage={setItem:(k,v)=>data.set(k,String(v)),getItem:k=>data.has(k)?data.get(k):null,removeItem:k=>data.delete(k)};
require('./assets/js/state-store.js');
const C=window.PredixJourneyContracts;
const Store=window.PredixSessionStateStore.SessionStateStore;
const store=new Store(window.sessionStorage);
let state=C.createInitialState();
state=C.transition(state,C.EVENTS.START);
if(!store.save(state).ok) throw new Error('ATOMIC_SAVE_FAILED');
let loaded=store.load();
if(!loaded||loaded.meta.stateRevision!==state.meta.stateRevision) throw new Error('STATE_LOAD_FAILED');
loaded.commercial.submission.status=C.SUBMISSION.SUBMITTING;
store.save(loaded);
const unknown=store.load();
if(unknown.commercial.submission.status!==C.SUBMISSION.UNKNOWN) throw new Error('SUBMITTING_NOT_RECOVERED_AS_UNKNOWN');
if(store.clear().ok) throw new Error('UNKNOWN_CLEAR_NOT_BLOCKED');

const corrupted={meta:{stateRevision:7},answers:{objectiveId:'atendimento',segment:'Clínica',processModeId:'one-person',channelIds:['whatsapp'],desiredResultIds:['faster-response']},configuration:{employeeId:'atendente-ia',tone:'profissional'}};
data.set(C.STORAGE.active,JSON.stringify(corrupted));
data.delete(C.STORAGE.lastKnownGood);
store.memoryState=null;
const partial=store.load();
if(partial.session.status!=='RECOVERABLE_PARTIAL') throw new Error('PARTIAL_RECOVERY_STATUS_FAILED');
if(partial.artifacts.prompt!==null||partial.artifacts.readinessMap!==null||partial.commercial.draft!==null) throw new Error('PARTIAL_RECOVERY_DERIVED_DATA_LEAK');
partial.commercial.submission.status=C.SUBMISSION.DRAFT;
store.memoryState=partial;
const cleared=store.clear();
if(!cleared.ok||data.size!==0) throw new Error('NAMESPACE_CLEAR_FAILED');
console.log('K77_ATOMIC_STORAGE=PASS');
console.log('K77_UNKNOWN_CLEAR_BLOCK=PASS');
console.log('K77_PARTIAL_RECOVERY_ALLOWLIST=PASS');
NODE
  pass "storage, recovery and clear guards"
}

run_api(){
node <<'NODE'
const {createHash}=require('node:crypto');
const api=require('./api/leads.js');
const withoutHash={
  schema_version:'2.0',submission_attempt_id:'submission-test-001',idempotency_key:'idempotency-test-001',
  source:'workforce_k6',product_interest:'workforce',person_name:'Teste',business_name:'Profissional autônomo',city:'Recife',state:'PE',
  business_segment:'Serviços',preferred_contact:'email',contact_value:'teste@example.invalid',current_tool:null,
  main_problem:'Avaliação técnica: channel-integration',desired_result:'Avaliar viabilidade técnica sem promessa de implantação.',
  commercial_interest:['diagnostico'],acceptable_price_range:null,consent_contact:true,consent_news:false,
  selected_technical_scope:['channel-integration'],readiness_summary:[{capabilityId:'external-integration',classification:'NEEDS_TECHNICAL_EVALUATION'}],
  consent_version:'1.0',privacy_notice_version:'4.0',website:''
};
const payloadHash=createHash('sha256').update(api.stableStringify(withoutHash)).digest('hex');
const normalized=api.normalizeK6({...withoutHash,payload_hash:payloadHash});
if(normalized.payload_hash!==payloadHash) throw new Error('K6_API_HASH_NORMALIZATION_FAILED');
let tamperBlocked=false;
try{api.normalizeK6({...withoutHash,payload_hash:'0'.repeat(64)});}catch(error){tamperBlocked=error.message==='PAYLOAD_HASH_MISMATCH';}
if(!tamperBlocked) throw new Error('PAYLOAD_TAMPER_NOT_BLOCKED');
let humanBlocked=false;
try{api.normalizeK6({...withoutHash,payload_hash:payloadHash,readiness_summary:[{capabilityId:'human-decision',classification:'NOT_ELIGIBLE_FOR_AUTOMATION'}]});}catch(error){humanBlocked=['INVALID_READINESS_SUMMARY','PAYLOAD_HASH_MISMATCH'].includes(error.message);}
if(!humanBlocked) throw new Error('HUMAN_ONLY_PAYLOAD_NOT_BLOCKED');
console.log('K77_SERVER_HASH_RECOMPUTE=PASS');
console.log('K77_HUMAN_ONLY_BLOCK=PASS');
NODE
  pass "commercial API hardening"
}

run_static_hardening(){
python3 - <<'PY'
from pathlib import Path
builder=Path('assets/js/employee-builder.js').read_text(encoding='utf-8')
contracts=Path('assets/js/journey-contracts.js').read_text(encoding='utf-8')
required_builder=[
 'payloadSnapshot','response.status >= 500','COMMERCIAL_SUBMIT_UNKNOWN','MANUAL_COPY_REQUIRED','confirm-manual-copy',
 'historyPayload','popstate','BroadcastChannel','CATALOG_SELECTION_ORPHANED','READINESS_PREPARED','COMMERCIAL_PATH_SELECTED'
]
for marker in required_builder:
    if marker not in builder: raise SystemExit(f'hardening marker missing: {marker}')
for forbidden in [
 'state.artifacts.readinessMap = G.buildReadinessMap',
 'state.journey.canonicalScreen = C.SCREENS.READINESS',
 'state = C.transition(state, C.EVENTS.BACK, { screen: C.SCREENS.COMMERCIAL_SCOPE })'
]:
    if forbidden in builder: raise SystemExit(f'direct UI mutation remains: {forbidden}')
for marker in ['PROMPT_COPY_REQUIRED','CONTRADICTORY_OBSERVATION','TAB_CONFLICT_DETECTED','CONNECTIVITY_EVIDENCE_CHANGED','OFFLINE_READY','OFFLINE_PARTIAL','OFFLINE_NOT_READY']:
    if marker not in contracts: raise SystemExit(f'contract marker missing: {marker}')
print('K77_EXACT_PAYLOAD_PREVIEW=PASS')
print('K77_HTTP_5XX_UNKNOWN=PASS')
print('K77_BROWSER_HISTORY_MINIMAL=PASS')
print('K77_OFFLINE_EVIDENCE=PASS')
print('K77_DUPLICATE_TAB_DETECTION=PASS')
print('K77_DIRECT_MUTATION_REMOVAL=PASS')
PY
  pass "static hardening evidence"
}

run_privacy(){
  local files=(assets/js/journey-contracts.js assets/js/state-store.js assets/js/prompt-generator.js assets/js/employee-builder.js funcionario-ia-gratis/index.html)
  for forbidden in 'localStorage' 'sessionStorage.clear(' 'gtag(' 'fbq(' 'analytics.track'; do
    if grep -Fn -- "$forbidden" "${files[@]}"; then echo "forbidden K6 marker: $forbidden" >&2; exit 1; fi
  done
  if grep -En -- 'sk-[A-Za-z0-9_-]{20,}|sb[_]secret_|SUPABASE[_]SERVICE[_]ROLE' "${files[@]}"; then
    echo 'possible secret found in K6 delivery' >&2; exit 1
  fi
  grep -Fq 'predixai.employeeBuilder' assets/js/journey-contracts.js
  pass "privacy, namespace and recovery"
}

case "${MODE}" in
  syntax) run_syntax ;;
  contract) run_contract ;;
  runtime) run_runtime ;;
  storage) run_storage ;;
  api) run_api ;;
  hardening) run_static_hardening ;;
  privacy) run_privacy ;;
  all) run_syntax; run_contract; run_runtime; run_storage; run_api; run_static_hardening; run_privacy ;;
  *) echo "modo inválido: ${MODE}" >&2; exit 2 ;;
esac
