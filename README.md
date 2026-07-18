# PredixAI BR — Site Institucional

Site oficial da PredixAI BR, empresa brasileira especializada em inteligência artificial, automação, agentes inteligentes, visão computacional e sistemas de apoio à decisão.

## Acesso

- Site planejado: https://leon337.github.io/predixai-brand/
- Repositório: https://github.com/leon337/predixai-brand

> A URL pública depende da ativação única de **Settings → Pages → Source → GitHub Actions** no repositório.

## Tecnologias

- HTML5 semântico
- CSS moderno e responsivo
- JavaScript progressivo sem frameworks
- SVG para identidade visual
- PWA Web Manifest
- SEO, Open Graph, Twitter Cards e JSON-LD
- GitHub Actions e GitHub Pages

## Experiência e interface

- Design futurista em tema escuro
- Identidade visual em ciano, azul e violeta
- Navegação mobile-first
- Animações leves com respeito a `prefers-reduced-motion`
- Acessibilidade por teclado, foco visível e link de salto
- Página 404 personalizada

## Estrutura

```text
.
├── .github/workflows/pages.yml
├── assets/
│   ├── css/styles.css
│   ├── img/
│   │   ├── favicon.svg
│   │   ├── logo.svg
│   │   └── social-card.svg
│   └── js/main.js
├── docs/history/ptp/
├── reports/
├── 404.html
├── index.html
├── manifest.webmanifest
├── PROJECT_STATE.md
├── predixai_context.json
├── robots.txt
└── sitemap.xml
```

## Desenvolvimento local

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`.

## Publicação

Alterações enviadas à branch `main` acionam `.github/workflows/pages.yml`. O workflow empacota o site e publica no GitHub Pages após a fonte **GitHub Actions** ser habilitada nas configurações do repositório.

## Estado

- Código: publicado no GitHub
- Interface: concluída
- Validação estrutural local: aprovada
- Hospedagem: aguardando ativação/validação do GitHub Pages

## Licença

Todos os direitos reservados à PredixAI BR.
