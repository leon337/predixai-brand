# PTP-WEB.AUD-001 — Auditoria Integral do predixai-brand

**Data:** 2026-07-19  
**Repositório:** `leon337/predixai-brand`  
**Site principal:** `https://predixai-brand.vercel.app/`  
**Modo:** `AUDIT_ONLY`  
**Objetivo:** auditar o núcleo publicável, comercial, visual, formulário, API, build, deploy, SEO, acessibilidade, performance estática e posicionamento antes do briefing ao agente desenvolvedor.

## 1. Resultado executivo

```txt
PTP-WEB.AUD-001=PASS_WITH_REQUIRED_REMEDIATIONS
REPOSITORY_RUNTIME_SCOPE_AUDITED=PASS
PUBLIC_PAGES_AUDITED=PASS
FRONTEND_AUDITED=PASS
FORM_FLOW_AUDITED=PASS
API_AUDITED=PASS
BUILD_AUDITED=PASS
DEPLOY_CONFIG_AUDITED=PASS
SEO_AUDITED=PASS_WITH_GAPS
ACCESSIBILITY_AUDITED=PASS_WITH_RUNTIME_TEST_GAPS
PERFORMANCE_AUDITED=PASS_STATIC_WITH_RUNTIME_MEASUREMENT_GAP
PRODUCT_ARCHITECTURE=AUDITED
COMMERCIAL_POSITIONING=AUDITED
FLAGSHIP_PRODUCT=ABSENT
WORKFORCE_INSERTION=APPROVED_WITH_PREREQUISITES
```

A base atual é tecnicamente consistente e não deve ser reconstruída. O principal problema é a arquitetura comercial: capacidades, produtos, verticais e pesquisas aparecem no mesmo nível. O PredixAI Workforce deve entrar como produto carro-chefe e organizar as demais soluções abaixo dele.

## 2. Escopo auditado

### Núcleo institucional e comercial

- `README.md`
- `index.html`
- `404.html`
- `robots.txt`
- `sitemap.xml`
- `manifest.webmanifest`

### Frontend

- `assets/css/styles.css`
- `assets/css/commercial.css`
- `assets/js/main.js`
- `assets/js/form.js`

### Páginas

- `validacao/index.html`
- `solucoes/atendimento/index.html`
- `solucoes/pet/index.html`
- `solucoes/market/index.html`
- `privacidade/index.html`
- `obrigado/index.html`

### Backend e publicação

- `api/leads.js`
- `scripts/build_vercel_static.sh`
- `vercel.json`

## 3. Arquitetura atual

```txt
HOME ESTÁTICA
  ├── HTML institucional
  ├── CSS principal
  ├── JavaScript de navegação/animação
  └── camada comercial injetada em runtime

PÁGINAS COMERCIAIS
  ├── Atendimento
  ├── Pet
  ├── Market
  ├── Validação
  ├── Privacidade
  └── Obrigado

API
  └── /api/leads
       └── Supabase RPC

BUILD
  └── scripts/build_vercel_static.sh
       └── dist/

DEPLOY
  └── Vercel
```

### Pontos fortes

- arquitetura simples e barata;
- baixo acoplamento com frameworks;
- deploy previsível;
- páginas independentes;
- API separada do conteúdo estático;
- exclusão explícita de arquivos técnicos e sensíveis do `dist/`.

### Problemas

- camada comercial principal injetada por JavaScript;
- repetição de header/footer;
- ausência de templates;
- `main.js` concentra responsabilidades demais;
- caminhos e origem principal codificados;
- catálogo sem modelo de dados;
- crescimento tende a multiplicar duplicações.

## 4. Inventário lógico do produto

### Capacidades institucionais

- agentes inteligentes;
- automação;
- visão computacional e OCR;
- apoio à decisão;
- produtos sob medida;
- educação.

### Produtos e conceitos atuais

- **PredixAI Atendimento:** produto-base/MVP em validação;
- **PredixAI Pet:** vertical baseada no Atendimento;
- **PredixAI Market:** conceito em pesquisa;
- **PredixAI Workforce:** ainda ausente.

### Problema de taxonomia

Atendimento, Pet e Market não são entidades equivalentes:

