# PROMPT DE CONTINUIDADE — K.7.8.2A.14.1 / LEA-166

Cole este conteúdo em um novo chat dentro do projeto PredixAI BR.

---

INICIAR A CONTINUIDADE DA PTP-WEB.2.8.3K, MANTENDO A ETAPA PRINCIPAL K.7.8.2A.14.1 — CONFIGURAÇÃO EFETIVA DERIVADA.

## Fontes obrigatórias

Consulte primeiro, nesta ordem, os arquivos da branch `ptp-web-2-workforce-k6-questionnaire-r2` do repositório `leon337/predixai-brand`:

1. `docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_CHECKPOINT_HISTORICO_PTP-WEB.2.8.3K_K7.8.2A.14.1_CONFIGURACAO_EFETIVA_DERIVADA.md`
2. `docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_ADR_CONFIGURACAO_EFETIVA_DERIVADA.md`
3. `docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_PLANO_TECNICO.md`
4. `docs/history/ptp/PTP-WEB/PTP-WEB.2/20260723_PTP-WEB.2.8.3K_K7.8.2A.14.1_ROADMAP_IMPLEMENTACAO.md`
5. `docs/history/ptp/PTP-WEB/PTP-WEB.2/20260722_PTP-WEB.2.8.3K_K7.8.2A_CLINICA_EXAMES_TRACKER.md`

Consulte também:

- GitHub PR #9;
- Linear LEA-116;
- subtarefas LEA-166, LEA-167, LEA-168, LEA-169, LEA-170 e LEA-171;
- relações formais de bloqueio entre essas subtarefas;
- HEAD real da branch no momento da auditoria.

## Estado importado

```txt
PTP_PRINCIPAL=PTP-WEB.2.8.3K
ETAPA_PAI=K.7.8.2A.14
ETAPA_ATUAL=K.7.8.2A.14.1
NOME_CURTO=Configuração Efetiva Derivada
ISSUE_PAI=LEA-116
PR=9
BRANCH=ptp-web-2-workforce-k6-questionnaire-r2
CHECKPOINT_COMMIT=ab36abc04cdc3ae4f8967ac9af15e673e4bba684
PR_DRAFT=YES
MERGE=BLOCKED
PRODUCTION_CHANGED=NO
LEA-166_A_171=TODO
```

## Missão exclusiva deste novo chat

Executar uma **revisão final independente pós-correção** dos três documentos:

- ADR;
- plano técnico;
- roadmap de implementação.

A revisão deve verificar se os oito achados documentais foram realmente incorporados de forma correta e sem criar novas contradições:

```txt
F01=algoritmo e canonicalização dos hashes
F02=proteção contra prototype pollution e paths perigosos
F03=fonte versionada de promptInstruction
F04=cobertura mensurável de bindings
F05=contrato exato do parser das 13 seções
F06=paridade semântica objetiva
F07=separação entre HEAD auditado, HEAD documental e HEAD de execução
F08=distinção entre deploy manual, produção e Preview automático do Git
```

## Verificações obrigatórias

1. Confirmar consistência entre ADR, plano técnico e roadmap.
2. Confirmar alinhamento com LEA-166 a LEA-171.
3. Confirmar que `EffectiveAgentConfig` permanece derivada, imutável e não persistida como fonte.
4. Confirmar que `PackageDocument + PackageCustomization` continuam sendo as únicas fontes persistidas.
5. Confirmar que a estratégia continua específica para o pacote de clínica e não introduz compilador universal prematuro.
6. Confirmar que API, Supabase, pacote publicado, checksum, `contentVersion`, `vercel.json`, produção e merge permanecem fora de escopo.
7. Confirmar que o contrato dos bindings exige allowlist exata, cobertura de 100%, propriedades próprias e bloqueio de `__proto__`, `prototype` e `constructor`.
8. Confirmar SHA-256, stable JSON com chaves ordenadas, arrays preservados, NFC e versão de canonicalização.
9. Confirmar o contrato fail-closed das 13 seções.
10. Confirmar matriz objetiva de fatos operacionais e oito invariantes de segurança.
11. Resolver o HEAD atual pelo GitHub; não confiar apenas nos SHAs históricos dos documentos.
12. Confirmar PR #9 aberto, draft, não mesclado e produção inalterada.

## Resultado exigido

Emitir um parecer:

```txt
FINAL_DOCUMENT_REVIEW=PASS
```

ou:

```txt
FINAL_DOCUMENT_REVIEW=CHANGES_REQUIRED
```

Em caso de `CHANGES_REQUIRED`, listar achados por severidade e propor somente correções documentais.

Em caso de `PASS`, confirmar que os documentos estão suficientemente precisos para solicitar a Leo autorização de preparação da **estratégia executável da LEA-166**.

## Proibições deste chat

```txt
CODE_CHANGE=PROIBIDO
BRANCH_CREATION=PROIBIDA
PR_CHILD_CREATION=PROIBIDA
SCRIPT_ALL_IN_ONE=PROIBIDO
COMMIT_FUNCIONAL=PROIBIDO
MANUAL_DEPLOY=PROIBIDO
PRODUCTION_DEPLOY=PROIBIDO
SUPABASE_CHANGE=PROIBIDA
MERGE=PROIBIDO
LINEAR_STATUS_ADVANCE=PROIBIDO
```

Não iniciar a LEA-166. Não mudar seu status de `Todo`. Não gerar implementação. Não corrigir comentários históricos sem autorização separada.

## Próximo gate

Somente após `FINAL_DOCUMENT_REVIEW=PASS`, apresentar a Leo uma solicitação objetiva de autorização para preparar a estratégia executável da LEA-166, ainda sem gerar script ou alterar código.

---
