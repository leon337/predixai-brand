# CHECKPOINT HISTÓRICO — PTP-WEB.2.8.3K / K.7.8.2A.14.1

## 1. Identificação

```txt
DATA_LOCAL=2026-07-23
PROJETO=PredixAI Brand — Workforce K6 Journey
PTP_PRINCIPAL=PTP-WEB.2.8.3K
ETAPA_PAI=K.7.8.2A.14
ETAPA_ATUAL=K.7.8.2A.14.1
NOME_CURTO=Configuração Efetiva Derivada
LINEAR_ISSUE_PAI=LEA-116
GITHUB_REPOSITORY=leon337/predixai-brand
GITHUB_PR=9
BRANCH_ATUAL=ptp-web-2-workforce-k6-questionnaire-r2
HEAD_ANTES_DO_CHECKPOINT=c89907e4f8c176db18aee7d90d18c743a89b0bd4
STATUS_DO_CHAT=FECHADO_POR_CONTEXTO_ALTO
```

## 2. Estado executivo

```txt
K.7.8.2A.1_A_13=PASS_APPROVED
K.7.8.2A.14=🟨 EM_REMEDIAÇÃO
K.7.8.2A.14.1=🟧 ETAPA_ATUAL
DECISÃO_ARQUITETURAL=✅ APROVADA_CONCEITUALMENTE
DOCUMENTAÇÃO_DE_PLANEJAMENTO=🚀 PUBLICADA_E_REVISADA
OITO_ACHADOS_DOCUMENTAIS=✅ INCORPORADOS
REVISÃO_FINAL_PÓS_CORREÇÃO=⏳ PENDENTE
LEA-166=⬜ TODO
IMPLEMENTAÇÃO_FUNCIONAL=⛔ NÃO_AUTORIZADA
ESTRATÉGIA_EXECUTÁVEL=⛔ NÃO_AUTORIZADA
SCRIPT_ALL_IN_ONE=⛔ NÃO_GERADO
BRANCH_FILHA=⛔ NÃO_CRIADA
PR_FILHO=⛔ NÃO_CRIADO
MERGE=⛔ BLOQUEADO
PRODUÇÃO=INALTERADA
```

## 3. Origem da remediação

A etapa K.7.8.2A.14 integrou o pacote fictício Saúde → Clínica de Exames ao criador de Funcionários de IA. O pacote foi carregado corretamente do Supabase por meio da API Vercel, validado por pacote, versão, origem, checksum e componentes obrigatórios.

Durante a validação humana, Leo personalizou intencionalmente:

```txt
EMPLOYEE_NAME=Sophia
COMPANY_NAME=Clinica Ciame
PRESENTATION=Assistente administrativo virtual
TONE=Formal e detalhado
RESPONSE_LENGTH=Detalhada e explicativa
```

A referência à Clínica Ciame não foi contaminação externa. O arquivo de prompt gerado confirmou que as personalizações foram inseridas na seção final do documento.

O defeito real identificado foi:

```txt
QUESTIONÁRIO=Sophia / Clínica Ciame
TELAS=Clara / Clínica Aurora
PROMPT=prompt canônico original + seção 14 de personalizações
```

Isso cria identidades e instruções contraditórias no mesmo fluxo.

## 4. Correção da avaliação conversacional

A classificação anterior `FAIL_IDENTITY_MISMATCH` foi considerada inválida porque Leo havia alterado deliberadamente a clínica e a assistente.

Resultado corrigido do teste conversacional:

```txt
CENÁRIOS_PASS=7
CENÁRIOS_PASS_WITH_MINOR_OMISSION=1
BLOQUEIO_DE_IDENTIDADE=NO
IDENTITY_CONTAMINATION=DESCARTADA
CUSTOMIZATION_APPLIED=YES
RESULTADO_GERAL=PASS_WITH_ONE_MINOR_OMISSION
```

O único ponto menor foi a resposta sobre acesso a resultado não declarar expressamente que não faria interpretação, embora tenha informado ausência de acesso real e uso de canais oficiais.

Registros antigos ainda pendentes de correção auditável:

