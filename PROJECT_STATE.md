# PROJECT STATE — PredixAI BR Site

Data: 2026-07-19

```txt
PTP_PRINCIPAL=PTP-WEB.1
NOME_CURTO=site_institucional_catalogo_comercial
REPOSITORY=leon337/predixai-brand
BRANCH=main
STATUS=FORM_NATIVE_IMPLEMENTED_PREVIEW_PENDING
PRIMARY_SITE=https://predixai-brand.vercel.app/
SECONDARY_SITE=https://leon337.github.io/predixai-brand/
VERCEL_TEAM=PREDIX AI BR
VERCEL_PROJECT=predixai-brand
VERCEL_PROJECT_ID=prj_pBk9kj1FRPluMRHPyeblhwAhqN7G
VERCEL_DEPLOYMENT_STATE=READY
SUPABASE_PROJECT=predixai-brand-site
SUPABASE_PROJECT_ID=vcmvdmxmkmekcurcfdze
SUPABASE_REGION=sa-east-1
INFRASTRUCTURE_COST=0
REAL_LEAD_COLLECTION=BLOCKED_UNTIL_END_TO_END_PASS
```

## Roadmap

```txt
✅ PTP-WEB.1.1 — Arquitetura e conteúdo institucional
✅ PTP-WEB.1.2 — UI/UX futurista e identidade visual
✅ PTP-WEB.1.3 — Responsividade, acessibilidade, SEO e PWA
✅🚀 PTP-WEB.1.4 — Código publicado no GitHub
✅🚀 PTP-WEB.1.5 — GitHub Pages publicado e validado
✅ PTP-WEB.1.6.1 — Pesquisa e decisão estratégica do catálogo
✅ PTP-WEB.1.6.2 — Plano de validação comercial aprovado
✅🚀 PTP-WEB.1.6.2V1 — Build estático isolado para Vercel
✅🚀 PTP-WEB.1.6.2V2 — Deploy Vercel validado
✅🚀 PTP-WEB.1.6.2V3 — Hardening pós-deploy e domínio principal
🟨 PTP-WEB.1.6.2F1 — Fundação do formulário comercial nativo
✅ PTP-WEB.1.6.2F1.1 — Projeto Supabase gratuito
✅ PTP-WEB.1.6.2F1.2 — Tabela, RLS e RPC limitada
🟧 PTP-WEB.1.6.2F1.3 — API e interface nativas
🟨 PTP-WEB.1.6.2A — Landing PredixAI Atendimento
🟨 PTP-WEB.1.6.2B — Landing PredixAI Pet
🟨 PTP-WEB.1.6.2C — Landing PredixAI Market
🟨 PTP-WEB.1.6.2F2 — Política de privacidade e confirmação
⬜ PTP-WEB.1.6.2F3 — Teste ponta a ponta, mobile e produção
```

## Arquitetura

```txt
PRIMARY_RUNTIME=Vercel
FORM_FRONTEND=Native PredixAI
FORM_API=Vercel Function /api/leads
FORM_DATABASE=Supabase Postgres
FORM_DATABASE_SECURITY=Forced RLS + SECURITY DEFINER RPC
FORM_RATE_LIMIT=5 submissions/hour/fingerprint
FORM_ANTISPAM=Honeypot + unknown-field rejection
GOOGLE_SHEETS=Optional reporting only
EXTERNAL_FORM_BUILDERS=Discarded
```

## Implementado nesta etapa

- projeto Supabase dedicado e gratuito;
- tabela `commercial_leads`;
- RLS forçada, sem leitura pública;
- função RPC de inserção validada e limitada;
- API Vercel `/api/leads`;
- formulário nativo de quatro etapas;
- páginas Atendimento, Pet e Market;
- política de privacidade;
- página de confirmação;
- sitemap atualizado;
- build isolado exigindo todas as páginas públicas.

## Regra de avanço

A coleta real permanece bloqueada até:

```txt
STATIC_BUILD=PASS
API_PREVIEW_DEPLOY=PASS
INVALID_PAYLOAD_TEST=PASS
CONSENT_REQUIRED_TEST=PASS
HONEYPOT_TEST=PASS
RATE_LIMIT_TEST=PASS
VALID_LEAD_INSERT_TEST=PASS
RLS_PUBLIC_READ_BLOCKED=PASS
PRIVACY_PAGE_HTTP=PASS
FORM_MOBILE_VISUAL=PASS
FORM_DESKTOP_VISUAL=PASS
VERCEL_PRODUCTION_DEPLOY=PASS
```
