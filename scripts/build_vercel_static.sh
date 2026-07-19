#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; DIST_DIR="${ROOT_DIR}/dist"
log(){ printf '[build_vercel_static] %s\n' "$*"; }; fail(){ printf '[build_vercel_static] ERROR: %s\n' "$*" >&2; exit 1; }
copy_required_file(){ local p="$1"; [[ -f "${ROOT_DIR}/${p}" ]]||fail "arquivo público obrigatório ausente: ${p}"; mkdir -p "$(dirname "${DIST_DIR}/${p}")"; cp -p "${ROOT_DIR}/${p}" "${DIST_DIR}/${p}"; }
copy_optional_file(){ local p="$1"; if [[ -f "${ROOT_DIR}/${p}" ]];then mkdir -p "$(dirname "${DIST_DIR}/${p}")";cp -p "${ROOT_DIR}/${p}" "${DIST_DIR}/${p}";fi; }
copy_required_dir(){ local p="$1";[[ -d "${ROOT_DIR}/${p}" ]]||fail "diretório público obrigatório ausente: ${p}";cp -a "${ROOT_DIR}/${p}" "${DIST_DIR}/${p}"; }
log "limpando saída anterior";rm -rf "${DIST_DIR}";mkdir -p "${DIST_DIR}"
for file in index.html 404.html manifest.webmanifest robots.txt sitemap.xml;do copy_required_file "${file}";done
copy_optional_file .nojekyll;copy_required_dir assets
for directory in solucoes validacao privacidade obrigado;do copy_required_dir "${directory}";done
for required in solucoes/workforce/index.html assets/css/workforce.css assets/css/workforce-base.css assets/css/home-commercial.css assets/img/predixai-workforce-flow.svg assets/img/social-card.svg;do [[ -f "${DIST_DIR}/${required}" ]]||fail "entrega Workforce ausente: ${required}";done
for marker in 'PredixAI Workforce' 'id="como-funciona"' 'id="processos"' 'id="para-quem"' 'id="seguranca"';do grep -q "${marker}" "${DIST_DIR}/index.html"||fail "marcador comercial ausente na Home: ${marker}";done
for imported in 'workforce-base.css' 'home-commercial.css';do grep -q "${imported}" "${DIST_DIR}/assets/css/workforce.css"||fail "importação CSS ausente: ${imported}";done
grep -q 'PredixAI Workforce' "${DIST_DIR}/solucoes/workforce/index.html"||fail "página Workforce inválida";grep -q '/solucoes/workforce/' "${DIST_DIR}/sitemap.xml"||fail "Workforce ausente do sitemap"
for forbidden in docs reports .github api supabase PROJECT_STATE.md predixai_context.json README.md .git .env .env.local;do [[ ! -e "${DIST_DIR}/${forbidden}" ]]||fail "arquivo proibido em dist/: ${forbidden}";done
sensitive="$({ find "${DIST_DIR}" -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -iname '*credential*' -o -iname '*secret*' -o -iname '*token*' \) -print -quit; }||true)";[[ -z "${sensitive}" ]]||fail "possível arquivo sensível: ${sensitive#${ROOT_DIR}/}"
for required in index.html validacao/index.html privacidade/index.html obrigado/index.html;do [[ -f "${DIST_DIR}/${required}" ]]||fail "arquivo ausente em dist/: ${required}";done
log "build concluído: $(find "${DIST_DIR}" -type f|wc -l|tr -d ' ') arquivos públicos em dist/"