```txt
GITHUB_PR_9_COMMENT_INCORRETO=5053209551
LINEAR_LEA_116_COMMENT_INCORRETO=1a1ba6fe-e115-43f1-a209-7ee9cc74d921
AÇÃO_FUTURA=PUBLICAR_COMENTÁRIO_CORRETIVO_SEM_APAGAR_HISTÓRICO
```

## 5. Decisão arquitetural aprovada

Foi rejeitado criar um `AgentDraft` persistido e editável, pois ele se tornaria uma terceira fonte capaz de divergir da personalização.

Modelo aprovado:

```txt
PackageDocument
+
PackageCustomization
↓
buildEffectiveAgentConfig()
↓
EffectiveAgentConfig derivada, determinística e imutável
├── projeção visual
├── resumo
├── prompt materializado
├── testes
└── hashes de rastreabilidade
```

Regras centrais:

```txt
FONTES_PERSISTIDAS=PackageDocument + PackageCustomization
PERSISTIR_EFFECTIVE_CONFIG=NO
EDITAR_EFFECTIVE_CONFIG=NO
CRIADOR_GENÉRICO_PRESERVADO=YES
COMPILADOR_UNIVERSAL_AGORA=NO
MATERIALIZADOR_ESPECÍFICO_DA_CLÍNICA=YES
```

## 6. Decisões técnicas consolidadas

### 6.1 Bindings

O campo `includeInPromptAs` será usado como binding real.

Cada valor deverá distinguir:

```txt
rawValue
displayValue
promptInstruction
source=suggested|user_edited|generated
```

Contrato obrigatório:

```txt
BINDING_COVERAGE=100%
UNBOUND_REQUIRED=0
UNKNOWN_BINDINGS=0
DUPLICATE_BINDINGS=0
EXACT_ALLOWLIST_ONLY=YES
OWN_PROPERTIES_ONLY=YES
MAX_PATH_DEPTH=4
PROTOTYPE_POLLUTION=BLOCK
FORBIDDEN_SEGMENTS=__proto__|prototype|constructor
```

### 6.2 Instruções de prompt

```txt
PROMPT_INSTRUCTION_SOURCE=VERSIONED_CLINIC_MATERIALIZER_MAP
PROMPT_INSTRUCTION_MAP_VERSION=1
MISSING_PROMPT_INSTRUCTION=BLOCK
PROMPT_INSTRUCTION_COVERAGE=100%
```

O schema universal será discutido apenas após validar pacotes de outros profissionais ou nichos.

### 6.3 Hashes

```txt
HASH_ALGORITHM=SHA-256
SERIALIZATION=STABLE_JSON_SORTED_KEYS
ARRAY_ORDER=PRESERVED
UNICODE_NORMALIZATION=NFC
CANONICALIZATION_VERSION=1
TEMPORAL_FIELDS_EXCLUDED=YES
```

Campos temporais e identificadores de sessão não participam dos hashes.

### 6.4 Materialização por seções

Foi rejeitada a reescrita manual integral do prompt.

Contrato aprovado:

```txt
EXPECTED_SECTION_COUNT=13
MISSING_SECTION=BLOCK
DUPLICATE_SECTION=BLOCK
UNEXPECTED_TOP_LEVEL_SECTION=BLOCK
SECTION_ORDER_CHANGED=BLOCK
EMPTY_SECTION=BLOCK
CANONICAL_SOURCE_HASH_MISMATCH=BLOCK
```

O parser deverá preservar listas, blocos de código, linhas em branco, títulos internos e Unicode. Somente os títulos principais previstos delimitam as treze seções.

### 6.5 Paridade objetiva

```txt
ALL_13_SECTIONS_PRESENT=PASS
DEFAULT_IDENTITY_PRESENT=PASS
SERVICES_FACTS_PRESERVED=PASS
HOURS_AND_CHANNELS_PRESERVED=PASS
SCHEDULING_RULES_PRESERVED=PASS
PAYMENT_RULES_PRESERVED=PASS
HANDOFF_RULES_PRESERVED=PASS
ALL_8_SAFETY_INVARIANTS_PRESENT=PASS
SECTION_14_PRESENT=NO
```

