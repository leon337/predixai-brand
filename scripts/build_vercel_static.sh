#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"

log() {
  printf '[build_vercel_static] %s\n' "$*"
}

fail() {
  printf '[build_vercel_static] ERROR: %s\n' "$*" >&2
  exit 1
}

copy_required_file() {
  local relative_path="$1"
  local source_path="${ROOT_DIR}/${relative_path}"
  local target_path="${DIST_DIR}/${relative_path}"

  [[ -f "${source_path}" ]] || fail "arquivo público obrigatório ausente: ${relative_path}"
  mkdir -p "$(dirname "${target_path}")"
  cp -p "${source_path}" "${target_path}"
}

copy_optional_file() {
  local relative_path="$1"
  local source_path="${ROOT_DIR}/${relative_path}"
  local target_path="${DIST_DIR}/${relative_path}"

  if [[ -f "${source_path}" ]]; then
    mkdir -p "$(dirname "${target_path}")"
    cp -p "${source_path}" "${target_path}"
  fi
}

copy_required_dir() {
  local relative_path="$1"
  local source_path="${ROOT_DIR}/${relative_path}"

  [[ -d "${source_path}" ]] || fail "diretório público obrigatório ausente: ${relative_path}"
  cp -a "${source_path}" "${DIST_DIR}/${relative_path}"
}

copy_optional_dir() {
  local relative_path="$1"
  local source_path="${ROOT_DIR}/${relative_path}"

  if [[ -d "${source_path}" ]]; then
    cp -a "${source_path}" "${DIST_DIR}/${relative_path}"
  fi
}

log "limpando saída anterior"
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

log "copiando arquivos públicos obrigatórios"
for file in \
  index.html \
  404.html \
  manifest.webmanifest \
  robots.txt \
  sitemap.xml
do
  copy_required_file "${file}"
done

copy_optional_file ".nojekyll"
copy_required_dir "assets"

log "copiando páginas públicas opcionais quando existirem"
for directory in solucoes validacao privacidade obrigado; do
  copy_optional_dir "${directory}"
done

log "verificando exclusão de memória técnica e arquivos sensíveis"
for forbidden_path in \
  docs \
  reports \
  .github \
  PROJECT_STATE.md \
  predixai_context.json \
  README.md \
  .git \
  .env \
  .env.local
do
  [[ ! -e "${DIST_DIR}/${forbidden_path}" ]] || fail "arquivo proibido presente em dist/: ${forbidden_path}"
done

sensitive_file="$({
  find "${DIST_DIR}" -type f \
    \( -name '.env*' \
    -o -name '*.pem' \
    -o -name '*.key' \
    -o -iname '*credential*' \
    -o -iname '*secret*' \
    -o -iname '*token*' \) \
    -print -quit
} || true)"

[[ -z "${sensitive_file}" ]] || fail "possível arquivo sensível encontrado: ${sensitive_file#${ROOT_DIR}/}"

[[ -f "${DIST_DIR}/index.html" ]] || fail "dist/index.html não foi criado"
[[ -d "${DIST_DIR}/assets" ]] || fail "dist/assets não foi criado"

file_count="$(find "${DIST_DIR}" -type f | wc -l | tr -d ' ')"
log "build concluído: ${file_count} arquivos públicos em dist/"
