(function () {
  "use strict";

  if (window.TarielClientePortalMesaSurface) return;

  window.TarielClientePortalMesaSurface =
    function createTarielClientePortalMesaSurface(config = {}) {
      const state = config.state || {};
      const documentRef = config.documentRef || document;
      const $ =
        typeof config.getById === "function"
          ? config.getById
          : (id) => documentRef.getElementById(id);
      const helpers = config.helpers || {};
      const filters = config.filters || {};

      const escapeAttr =
        typeof helpers.escapeAttr === "function"
          ? helpers.escapeAttr
          : (valor) => String(valor ?? "");
      const escapeHtml =
        typeof helpers.escapeHtml === "function"
          ? helpers.escapeHtml
          : (valor) => String(valor ?? "");
      const formatarInteiro =
        typeof helpers.formatarInteiro === "function"
          ? helpers.formatarInteiro
          : (valor) => String(Number(valor || 0));
      const horasDesdeAtualizacao =
        typeof helpers.horasDesdeAtualizacao === "function"
          ? helpers.horasDesdeAtualizacao
          : () => 0;
      const laudoBadge =
        typeof helpers.laudoBadge === "function"
          ? helpers.laudoBadge
          : () => "";
      const laudoMesaParado =
        typeof helpers.laudoMesaParado === "function"
          ? helpers.laudoMesaParado
          : () => false;
      const ordenarPorPrioridade =
        typeof helpers.ordenarPorPrioridade === "function"
          ? helpers.ordenarPorPrioridade
          : (lista) => [...(lista || [])];
      const parseDataIso =
        typeof helpers.parseDataIso === "function"
          ? helpers.parseDataIso
          : () => 0;
      const prioridadeMesa =
        typeof helpers.prioridadeMesa === "function"
          ? helpers.prioridadeMesa
          : () => ({ tone: "aprovado", badge: "", acao: "" });
      const appendAnexos =
        typeof helpers.appendAnexos === "function"
          ? helpers.appendAnexos
          : null;
      const appendTextWithBreaks =
        typeof helpers.appendTextWithBreaks === "function"
          ? helpers.appendTextWithBreaks
          : null;
      const renderAnexos =
        typeof helpers.renderAnexos === "function"
          ? helpers.renderAnexos
          : () => "";
      const clearElement =
        typeof helpers.clearElement === "function"
          ? helpers.clearElement
          : (node) => {
              if (!node) return false;
              node.textContent = "";
              return true;
            };
      const renderEmptyState =
        typeof helpers.renderEmptyState === "function"
          ? helpers.renderEmptyState
          : (target, options = {}) => {
              if (!target) return false;
              clearElement(target);
              const empty = documentRef.createElement("div");
              empty.className = "empty-state";
              const title = documentRef.createElement("strong");
              title.textContent = texto(
                options.title || "Nenhum item encontrado",
              );
              empty.appendChild(title);
              const detail = texto(options.detail || "").trim();
              if (detail) {
                const paragraph = documentRef.createElement("p");
                paragraph.textContent = detail;
                empty.appendChild(paragraph);
              }
              target.appendChild(empty);
              return true;
            };
      const renderHeroChipList =
        typeof helpers.renderHeroChipList === "function"
          ? helpers.renderHeroChipList
          : (target, chips) => {
              if (!target) return false;
              clearElement(target);
              (Array.isArray(chips) ? chips : []).forEach((chipText) => {
                const chip = documentRef.createElement("span");
                chip.className = "hero-chip";
                chip.textContent = texto(chipText).trim();
                target.appendChild(chip);
              });
              return true;
            };
      const renderStaticContractHtml =
        typeof helpers.renderStaticContractHtml === "function"
          ? helpers.renderStaticContractHtml
          : null;
      const resumoEsperaHoras =
        typeof helpers.resumoEsperaHoras === "function"
          ? helpers.resumoEsperaHoras
          : () => "";
      const rotuloSituacaoMesa =
        typeof helpers.rotuloSituacaoMesa === "function"
          ? helpers.rotuloSituacaoMesa
          : () => "";
      const texto =
        typeof helpers.texto === "function"
          ? helpers.texto
          : (valor) => (valor == null ? "" : String(valor));
      const textoComQuebras =
        typeof helpers.textoComQuebras === "function"
          ? helpers.textoComQuebras
          : (valor) => escapeHtml(valor);
      const sincronizarUrlDaSecao =
        typeof helpers.sincronizarUrlDaSecao === "function"
          ? helpers.sincronizarUrlDaSecao
          : () => null;
      const variantStatusLaudo =
        typeof helpers.variantStatusLaudo === "function"
          ? helpers.variantStatusLaudo
          : () => "aguardando";

      const filtrarLaudosMesa =
        typeof filters.filtrarLaudosMesa === "function"
          ? filters.filtrarLaudosMesa
          : () => [];
      const SECTION_ORDER = Object.freeze([
        "overview",
        "queue",
        "pending",
        "reply",
      ]);
      const SECTION_META = Object.freeze({
        overview: Object.freeze({
          title: "Visao geral",
          meta: "Panorama da analise da mesa.",
        }),
        queue: Object.freeze({
          title: "Fila de revisao",
          meta: "Selecao do laudo a revisar.",
        }),
        pending: Object.freeze({
          title: "Pendencias",
          meta: "Chamados, triagem e movimentos que pedem resposta.",
        }),
        reply: Object.freeze({
          title: "Responder",
          meta: "Contexto, decisao e resposta da mesa.",
        }),
      });
      const TARGET_TO_SECTION = Object.freeze({
        "mesa-overview": "overview",
        "mesa-resumo-geral": "overview",
        "mesa-queue": "queue",
        "mesa-busca-laudos": "queue",
        "mesa-lista-resumo": "queue",
        "lista-mesa-laudos": "queue",
        "mesa-pending": "pending",
        "mesa-alertas-operacionais": "pending",
        "mesa-triagem": "pending",
        "mesa-movimentos": "pending",
        "mesa-reply": "reply",
        "mesa-contexto": "reply",
        "mesa-resumo": "reply",
        "mesa-mensagens": "reply",
        "mesa-resposta": "reply",
        "mesa-arquivo": "reply",
        "mesa-motivo": "reply",
        "form-mesa-msg": "reply",
        "btn-mesa-aprovar": "reply",
        "btn-mesa-rejeitar": "reply",
      });

      function normalizarSecaoMesa(valor) {
        const secao = texto(valor).trim().toLowerCase();
        return SECTION_ORDER.includes(secao) ? secao : "overview";
      }

      function resolverSecaoMesaPorTarget(targetId) {
        const alvo = texto(targetId).trim().replace(/^#/, "");
        if (!alvo) return null;
        if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
        return SECTION_ORDER.includes(alvo) ? alvo : null;
      }

      function obterBotoesSecaoMesa() {
        return Array.from(
          documentRef.querySelectorAll("[data-mesa-section-tab]"),
        );
      }

      function obterPaineisSecaoMesa() {
        return Array.from(documentRef.querySelectorAll("[data-mesa-panel]"));
      }

      function definirTextoNoElemento(id, valor) {
        const node = $(id);
        if (!node) return;
        node.textContent = texto(valor);
      }

      function atualizarResumoSecaoMesa() {
        const secaoAtiva = normalizarSecaoMesa(
          state.ui?.mesaSection || state.ui?.sections?.mesa || "overview",
        );
        const definicao = SECTION_META[secaoAtiva] || SECTION_META.overview;
        const nav = documentRef.querySelector('[data-surface-nav="mesa"]');
        const laudos = state.bootstrap?.mesa?.laudos || [];
        const laudosFiltrados = filtrarLaudosMesa();
        const laudoAtivo = obterLaudoMesaSelecionado();
        const totalPendencias = laudos.reduce(
          (acc, item) => acc + Number(item.pendencias_abertas || 0),
          0,
        );
        const totalWhispers = laudos.reduce(
          (acc, item) => acc + Number(item.whispers_nao_lidos || 0),
          0,
        );
        const contagens = {
          overview: `${formatarInteiro(laudos.length)} laudos no radar`,
          queue: `${formatarInteiro(laudosFiltrados.length)} itens na fila`,
          pending: `${formatarInteiro(totalPendencias)} pendencias e ${formatarInteiro(totalWhispers)} chamados`,
          reply: texto(laudoAtivo?.titulo || "Sem laudo selecionado"),
        };

        if (nav) {
          nav.dataset.surfaceActiveSection = secaoAtiva;
        }
        definirTextoNoElemento("mesa-section-summary-title", definicao.title);
        definirTextoNoElemento("mesa-section-summary-meta", definicao.meta);
        definirTextoNoElemento(
          "mesa-section-count-overview",
          contagens.overview,
        );
        definirTextoNoElemento("mesa-section-count-queue", contagens.queue);
        definirTextoNoElemento("mesa-section-count-pending", contagens.pending);
        definirTextoNoElemento("mesa-section-count-reply", contagens.reply);
      }

      function abrirSecaoMesa(
        secao,
        { focusTab = false, syncUrl = true } = {},
      ) {
        const secaoAtiva = normalizarSecaoMesa(secao || state.ui?.mesaSection);
        state.ui.mesaSection = secaoAtiva;
        state.ui.sections = state.ui.sections || {};
        state.ui.sections.mesa = secaoAtiva;

        const tabAtiva =
          obterBotoesSecaoMesa().find(
            (button) => button.dataset.mesaSectionTab === secaoAtiva,
          ) || null;
        obterBotoesSecaoMesa().forEach((button) => {
          const ativa = button.dataset.mesaSectionTab === secaoAtiva;
          button.classList.toggle("is-active", ativa);
          button.setAttribute("aria-selected", ativa ? "true" : "false");
          button.setAttribute("aria-current", ativa ? "page" : "false");
          button.setAttribute("tabindex", ativa ? "0" : "-1");
        });
        obterPaineisSecaoMesa().forEach((panel) => {
          panel.hidden = panel.dataset.mesaPanel !== secaoAtiva;
        });
        atualizarResumoSecaoMesa();

        if (focusTab && tabAtiva) {
          tabAtiva.focus();
        }
        if (syncUrl && state.ui?.tab === "mesa") {
          sincronizarUrlDaSecao("mesa", secaoAtiva);
        }
        return secaoAtiva;
      }

      function obterLaudoMesaSelecionado() {
        return (
          (state.bootstrap?.mesa?.laudos || []).find(
            (laudo) => Number(laudo.id) === Number(state.mesa.laudoId),
          ) || null
        );
      }

      function obterLaudoMesaPorId(laudoId) {
        return (
          (state.bootstrap?.mesa?.laudos || []).find(
            (laudo) => Number(laudo.id) === Number(laudoId),
          ) || null
        );
      }

      function humanizarLifecycleStatus(valor) {
        const mapa = {
          analise_livre: "Analise livre",
          pre_laudo: "Pre-laudo",
          laudo_em_coleta: "Laudo guiado",
          aguardando_mesa: "Aguardando mesa",
          em_revisao_mesa: "Em revisao na mesa",
          devolvido_para_correcao: "Devolvido para correcao",
          aprovado: "Aprovado",
          emitido: "Emitido",
        };
        const chave = texto(valor).trim().toLowerCase();
        return mapa[chave] || "Fluxo legado";
      }

      function humanizarOwnerRole(valor) {
        const mapa = {
          inspetor: "Responsavel: campo",
          mesa: "Responsavel: mesa",
          none: "Responsavel: conclusao",
        };
        const chave = texto(valor).trim().toLowerCase();
        return mapa[chave] || "Responsavel nao definido";
      }

      function laudoAllowedSurfaceActions(laudo) {
        return Array.isArray(laudo?.allowed_surface_actions)
          ? laudo.allowed_surface_actions
              .map((item) => texto(item).trim())
              .filter(Boolean)
          : [];
      }

      function laudoHasSurfaceAction(laudo, actionKey) {
        return laudoAllowedSurfaceActions(laudo).includes(
          texto(actionKey).trim(),
        );
      }

      function resumirMomentoCanonicoMesa(laudo) {
        const lifecycleStatus = texto(laudo?.case_lifecycle_status)
          .trim()
          .toLowerCase();
        const ownerRole = texto(laudo?.active_owner_role).trim().toLowerCase();
        const statusVisualLabel = texto(
          laudo?.status_visual_label ||
            laudo?.status_revisao ||
            laudo?.status_card_label ||
            "Em revisao",
        ).trim();

        const base = {
          key: "case_monitoring",
          label: "Monitorar caso",
          detail: "Caso em acompanhamento operacional.",
          tone: "aguardando",
          lifecycleLabel: humanizarLifecycleStatus(lifecycleStatus),
          ownerLabel: humanizarOwnerRole(ownerRole),
          statusVisualLabel,
        };

        if (
          laudoHasSurfaceAction(laudo, "mesa_approve") ||
          laudoHasSurfaceAction(laudo, "mesa_return")
        ) {
          return {
            ...base,
            key: "decision_ready",
            label: "Decisao disponivel",
            detail:
              "A mesa ja pode aprovar ou devolver com orientacao objetiva.",
            tone: "aprovado",
          };
        }

        if (laudoHasSurfaceAction(laudo, "chat_finalize")) {
          return {
            ...base,
            key: "waiting_field_send",
            label: "Aguardando envio do campo",
            detail:
              "A coleta ficou pronta, mas o caso ainda depende do envio formal para a mesa.",
            tone: "aguardando",
          };
        }

        if (ownerRole === "inspetor") {
          return {
            ...base,
            key: "field_owner",
            label: "Campo em acao",
            detail:
              "O caso esta com o inspetor e pede retorno, evidencia ou novo envio.",
            tone:
              lifecycleStatus === "devolvido_para_correcao"
                ? "ajustes"
                : "aberto",
          };
        }

        if (ownerRole === "mesa") {
          return {
            ...base,
            key: "mesa_owner",
            label: "Mesa em acao",
            detail:
              "A validacao humana da mesa segue como proximo passo do caso.",
            tone: "aberto",
          };
        }

        if (lifecycleStatus === "aprovado") {
          return {
            ...base,
            key: "issue_ready",
            label: "Pronto para emissao",
            detail:
              "O caso ja foi aprovado e aguarda a etapa final documental.",
            tone: "aprovado",
          };
        }

        if (lifecycleStatus === "emitido") {
          return {
            ...base,
            key: "issued",
            label: "Emissao concluida",
            detail: "O caso ja fechou o ciclo atual com documento emitido.",
            tone: "aprovado",
          };
        }

        return base;
      }

      function renderMesaCaseSignals(laudo) {
        const resumo = resumirMomentoCanonicoMesa(laudo);
        return `
                <div class="item-case-signals" aria-label="Sinais canônicos do caso">
                    <span class="item-case-signal">Fluxo ${escapeHtml(resumo.lifecycleLabel)}</span>
                    <span class="item-case-signal">Owner ${escapeHtml(resumo.ownerLabel)}</span>
                    <span class="item-case-signal item-case-signal--focus">${escapeHtml(resumo.label)}</span>
                </div>
            `;
      }

      function renderMesaResolutionGuide(laudo) {
        const actions = laudoAllowedSurfaceActions(laudo);
        const canApprove = actions.includes("mesa_approve");
        const canReturn = actions.includes("mesa_return");
        const lifecycleStatus = texto(laudo?.case_lifecycle_status)
          .trim()
          .toLowerCase();
        const ownerRole = texto(laudo?.active_owner_role).trim().toLowerCase();

        let title = "Responder e consolidar contexto";
        let copy =
          "A mesa ainda está qualificando o caso antes da decisão final.";
        let tone = "aberto";

        if (canApprove || canReturn) {
          title = "Decisão pronta na mesa";
          copy =
            "O caso já permite aprovar ou devolver com motivo explícito no mesmo fluxo.";
          tone = "aprovado";
        } else if (
          ownerRole === "inspetor" ||
          lifecycleStatus === "devolvido_para_correcao"
        ) {
          title = "Aguardando retorno do campo";
          copy =
            "A mesa já devolveu o caso e agora depende de correção e novo envio do inspetor.";
          tone = "aguardando";
        } else if (
          lifecycleStatus === "aprovado" ||
          lifecycleStatus === "emitido" ||
          ownerRole === "none"
        ) {
          title = "Ciclo de revisão encerrado";
          copy =
            "A etapa da mesa já foi concluída e o caso segue para emissão ou reabertura.";
          tone = "aprovado";
        }

        return `
                <div class="context-guidance" data-tone="${escapeAttr(tone)}">
                    <div class="context-guidance-copy">
                        <small>Fase operacional da mesa</small>
                        <strong>${escapeHtml(title)}</strong>
                        <p>${escapeHtml(copy)}</p>
                    </div>
                    <span class="pill" data-kind="priority" data-status="${escapeAttr(tone)}">${escapeHtml(title)}</span>
                </div>
            `;
      }

      function mesaVisibilityPolicy() {
        return (
          state.bootstrap?.tenant_admin_projection?.payload
            ?.visibility_policy || {}
        );
      }

      function mesaCaseActionsEnabled() {
        return Boolean(mesaVisibilityPolicy().case_actions_enabled);
      }

      function mesaReadOnlyMode() {
        const policy = mesaVisibilityPolicy();
        return (
          Boolean(policy.case_list_visible) &&
          !Boolean(policy.case_actions_enabled)
        );
      }

      function resumirMomentoIso(valor) {
        const textoIso = texto(valor).trim();
        if (!textoIso) return "";
        return textoIso
          .replace("T", " ")
          .replace(/\.\d+/, "")
          .replace("+00:00", " UTC");
      }

      function mesaHumanOverrideLatest(laudo) {
        const envelope =
          laudo && typeof laudo.human_override_summary === "object"
            ? laudo.human_override_summary
            : null;
        const latest =
          envelope && typeof envelope.latest === "object"
            ? envelope.latest
            : null;
        return latest && typeof latest === "object" ? latest : null;
      }

      function renderMesaHumanOverrideNotice(laudo) {
        const latest = mesaHumanOverrideLatest(laudo);
        if (!latest) return "";
        const actorName = texto(latest.actor_name || "Validador humano");
        const reason = texto(
          latest.reason || "Justificativa interna registrada.",
        );
        const appliedAt = resumirMomentoIso(latest.applied_at);
        return `
                <div class="context-guidance" data-tone="aguardando">
                    <div class="context-guidance-copy">
                        <small>Override humano interno</small>
                        <strong>${escapeHtml(actorName)}${appliedAt ? ` • ${escapeHtml(appliedAt)}` : ""}</strong>
                        <p>${escapeHtml(reason)}</p>
                    </div>
                    <span class="pill" data-kind="priority" data-status="aguardando">Auditável</span>
                </div>
            `;
      }

      function renderMesaPolicyHints() {
        const readOnly = mesaReadOnlyMode();
        const textarea = $("mesa-resposta");
        const arquivo = $("mesa-arquivo");
        const motivo = $("mesa-motivo");
        const sendButton = $("btn-mesa-msg-enviar");
        const approveButton = $("btn-mesa-aprovar");
        const rejectButton = $("btn-mesa-rejeitar");
        const hasCaseSelected = Boolean(state.mesa.laudoId);
        const variant = readOnly ? "readOnly" : "editable";

        if (renderStaticContractHtml) {
          renderStaticContractHtml(
            "mesa-reply-policy-hint",
            "mesaReplyPolicyHint",
            variant,
          );
          renderStaticContractHtml(
            "mesa-reply-policy-note",
            "mesaReplyPolicyNote",
            variant,
            { hidden: !readOnly },
          );
          renderStaticContractHtml(
            "mesa-message-policy-note",
            "mesaMessagePolicyNote",
            variant,
            { hidden: false },
          );
        }

        if (textarea) {
          textarea.disabled = readOnly || !hasCaseSelected;
        }
        if (arquivo) {
          arquivo.disabled = readOnly || !hasCaseSelected;
        }
        if (motivo) {
          motivo.disabled = readOnly || !hasCaseSelected;
        }
        if (sendButton) {
          sendButton.disabled = readOnly || !hasCaseSelected;
        }
        if (approveButton) {
          approveButton.disabled = readOnly || !hasCaseSelected;
        }
        if (rejectButton) {
          rejectButton.disabled = readOnly || !hasCaseSelected;
        }
      }

      function renderMesaList() {
        const laudos = ordenarPorPrioridade(
          filtrarLaudosMesa(),
          prioridadeMesa,
        );
        const lista = $("lista-mesa-laudos");
        const resumo = $("mesa-lista-resumo");
        const filtroAtivo = rotuloSituacaoMesa(state.ui.mesaSituacao);
        if (!lista || !resumo) return;

        const totalPendencias = (state.bootstrap?.mesa?.laudos || []).reduce(
          (acc, item) => acc + Number(item.pendencias_abertas || 0),
          0,
        );
        const totalWhispers = (state.bootstrap?.mesa?.laudos || []).reduce(
          (acc, item) => acc + Number(item.whispers_nao_lidos || 0),
          0,
        );

        const chipsResumo = [
          `${formatarInteiro(totalPendencias)} pendencias abertas`,
          `${formatarInteiro(totalWhispers)} chamados pendentes`,
        ];
        if (filtroAtivo) {
          chipsResumo.push(`Filtro rapido: ${filtroAtivo}`);
        }
        renderHeroChipList(resumo, chipsResumo);

        if (!laudos.length) {
          renderEmptyState(lista, {
            title: "Nenhum laudo na fila da mesa",
            detail:
              "Quando o chat da empresa enviar laudos para revisao, eles aparecem aqui.",
          });
          atualizarResumoSecaoMesa();
          return;
        }

        lista.innerHTML = laudos
          .map(
            (laudo) => `
                <article class="item ${Number(state.mesa.laudoId) === Number(laudo.id) ? "active" : ""}" data-mesa="${laudo.id}" data-case-flow-summary="${escapeAttr(resumirMomentoCanonicoMesa(laudo).key)}" tabindex="0">
                    <div class="item-head">
                        <strong>${escapeHtml(laudo.titulo)}</strong>
                        ${laudoBadge(laudo.status_card_label, laudo.status_card)}
                    </div>
                    <div class="item-preview">${escapeHtml(laudo.preview || "Sem resumo registrado.")}</div>
                    ${renderMesaCaseSignals(laudo)}
                    <div class="item-footer">
                        <span class="pill" data-kind="priority" data-status="${prioridadeMesa(laudo).tone}">${escapeHtml(prioridadeMesa(laudo).badge)}</span>
                        <span class="hero-chip">${formatarInteiro(laudo.pendencias_abertas || 0)} pendencias</span>
                        <span class="hero-chip">${formatarInteiro(laudo.whispers_nao_lidos || 0)} chamados</span>
                        ${laudoMesaParado(laudo) ? `<span class="hero-chip">${escapeHtml(resumoEsperaHoras(horasDesdeAtualizacao(laudo.atualizado_em)))}</span>` : ""}
                    </div>
                </article>
            `,
          )
          .join("");
        atualizarResumoSecaoMesa();
      }

      function renderMesaTriagem() {
        const container = $("mesa-triagem");
        const laudos = state.bootstrap?.mesa?.laudos || [];
        if (!container) return;

        const responder = ordenarPorPrioridade(
          laudos.filter((item) => Number(item?.whispers_nao_lidos || 0) > 0),
          prioridadeMesa,
        );
        const pendencias = ordenarPorPrioridade(
          laudos.filter((item) => Number(item?.pendencias_abertas || 0) > 0),
          prioridadeMesa,
        );
        const aguardando = ordenarPorPrioridade(
          laudos.filter(
            (item) =>
              variantStatusLaudo(item.status_card) === "aguardando" &&
              Number(item?.whispers_nao_lidos || 0) <= 0 &&
              Number(item?.pendencias_abertas || 0) <= 0,
          ),
          prioridadeMesa,
        );
        const parados = ordenarPorPrioridade(
          laudos.filter((item) => laudoMesaParado(item)),
          prioridadeMesa,
        );
        const filtroAtivo = rotuloSituacaoMesa(state.ui.mesaSituacao);
        const destaque =
          responder[0] || pendencias[0] || parados[0] || aguardando[0] || null;

        container.innerHTML = `
                <div class="toolbar-meta">
                    <button class="btn" type="button" data-act="filtrar-mesa-status" data-situacao="responder">Ver respostas novas</button>
                    <button class="btn" type="button" data-act="filtrar-mesa-status" data-situacao="pendencias">Ver pendencias</button>
                    <button class="btn" type="button" data-act="filtrar-mesa-status" data-situacao="aguardando">Ver prontos para revisar</button>
                    <button class="btn" type="button" data-act="filtrar-mesa-status" data-situacao="parados">Ver parados</button>
                    <button class="btn ghost" type="button" data-act="limpar-mesa-filtro">Limpar filtro rapido</button>
                    ${filtroAtivo ? `<span class="hero-chip">Filtro rapido: ${escapeHtml(filtroAtivo)}</span>` : ""}
                </div>
                ${
                  destaque
                    ? `
                    <article class="activity-item">
                        <div class="activity-head">
                            <div class="activity-copy">
                                <strong>${escapeHtml(destaque.titulo || "Laudo da mesa")}</strong>
                                <span class="activity-meta">${escapeHtml(destaque.status_visual_label || destaque.status_revisao || destaque.status_card_label || "Em revisão")} • ${escapeHtml(destaque.data_br || "Sem data")}</span>
                            </div>
                            <span class="pill" data-kind="priority" data-status="${escapeAttr(prioridadeMesa(destaque).tone)}">${escapeHtml(prioridadeMesa(destaque).badge)}</span>
                        </div>
                        <p class="activity-detail">${escapeHtml(prioridadeMesa(destaque).acao)}${laudoMesaParado(destaque) ? ` ${resumoEsperaHoras(horasDesdeAtualizacao(destaque.atualizado_em))}.` : ""}</p>
                        <div class="toolbar-meta">
                            <button class="btn" type="button" data-act="abrir-prioridade" data-kind="mesa-laudo" data-canal="mesa" data-laudo="${escapeAttr(String(destaque.id || ""))}" data-target="mesa-contexto">Abrir laudo prioritario</button>
                        </div>
                    </article>
                `
                    : `
                    <div class="empty-state">
                        <strong>Mesa em dia</strong>
                        <p>Nenhum chamado ou pendencia urgente apareceu agora. Use os filtros rapidos para revisar a fila por estado.</p>
                    </div>
                `
                }
            `;
        atualizarResumoSecaoMesa();
      }

      function renderMesaMovimentos() {
        const container = $("mesa-movimentos");
        const laudos = ordenarPorPrioridade(
          state.bootstrap?.mesa?.laudos || [],
          (item) => ({
            score: parseDataIso(item?.atualizado_em),
          }),
        ).slice(0, 3);
        if (!container) return;

        if (!laudos.length) {
          container.innerHTML = `
                    <div class="empty-state">
                        <strong>Sem movimentos recentes na mesa</strong>
                        <p>Assim que a empresa receber chamados, pendencias ou aprovacoes, o resumo aparece aqui.</p>
                    </div>
                `;
          return;
        }

        container.innerHTML = `
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>Movimentos recentes da mesa</strong>
                            <span class="activity-meta">Os laudos mais novos tocados na fila da Mesa Avaliadora.</span>
                        </div>
                        <span class="hero-chip">${formatarInteiro(laudos.length)} recentes</span>
                    </div>
                    <div class="activity-list">
                        ${laudos
                          .map(
                            (laudo) => `
                            <article class="activity-item">
                                <div class="activity-head">
                                    <div class="activity-copy">
                                        <strong>${escapeHtml(laudo.titulo || "Laudo da mesa")}</strong>
                                        <span class="activity-meta">${escapeHtml(laudo.data_br || "Sem data")} • ${escapeHtml(laudo.status_visual_label || laudo.status_revisao || laudo.status_card_label || "Em revisao")}</span>
                                    </div>
                                    <span class="pill" data-kind="priority" data-status="${escapeAttr(prioridadeMesa(laudo).tone)}">${escapeHtml(prioridadeMesa(laudo).badge)}</span>
                                </div>
                                <p class="activity-detail">${escapeHtml(laudo.preview || "Sem resumo recente na mesa.")}</p>
                                <div class="toolbar-meta">
                                    <span class="hero-chip">${formatarInteiro(laudo.pendencias_abertas || 0)} pendencias</span>
                                    <span class="hero-chip">${formatarInteiro(laudo.whispers_nao_lidos || 0)} chamados</span>
                                    ${laudoMesaParado(laudo) ? `<span class="hero-chip">${escapeHtml(resumoEsperaHoras(horasDesdeAtualizacao(laudo.atualizado_em)))}</span>` : ""}
                                    <button class="btn" type="button" data-act="abrir-prioridade" data-kind="mesa-laudo" data-canal="mesa" data-laudo="${escapeAttr(String(laudo.id || ""))}" data-target="mesa-contexto">Abrir laudo</button>
                                </div>
                            </article>
                        `,
                          )
                          .join("")}
                    </div>
                </article>
            `;
        atualizarResumoSecaoMesa();
      }

      function renderMesaContext() {
        const alvo = obterLaudoMesaSelecionado();
        const contexto = $("mesa-contexto");
        const aprovar = $("btn-mesa-aprovar");
        const rejeitar = $("btn-mesa-rejeitar");
        const caseActionsEnabled = mesaCaseActionsEnabled();
        if (!contexto || !aprovar || !rejeitar) return;

        if (!alvo) {
          contexto.innerHTML = `
                    <div class="empty-state">
                        <strong>Selecione um laudo para revisar</strong>
                        <p>O painel da mesa mostra pendencias, chamados e historico do laudo selecionado.</p>
                    </div>
                `;
          aprovar.disabled = true;
          rejeitar.disabled = true;
          $("mesa-titulo").textContent = "Selecione um laudo";
          renderMesaPolicyHints();
          atualizarResumoSecaoMesa();
          return;
        }

        const prioridade = prioridadeMesa(alvo);
        const momentoCanonico = resumirMomentoCanonicoMesa(alvo);
        const canApprove =
          caseActionsEnabled && laudoHasSurfaceAction(alvo, "mesa_approve");
        const canReturn =
          caseActionsEnabled && laudoHasSurfaceAction(alvo, "mesa_return");
        $("mesa-titulo").textContent = alvo.titulo || "Laudo selecionado";
        aprovar.disabled = !canApprove;
        rejeitar.disabled = !canReturn;

        contexto.innerHTML = `
                <div class="context-card">
                    <div class="context-head">
                        <div>
                            <div class="context-title">${escapeHtml(alvo.titulo)}</div>
                            <div class="context-subtitle">${escapeHtml(alvo.preview || "Sem resumo de campo.")}</div>
                        </div>
                        <div class="context-actions">
                            ${laudoBadge(alvo.status_card_label, alvo.status_card)}
                        </div>
                    </div>
                    <div class="context-grid">
                        <div class="context-block">
                            <small>Pendencias abertas</small>
                            <strong>${formatarInteiro(alvo.pendencias_abertas || 0)}</strong>
                        </div>
                        <div class="context-block">
                            <small>Chamados nao lidos</small>
                            <strong>${formatarInteiro(alvo.whispers_nao_lidos || 0)}</strong>
                        </div>
                        <div class="context-block">
                            <small>Atualizado em</small>
                            <strong>${escapeHtml(alvo.data_br || "Sem data")}</strong>
                        </div>
                        <div class="context-block">
                            <small>Fluxo do caso</small>
                            <strong>${escapeHtml(`${humanizarLifecycleStatus(alvo.case_lifecycle_status)} / ${humanizarOwnerRole(alvo.active_owner_role)}`)}</strong>
                        </div>
                    </div>
                    <div class="item-case-signals" aria-label="Sinais canônicos do caso">
                        <span class="item-case-signal">Status ${escapeHtml(momentoCanonico.statusVisualLabel)}</span>
                        <span class="item-case-signal">Fluxo ${escapeHtml(momentoCanonico.lifecycleLabel)}</span>
                        <span class="item-case-signal">Owner ${escapeHtml(momentoCanonico.ownerLabel)}</span>
                        <span class="item-case-signal item-case-signal--focus">${escapeHtml(momentoCanonico.label)}</span>
                    </div>
                    <div class="context-guidance" data-tone="${prioridade.tone}">
                        <div class="context-guidance-copy">
                            <small>Proximo passo recomendado</small>
                            <strong>${escapeHtml(prioridade.badge)}</strong>
                            <p>${escapeHtml(prioridade.acao)}</p>
                        </div>
                        <span class="pill" data-kind="priority" data-status="${prioridade.tone}">${escapeHtml(prioridade.badge)}</span>
                    </div>
                    <div class="context-guidance" data-tone="${momentoCanonico.tone}">
                        <div class="context-guidance-copy">
                            <small>Momento canônico do caso</small>
                            <strong>${escapeHtml(momentoCanonico.label)}</strong>
                            <p>${escapeHtml(momentoCanonico.detail)}</p>
                        </div>
                        <span class="pill" data-kind="priority" data-status="${momentoCanonico.tone}">${escapeHtml(momentoCanonico.lifecycleLabel)}</span>
                    </div>
                    ${renderMesaResolutionGuide(alvo)}
                    ${renderMesaHumanOverrideNotice(alvo)}
                    ${
                      laudoMesaParado(alvo)
                        ? `
                        <div class="context-guidance" data-tone="aguardando">
                            <div class="context-guidance-copy">
                                <small>Fila parada</small>
                                <strong>${escapeHtml(resumoEsperaHoras(horasDesdeAtualizacao(alvo.atualizado_em)))}</strong>
                                <p>Vale revisar este laudo para nao deixar a mesa esfriar com pendencias ou resposta em aberto.</p>
                            </div>
                            <span class="pill" data-kind="priority" data-status="aguardando">Retomar</span>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
        renderMesaPolicyHints();
        atualizarResumoSecaoMesa();
      }

      function renderMesaResumoGeral() {
        const container = $("mesa-resumo-geral");
        const laudos = state.bootstrap?.mesa?.laudos || [];
        const selecionado = obterLaudoMesaSelecionado();
        const prioridade = selecionado ? prioridadeMesa(selecionado) : null;
        const momentoSelecionado = selecionado
          ? resumirMomentoCanonicoMesa(selecionado)
          : null;
        if (!container) return;

        const comAcaoAgora = laudos.filter(
          (item) =>
            Number(item.pendencias_abertas || 0) > 0 ||
            Number(item.whispers_nao_lidos || 0) > 0,
        ).length;
        const totalPendencias = laudos.reduce(
          (acc, item) => acc + Number(item.pendencias_abertas || 0),
          0,
        );
        const totalWhispers = laudos.reduce(
          (acc, item) => acc + Number(item.whispers_nao_lidos || 0),
          0,
        );
        const prontosParaRevisar = laudos.filter(
          (item) => resumirMomentoCanonicoMesa(item).key === "decision_ready",
        ).length;
        const emCampo = laudos.filter(
          (item) => resumirMomentoCanonicoMesa(item).key === "field_owner",
        ).length;

        container.innerHTML = `
                <article class="metric-card" data-accent="attention">
                    <small>Acao agora</small>
                    <strong>${formatarInteiro(comAcaoAgora)}</strong>
                    <span class="metric-meta">Laudos com chamado novo ou pendencia aberta pedindo resposta imediata.</span>
                </article>
                <article class="metric-card" data-accent="waiting">
                    <small>Pendencias abertas</small>
                    <strong>${formatarInteiro(totalPendencias)}</strong>
                    <span class="metric-meta">${formatarInteiro(totalWhispers)} chamados ainda aguardam leitura da mesa.</span>
                </article>
                <article class="metric-card" data-accent="live">
                    <small>Decisao disponivel</small>
                    <strong>${formatarInteiro(prontosParaRevisar)}</strong>
                    <span class="metric-meta">${formatarInteiro(emCampo)} caso(s) ainda estao com o campo como owner ativo.</span>
                </article>
                <article class="metric-card" data-accent="${momentoSelecionado ? momentoSelecionado.tone : prioridade ? prioridade.tone : "done"}">
                    <small>Foco do laudo selecionado</small>
                    <strong>${escapeHtml(momentoSelecionado ? momentoSelecionado.label : prioridade ? prioridade.badge : "Sem selecao")}</strong>
                    <span class="metric-meta">${escapeHtml(momentoSelecionado ? momentoSelecionado.detail : "Escolha um laudo da fila para ver a acao recomendada.")}</span>
                </article>
            `;
        atualizarResumoSecaoMesa();
      }

      function renderMesaResumo() {
        const pacote = state.mesa.pacote;
        const container = $("mesa-resumo");
        if (!container) return;

        if (!pacote) {
          clearElement(container);
          atualizarResumoSecaoMesa();
          return;
        }

        container.innerHTML = `
                <article class="metric-card">
                    <small>Pendencias abertas</small>
                    <strong>${formatarInteiro(pacote.resumo_pendencias?.abertas || 0)}</strong>
                    <span class="metric-meta">${formatarInteiro(pacote.resumo_pendencias?.resolvidas || 0)} resolvidas recentes</span>
                </article>
                <article class="metric-card">
                    <small>Chamados recentes</small>
                    <strong>${formatarInteiro((pacote.whispers_recentes || []).length)}</strong>
                    <span class="metric-meta">${formatarInteiro(pacote.resumo_mensagens?.inspetor || 0)} mensagens do inspetor</span>
                </article>
                <article class="metric-card">
                    <small>Interacoes da mesa</small>
                    <strong>${formatarInteiro(pacote.resumo_mensagens?.mesa || 0)}</strong>
                    <span class="metric-meta">${formatarInteiro(pacote.resumo_evidencias?.documentos || 0)} documentos e ${formatarInteiro(pacote.resumo_evidencias?.fotos || 0)} fotos</span>
                </article>
            `;
        atualizarResumoSecaoMesa();
      }

      function tituloMensagemMesa(mensagem) {
        if (mensagem.is_whisper) return "Chamado do inspetor";
        if (texto(mensagem.tipo) === "humano_eng") {
          return mensagem.lida ? "Pendencia resolvida" : "Pendencia da mesa";
        }
        return "Resposta da mesa";
      }

      function classeMensagemMesa(mensagem) {
        if (mensagem.is_whisper) return "msg--whisper";
        if (texto(mensagem.tipo) === "humano_eng") return "msg--mesa";
        return "msg--assistente";
      }

      function renderMesaMensagens() {
        const container = $("mesa-mensagens");
        const mensagens = Array.isArray(state.mesa.mensagens)
          ? state.mesa.mensagens
          : [];
        if (!container) return;

        if (!mensagens.length) {
          renderEmptyState(container, {
            title: "Nada carregado ainda",
            detail:
              "As respostas da mesa, chamados e anexos deste laudo aparecem aqui.",
          });
          atualizarResumoSecaoMesa();
          return;
        }

        clearElement(container);
        mensagens.forEach((mensagem) => {
          const pendencia = texto(mensagem.tipo) === "humano_eng";
          const article = documentRef.createElement("article");
          article.className = `msg ${classeMensagemMesa(mensagem)}`;

          const head = documentRef.createElement("div");
          head.className = "msg-head";
          const meta = documentRef.createElement("div");
          meta.className = "msg-meta";

          const title = documentRef.createElement("span");
          title.className = "msg-title";
          title.textContent = tituloMensagemMesa(mensagem);
          meta.appendChild(title);

          const time = documentRef.createElement("span");
          time.className = "msg-time";
          time.textContent = texto(mensagem.data || "Agora");
          meta.appendChild(time);

          if (pendencia) {
            const status = documentRef.createElement("span");
            status.className = "pill";
            status.dataset.kind = "status";
            status.dataset.status = mensagem.lida ? "ativo" : "temporaria";
            status.textContent = mensagem.lida ? "Resolvida" : "Aberta";
            meta.appendChild(status);
          }

          head.appendChild(meta);
          article.appendChild(head);

          const body = documentRef.createElement("div");
          body.className = "msg-body";
          if (appendTextWithBreaks) {
            appendTextWithBreaks(body, mensagem.texto || "(sem conteudo)");
          } else {
            body.innerHTML = textoComQuebras(mensagem.texto || "(sem conteudo)");
          }
          article.appendChild(body);

          if (mensagem.resolvida_em_label) {
            const resolucao = documentRef.createElement("div");
            resolucao.className = "msg-time";
            const resolvedBy = mensagem.resolvida_por_nome
              ? ` por ${texto(mensagem.resolvida_por_nome)}`
              : "";
            resolucao.textContent = `Resolvida em ${texto(mensagem.resolvida_em_label)}${resolvedBy}`;
            article.appendChild(resolucao);
          }

          if (appendAnexos) {
            appendAnexos(article, mensagem.anexos);
          } else {
            article.insertAdjacentHTML("beforeend", renderAnexos(mensagem.anexos));
          }

          if (pendencia) {
            const actions = documentRef.createElement("div");
            actions.className = "msg-actions";
            const button = documentRef.createElement("button");
            button.className = "btn";
            button.type = "button";
            button.dataset.act = "toggle-pendencia";
            button.dataset.id = texto(mensagem.id);
            button.dataset.lida = mensagem.lida ? "1" : "0";
            button.textContent = mensagem.lida
              ? "Reabrir pendencia"
              : "Marcar resolvida";
            actions.appendChild(button);
            article.appendChild(actions);
          }

          container.appendChild(article);
        });
        atualizarResumoSecaoMesa();
      }

      return {
        abrirSecaoMesa,
        laudoHasSurfaceAction,
        obterLaudoMesaPorId,
        obterLaudoMesaSelecionado,
        resolverSecaoMesaPorTarget,
        renderMesaContext,
        renderMesaList,
        renderMesaMensagens,
        renderMesaMovimentos,
        renderMesaResumo,
        renderMesaResumoGeral,
        renderMesaTriagem,
      };
    };
})();
