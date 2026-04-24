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

      function criarMesaCaseSignalsNode(laudo) {
        const resumo = resumirMomentoCanonicoMesa(laudo);
        const signals = documentRef.createElement("div");
        signals.className = "item-case-signals";
        signals.setAttribute("aria-label", "Sinais canônicos do caso");

        [
          `Fluxo ${resumo.lifecycleLabel}`,
          `Owner ${resumo.ownerLabel}`,
          resumo.label,
        ].forEach((label, index) => {
          const signal = documentRef.createElement("span");
          signal.className =
            index === 2
              ? "item-case-signal item-case-signal--focus"
              : "item-case-signal";
          signal.textContent = texto(label);
          signals.appendChild(signal);
        });

        return signals;
      }

      function criarMesaContextBlockNode(labelText, valueText) {
        const block = documentRef.createElement("div");
        block.className = "context-block";
        const label = documentRef.createElement("small");
        label.textContent = texto(labelText);
        block.appendChild(label);
        const value = documentRef.createElement("strong");
        value.textContent = texto(valueText);
        block.appendChild(value);
        return block;
      }

      function criarMesaMetricCardNode({ accent, label, value, meta }) {
        const card = documentRef.createElement("article");
        card.className = "metric-card";
        if (accent) {
          card.dataset.accent = texto(accent).trim();
        }
        const labelNode = documentRef.createElement("small");
        labelNode.textContent = texto(label);
        card.appendChild(labelNode);
        const valueNode = documentRef.createElement("strong");
        valueNode.textContent = texto(value);
        card.appendChild(valueNode);
        const metaNode = documentRef.createElement("span");
        metaNode.className = "metric-meta";
        metaNode.textContent = texto(meta);
        card.appendChild(metaNode);
        return card;
      }

      function appendMesaTextWithBreaks(target, value) {
        if (appendTextWithBreaks) {
          appendTextWithBreaks(target, value);
          return;
        }
        texto(value || "")
          .split("\n")
          .forEach((linha, index) => {
            if (index > 0) {
              target.appendChild(documentRef.createElement("br"));
            }
            target.appendChild(documentRef.createTextNode(linha));
          });
      }

      function criarMesaContextGuidanceNode({
        tone,
        eyebrow,
        title,
        detail,
        pillText,
        pillTone,
      }) {
        const guidance = documentRef.createElement("div");
        guidance.className = "context-guidance";
        guidance.dataset.tone = texto(tone).trim();

        const copy = documentRef.createElement("div");
        copy.className = "context-guidance-copy";
        const eyebrowNode = documentRef.createElement("small");
        eyebrowNode.textContent = texto(eyebrow);
        copy.appendChild(eyebrowNode);
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        copy.appendChild(titleNode);
        const detailNode = documentRef.createElement("p");
        detailNode.textContent = texto(detail);
        copy.appendChild(detailNode);
        guidance.appendChild(copy);

        const pill = documentRef.createElement("span");
        pill.className = "pill";
        pill.dataset.kind = "priority";
        pill.dataset.status = texto(pillTone || tone).trim();
        pill.textContent = texto(pillText || title);
        guidance.appendChild(pill);
        return guidance;
      }

      function mesaResolutionGuideConfig(laudo) {
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

        return { title, copy, tone };
      }

      function criarMesaResolutionGuideNode(laudo) {
        const guide = mesaResolutionGuideConfig(laudo);
        return criarMesaContextGuidanceNode({
          tone: guide.tone,
          eyebrow: "Fase operacional da mesa",
          title: guide.title,
          detail: guide.copy,
          pillText: guide.title,
          pillTone: guide.tone,
        });
      }

      function criarMesaContextCaseSignalsNode(momentoCanonico) {
        const signals = documentRef.createElement("div");
        signals.className = "item-case-signals";
        signals.setAttribute("aria-label", "Sinais canônicos do caso");

        [
          `Status ${momentoCanonico.statusVisualLabel}`,
          `Fluxo ${momentoCanonico.lifecycleLabel}`,
          `Owner ${momentoCanonico.ownerLabel}`,
          momentoCanonico.label,
        ].forEach((label, index) => {
          const signal = documentRef.createElement("span");
          signal.className =
            index === 3
              ? "item-case-signal item-case-signal--focus"
              : "item-case-signal";
          signal.textContent = texto(label);
          signals.appendChild(signal);
        });

        return signals;
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

      function criarMesaHumanOverrideNoticeNode(laudo) {
        const latest = mesaHumanOverrideLatest(laudo);
        if (!latest) return null;
        const actorName = texto(latest.actor_name || "Validador humano");
        const reason = texto(
          latest.reason || "Justificativa interna registrada.",
        );
        const appliedAt = resumirMomentoIso(latest.applied_at);
        return criarMesaContextGuidanceNode({
          tone: "aguardando",
          eyebrow: "Override humano interno",
          title: `${actorName}${appliedAt ? ` • ${appliedAt}` : ""}`,
          detail: reason,
          pillText: "Auditável",
          pillTone: "aguardando",
        });
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

      function criarMesaLaudoItem(laudo) {
        const prioridade = prioridadeMesa(laudo);
        const resumoCanonico = resumirMomentoCanonicoMesa(laudo);
        const item = documentRef.createElement("article");
        item.className = "item";
        if (Number(state.mesa.laudoId) === Number(laudo.id)) {
          item.classList.add("active");
        }
        item.dataset.mesa = String(laudo.id || "");
        item.dataset.caseFlowSummary = texto(resumoCanonico.key).trim();
        item.tabIndex = 0;

        const head = documentRef.createElement("div");
        head.className = "item-head";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo);
        head.appendChild(title);
        const badgeHtml = laudoBadge(laudo.status_card_label, laudo.status_card);
        if (badgeHtml) {
          head.insertAdjacentHTML("beforeend", badgeHtml);
        }
        item.appendChild(head);

        const preview = documentRef.createElement("div");
        preview.className = "item-preview";
        preview.textContent = texto(laudo.preview || "Sem resumo registrado.");
        item.appendChild(preview);
        item.appendChild(criarMesaCaseSignalsNode(laudo));

        const footer = documentRef.createElement("div");
        footer.className = "item-footer";

        const prioridadeChip = documentRef.createElement("span");
        prioridadeChip.className = "pill";
        prioridadeChip.dataset.kind = "priority";
        prioridadeChip.dataset.status = texto(prioridade.tone).trim();
        prioridadeChip.textContent = texto(prioridade.badge);
        footer.appendChild(prioridadeChip);

        const pendenciasChip = documentRef.createElement("span");
        pendenciasChip.className = "hero-chip";
        pendenciasChip.textContent = `${formatarInteiro(laudo.pendencias_abertas || 0)} pendencias`;
        footer.appendChild(pendenciasChip);

        const whispersChip = documentRef.createElement("span");
        whispersChip.className = "hero-chip";
        whispersChip.textContent = `${formatarInteiro(laudo.whispers_nao_lidos || 0)} chamados`;
        footer.appendChild(whispersChip);

        if (laudoMesaParado(laudo)) {
          const esperaChip = documentRef.createElement("span");
          esperaChip.className = "hero-chip";
          esperaChip.textContent = resumoEsperaHoras(
            horasDesdeAtualizacao(laudo.atualizado_em),
          );
          footer.appendChild(esperaChip);
        }

        item.appendChild(footer);
        return item;
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

        clearElement(lista);
        laudos.forEach((laudo) => {
          lista.appendChild(criarMesaLaudoItem(laudo));
        });
        atualizarResumoSecaoMesa();
      }

      function criarMesaEmptyStateNode(titleText, detailText) {
        const empty = documentRef.createElement("div");
        empty.className = "empty-state";
        const title = documentRef.createElement("strong");
        title.textContent = texto(titleText);
        empty.appendChild(title);
        const detail = documentRef.createElement("p");
        detail.textContent = texto(detailText);
        empty.appendChild(detail);
        return empty;
      }

      function criarMesaToolbarButton(label, situacao, { ghost = false } = {}) {
        const button = documentRef.createElement("button");
        button.className = ghost ? "btn ghost" : "btn";
        button.type = "button";
        button.dataset.act = situacao
          ? "filtrar-mesa-status"
          : "limpar-mesa-filtro";
        if (situacao) {
          button.dataset.situacao = situacao;
        }
        button.textContent = label;
        return button;
      }

      function criarMesaTriagemToolbar(filtroAtivo) {
        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        [
          ["Ver respostas novas", "responder"],
          ["Ver pendencias", "pendencias"],
          ["Ver prontos para revisar", "aguardando"],
          ["Ver parados", "parados"],
        ].forEach(([label, situacao]) => {
          toolbar.appendChild(criarMesaToolbarButton(label, situacao));
        });
        toolbar.appendChild(
          criarMesaToolbarButton("Limpar filtro rapido", "", { ghost: true }),
        );
        if (filtroAtivo) {
          const chip = documentRef.createElement("span");
          chip.className = "hero-chip";
          chip.textContent = `Filtro rapido: ${filtroAtivo}`;
          toolbar.appendChild(chip);
        }
        return toolbar;
      }

      function criarMesaPrioridadeActivity(laudo) {
        const prioridade = prioridadeMesa(laudo);
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo || "Laudo da mesa");
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent = `${texto(laudo.status_visual_label || laudo.status_revisao || laudo.status_card_label || "Em revisão")} • ${texto(laudo.data_br || "Sem data")}`;
        copy.appendChild(title);
        copy.appendChild(meta);
        head.appendChild(copy);

        const pill = documentRef.createElement("span");
        pill.className = "pill";
        pill.dataset.kind = "priority";
        pill.dataset.status = texto(prioridade.tone).trim();
        pill.textContent = texto(prioridade.badge);
        head.appendChild(pill);
        article.appendChild(head);

        const detail = documentRef.createElement("p");
        detail.className = "activity-detail";
        detail.textContent = `${texto(prioridade.acao)}${laudoMesaParado(laudo) ? ` ${resumoEsperaHoras(horasDesdeAtualizacao(laudo.atualizado_em))}.` : ""}`;
        article.appendChild(detail);

        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        const button = documentRef.createElement("button");
        button.className = "btn";
        button.type = "button";
        button.dataset.act = "abrir-prioridade";
        button.dataset.kind = "mesa-laudo";
        button.dataset.canal = "mesa";
        button.dataset.laudo = String(laudo.id || "");
        button.dataset.target = "mesa-contexto";
        button.textContent = "Abrir laudo prioritario";
        toolbar.appendChild(button);
        article.appendChild(toolbar);

        return article;
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

        clearElement(container);
        container.appendChild(criarMesaTriagemToolbar(filtroAtivo));
        container.appendChild(
          destaque
            ? criarMesaPrioridadeActivity(destaque)
            : criarMesaEmptyStateNode(
                "Mesa em dia",
                "Nenhum chamado ou pendencia urgente apareceu agora. Use os filtros rapidos para revisar a fila por estado.",
              ),
        );
        atualizarResumoSecaoMesa();
      }

      function criarMesaMovimentoItem(laudo) {
        const prioridade = prioridadeMesa(laudo);
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo || "Laudo da mesa");
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent = `${texto(laudo.data_br || "Sem data")} • ${texto(laudo.status_visual_label || laudo.status_revisao || laudo.status_card_label || "Em revisao")}`;
        copy.appendChild(title);
        copy.appendChild(meta);
        head.appendChild(copy);

        const pill = documentRef.createElement("span");
        pill.className = "pill";
        pill.dataset.kind = "priority";
        pill.dataset.status = texto(prioridade.tone).trim();
        pill.textContent = texto(prioridade.badge);
        head.appendChild(pill);
        article.appendChild(head);

        const detail = documentRef.createElement("p");
        detail.className = "activity-detail";
        detail.textContent = texto(laudo.preview || "Sem resumo recente na mesa.");
        article.appendChild(detail);

        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        const pendenciasChip = documentRef.createElement("span");
        pendenciasChip.className = "hero-chip";
        pendenciasChip.textContent = `${formatarInteiro(laudo.pendencias_abertas || 0)} pendencias`;
        toolbar.appendChild(pendenciasChip);

        const whispersChip = documentRef.createElement("span");
        whispersChip.className = "hero-chip";
        whispersChip.textContent = `${formatarInteiro(laudo.whispers_nao_lidos || 0)} chamados`;
        toolbar.appendChild(whispersChip);

        if (laudoMesaParado(laudo)) {
          const esperaChip = documentRef.createElement("span");
          esperaChip.className = "hero-chip";
          esperaChip.textContent = resumoEsperaHoras(
            horasDesdeAtualizacao(laudo.atualizado_em),
          );
          toolbar.appendChild(esperaChip);
        }

        const button = documentRef.createElement("button");
        button.className = "btn";
        button.type = "button";
        button.dataset.act = "abrir-prioridade";
        button.dataset.kind = "mesa-laudo";
        button.dataset.canal = "mesa";
        button.dataset.laudo = String(laudo.id || "");
        button.dataset.target = "mesa-contexto";
        button.textContent = "Abrir laudo";
        toolbar.appendChild(button);
        article.appendChild(toolbar);

        return article;
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
          clearElement(container);
          container.appendChild(
            criarMesaEmptyStateNode(
              "Sem movimentos recentes na mesa",
              "Assim que a empresa receber chamados, pendencias ou aprovacoes, o resumo aparece aqui.",
            ),
          );
          return;
        }

        clearElement(container);
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const title = documentRef.createElement("strong");
        title.textContent = "Movimentos recentes da mesa";
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent = "Os laudos mais novos tocados na fila da Mesa Avaliadora.";
        copy.appendChild(title);
        copy.appendChild(meta);
        head.appendChild(copy);

        const count = documentRef.createElement("span");
        count.className = "hero-chip";
        count.textContent = `${formatarInteiro(laudos.length)} recentes`;
        head.appendChild(count);
        article.appendChild(head);

        const list = documentRef.createElement("div");
        list.className = "activity-list";
        laudos.forEach((laudo) => {
          list.appendChild(criarMesaMovimentoItem(laudo));
        });
        article.appendChild(list);
        container.appendChild(article);
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
          clearElement(contexto);
          contexto.appendChild(
            criarMesaEmptyStateNode(
              "Selecione um laudo para revisar",
              "O painel da mesa mostra pendencias, chamados e historico do laudo selecionado.",
            ),
          );
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

        const card = documentRef.createElement("div");
        card.className = "context-card";

        const head = documentRef.createElement("div");
        head.className = "context-head";
        const copy = documentRef.createElement("div");
        const title = documentRef.createElement("div");
        title.className = "context-title";
        title.textContent = texto(alvo.titulo);
        copy.appendChild(title);
        const subtitle = documentRef.createElement("div");
        subtitle.className = "context-subtitle";
        subtitle.textContent = texto(alvo.preview || "Sem resumo de campo.");
        copy.appendChild(subtitle);
        head.appendChild(copy);

        const actions = documentRef.createElement("div");
        actions.className = "context-actions";
        const badgeHtml = laudoBadge(alvo.status_card_label, alvo.status_card);
        if (badgeHtml) {
          actions.insertAdjacentHTML("beforeend", badgeHtml);
        }
        head.appendChild(actions);
        card.appendChild(head);

        const grid = documentRef.createElement("div");
        grid.className = "context-grid";
        [
          ["Pendencias abertas", formatarInteiro(alvo.pendencias_abertas || 0)],
          ["Chamados nao lidos", formatarInteiro(alvo.whispers_nao_lidos || 0)],
          ["Atualizado em", alvo.data_br || "Sem data"],
          [
            "Fluxo do caso",
            `${humanizarLifecycleStatus(alvo.case_lifecycle_status)} / ${humanizarOwnerRole(alvo.active_owner_role)}`,
          ],
        ].forEach(([label, value]) => {
          grid.appendChild(criarMesaContextBlockNode(label, value));
        });
        card.appendChild(grid);

        card.appendChild(criarMesaContextCaseSignalsNode(momentoCanonico));
        card.appendChild(
          criarMesaContextGuidanceNode({
            tone: prioridade.tone,
            eyebrow: "Proximo passo recomendado",
            title: prioridade.badge,
            detail: prioridade.acao,
            pillText: prioridade.badge,
            pillTone: prioridade.tone,
          }),
        );
        card.appendChild(
          criarMesaContextGuidanceNode({
            tone: momentoCanonico.tone,
            eyebrow: "Momento canônico do caso",
            title: momentoCanonico.label,
            detail: momentoCanonico.detail,
            pillText: momentoCanonico.lifecycleLabel,
            pillTone: momentoCanonico.tone,
          }),
        );
        card.appendChild(criarMesaResolutionGuideNode(alvo));

        const overrideNotice = criarMesaHumanOverrideNoticeNode(alvo);
        if (overrideNotice) {
          card.appendChild(overrideNotice);
        }

        if (laudoMesaParado(alvo)) {
          card.appendChild(
            criarMesaContextGuidanceNode({
              tone: "aguardando",
              eyebrow: "Fila parada",
              title: resumoEsperaHoras(horasDesdeAtualizacao(alvo.atualizado_em)),
              detail:
                "Vale revisar este laudo para nao deixar a mesa esfriar com pendencias ou resposta em aberto.",
              pillText: "Retomar",
              pillTone: "aguardando",
            }),
          );
        }

        clearElement(contexto);
        contexto.appendChild(card);
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

        clearElement(container);
        [
          {
            accent: "attention",
            label: "Acao agora",
            value: formatarInteiro(comAcaoAgora),
            meta: "Laudos com chamado novo ou pendencia aberta pedindo resposta imediata.",
          },
          {
            accent: "waiting",
            label: "Pendencias abertas",
            value: formatarInteiro(totalPendencias),
            meta: `${formatarInteiro(totalWhispers)} chamados ainda aguardam leitura da mesa.`,
          },
          {
            accent: "live",
            label: "Decisao disponivel",
            value: formatarInteiro(prontosParaRevisar),
            meta: `${formatarInteiro(emCampo)} caso(s) ainda estao com o campo como owner ativo.`,
          },
          {
            accent: momentoSelecionado
              ? momentoSelecionado.tone
              : prioridade
                ? prioridade.tone
                : "done",
            label: "Foco do laudo selecionado",
            value: momentoSelecionado
              ? momentoSelecionado.label
              : prioridade
                ? prioridade.badge
                : "Sem selecao",
            meta: momentoSelecionado
              ? momentoSelecionado.detail
              : "Escolha um laudo da fila para ver a acao recomendada.",
          },
        ].forEach((metric) => {
          container.appendChild(criarMesaMetricCardNode(metric));
        });
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

        clearElement(container);
        [
          {
            label: "Pendencias abertas",
            value: formatarInteiro(pacote.resumo_pendencias?.abertas || 0),
            meta: `${formatarInteiro(pacote.resumo_pendencias?.resolvidas || 0)} resolvidas recentes`,
          },
          {
            label: "Chamados recentes",
            value: formatarInteiro((pacote.whispers_recentes || []).length),
            meta: `${formatarInteiro(pacote.resumo_mensagens?.inspetor || 0)} mensagens do inspetor`,
          },
          {
            label: "Interacoes da mesa",
            value: formatarInteiro(pacote.resumo_mensagens?.mesa || 0),
            meta: `${formatarInteiro(pacote.resumo_evidencias?.documentos || 0)} documentos e ${formatarInteiro(pacote.resumo_evidencias?.fotos || 0)} fotos`,
          },
        ].forEach((metric) => {
          container.appendChild(criarMesaMetricCardNode(metric));
        });
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
          appendMesaTextWithBreaks(body, mensagem.texto || "(sem conteudo)");
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