- Atendimento é núcleo funcional;
- Pet é vertical;
- Market é pesquisa.

Essa mistura impede uma hierarquia comercial clara.

## 5. Frontend

### HTML

O HTML usa semântica adequada, idioma correto, headings, navegação, CTAs, links de salto e páginas específicas.

### CSS

Há design system implícito com cores, superfícies, tipografia, espaçamentos, sombras, raios, botões, cards, grids, estados de formulário e breakpoints.

### JavaScript

`main.js` reúne cabeçalho, menu, CTAs, injeção da camada comercial, carregamento dinâmico de CSS, animações e canvas.

`form.js` reúne etapas, validação, campos condicionais, payload, envio, erros e redirecionamento.

```txt
HTML_STRUCTURE=PASS
CSS_FOUNDATION=PASS
JS_RESPONSIBILITY_SEPARATION=WARN
TEMPLATE_SYSTEM=ABSENT
COMMERCIAL_CONTENT_STATIC_RENDERING=FAIL
```

## 6. Componentização

Existe reutilização por classes CSS, mas não por templates ou componentes de marcação. Cabeçalho, rodapé, navegação, Hero, painel de status e CTAs são repetidos.

### Impacto

Adicionar novas soluções aumenta o risco de inconsistência, links divergentes, versões diferentes do menu, retrabalho e erros de SEO.

### Recomendação

Adotar gerador estático ou templates leves, sem exigir framework pesado.

## 7. Design System

### Aprovado

- identidade consistente;
- visual premium;
- paleta coerente;
- estados de foco;
- componentes comerciais compatíveis com a Home;
- experiência mobile-first prevista em CSS.

### Pendente

- documentação dos tokens;
- catálogo de componentes;
- regras de variantes;
- teste visual automatizado;
- critérios para novos produtos.

```txt
DESIGN_SYSTEM_IMPLICIT=PASS
DESIGN_SYSTEM_DOCUMENTED=NO
VISUAL_CONSISTENCY=PASS
```

## 8. Navegação

A navegação é simples, responsiva e possui CTA evidente. Entretanto, o link “Produtos” e os cards comerciais são criados por JavaScript. Sem JavaScript, a Home perde parte do catálogo e da hierarquia comercial.

### Recomendação

Renderizar conteúdo comercial essencial diretamente no HTML.

## 9. SEO

### Aprovado

- `lang=pt-BR`;
- titles;
- descriptions;
- canonical;
- robots;
- sitemap;
- Open Graph na Home;
- Twitter Cards na Home;
- JSON-LD da organização;
- página Obrigado com `noindex`.

### Lacunas

- páginas internas sem Open Graph completo;
- ausência de JSON-LD de produto/serviço;
- conteúdo dos produtos na Home depende de JavaScript;
- páginas de solução possuem conteúdo curto;
- 404 não compartilha o mesmo sistema visual e metadados completos.

```txt
SEO_HOME=PASS
SEO_INTERNAL_PAGES=WARN
SITEMAP=PASS_CURRENT_SCOPE
ROBOTS=PASS
STRUCTURED_DATA_PRODUCTS=ABSENT
```

## 10. Performance

### Pontos fortes

- sem framework pesado;
- scripts deferidos;
- SVG;
- poucas camadas;
- animação compatível com preferência de movimento;
- canvas pausado quando a aba fica oculta.

### Riscos

- canvas em tela inteira com comparação entre pares de nós;
- possível consumo de CPU e bateria em aparelhos modestos;
- CSS comercial carregado depois do HTML;
- injeção de cards com risco de mudança de layout;
- ausência de orçamento Lighthouse e medição automatizada.

```txt
STATIC_PERFORMANCE_FOUNDATION=PASS
LOW_END_DEVICE_RUNTIME=NOT_MEASURED
CORE_WEB_VITALS=NOT_MEASURED
LAYOUT_SHIFT_RISK=WARN
```

## 11. Responsividade

Os breakpoints convertem grids para uma coluna. Permanecem pendentes testes com teclado virtual, orientação horizontal, zoom de 200%, textos grandes, largura de 320 px, canvas em hardware fraco e menu com catálogo crescente.

