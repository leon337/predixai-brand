# PredixAI BR — Site Institucional e Catálogo Comercial

Site oficial da PredixAI BR, empresa brasileira especializada em inteligência artificial, automação, agentes inteligentes, visão computacional e sistemas de apoio à decisão.

## Acesso

- Site principal: https://predixai-brand.vercel.app/
- Site secundário: https://leon337.github.io/predixai-brand/
- Repositório: https://github.com/leon337/predixai-brand

## Estado atual

```txt
PTP_PRINCIPAL=PTP-WEB.1
ETAPA_ATUAL=PTP-WEB.1.6.2F1
PRIMARY_RUNTIME=Vercel
SECONDARY_STATIC_HOST=GitHub Pages
FORM_FRONTEND=Native PredixAI
FORM_API=Vercel Functions
FORM_DATABASE=Supabase Postgres
REAL_LEAD_COLLECTION=BLOCKED_UNTIL_SECURITY_VALIDATION
```

## Tecnologias

- HTML5 semântico
- CSS moderno e responsivo
- JavaScript progressivo sem frameworks
- SVG para identidade visual
- PWA Web Manifest
- SEO, Open Graph, Twitter Cards e JSON-LD
- GitHub Actions e GitHub Pages
- Vercel para runtime, deploys e futuras funções de API
- Supabase planejado para banco de dados e Row Level Security

## Experiência e interface

- design futurista em tema escuro;
- identidade visual em ciano, azul e violeta;
- navegação mobile-first;
- animações leves com respeito a `prefers-reduced-motion`;
- acessibilidade por teclado, foco visível e link de salto;
- página 404 personalizada;
- coleta mínima de dados como requisito do formulário comercial.

## Publicação

A Vercel está conectada à branch `main`. O build executa:

```bash
bash scripts/build_vercel_static.sh
```

Somente o diretório `dist/` é publicado. Arquivos de governança, relatórios, contexto e possíveis credenciais são excluídos do deployment.

O GitHub Pages permanece como hospedagem estática secundária.

## Desenvolvimento local

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`.

## Próxima etapa

Construir a fundação do formulário comercial nativo com validação no servidor, Supabase, política de privacidade, consentimento explícito e proteção antispam.

## Licença

Todos os direitos reservados à PredixAI BR.
