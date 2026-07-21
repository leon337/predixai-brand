(()=>{"use strict";const e=document.querySelector("[data-k6-app]");if(!(e instanceof HTMLElement))return;const a=window.PredixJourneyContracts,n=window.PredixPromptGenerator,o=window.PredixSessionStateStore?.SessionStateStore;if(!a||!n||!o)return void(e.innerHTML='<div class="k6-fatal" role="alert"><h2>Não foi possível iniciar o gerador.</h2><p>Atualize a página para tentar novamente.</p></div>');const s="leon337.github.io"===window.location.hostname,t=s?"/predixai-brand":"",i=`${t}/assets/data/ai-employees.json`,r=s?"https://predixai-brand.vercel.app/api/leads":"/api/leads",c={chatgpt:"https://chatgpt.com/",claude:"https://claude.ai/",gemini:"https://gemini.google.com/"},l=new o;let d=null,p=null,m=!1,u=null;const E=e=>String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"),S=a=>[...e.querySelectorAll(`[name="${a}"]:checked`)].map(e=>e.value),v=a=>{const n=e.querySelector(`[name="${a}"]:checked`);if(n instanceof HTMLInputElement)return n.value.trim();const o=e.querySelector(`[name="${a}"]`);return o instanceof HTMLInputElement||o instanceof HTMLTextAreaElement||o instanceof HTMLSelectElement?o.value.trim():""},C=(e,a="info")=>{u={message:e,type:a},k()},N={[a.PHASES.CREATE]:"Criar",[a.PHASES.KNOW]:"Conhecer",[a.PHASES.TEST]:"Testar",[a.PHASES.DECIDE]:"Decidir"},h=[a.PHASES.CREATE,a.PHASES.KNOW,a.PHASES.TEST,a.PHASES.DECIDE],R=()=>Math.max(0,h.indexOf(p.journey.phase)),f=(e,n="")=>`
    <div class="k6-shell">
      <header class="k6-app-header">
        <a href="${t?`${t}/`:"/"}" class="k6-brand" aria-label="PredixAI BR — início">
          <img src="${t}/assets/img/logo.svg" alt="PredixAI BR" width="194" height="42">
        </a>
        <a href="${t}/privacidade/" class="k6-help">Privacidade</a>
      </header>
      <nav class="k6-phase-nav" aria-label="Fases da jornada">
        <ol>${h.map((e,a)=>{const n=a===R(),o=a<R();return`<li class="${n?"is-current":o?"is-done":""}" ${n?'aria-current="step"':""}>
      <span aria-hidden="true">${o?"✓":n?"●":"○"}</span>${N[e]}
    </li>`}).join("")}</ol>
      </nav>
      ${(()=>{const e=[];return"MEMORY_ONLY"===l.status&&e.push('<div class="k6-banner k6-banner-warning" role="status">O armazenamento temporário não está disponível. Recarregar ou fechar esta aba pode apagar suas respostas.</div>'),p?.commercial?.submission?.status===a.SUBMISSION.UNKNOWN&&e.push('<div class="k6-banner k6-banner-warning" role="alert">O resultado do envio comercial ainda é desconhecido. Não envie novamente nem apague a sessão neste momento.</div>'),u&&e.push(`<div class="k6-banner k6-banner-${E(u.type)}" role="${"error"===u.type?"alert":"status"}">${E(u.message)}</div>`),e.join("")})()}
      <main class="k6-main" id="k6-main" tabindex="-1">${e}</main>
      ${n?`<footer class="k6-action-bar">${n}</footer>`:""}
    </div>`,I=(e,a,n="primary",o="")=>`<button class="button button-${n}" type="button" data-action="${a}" ${o}>${e}</button>`,b=()=>I("← Voltar","back","ghost"),g=(e,a,n=[],o=!1)=>a.map(a=>{const s=n.includes(a.id)?"checked":"";return`<label class="k6-option">
      <input type="${o?"checkbox":"radio"}" name="${e}" value="${E(a.id)}" ${s}>
      <span><strong>${E(a.label)}</strong>${a.description?`<small>${E(a.description)}</small>`:""}</span>
    </label>`}).join(""),T=()=>f('
    <section class="k6-card k6-hero-card">
      <p class="eyebrow">Experimente antes de automatizar</p>
      <h1>Crie um Funcionário de IA para testar</h1>
      <p>Responda perguntas sobre o seu negócio. A PredixAI preparará uma configuração segura, um prompt para teste manual e um mapa do que ainda precisa ser organizado.</p>
      <ul class="k6-check-list">
        <li>Sem login obrigatório</li>
        <li>Geração local no navegador</li>
        <li>Teste manual em uma plataforma escolhida por você</li>
        <li>Decisões importantes permanecem humanas</li>
      </ul>
      <p class="k6-privacy-note">Não use dados pessoais, prontuários, senhas, tokens ou informações reais de clientes.</p>
    </section>
  ',I("Começar","start")),A=e=>d.employees.find(a=>a.id===e),O=()=>{const e=p.answers.objectiveId;return d.scenarioTemplates.find(a=>a.objectiveId===e)||d.scenarioTemplates[0]},y={[a.READINESS.READY]:"Pronto para teste manual",[a.READINESS.BUSINESS]:"Precisa de informações da empresa",[a.READINESS.TECHNICAL]:"Precisa de avaliação técnica",[a.READINESS.HUMAN_ONLY]:"Deve permanecer sob responsabilidade humana"},M=()=>{const e=p.commercial.draft||{};return{schema_version:"2.0",submission_attempt_id:e.submissionAttemptId||"",idempotency_key:e.idempotencyKey||"",payload_hash:e.payloadHash||"",source:"workforce_k6",product_interest:"workforce",person_name:e.contactName||"",business_name:e.companyName||"",city:e.city||"",state:e.state||"",business_segment:p.answers.segment||"Não informado",preferred_contact:e.contactChannel||"",contact_value:e.contactValue||"",current_tool:p.answers.channelIds.join(", ")||null,main_problem:`Avaliação técnica: ${(e.selectedTechnicalScopeIds||[]).join(", ")}`,desired_result:"Avaliar viabilidade técnica sem promessa de implantação.",commercial_interest:["diagnostico"],acceptable_price_range:null,consent_contact:!0===e.consentContact,consent_news:!0===e.consentNews,selected_technical_scope:e.selectedTechnicalScopeIds||[],readiness_summary:e.readinessSummaryAllowlist||[],consent_version:e.consentVersion||"1.0",privacy_notice_version:e.privacyNoticeVersion||"4.0",website:""}},$={[a.SCREENS.ENTRY]:T,[a.SCREENS.OBJECTIVE]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>O que você quer melhorar primeiro?</h1>
      <div class="k6-option-grid">${g("objective",d.objectives,[p.answers.objectiveId])}</div>
    </section>
  `,`${b()}${I("Continuar","save-objective")}`),[a.SCREENS.SEGMENT]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Qual é o ramo do seu negócio?</h1>
      <label class="k6-field">
        <span>Segmento</span>
        <input name="segment" maxlength="80" value="${E(p.answers.segment)}" placeholder="Ex.: clínica de exames, loja, construção">
      </label>
      <p class="k6-field-help">Informe apenas uma descrição geral. Não inclua dados de clientes.</p>
    </section>
  `,`${b()}${I("Continuar","save-segment")}`),[a.SCREENS.PROCESS]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Como esse trabalho é feito atualmente?</h1>
      <div class="k6-option-grid">${g("processMode",d.processModes,[p.answers.processModeId])}</div>
    </section>
  `,`${b()}${I("Continuar","save-process")}`),[a.SCREENS.CHANNELS]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Onde esse trabalho acontece hoje?</h1>
      <p>Os canais servem apenas como contexto. Nenhuma integração será solicitada ou ativada automaticamente.</p>
      <div class="k6-option-grid">${g("channels",d.channels,p.answers.channelIds,!0)}</div>
    </section>
  `,`${b()}${I("Continuar","save-channels")}`),[a.SCREENS.RESULTS]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>O que você espera desse funcionário?</h1>
      <p>Escolha de uma a três opções.</p>
      <div class="k6-option-grid">${g("desiredResults",d.desiredResults,p.answers.desiredResultIds,!0)}</div>
    </section>
  `,`${b()}${I("Criar para teste","save-results")}`),[a.SCREENS.RECOMMENDATION]:()=>{const e=A(p.recommendation.employeeId),a=p.recommendation.alternativeIds.map(A).filter(Boolean);return f(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Encontramos uma configuração para seu teste</h1>
        <article class="k6-recommendation">
          <span class="k6-employee-icon" aria-hidden="true">${E(e.icone)}</span>
          <div>
            <p class="k6-label">Funcionário recomendado</p>
            <h2>${E(e.nome)}</h2>
            <p>${E(e.descricao)}</p>
          </div>
        </article>
        <div class="k6-explanation">
          <h3>Por que recomendamos</h3>
          <p>${E(p.recommendation.explanation)}</p>
          <ul>${p.recommendation.appliedRules.map(e=>`<li>${E(e)}</li>`).join("")}</ul>
        </div>
        ${a.length?`<details><summary>Ver alternativa substituta</summary>${a.map(e=>`<p><strong>${E(e.nome)}</strong> — ${E(e.descricao)}</p>`).join("")}</details>`:""}
      </section>
    `,`${b()}${I("Definir como vai trabalhar","accept-recommendation")}`)},[a.SCREENS.CONFIGURATION]:()=>{const e=A(p.configuration.employeeId);return f(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Como ${E(e.nome)} vai trabalhar</h1>
        <div class="k6-control-panel">
          <h2>Controles obrigatórios ativos</h2>
          <ul>${p.configuration.mandatoryControls.map(e=>`<li>🔒 ${E(e)}</li>`).join("")}</ul>
        </div>
        <label class="k6-field">
          <span>Tom de comunicação</span>
          <select name="tone">
            ${d.tones.map(e=>`<option value="${E(e.value)}" ${e.value===p.configuration.tone?"selected":""}>${E(e.label)}</option>`).join("")}
          </select>
        </label>
        <fieldset class="k6-fieldset">
          <legend>Informações empresariais autorizadas para o teste</legend>
          ${d.authorizedContentOptions.map(e=>`<label class="k6-inline-check"><input type="checkbox" name="authorizedContent" value="${E(e.label)}" ${p.configuration.authorizedContent.includes(e.label)?"checked":""}><span>${E(e.label)}</span></label>`).join("")}
        </fieldset>
        <label class="k6-field">
          <span>Regra adicional opcional</span>
          <textarea name="additionalRules" maxlength="500" placeholder="Ex.: atendimento de segunda a sexta, das 8h às 18h.">${E(p.configuration.additionalRules)}</textarea>
        </label>
        <p class="k6-field-help">Regras que tentem remover controles obrigatórios serão rejeitadas.</p>
      </section>
    `,`${b()}${I("Revisar configuração","save-configuration")}`)},[a.SCREENS.REVIEW]:()=>{const e=A(p.configuration.employeeId);return f(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Revise a configuração</h1>
        <dl class="k6-summary-list">
          <div><dt>Funcionário</dt><dd>${E(e.nome)}</dd></div>
          <div><dt>Segmento</dt><dd>${E(p.answers.segment)}</dd></div>
          <div><dt>Tom</dt><dd>${E(p.configuration.tone)}</dd></div>
          <div><dt>Controle humano</dt><dd>${p.configuration.mandatoryControls.length} regras obrigatórias</dd></div>
          <div><dt>Conteúdo autorizado</dt><dd>${p.configuration.authorizedContent.length||"Nenhum item específico"}</dd></div>
        </dl>
      </section>
    `,`${b()}${I("Preparar meu prompt","prepare-prompt")}`)},[a.SCREENS.PROMPT]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Seu prompt está preparado</h1>
      <div class="k6-artifact-meta">
        <span>Versão ${p.artifacts.prompt.promptVersion}</span>
        <span>Hash ${E(p.artifacts.prompt.contentHash.slice(0,12))}</span>
        <span>${E(p.artifacts.prompt.status)}</span>
      </div>
      <textarea class="k6-prompt-output" readonly data-prompt-output aria-label="Prompt personalizado">${E(p.artifacts.prompt.content)}</textarea>
      <p>O prompt permanece local até você copiá-lo. A PredixAI não o envia para outra plataforma.</p>
      ${"MANUAL_COPY_REQUIRED"===p.artifacts.prompt.copyStatus?'<div class="k6-safety-callout">Selecione o conteúdo acima, copie manualmente e confirme somente depois de concluir a cópia.</div>':""}
    </section>
  `,`${b()}${"MANUAL_COPY_REQUIRED"===p.artifacts.prompt.copyStatus?I("Confirmo que copiei manualmente","confirm-manual-copy","ghost"):""}${I("Copiar prompt","copy-prompt")}`),[a.SCREENS.PLATFORM]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Onde deseja testar?</h1>
      <p>Nenhuma plataforma será conectada automaticamente. Uma nova página poderá ser aberta após o checkpoint local.</p>
      <div class="k6-option-grid">
        ${g("platform",[{id:"chatgpt",label:"ChatGPT",description:"Abrir uma conversa nova quando possível."},{id:"claude",label:"Claude",description:"Cole e envie manualmente o prompt."},{id:"gemini",label:"Gemini",description:"Cole e envie manualmente o prompt."},{id:"other",label:"Outra plataforma",description:"Abertura manual, sem URL informada pelo usuário."}])}
      </div>
      <div class="k6-safety-callout">Não cole dados pessoais, senhas, documentos, prontuários ou informações reais de clientes.</div>
    </section>
  `,`${b()}${I("Preservar etapa e continuar","select-platform")}`),[a.SCREENS.RETURN]:()=>{const e=p.externalJourney.activeTestAttempt;return f(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>O que aconteceu na plataforma?</h1>
        <p>Plataforma escolhida: <strong>${E(e?.platformId||"outra")}</strong></p>
        <div class="k6-option-grid">${g("returnStatus",[{id:"sent",label:"Colei e enviei o prompt"},{id:"not-sent",label:"Colei, mas ainda não enviei"},{id:"not-copied",label:"Ainda não consegui colar"}])}</div>
        <div class="k6-secondary-actions">
          ${I("Copiar novamente","copy-prompt-again","ghost")}
          ${I("Abrir plataforma novamente","reopen-platform","ghost")}
          ${I("Continuar sem realizar o teste","skip-test","ghost")}
        </div>
      </section>
    `,`${b()}${I("Continuar","confirm-return")}`)},[a.SCREENS.SCENARIO]:()=>{const e=O();return f(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>Faça o primeiro teste</h1>
        <div class="k6-scenario">
          <p class="k6-label">Cenário fictício</p>
          <blockquote>${E(e.message)}</blockquote>
          ${I("Copiar mensagem de teste","copy-scenario","ghost")}
        </div>
        <h2>O que observar</h2>
        <ul class="k6-check-list">
          <li>Usou apenas informações disponíveis</li>
          <li>Pediu esclarecimentos quando necessário</li>
          <li>Evitou promessas ou ações externas</li>
          <li>Encaminhou situações especiais</li>
          <li>Manteve o tom configurado</li>
        </ul>
      </section>
    `,`${b()}${I("Já executei o teste","scenario-executed")}`)},[a.SCREENS.OBSERVATION]:()=>f('
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Como foi o teste?</h1>
      <label class="k6-field"><span>Resultado percebido</span>
        <select name="matchResult">
          <option value="">Selecione</option>
          <option value="expected">Correspondeu ao esperado</option>
          <option value="partial">Correspondeu parcialmente</option>
          <option value="unexpected">Não correspondeu</option>
          <option value="unable">Não consegui avaliar</option>
        </select>
      </label>
      <label class="k6-field"><span>A resposta inventou alguma informação?</span>
        <select name="inventedInfo">
          <option value="">Selecione</option>
          <option value="no">Não percebi</option>
          <option value="yes">Sim</option>
          <option value="unknown">Não sei avaliar</option>
        </select>
      </label>
      <label class="k6-field"><span>Quando necessário, encaminhou para uma pessoa?</span>
        <select name="humanHandoff">
          <option value="">Selecione</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
          <option value="not-required">O cenário não exigia</option>
          <option value="unknown">Não sei avaliar</option>
        </select>
      </label>
    </section>
  ',`${b()}${I("Registrar observação","save-observation")}`),[a.SCREENS.TEST_SUMMARY]:()=>{const e=p.externalJourney.observations.at(-1);return f(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>Observação registrada</h1>
        <p>Este resultado foi informado por você. A PredixAI não leu nem validou a resposta da plataforma externa.</p>
        <dl class="k6-summary-list">
          <div><dt>Correspondência</dt><dd>${E(e?.matchResult||"Não informado")}</dd></div>
          <div><dt>Informação inventada</dt><dd>${E(e?.inventedInfo||"Não informado")}</dd></div>
          <div><dt>Encaminhamento humano</dt><dd>${E(e?.humanHandoff||"Não informado")}</dd></div>
        </dl>
      </section>
    `,`${b()}${I("Ver mapa de prontidão","view-readiness")}`)},[a.SCREENS.READINESS]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Decidir</p>
      <h1>Seu mapa de prontidão</h1>
      <div class="k6-readiness-list">
        ${p.artifacts.readinessMap.capabilities.map(e=>`
          <article class="k6-readiness-card" data-classification="${E(e.classification)}">
            <p class="k6-label">${E(y[e.classification])}</p>
            <h2>${E(e.label)}</h2>
            <p><strong>Dependências:</strong> ${E(e.dependencies.join(", "))}</p>
            <p><strong>Controle:</strong> ${E(e.humanControl)}</p>
            <p><strong>Próxima ação:</strong> ${E(e.nextAction)}</p>
          </article>`).join("")}
      </div>
    </section>
  `,`${b()}${I("Escolher próximo passo","readiness-viewed")}`),[a.SCREENS.DECISION]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Decidir</p>
      <h1>Qual será o próximo passo?</h1>
      <div class="k6-decision-grid">
        <article>
          <p class="k6-label">Caminho gratuito</p>
          <h2>Continuar testando</h2>
          <p>Use o prompt, complete informações autorizadas e faça outros testes fictícios.</p>
          ${I("Continuar gratuitamente","free-path")}
        </article>
        <article>
          <p class="k6-label">Avaliação opcional</p>
          <h2>Avaliar integrações</h2>
          <p>Selecione somente capacidades técnicas que deseja discutir com a PredixAI.</p>
          ${I("Solicitar avaliação","commercial-path","ghost")}
        </article>
      </div>
    </section>
  `,b()),[a.SCREENS.FREE_PATH]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Continuidade gratuita</p>
      <h1>Continue com controle humano</h1>
      <ol class="k6-number-list">
        <li>Adicione somente informações empresariais autorizadas.</li>
        <li>Faça testes com cenários fictícios.</li>
        <li>Revise respostas inesperadas.</li>
        <li>Mantenha decisões importantes sob responsabilidade humana.</li>
      </ol>
      <div class="k6-secondary-actions">
        ${I("Copiar prompt novamente","copy-prompt-again","ghost")}
        ${I("Recomeçar configuração","restart","ghost")}
      </div>
    </section>
  `,b()),[a.SCREENS.COMMERCIAL_SCOPE]:()=>f(`
    <section class="k6-card">
      <p class="eyebrow">Avaliação opcional</p>
      <h1>O que deseja avaliar?</h1>
      <div class="k6-option-grid">${g("technicalScope",[{id:"channel-integration",label:"Canal de atendimento"},{id:"agenda-system",label:"Consulta a agenda ou sistema"},{id:"request-registration",label:"Registro automático de solicitações"},{id:"business-content",label:"Organização de conteúdo empresarial"}],[],!0)}</div>
      <p>Nenhuma opção está marcada por padrão. Capacidades que devem permanecer humanas não são elegíveis.</p>
    </section>
  `,`${b()}${I("Continuar","save-commercial-scope")}`),[a.SCREENS.COMMERCIAL_CONTACT]:()=>f('
    <section class="k6-card">
      <p class="eyebrow">Avaliação opcional</p>
      <h1>Contato e consentimento</h1>
      <div class="k6-form-grid">
        <label class="k6-field"><span>Nome</span><input name="contactName" maxlength="120" autocomplete="name"></label>
        <label class="k6-field"><span>Empresa ou negócio — opcional</span><input name="companyName" maxlength="160" autocomplete="organization"></label>
        <label class="k6-field"><span>Cidade</span><input name="city" maxlength="120" autocomplete="address-level2"></label>
        <label class="k6-field"><span>Estado</span><input name="state" maxlength="2" autocomplete="address-level1" placeholder="PE"></label>
        <label class="k6-field"><span>Canal de contato</span>
          <select name="contactChannel"><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select>
        </label>
        <label class="k6-field"><span>Contato</span><input name="contactValue" maxlength="180" autocomplete="email"></label>
      </div>
      <label class="k6-inline-check"><input type="checkbox" name="consentContact"><span>Concordo com o uso destes dados para responder à solicitação.</span></label>
      <label class="k6-inline-check"><input type="checkbox" name="consentNews"><span>Quero receber novidades da PredixAI. Opcional.</span></label>
    </section>
  ',`${b()}${I("Revisar envio","save-commercial-contact")}`),[a.SCREENS.COMMERCIAL_SUBMIT]:()=>{const e=p.commercial.submission,n=M();let o="";e.status===a.SUBMISSION.CONFIRMED?o=`<div class="k6-result-success" role="status"><h2>Solicitação registrada</h2><p>Referência: ${E(e.serverReference)}</p><p>Nenhum preço, prazo ou viabilidade técnica foi confirmado.</p></div>`:e.status===a.SUBMISSION.FAILED?o='<div class="k6-result-error" role="alert"><h2>Não foi possível enviar</h2><p>Nenhuma confirmação foi registrada. Revise os dados antes de tentar novamente.</p></div>':e.status===a.SUBMISSION.UNKNOWN&&(o='<div class="k6-result-warning" role="alert"><h2>Resultado ainda não confirmado</h2><p>A solicitação pode ter sido recebida. Não envie novamente neste momento.</p></div>');const s=![a.SUBMISSION.CONFIRMED,a.SUBMISSION.UNKNOWN,a.SUBMISSION.SUBMITTING].includes(e.status);return f(`
      <section class="k6-card">
        <p class="eyebrow">Avaliação opcional</p>
        <h1>Revise exatamente o que será enviado</h1>
        <pre class="k6-payload-preview">${E(JSON.stringify(n,null,2))}</pre>
        ${o}
      </section>
    `,`${b()}${s?I(e.status===a.SUBMISSION.FAILED?"Tentar novamente":"Enviar solicitação","submit-commercial","primary"):""}${I("Continuar gratuitamente","free-path","ghost")}`)}},k=()=>{if(!d||!p)return;if(m)e.innerHTML=f(`
    <section class="k6-card k6-resume-card">
      <p class="eyebrow">Jornada temporária encontrada</p>
      <h1>Continuar de onde você parou?</h1>
      <p>As respostas estão disponíveis apenas nesta aba do navegador. Você pode continuar ou iniciar uma nova jornada.</p>
      <dl class="k6-summary-list">
        <div><dt>Fase</dt><dd>${E(N[p.journey.phase])}</dd></div>
        <div><dt>Revisão</dt><dd>${p.meta.stateRevision}</dd></div>
      </dl>
    </section>
  `,`${I("Iniciar nova jornada","restart","ghost")}${I("Continuar jornada","resume","primary")}`);else{const a=$[p.journey.canonicalScreen]||T;e.innerHTML=a()}const a=e.querySelector("#k6-main h1");a instanceof HTMLElement&&(a.setAttribute("tabindex","-1"),requestAnimationFrame(()=>a.focus({preventScroll:!1})))},_=()=>{const e=l.save(p);return e.ok||(u={message:"Não foi possível preservar esta etapa. A jornada continuará apenas em memória.",type:"warning"}),e},P=(e,n={},o="push")=>{p=a.transition(p,e,n),p.journey.canonicalScreen=a.deriveCanonicalScreen(p),_();const s={screenId:p.journey.canonicalScreen,sessionId:p.session.sessionId,stateRevision:p.meta.stateRevision};"replace"===o?history.replaceState(s,"",location.pathname+location.search):history.pushState(s,"",location.pathname+location.search),u=null,k()},w={[a.SCREENS.OBJECTIVE]:a.SCREENS.ENTRY,[a.SCREENS.SEGMENT]:a.SCREENS.OBJECTIVE,[a.SCREENS.PROCESS]:a.SCREENS.SEGMENT,[a.SCREENS.CHANNELS]:a.SCREENS.PROCESS,[a.SCREENS.RESULTS]:a.SCREENS.CHANNELS,[a.SCREENS.RECOMMENDATION]:a.SCREENS.RESULTS,[a.SCREENS.CONFIGURATION]:a.SCREENS.RECOMMENDATION,[a.SCREENS.REVIEW]:a.SCREENS.CONFIGURATION,[a.SCREENS.PROMPT]:a.SCREENS.REVIEW,[a.SCREENS.PLATFORM]:a.SCREENS.PROMPT,[a.SCREENS.RETURN]:a.SCREENS.PLATFORM,[a.SCREENS.SCENARIO]:a.SCREENS.RETURN,[a.SCREENS.OBSERVATION]:a.SCREENS.SCENARIO,[a.SCREENS.TEST_SUMMARY]:a.SCREENS.OBSERVATION,[a.SCREENS.READINESS]:a.SCREENS.TEST_SUMMARY,[a.SCREENS.DECISION]:a.SCREENS.READINESS,[a.SCREENS.FREE_PATH]:a.SCREENS.DECISION,[a.SCREENS.COMMERCIAL_SCOPE]:a.SCREENS.DECISION,[a.SCREENS.COMMERCIAL_CONTACT]:a.SCREENS.COMMERCIAL_SCOPE,[a.SCREENS.COMMERCIAL_SUBMIT]:a.SCREENS.COMMERCIAL_CONTACT},L=async(e,a)=>{try{return await navigator.clipboard.writeText(e),C(a,"success"),"CLIPBOARD_SUCCESS"}catch{const n=document.createElement("textarea");n.value=e,n.setAttribute("readonly",""),n.style.position="fixed",n.style.opacity="0",document.body.append(n),n.select();const o=document.execCommand("copy");return n.remove(),C(o?a:"Selecione o conteúdo e copie manualmente.",o?"success":"warning"),o?"CLIPBOARD_SUCCESS":"MANUAL_COPY_REQUIRED"}};e.addEventListener("click",o=>{const s=o.target;if(!(s instanceof Element))return;const t=s.closest("[data-action]");t instanceof HTMLElement&&(async o=>{try{switch(o){case"resume":return m=!1,void k();case"restart":return p.commercial.submission.status===a.SUBMISSION.UNKNOWN?void C("Não é possível apagar a sessão enquanto o resultado do envio estiver desconhecido.","error"):(l.clear(),p=a.createInitialState(),p.versions.catalogVersion=d.catalogVersion,m=!1,_(),void k());case"back":return void P(a.EVENTS.BACK,{screen:w[p.journey.canonicalScreen]||a.SCREENS.ENTRY});case"start":return void P(a.EVENTS.START);case"save-objective":{const e=v("objective");return void P(a.EVENTS.OBJECTIVE_SELECTED,{objectiveId:e})}case"save-segment":return void P(a.EVENTS.SEGMENT_CONFIRMED,{segment:v("segment")});case"save-process":return void P(a.EVENTS.PROCESS_SELECTED,{processModeId:v("processMode")});case"save-channels":return void P(a.EVENTS.CHANNELS_CONFIRMED,{channelIds:S("channels")});case"save-results":{const e=S("desiredResults"),o=n.recommendEmployee(d,{...p.answers,desiredResultIds:e});return void P(a.EVENTS.RESULTS_CONFIRMED,{desiredResultIds:e,recommendation:o,mandatoryControls:d.mandatoryControls.map(e=>e.label)})}case"accept-recommendation":return void P(a.EVENTS.RECOMMENDATION_ACCEPTED);case"save-configuration":{const e=v("additionalRules");return n.containsRuleConflict(e)?void C("A regra adicional conflita com os controles obrigatórios. Remova a instrução conflitante.","error"):void P(a.EVENTS.CONFIGURATION_CONFIRMED,{tone:v("tone"),additionalRules:e,authorizedContent:S("authorizedContent")})}case"prepare-prompt":{u={message:"Preparando o prompt localmente...",type:"info"},k();const e=await n.generatePromptArtifact({catalog:d,state:p});return void P(a.EVENTS.PROMPT_PREPARED,{promptArtifact:e})}case"copy-prompt":case"copy-prompt-again":{const e=await L(p.artifacts.prompt.content,"Prompt copiado.");return void("copy-prompt"===o&&"CLIPBOARD_SUCCESS"===e?P(a.EVENTS.PROMPT_COPY_CONFIRMED,{copyStatus:e}):"MANUAL_COPY_REQUIRED"===e&&(p.artifacts.prompt.copyStatus=e,_(),k()))}case"confirm-manual-copy":return void P(a.EVENTS.PROMPT_COPY_CONFIRMED,{copyStatus:"MANUAL_COPY_DECLARED"});case"select-platform":{const e=v("platform");if(P(a.EVENTS.PLATFORM_SELECTED,{platformId:e}),"WRITE_FAILED"===l.status||"QUOTA_EXCEEDED"===l.status)return;return void(c[e]&&window.open(c[e],"_blank","noopener,noreferrer"))}case"reopen-platform":{const e=p.externalJourney.activeTestAttempt?.platformId;return void(c[e]?window.open(c[e],"_blank","noopener,noreferrer"):C("Abra manualmente a plataforma escolhida.","info"))}case"confirm-return":{const e=v("returnStatus");return void("sent"===e?P(a.EVENTS.PROMPT_SUBMISSION_DECLARED):e?C("O cenário será liberado somente depois que você declarar o envio do prompt.","warning"):C("Selecione o que aconteceu na plataforma.","error"))}case"skip-test":return P(a.EVENTS.TEST_SKIPPED),void(p.artifacts.readinessMap||(p.artifacts.readinessMap=n.buildReadinessMap({catalog:d,state:p}),_(),k()));case"copy-scenario":return void await L(O().message,"Mensagem de teste copiada.");case"scenario-executed":return void P(a.EVENTS.SCENARIO_EXECUTED);case"save-observation":{const e={matchResult:v("matchResult"),inventedInfo:v("inventedInfo"),humanHandoff:v("humanHandoff")};if(Object.values(e).some(e=>!e))return void C("Preencha as três observações para continuar.","error");if("expected"===e.matchResult&&"yes"===e.inventedInfo)return void C("As respostas informadas são contraditórias. Revise o resultado percebido ou a indicação de informação inventada.","error");const o=a.clone(p);o.externalJourney.observations.push(e);const s=n.buildReadinessMap({catalog:d,state:o});return void P(a.EVENTS.OBSERVATION_RECORDED,{observation:e,readinessMap:s})}case"view-readiness":return p.artifacts.readinessMap||(p.artifacts.readinessMap=n.buildReadinessMap({catalog:d,state:p})),void P(a.EVENTS.READINESS_PREPARED,{readinessMap:p.artifacts.readinessMap});case"readiness-viewed":return void P(a.EVENTS.READINESS_VIEWED,{readinessMap:p.artifacts.readinessMap});case"free-path":return void P(a.EVENTS.FREE_PATH_SELECTED);case"commercial-path":return void P(a.EVENTS.COMMERCIAL_PATH_SELECTED);case"save-commercial-scope":{const e=S("technicalScope"),n=p.artifacts.readinessMap.capabilities.filter(e=>e.classification!==a.READINESS.HUMAN_ONLY).map(e=>({capabilityId:e.capabilityId,classification:e.classification}));return void P(a.EVENTS.COMMERCIAL_SCOPE_SELECTED,{scopeIds:e,readinessSummaryAllowlist:n})}case"save-commercial-contact":{const o={contactName:v("contactName"),companyName:v("companyName"),city:v("city"),state:v("state").toUpperCase(),contactChannel:v("contactChannel"),contactValue:v("contactValue"),consentContact:!0===e.querySelector('[name="consentContact"]')?.checked,consentNews:!0===e.querySelector('[name="consentNews"]')?.checked,consentVersion:"1.0",privacyNoticeVersion:"4.0"};if(o.contactName.length<2||o.city.length<2||!/^[A-Z]{2}$/.test(o.state)||o.contactValue.length<5||!o.consentContact)return void C("Preencha nome, cidade, estado, contato e o consentimento obrigatório.","error");const s=a.randomId("submission"),t=a.randomId("idem"),i={...p.commercial.draft,...o,submissionAttemptId:s,idempotencyKey:t,payloadHash:""},r=p.commercial.draft;p.commercial.draft=i;const c=M();delete c.payload_hash;const l=await n.simpleHash(JSON.stringify(c));return p.commercial.draft=r,void P(a.EVENTS.COMMERCIAL_CONTACT_CONFIRMED,{contact:{...o,submissionAttemptId:s,idempotencyKey:t,payloadHash:l}})}case"submit-commercial":{if(p.commercial.submission.status===a.SUBMISSION.UNKNOWN)return;const e=M(),n=e.submission_attempt_id,o=e.idempotency_key;P(a.EVENTS.COMMERCIAL_SUBMIT_STARTED,{submissionAttemptId:n,idempotencyKey:o});try{const n=await fetch(r,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)}),o=await n.json().catch(()=>({}));if(!n.ok){const e=new Set(["UPSTREAM_TIMEOUT","SERVICE_UNAVAILABLE"]);return void(n.status>=500||e.has(o.error)?P(a.EVENTS.COMMERCIAL_SUBMIT_UNKNOWN,{errorCode:o.error||`HTTP_${n.status}`}):P(a.EVENTS.COMMERCIAL_SUBMIT_FAILED,{errorCode:o.error||`HTTP_${n.status}`}))}P(a.EVENTS.COMMERCIAL_SUBMIT_CONFIRMED,{serverReference:o.lead_id||o.submission_id||"registrado"})}catch{P(a.EVENTS.COMMERCIAL_SUBMIT_UNKNOWN,{errorCode:"NETWORK_RESULT_UNKNOWN"})}return}default:return}}catch(e){const a=e instanceof Error?e.message:"UNEXPECTED_ERROR";C({INCOMPLETE_INPUT:"Complete esta etapa antes de continuar.",INVALID_SELECTION:"Revise as opções selecionadas.",CONFLICTING_CONFIGURATION:"Uma regra adicional conflita com os controles obrigatórios.",PROMPT_NOT_COPIED:"Copie a versão atual do prompt antes de escolher a plataforma.",STALE_PROMPT:"O prompt está desatualizado e precisa ser gerado novamente.",PROMPT_SUBMISSION_REQUIRED:"Declare primeiro que enviou o prompt.",SUBMISSION_RETRY_BLOCKED:"Uma nova tentativa está bloqueada enquanto o resultado anterior estiver desconhecido."}[a]||"Não foi possível concluir esta ação. Suas respostas válidas foram preservadas.","error")}})(t.dataset.action)});window.addEventListener("popstate",e=>{const n=e.state?.screenId;if(p&&Object.values(a.SCREENS).includes(n))try{p=a.transition(p,a.EVENTS.BACK,{screen:n}),p.journey.canonicalScreen=a.deriveCanonicalScreen(p),_(),u=null,k()}catch{p.journey.canonicalScreen=a.deriveCanonicalScreen(p),k()}}),(async()=>{e.innerHTML='<div class="k6-loading" role="status" aria-busy="true">Carregando o gerador...</div>';try{const e=await fetch(i,{credentials:"same-origin"});if(!e.ok)throw new Error("CATALOG_UNAVAILABLE");if(d=await e.json(),"2.0"!==d.schemaVersion||!Array.isArray(d.employees)||d.employees.length<1)throw new Error("INVALID_CATALOG");p=l.load(),p?(p.versions.catalogVersion=d.catalogVersion,m=p.meta.stateRevision>0):(p=a.createInitialState(),p.versions.catalogVersion=d.catalogVersion,_()),k()}catch{e.innerHTML='<div class="k6-fatal" role="alert"><h1>O catálogo não pôde ser carregado</h1><p>Atualize a página para tentar novamente. Nenhuma resposta foi enviada.</p></div>'}})().then(()=>{p&&history.replaceState({screenId:p.journey.canonicalScreen,sessionId:p.session.sessionId,stateRevision:p.meta.stateRevision},"",location.pathname+location.search)})})();