```txt
RESPONSIVE_CODE=PASS
RESPONSIVE_RUNTIME_MATRIX=PENDING
```

## 12. Acessibilidade

### Aprovado

- skip link;
- foco visível;
- labels;
- `aria-live`;
- teclado;
- Escape;
- `hidden`;
- mensagens de erro;
- `prefers-reduced-motion`;
- foco no campo inválido.

### Ajustes

- `scrollTo(... smooth)` deve respeitar movimento reduzido;
- revisar contraste dos textos secundários;
- testar leitor de tela e zoom;
- automatizar axe/Lighthouse.

```txt
ACCESSIBILITY_STATIC=PASS
WCAG_RUNTIME_VALIDATION=PENDING
```

## 13. Formulário

### Pontos fortes

- quatro etapas;
- perguntas condicionais;
- validação progressiva;
- captura de segmento, dor e resultado desejado;
- UTM;
- consentimento;
- faixa de preço;
- honeypot;
- tratamento de erro.

### Problemas

- trocar WhatsApp/e-mail apaga o valor digitado;
- contrato limitado a Atendimento/Pet/Market;
- ausência de Workforce e solução sob medida;
- ausência de classificação por departamento;
- ausência de seleção de múltiplas necessidades.

### Recomendação

Adicionar `workforce`, `sob_medida`, departamento prioritário, quantidade de processos, canais, integrações atuais, necessidade de atendimento humano e interesse em diagnóstico.

## 14. API

### Aprovado

- allowlist;
- limite de payload;
- validação de JSON;
- rejeição de campos desconhecidos;
- honeypot;
- consentimento obrigatório;
- normalização;
- validação server-side;
- `no-store`;
- métodos controlados;
- fingerprint para rate limit;
- integração via RPC.

### Hardening necessário

- retirar fallback de URL/chave do código;
- exigir variáveis de ambiente;
- adicionar timeout ao Supabase;
- validar `Origin`/`Referer`;
- documentar fingerprint na privacidade;
- ampliar enums para Workforce;
- validar contrato API/RPC;
- incluir testes automatizados.

```txt
API_INPUT_VALIDATION=PASS
API_SECURITY_BASE=PASS
ENV_CONFIGURATION=WARN
UPSTREAM_TIMEOUT=ABSENT
ORIGIN_CONTROL=ABSENT
```

## 15. Build

O script limpa `dist`, copia somente arquivos públicos, exige páginas obrigatórias, exclui docs/reports/API/Supabase e procura arquivos sensíveis.

```txt
BUILD_FAIL_FAST=PASS
PUBLIC_SCOPE_ALLOWLIST=PASS
SENSITIVE_FILE_CHECK=PASS
DIST_VALIDATION=PASS
```

### Melhorias

- gerar manifesto de build;
- validar links, HTML e sitemap;
- validar title/canonical;
- detectar referências quebradas;
- testar ausência de JS/CSS obrigatórios.

## 16. Deploy e headers

A Vercel usa build próprio, publica `dist`, configura `/api/leads` e aplica headers de segurança.

### Aprovado

- `nosniff`;
- bloqueio de frames;
- Referrer Policy;
- Permissions Policy;
- COOP;
- DNS prefetch desativado.

### Lacunas

- CSP ausente;
- HSTS não confirmado;
- cache-control estático não explícito;
- logs, rollback e observabilidade não comprovados pelo código.

```txt
DEPLOY_CONFIG=PASS
SECURITY_HEADERS=PASS_WITH_GAPS
CSP=ABSENT
HSTS=NOT_CONFIRMED
```

## 17. Privacidade

### Aprovado

- coleta mínima;
- finalidade descrita;
- consentimento;
- retenção inicial;
- direitos;
- ausência de rastreamento publicitário;
- Supabase mencionado;
- dados sensíveis evitados.

### Ajustes

- informar tratamento de hash de IP/user-agent;
- definir canal formal de privacidade além do GitHub;
- informar controlador e contato com maior precisão;
- versionar política;
- revisar bases legais antes de escala comercial.

## 18. UX/UI

### Pontos fortes

- aparência profissional;
- linguagem visual coerente;
- CTAs evidentes;
- páginas curtas;
- transparência sobre estágio;
- formulários compreensíveis.

