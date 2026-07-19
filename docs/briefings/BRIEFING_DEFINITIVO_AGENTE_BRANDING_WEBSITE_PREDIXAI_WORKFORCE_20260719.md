# BRIEFING DEFINITIVO — Missão do Agente de Branding e Website

## Missão

Evoluir o site `predixai-brand` para apresentar **PredixAI Workforce** como produto carro-chefe da PredixAI BR, preservando a identidade visual, as rotas existentes, o formulário comercial, a arquitetura de publicação e a transparência sobre o estágio de cada solução.

## Contexto

A Home atual apresenta capacidades amplas de IA. A camada comercial possui:

- PredixAI Atendimento;
- PredixAI Pet;
- PredixAI Market.

Essas ofertas pertencem a categorias diferentes. O Workforce deve organizar o catálogo:

- Workforce = produto carro-chefe;
- Atendimento = departamento/módulo inicial;
- Pet = vertical;
- Market = pesquisa/vertical futura;
- OCR, visão, integrações e apoio à decisão = soluções sob medida.

## Posicionamento aprovado

**Mensagem central:**

> A PredixAI BR cria departamentos inteligentes formados por agentes de IA, automações e sistemas integrados para executar processos empresariais com controle humano.

**Evitar:**

- prometer substituição total de pessoas;
- afirmar produto pronto sem prova;
- prometer redução percentual de custo sem dados;
- sugerir autonomia irrestrita.

## Entregas obrigatórias

### 1. Home

Adicionar seção estática após o Hero:

**Eyebrow:** Produto carro-chefe  
**Título:** Um departamento inteiro de IA trabalhando com sua empresa.  
**Texto:** A PredixAI Workforce integra agentes especializados, automações e sistemas para organizar atendimento, vendas, administração, finanças, operações e gestão, mantendo supervisão humana nas decisões importantes.

CTAs:

- Conhecer o Workforce
- Validar uma solução

A seção deve existir no HTML, não ser criada apenas por JavaScript.

### 2. Página própria

Criar:

```txt
/solucoes/workforce/
```

Estrutura:

1. Hero;
2. problema;
3. proposta de valor;
4. como funciona;
5. departamentos;
6. canais e integrações;
7. supervisão humana;
8. segurança e governança;
9. exemplos por segmento;
10. implantação;
11. FAQ;
12. CTA para validação.

### 3. Departamentos

Apresentar inicialmente:

- Atendimento;
- Comercial;
- Administrativo;
- Financeiro;
- RH;
- Estoque;
- Logística;
- Documentação;
- Gestão;
- Integrações.

Cada card deve indicar:

- tarefas automatizadas;
- entradas;
- resultados;
- quando encaminha para pessoa;
- estágio: disponível, validação ou planejado.

### 4. Reclassificação das ofertas atuais

- Atendimento: primeiro módulo/departamento do Workforce;
- Pet: primeira vertical;
- Market: vertical em pesquisa;
- não excluir páginas atuais;
- preservar URLs e SEO existentes.

### 5. Navegação

Proposta:

- Workforce
- Soluções
- Segmentos
- Método
- Ecossistema
- Sobre
- Validar solução

Manter mobile-first e teclado.

### 6. Formulário

Adicionar:

- `workforce`;
- `sob_medida`;
- departamento prioritário;
- múltiplos processos;
- canais atuais;
- sistema atual;
- volume aproximado;
- necessidade de integração;
- resultado esperado;
- preferência por diagnóstico, demonstração, piloto ou proposta.

Atualizar de forma consistente:

- HTML;
- `form.js`;
- `api/leads.js`;
- Supabase/RPC;
- relatórios;
- política de privacidade.

### 7. SEO

Atualizar:

- title e description da Home;
- Open Graph;
- Twitter Cards;
- JSON-LD;
- dados estruturados do Workforce;
- sitemap;
- canonicals;
- social card.

### 8. Arquitetura

Não reconstruir o site.

Aplicar:

- conteúdo comercial crítico em HTML;
- separação de responsabilidades no JavaScript;
- componente/template para header/footer/páginas;
- design system atual preservado;
- nenhum framework novo sem justificativa.

### 9. Segurança e qualidade

- variáveis Supabase obrigatórias;
- timeout na chamada upstream;
- avaliar validação de Origin/Referer;
- documentar fingerprint na privacidade;
- adicionar CSP compatível;
- validar que nada sensível entra em `dist/`.

### 10. Testes

Obrigatórios:

- build limpo;
- links;
- sitemap;
- HTML;
- mobile;
- teclado;
- movimento reduzido;
- formulário por produto;
- API;
- erros;
- página Obrigado;
- 404;
- headers;
- Lighthouse/axe quando disponíveis;
- validação das rotas existentes.

## Arquivos prováveis

```txt
index.html
assets/css/styles.css
assets/css/commercial.css
assets/js/main.js
assets/js/form.js
solucoes/workforce/index.html
solucoes/atendimento/index.html
solucoes/pet/index.html
solucoes/market/index.html
validacao/index.html
privacidade/index.html
api/leads.js
supabase/*
sitemap.xml
robots.txt
manifest.webmanifest
vercel.json
scripts/build_vercel_static.sh
README.md
docs/*
reports/*
```

## Restrições

- não remover páginas atuais;
- não quebrar GitHub Pages secundário;
- não expor segredos;
- não declarar Workforce pronto;
- não fazer promessas de substituição integral;
- não trocar identidade visual;
- não criar imagem nova sem aprovação;
- usar a imagem conceitual fornecida apenas como referência ou seção explicativa, caso aprovada;
- não iniciar implementação sem apresentar plano, arquivos, riscos e validações.

## Resultado esperado

O visitante deve entender em poucos segundos:

1. o que a PredixAI vende;
2. que Workforce é o produto principal;
3. quais departamentos podem ser automatizados;
4. que há supervisão humana;
5. que as soluções podem ser adaptadas ao segmento;
6. como solicitar diagnóstico, demonstração ou piloto.

## Fluxo de execução solicitado ao agente

```txt
AUDITAR ESTADO REAL
→ APRESENTAR PLANO
→ AGUARDAR APROVAÇÃO
→ IMPLEMENTAR EM BRANCH
→ TESTAR
→ DOCUMENTAR
→ ABRIR PR
→ VALIDAR PREVIEW
→ MERGE
→ VALIDAR PRODUÇÃO
```