### 6.6 Segurança imutável

```txt
administrativeOnly=true
realCustomerDataAllowed=false
realPatientDataAllowed=false
realRecordAccessAllowed=false
realBookingAllowed=false
realPaymentAllowed=false
clinicalAdviceAllowed=false
resultInterpretationAllowed=false
```

Nenhuma personalização poderá reduzir essas proteções.

## 7. Roadmap Linear formalizado

Subtarefas filhas da LEA-116:

```txt
LEA-166=K.7.8.2A.14.1A — Contrato da Configuração Efetiva — Todo
LEA-167=K.7.8.2A.14.1B — Projeção Visual do Pacote — Todo
LEA-168=K.7.8.2A.14.1C — Materialização do Prompt — Todo
LEA-169=K.7.8.2A.14.1D — Conflitos e Persistência — Todo
LEA-170=K.7.8.2A.14.1E — Validação Independente — Todo
LEA-171=K.7.8.2A.14.1F — Preview e Fechamento — Todo
```

Dependência formal:

```txt
LEA-166
↓
LEA-167
↓
LEA-168
↓
LEA-169
↓
LEA-170
↓
LEA-171
```

Não avançar sem evidência de conclusão da etapa anterior.

## 8. Documentação publicada

```txt
ADR=docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_ADR_CONFIGURACAO_EFETIVA_DERIVADA.md
PLANO_TECNICO=docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_PLANO_TECNICO.md
ROADMAP=docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_ROADMAP_IMPLEMENTACAO.md
TRACKER=docs/history/ptp/PTP-WEB/PTP-WEB.2/20260722_PTP-WEB.2.8.3K_K7.8.2A_CLINICA_EXAMES_TRACKER.md
```

Commits documentais anteriores:

```txt
acf734a80928162ea83c81e21ce37fbb4bf5853b=ADR inicial
02215b6a579f77fcc94a405fae3e023dde9a05e4=plano inicial
a5c928bc0ce523d32ad9179de8be29c5621fba2f=roadmap inicial
13d0b3aee920f2af4de57c3512213208f7bf7df8=ADR corrigido
46c6fb3216456a860d9389fddaaf2d1e808ab40c=plano corrigido
c89907e4f8c176db18aee7d90d18c743a89b0bd4=roadmap corrigido
```

## 9. Estado do GitHub

```txt
PR=9
PR_STATE=OPEN
PR_DRAFT=YES
PR_MERGED=NO
BRANCH=ptp-web-2-workforce-k6-questionnaire-r2
IMPLEMENTATION_HEAD_AUDITED=d1b7d7190921373a29117226edb25284abcf6ce2
DOCUMENTATION_HEAD_BEFORE_CHECKPOINT=c89907e4f8c176db18aee7d90d18c743a89b0bd4
EXECUTION_BASE_HEAD=RESOLVER_NA_AUDITORIA_DA_LEA-166
```

Após `d1b7d719`, não houve alteração funcional. Os commits seguintes foram exclusivamente documentais.

A estratégia aprovada para implementação futura é um PR filho empilhado:

```txt
BASE_BRANCH=ptp-web-2-workforce-k6-questionnaire-r2
HEAD_BRANCH_PROPOSTA=ptp-web-2-workforce-effective-config-r1
PR_FILHO=STACKED_DRAFT
```

A branch e o PR filho ainda não foram autorizados nem criados.

## 10. Vercel

```txt
VERCEL_PROJECT=predixai-brand
VERCEL_PROJECT_ID=prj_pBk9kj1FRPluMRHPyeblhwAhqN7G
VERCEL_TEAM=predix-ai-br
MANUAL_DEPLOY=NO
PRODUCTION_DEPLOY=NO
PRODUCTION_CHANGED=NO
AUTOMATIC_GIT_PREVIEW=ENABLED_AND_OBSERVED
```

Commits documentais acionam Preview automaticamente pela integração GitHub → Vercel. Isso não equivale a deploy manual nem a promoção para produção.