### Fraquezas

- páginas de produto superficiais;
- excesso de mensagem “em validação”;
- pouca prova de capacidade;
- ausência de demonstração, FAQ, processo de implantação e fluxos;
- ausência de diferenciação entre produto, vertical e pesquisa.

## 19. Posicionamento comercial

### Estado atual

O site comunica que a PredixAI desenvolve IA, automação, OCR, agentes e sistemas.

### Problema

Isso demonstra competência técnica, mas não uma oferta central.

### Posicionamento recomendado

> A PredixAI BR cria departamentos inteligentes formados por agentes de IA, automações e sistemas integrados para executar processos empresariais com controle humano.

### Regra de linguagem

Não usar “substitui todos os profissionais”. Preferir:

- automatiza tarefas;
- reduz trabalho repetitivo;
- amplia capacidade;
- mantém supervisão humana;
- encaminha exceções;
- registra evidências.

## 20. Arquitetura comercial aprovada

```txt
PREDIXAI BR
│
├── PREDIXAI WORKFORCE
│   └── produto carro-chefe
│
├── DEPARTAMENTOS INTELIGENTES
│   ├── Atendimento
│   ├── Comercial
│   ├── Administrativo
│   ├── Financeiro
│   ├── RH
│   ├── Estoque
│   ├── Logística
│   ├── Documentação
│   └── Gestão
│
├── VERTICAIS
│   ├── Pet
│   ├── Market
│   ├── Clínica
│   └── outras
│
├── SOLUÇÕES SOB MEDIDA
│   ├── OCR
│   ├── visão computacional
│   ├── integrações
│   └── apoio à decisão
│
└── LABORATÓRIO
    └── conceitos e pesquisas
```

## 21. Integração do Workforce

### Deve ser

- produto carro-chefe;
- seção destacada após o Hero;
- item principal da navegação;
- página própria;
- origem de departamentos e verticais;
- CTA conectado ao formulário;
- base da narrativa comercial.

### Não deve ser

- apenas outro card;
- promessa de substituição integral de pessoas;
- produto descrito como pronto sem evidência;
- mistura com Market em pesquisa;
- imagem decorativa sem explicação.

## 22. Prioridades

### P0

1. Definir nomenclatura final do Workforce.
2. Criar `/solucoes/workforce/`.
3. Inserir seção estática na Home.
4. Reorganizar taxonomia.
5. Atualizar formulário/API/RPC.
6. Atualizar SEO.
7. Preservar rotas atuais.
8. Validar build e deploy.

### P1

1. Templates.
2. JavaScript modular.
3. Design system documentado.
4. Testes de links/HTML/API.
5. Lighthouse/axe.
6. CSP e timeout.
7. Contato formal de privacidade.

### P2

1. Casos de uso.
2. FAQ.
3. Demonstrações.
4. Processo de implantação.
5. Prova social.
6. Calculadora de ROI após validação.
7. Catálogo de módulos.

## 23. Condições de aceite para o agente desenvolvedor

```txt
HOME_CURRENT_IDENTITY_PRESERVED=PASS
WORKFORCE_HIERARCHY=PASS
STATIC_CONTENT_WITHOUT_JS=PASS
CURRENT_ROUTES_PRESERVED=PASS
FORM_CONTRACT_UPDATED=PASS
API_CONTRACT_UPDATED=PASS
SUPABASE_CONTRACT_UPDATED=PASS
SEO_UPDATED=PASS
SITEMAP_UPDATED=PASS
MOBILE_VALIDATED=PASS
KEYBOARD_VALIDATED=PASS
BUILD_VALIDATED=PASS
DEPLOY_VALIDATED=PASS
NO_SECRET_EXPOSURE=PASS
REPORT_AND_DOCUMENTATION=PASS
```

## 24. Decisão final

```txt
AUDIT_APPROVAL=APPROVED
SITE_REBUILD_REQUIRED=NO
WORKFORCE_IMPLEMENTATION_ALLOWED=YES_AFTER_BRIEFING_APPROVAL
CURRENT_FOUNDATION=PRESERVE
MAIN_CHANGE=COMMERCIAL_HIERARCHY_AND_PRODUCT_ARCHITECTURE
```
