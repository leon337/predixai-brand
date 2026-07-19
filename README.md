# PredixAI BR — PredixAI Workforce

Site oficial da PredixAI BR e núcleo comercial do **PredixAI Workforce**, produto carro-chefe em validação.

> A PredixAI BR cria departamentos inteligentes formados por agentes de IA, automações e sistemas integrados para executar processos empresariais com controle humano.

## Acesso

- Site principal: https://predixai-brand.vercel.app/
- Site secundário: https://leon337.github.io/predixai-brand/
- Repositório: https://github.com/leon337/predixai-brand

## Estado atual

```txt
PTP_PRINCIPAL=PTP-WEB.2
PRODUTO_CARRO_CHEFE=PredixAI Workforce
ESTAGIO=EM_VALIDACAO
PRIMARY_RUNTIME=Vercel
SECONDARY_STATIC_HOST=GitHub Pages
FORM_FRONTEND=Native PredixAI
FORM_API=Vercel Functions
FORM_DATABASE=Supabase Postgres
INFRASTRUCTURE_COST=0
```

## Arquitetura comercial

- **Workforce:** produto carro-chefe;
- **Atendimento:** primeiro departamento em validação;
- **Pet:** primeira vertical em validação;
- **Market:** vertical em pesquisa;
- **Sob medida:** OCR, visão computacional, integrações e apoio à decisão;
- **Laboratório:** conceitos sem disponibilidade comercial.

## Tecnologias

HTML5 semântico, CSS mobile-first, JavaScript sem frameworks, Vercel Functions, Supabase Postgres com RLS, SVG, SEO, JSON-LD e GitHub Actions.

## Validação local

```bash
chmod +x scripts/build_vercel_static.sh scripts/validate_workforce.sh
bash scripts/validate_workforce.sh
```

A Vercel e o GitHub Pages publicam apenas `dist/`, excluindo documentação, relatórios, código da API, migrações e arquivos de governança.

## Segurança

- nenhuma chave administrativa no frontend;
- variáveis Supabase obrigatórias na Vercel;
- validação server-side, origem controlada e timeout;
- honeypot e rate limit;
- leitura pública do banco bloqueada;
- CSP e headers de segurança;
- testes automatizados sem criação de lead real em produção.

## Licença

Todos os direitos reservados à PredixAI BR.