Política ainda pendente para commits somente documentais:

```txt
A=aceitar Preview automático
B=configurar Ignore Build Step para docs/** e reports/**
C=usar branch documental não monitorada
```

Nenhuma opção foi autorizada.

## 11. Scripts, relatórios e publicações

```txt
NOVO_SCRIPT_ALL_IN_ONE_NESTE_CHAT=NO
IMPLEMENTAÇÃO_FUNCIONAL_NESTE_CHAT=NO
NOVO_RELATÓRIO_TXT_DE_EXECUÇÃO=NO
NOVO_MARKDOWN_DE_RESULTADO_FUNCIONAL=NO
COMMITS_FUNCIONAIS_NESTE_CHAT=NO
DEPLOY_MANUAL_NESTE_CHAT=NO
```

Relatório anterior válido da etapa 14:

```txt
reports/20260722_PTP-WEB.2.8.3K_K7.8.2A.14_PROMPT_BUILDER_INTEGRATION.txt
```

A ausência de novo relatório TXT é esperada, pois o trabalho deste chat foi debate, revisão crítica, governança e documentação, sem execução funcional.

## 12. Arquivos previstos para a implementação futura

Novos arquivos propostos:

```txt
assets/js/workforce-package-effective-config.js
assets/js/workforce-package-projection.js
assets/js/workforce-package-clinic-materializer.js
scripts/validate_workforce_effective_config.js
```

Arquivos possivelmente modificados:

```txt
funcionario-ia-gratis/index.html
assets/js/workforce-package-prompt.js
assets/js/workforce-package-ui.js
assets/js/employee-builder.js
assets/js/workforce-package-bootstrap.js
assets/js/workforce-package-state.js
scripts/validate_workforce_package_builder.js
.github/workflows/workforce-package-builder-quality.yml
assets/css/workforce-package.css  # somente se necessário
```

Fora de escopo:

```txt
api/**
supabase/**
master-package.json
operational-prompt.md
checksum publicado
contentVersion
vercel.json
produção
merge
```

Os arquivos reais deverão ser auditados novamente antes de qualquer estratégia executável.

## 13. Pendências e bloqueios

```txt
P1=realizar revisão final dos três documentos após as oito correções
P2=confirmar se todos os oito achados foram incorporados sem novas contradições
P3=resolver HEAD real para a futura base de execução
P4=decidir se a política de Preview automático documental será tratada agora ou separadamente
P5=publicar correção auditável dos comentários antigos de identidade
P6=solicitar autorização de Leo para preparar a estratégia executável da LEA-166
P7=somente depois discutir branch filha, PR filho e script all-in-one
```

## 14. Próxima ação obrigatória

No próximo chat:

```txt
1. Ler este checkpoint.
2. Ler o prompt de continuidade associado.
3. Consultar GitHub e Linear para resolver o estado real.
4. Revisar formalmente os três documentos corrigidos.
5. Verificar consistência ADR ↔ plano ↔ roadmap ↔ LEA-166 a LEA-171.
6. Emitir PASS ou CHANGES_REQUIRED.
7. Não alterar código, branch, PR, Vercel ou Supabase.
8. Não gerar script.
9. Somente com PASS solicitar autorização para preparar a estratégia executável da LEA-166.
```

## 15. Condição de avanço

```txt
FINAL_DOCUMENT_REVIEW=PASS
LINEAR_ALIGNMENT=PASS
GITHUB_STATE_RESOLVED=PASS
LEO_AUTHORIZATION_FOR_EXECUTION_STRATEGY=REQUIRED
```

Sem essa autorização, a LEA-166 permanece `Todo` e nenhum trabalho funcional deve começar.

## 16. Encerramento

```txt
CHAT_STATUS=✅ CHECKPOINTADO
PASSAGEM_DE_BASTÃO=REPOSITÓRIO_GITHUB
PR_DRAFT=YES
MERGE=BLOCKED
PRODUCTION_CHANGED=NO
NEXT_CHAT_START=REVISÃO_FINAL_DOCUMENTAL_PÓS_CORREÇÃO
```
