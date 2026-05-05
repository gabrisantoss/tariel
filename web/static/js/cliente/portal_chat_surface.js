(function () {
  "use strict";

  if (window.TarielClientePortalChatSurface) return;

  window.TarielClientePortalChatSurface =
    function createTarielClientePortalChatSurface(config = {}) {
      const state = config.state || {};
      const documentRef = config.documentRef || document;
      const $ =
        typeof config.getById === "function"
          ? config.getById
          : (id) => documentRef.getElementById(id);
      const helpers = config.helpers || {};
      const filters = config.filters || {};

      const api =
        typeof helpers.api === "function" ? helpers.api : async () => null;
      const escapeAttr =
        typeof helpers.escapeAttr === "function"
          ? helpers.escapeAttr
          : (valor) => String(valor ?? "");
      const escapeHtml =
        typeof helpers.escapeHtml === "function"
          ? helpers.escapeHtml
          : (valor) => String(valor ?? "");
      const feedback =
        typeof helpers.feedback === "function" ? helpers.feedback : () => null;
      const formatarCapacidadeRestante =
        typeof helpers.formatarCapacidadeRestante === "function"
          ? helpers.formatarCapacidadeRestante
          : () => "";
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
      const laudoChatParado =
        typeof helpers.laudoChatParado === "function"
          ? helpers.laudoChatParado
          : () => false;
      const ordenarPorPrioridade =
        typeof helpers.ordenarPorPrioridade === "function"
          ? helpers.ordenarPorPrioridade
          : (lista) => [...(lista || [])];
      const parseDataIso =
        typeof helpers.parseDataIso === "function"
          ? helpers.parseDataIso
          : () => 0;
      const prioridadeChat =
        typeof helpers.prioridadeChat === "function"
          ? helpers.prioridadeChat
          : () => ({ tone: "aprovado", badge: "", acao: "" });
      const renderAnexos =
        typeof helpers.renderAnexos === "function"
          ? helpers.renderAnexos
          : () => "";
      const appendAnexos =
        typeof helpers.appendAnexos === "function"
          ? helpers.appendAnexos
          : null;
      const appendTextWithBreaks =
        typeof helpers.appendTextWithBreaks === "function"
          ? helpers.appendTextWithBreaks
          : null;
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
      const renderGroupedSelectOptions =
        typeof helpers.renderGroupedSelectOptions === "function"
          ? helpers.renderGroupedSelectOptions
          : null;
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
      const rotuloSituacaoChat =
        typeof helpers.rotuloSituacaoChat === "function"
          ? helpers.rotuloSituacaoChat
          : () => "";
      const texto =
        typeof helpers.texto === "function"
          ? helpers.texto
          : (valor) => (valor == null ? "" : String(valor));
      const textoComQuebras =
        typeof helpers.textoComQuebras === "function"
          ? helpers.textoComQuebras
          : (valor) => escapeHtml(valor);
      const tomCapacidadeEmpresa =
        typeof helpers.tomCapacidadeEmpresa === "function"
          ? helpers.tomCapacidadeEmpresa
          : () => "aprovado";
      const sincronizarUrlDaSecao =
        typeof helpers.sincronizarUrlDaSecao === "function"
          ? helpers.sincronizarUrlDaSecao
          : () => null;
      const variantStatusLaudo =
        typeof helpers.variantStatusLaudo === "function"
          ? helpers.variantStatusLaudo
          : () => "aberto";
      const withBusy =
        typeof helpers.withBusy === "function"
          ? helpers.withBusy
          : async (_target, _busyText, callback) => callback();

      const filtrarLaudosChat =
        typeof filters.filtrarLaudosChat === "function"
          ? filters.filtrarLaudosChat
          : () => [];
      const SECTION_ORDER = Object.freeze(["overview", "new", "queue", "case"]);
      const SECTION_META = Object.freeze({
        overview: Object.freeze({
          title: "Visao geral",
          meta: "Radar e prioridades do chat.",
        }),
        new: Object.freeze({
          title: "Novo laudo",
          meta: "Abertura isolada da conversa ativa.",
        }),
        queue: Object.freeze({
          title: "Fila operacional",
          meta: "Busca e selecao do caso certo.",
        }),
        case: Object.freeze({
          title: "Caso ativo",
          meta: "Contexto e conversa como foco principal.",
        }),
      });
      const TARGET_TO_SECTION = Object.freeze({
        "chat-overview": "overview",
        "chat-resumo-geral": "overview",
        "chat-alertas-operacionais": "overview",
        "chat-triagem": "overview",
        "chat-movimentos": "overview",
        "chat-new": "new",
        "form-chat-laudo": "new",
        "chat-capacidade-nota": "new",
        "btn-chat-laudo-criar": "new",
        "chat-tipo-template": "new",
        "chat-queue": "queue",
        "chat-busca-laudos": "queue",
        "chat-lista-resumo": "queue",
        "lista-chat-laudos": "queue",
        "chat-case": "case",
        "chat-contexto": "case",
        "chat-mensagens": "case",
        "chat-mensagem": "case",
        "form-chat-msg": "case",
        "btn-chat-upload-doc": "case",
        "chat-upload-doc": "case",
        "chat-upload-status": "case",
        "btn-chat-finalizar": "case",
        "btn-chat-reabrir": "case",
      });

      function normalizarSecaoChat(valor) {
        const secao = texto(valor).trim().toLowerCase();
        return SECTION_ORDER.includes(secao) ? secao : "overview";
      }

      function resolverSecaoChatPorTarget(targetId) {
        const alvo = texto(targetId).trim().replace(/^#/, "");
        if (!alvo) return null;
        if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
        return SECTION_ORDER.includes(alvo) ? alvo : null;
      }

      function obterBotoesSecaoChat() {
        return Array.from(
          documentRef.querySelectorAll("[data-chat-section-tab]"),
        );
      }

      function obterPaineisSecaoChat() {
        return Array.from(documentRef.querySelectorAll("[data-chat-panel]"));
      }

      function definirTextoNoElemento(id, valor) {
        const node = $(id);
        if (!node) return;
        node.textContent = texto(valor);
      }

      function atualizarResumoSecaoChat() {
        const secaoAtiva = normalizarSecaoChat(
          state.ui?.chatSection || state.ui?.sections?.chat || "overview",
        );
        const definicao = SECTION_META[secaoAtiva] || SECTION_META.overview;
        const nav = documentRef.querySelector('[data-surface-nav="chat"]');
        const empresa = state.bootstrap?.empresa || {};
        const laudos = state.bootstrap?.chat?.laudos || [];
        const laudosFiltrados = filtrarLaudosChat();
        const laudoAtivo = obterLaudoChatSelecionado();
        const laudosRestantes =
          empresa.laudos_restantes == null
            ? "Contrato sem teto mensal"
            : `${formatarInteiro(Math.max(Number(empresa.laudos_restantes || 0), 0))} laudos restantes`;
        const contagens = {
          overview: `${formatarInteiro(laudos.length)} laudos no radar`,
          new: laudosRestantes,
          queue: `${formatarInteiro(laudosFiltrados.length)} casos na fila`,
          case: texto(laudoAtivo?.titulo || "Sem caso selecionado"),
        };

        if (nav) {
          nav.dataset.surfaceActiveSection = secaoAtiva;
        }
        definirTextoNoElemento("chat-section-summary-title", definicao.title);
        definirTextoNoElemento("chat-section-summary-meta", definicao.meta);
        definirTextoNoElemento(
          "chat-section-count-overview",
          contagens.overview,
        );
        definirTextoNoElemento("chat-section-count-new", contagens.new);
        definirTextoNoElemento("chat-section-count-queue", contagens.queue);
        definirTextoNoElemento("chat-section-count-case", contagens.case);
      }

      function abrirSecaoChat(
        secao,
        { focusTab = false, syncUrl = true } = {},
      ) {
        const secaoAtiva = normalizarSecaoChat(secao || state.ui?.chatSection);
        state.ui.chatSection = secaoAtiva;
        state.ui.sections = state.ui.sections || {};
        state.ui.sections.chat = secaoAtiva;

        const tabAtiva =
          obterBotoesSecaoChat().find(
            (button) => button.dataset.chatSectionTab === secaoAtiva,
          ) || null;
        obterBotoesSecaoChat().forEach((button) => {
          const ativa = button.dataset.chatSectionTab === secaoAtiva;
          button.classList.toggle("is-active", ativa);
          button.setAttribute("aria-selected", ativa ? "true" : "false");
          button.setAttribute("aria-current", ativa ? "page" : "false");
          button.setAttribute("tabindex", ativa ? "0" : "-1");
        });
        obterPaineisSecaoChat().forEach((panel) => {
          panel.hidden = panel.dataset.chatPanel !== secaoAtiva;
        });
        atualizarResumoSecaoChat();

        if (focusTab && tabAtiva) {
          tabAtiva.focus();
        }
        if (syncUrl && state.ui?.tab === "chat") {
          sincronizarUrlDaSecao("chat", secaoAtiva);
        }
        return secaoAtiva;
      }

      function obterLaudoChatSelecionado() {
        return (
          (state.bootstrap?.chat?.laudos || []).find(
            (laudo) => Number(laudo.id) === Number(state.chat.laudoId),
          ) || null
        );
      }

      function humanizarLifecycleStatus(valor) {
        const mapa = {
          analise_livre: "Em coleta",
          pre_laudo: "Em coleta",
          laudo_em_coleta: "Em coleta",
          aguardando_mesa: "Na Mesa",
          em_revisao_mesa: "Na Mesa",
          devolvido_para_correcao: "Pendente",
          aprovado: "Aprovado",
          emitido: "Emitido",
        };
        const chave = texto(valor).trim().toLowerCase();
        return mapa[chave] || "Em acompanhamento";
      }

      function humanizarOwnerRole(valor) {
        const mapa = {
          inspetor: "Campo tecnico",
          mesa: "Revisão Técnica",
          none: "Ciclo encerrado",
        };
        const chave = texto(valor).trim().toLowerCase();
        return mapa[chave] || "Responsavel em definicao";
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

      function chatVisibilityPolicy() {
        return (
          state.bootstrap?.tenant_admin_projection?.payload
            ?.visibility_policy || {}
        );
      }

      function chatCaseActionsEnabled() {
        return Boolean(chatVisibilityPolicy().case_actions_enabled);
      }

      function chatReadOnlyMode() {
        const policy = chatVisibilityPolicy();
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

      function chatHumanOverrideLatest(laudo) {
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

      function criarChatContextBlockNode(labelText, valueText) {
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

      function criarChatContextGuidanceNode({
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

      function criarChatHumanOverrideNoticeNode(laudo) {
        const latest = chatHumanOverrideLatest(laudo);
        if (!latest) return null;
        const actorName = texto(latest.actor_name || "Validador humano");
        const reason = texto(
          latest.reason || "Justificativa interna registrada.",
        );
        const appliedAt = resumirMomentoIso(latest.applied_at);
        return criarChatContextGuidanceNode({
          tone: "aguardando",
          eyebrow: "Override humano interno",
          title: `${actorName}${appliedAt ? ` • ${appliedAt}` : ""}`,
          detail: reason,
          pillText: "Auditável",
          pillTone: "aguardando",
        });
      }

      function renderChatPolicyHints() {
        const readOnly = chatReadOnlyMode();
        const uploadButton = $("btn-chat-upload-doc");
        const uploadInput = $("chat-upload-doc");
        const textarea = $("chat-mensagem");
        const sendButton = $("btn-chat-msg-enviar");
        const hasCaseSelected = Boolean(state.chat.laudoId);
        const variant = readOnly ? "readOnly" : "editable";

        if (renderStaticContractHtml) {
          renderStaticContractHtml(
            "chat-new-policy-hint",
            "chatReadOnlyHint",
            variant,
          );
          renderStaticContractHtml(
            "chat-case-policy-hint",
            "chatReadOnlyHint",
            variant,
          );
          renderStaticContractHtml(
            "chat-case-policy-note",
            "chatCasePolicyNote",
            variant,
            { hidden: !readOnly },
          );
          renderStaticContractHtml(
            "chat-message-policy-note",
            "chatMessagePolicyNote",
            variant,
            { hidden: !readOnly },
          );
        }

        if (uploadButton) {
          uploadButton.disabled = readOnly || !hasCaseSelected;
        }
        if (uploadInput) {
          uploadInput.disabled = readOnly;
        }
        if (textarea) {
          textarea.disabled = readOnly || !hasCaseSelected;
        }
        if (sendButton) {
          sendButton.disabled = readOnly || !hasCaseSelected;
        }
      }

      function documentoChatPendenteAtivo() {
        return Boolean(texto(state.chat.documentoTexto).trim());
      }

      function appendChatTextWithBreaks(target, value) {
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

      function criarChatFormHintNode({ tone, title, detail }) {
        const hint = documentRef.createElement("div");
        hint.className = "form-hint";
        hint.dataset.tone = texto(tone).trim();
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        hint.appendChild(titleNode);
        const detailNode = documentRef.createElement("span");
        detailNode.textContent = texto(detail);
        hint.appendChild(detailNode);
        return hint;
      }

      function criarChatMetricCardNode({ accent, label, value, meta }) {
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

      function limparDocumentoChatPendente() {
        state.chat.documentoTexto = "";
        state.chat.documentoNome = "";
        state.chat.documentoChars = 0;
        state.chat.documentoTruncado = false;
        if ($("chat-upload-doc")) {
          $("chat-upload-doc").value = "";
        }
        renderChatDocumentoPendente();
      }

      function renderChatDocumentoPendente() {
        const container = $("chat-upload-status");
        renderChatPolicyHints();
        if (!container) return;

        if (!documentoChatPendenteAtivo()) {
          container.hidden = true;
          clearElement(container);
          return;
        }

        const nome = texto(state.chat.documentoNome || "documento");
        const chars = Number(
          state.chat.documentoChars ||
            texto(state.chat.documentoTexto).length ||
            0,
        );
        const truncado = Boolean(state.chat.documentoTruncado);

        container.hidden = false;
        clearElement(container);
        const lista = documentRef.createElement("div");
        lista.className = "attachment-list";
        const item = documentRef.createElement("div");
        item.className = "attachment-item";
        const copy = documentRef.createElement("div");
        copy.className = "attachment-copy";
        const name = documentRef.createElement("span");
        name.className = "attachment-name";
        name.textContent = nome;
        copy.appendChild(name);
        const meta = documentRef.createElement("span");
        meta.className = "attachment-meta";
        meta.textContent = `Documento pronto para envio • ${formatarInteiro(chars)} caracteres${truncado ? " • resumo truncado" : ""}`;
        copy.appendChild(meta);
        item.appendChild(copy);
        const remover = documentRef.createElement("button");
        remover.id = "btn-chat-upload-limpar";
        remover.className = "btn ghost";
        remover.type = "button";
        remover.textContent = "Remover";
        remover.addEventListener("click", () => {
          limparDocumentoChatPendente();
          feedback("Documento removido do rascunho do chat.");
        });
        item.appendChild(remover);
        lista.appendChild(item);
        container.appendChild(lista);
      }

      async function importarDocumentoChat(arquivo) {
        if (!arquivo) return;
        if (!state.chat.laudoId) {
          if ($("chat-upload-doc")) {
            $("chat-upload-doc").value = "";
          }
          feedback(
            "Selecione um laudo do chat antes de importar um documento.",
            true,
          );
          return;
        }

        const botao = $("btn-chat-upload-doc");
        await withBusy(botao, "Lendo...", async () => {
          const formData = new FormData();
          formData.append("arquivo", arquivo);
          const resposta = await api("/cliente/api/chat/upload_doc", {
            method: "POST",
            body: formData,
          });

          state.chat.documentoTexto = texto(resposta?.texto || "").trim();
          state.chat.documentoNome = texto(
            resposta?.nome || arquivo.name || "documento",
          );
          state.chat.documentoChars = Number(
            resposta?.chars || state.chat.documentoTexto.length || 0,
          );
          state.chat.documentoTruncado = Boolean(resposta?.truncado);
          renderChatDocumentoPendente();
          $("chat-mensagem")?.focus();
          feedback(
            `${state.chat.documentoNome} pronto para envio no chat da empresa.`,
            false,
            "Documento carregado",
          );
        }).catch((erro) => {
          limparDocumentoChatPendente();
          feedback(erro.message || "Falha ao importar documento.", true);
        });
      }

      function renderChatCapacidade() {
        const empresa = state.bootstrap?.empresa;
        const nota = $("chat-capacidade-nota");
        const botao = $("btn-chat-laudo-criar");
        const seletor = $("chat-tipo-template");
        const readOnly = chatReadOnlyMode();
        const templateOptions = Array.isArray(
          state.bootstrap?.chat?.tipo_template_options,
        )
          ? state.bootstrap.chat.tipo_template_options
          : [];
        const governado = Boolean(state.bootstrap?.chat?.catalog_governed_mode);
        const governadoSemTemplates = governado && templateOptions.length === 0;
        if (!empresa || !nota) return;

        if (seletor && governadoSemTemplates) {
          clearElement(seletor);
          delete seletor.dataset.catalogSignature;
        } else if (seletor && templateOptions.length) {
          const assinatura = JSON.stringify(
            templateOptions.map((item) => [
              item?.value,
              item?.label,
              item?.group_label,
            ]),
          );
          if (seletor.dataset.catalogSignature !== assinatura) {
            const valorAtual = texto(seletor.value).trim();
            if (renderGroupedSelectOptions) {
              renderGroupedSelectOptions(seletor, templateOptions, {
                currentValue: valorAtual,
                defaultGroupLabel: "Catálogo oficial",
                signature: assinatura,
              });
            } else {
              const grupos = new Map();
              templateOptions.forEach((item) => {
                const grupo =
                  texto(item?.group_label).trim() || "Catálogo oficial";
                if (!grupos.has(grupo)) {
                  grupos.set(grupo, []);
                }
                grupos.get(grupo).push(item);
              });

              clearElement(seletor);
              grupos.forEach((itens, grupo) => {
                const optgroup = documentRef.createElement("optgroup");
                optgroup.label = grupo;
                itens.forEach((item) => {
                  const option = documentRef.createElement("option");
                  option.value = texto(item?.value).trim();
                  option.textContent =
                    texto(item?.label).trim() || option.value;
                  optgroup.appendChild(option);
                });
                seletor.appendChild(optgroup);
              });

              const valorValido = templateOptions.some(
                (item) => texto(item?.value).trim() === valorAtual,
              )
                ? valorAtual
                : texto(templateOptions[0]?.value).trim();
              seletor.value = valorValido;
              seletor.dataset.catalogSignature = assinatura;
            }
          }
        }

        const atingiuTeto =
          empresa.laudos_mes_limite != null &&
          Number(empresa.laudos_restantes || 0) <= 0;
        const emAtencao =
          empresa.laudos_mes_limite != null &&
          Number(empresa.laudos_restantes || 0) > 0 &&
          Number(empresa.laudos_restantes || 0) <= 5;
        const planoSugerido = texto(empresa.plano_sugerido).trim();
        const tone = atingiuTeto
          ? "ajustes"
          : emAtencao
            ? "aguardando"
            : tomCapacidadeEmpresa(empresa);
        const tituloCapacidade = atingiuTeto
          ? "Novos laudos bloqueados pelo plano"
          : emAtencao
            ? "Janela mensal quase no limite"
            : "Abertura de laudo dentro da capacidade";
        const detalheCapacidade = atingiuTeto
          ? `${formatarCapacidadeRestante(empresa.laudos_restantes, empresa.laudos_excedente, "laudo", "laudos")}. ${planoSugerido ? `Registre interesse em ${planoSugerido} para liberar novas aberturas.` : "Revise o contrato antes de abrir novos laudos."}`
          : emAtencao
            ? `${formatarCapacidadeRestante(empresa.laudos_restantes, empresa.laudos_excedente, "laudo", "laudos")}. ${planoSugerido ? `Vale registrar ${planoSugerido} antes do proximo pico.` : "Monitore a fila antes do proximo pico."}`
            : governadoSemTemplates
              ? "A empresa continua sob liberacao do Admin-CEO, mas nao possui modelos liberados no momento."
              : governado
                ? "A empresa esta usando os modelos liberados pelo Admin-CEO."
                : "O plano atual ainda sustenta novas aberturas de laudo com folga operacional.";

        clearElement(nota);
        if (readOnly) {
          nota.appendChild(
            criarChatFormHintNode({
              tone: "aguardando",
              title: "Superfície indisponível",
              detail:
                "O Chat precisa estar contratado para operar novos laudos pelo portal cliente.",
            }),
          );
        }
        const hint = criarChatFormHintNode({
          tone,
          title: tituloCapacidade,
          detail: detalheCapacidade,
        });
        if (planoSugerido && (atingiuTeto || emAtencao)) {
          const toolbar = documentRef.createElement("div");
          toolbar.className = "toolbar-meta";
          const upgrade = documentRef.createElement("button");
          upgrade.className = "btn";
          upgrade.type = "button";
          upgrade.dataset.act = "preparar-upgrade";
          upgrade.dataset.origem = "chat";
          upgrade.textContent = `Registrar interesse em ${planoSugerido}`;
          toolbar.appendChild(upgrade);
          hint.appendChild(toolbar);
        }
        nota.appendChild(hint);

        if (botao) {
          botao.disabled = readOnly || atingiuTeto || governadoSemTemplates;
        }
        if (seletor) {
          seletor.disabled = readOnly || atingiuTeto || governadoSemTemplates;
        }
        renderChatPolicyHints();
      }

      function renderChatResumo() {
        const container = $("chat-resumo-geral");
        if (!container) return;

        const laudos = state.bootstrap?.chat?.laudos || [];
        const selecionado = obterLaudoChatSelecionado();
        const prioridade = selecionado ? prioridadeChat(selecionado) : null;

        const abertos = laudos.filter(
          (item) => variantStatusLaudo(item.status_card) === "aberto",
        ).length;
        const aguardando = laudos.filter(
          (item) => variantStatusLaudo(item.status_card) === "aguardando",
        ).length;
        const ajustes = laudos.filter(
          (item) => variantStatusLaudo(item.status_card) === "ajustes",
        ).length;
        const concluidos = laudos.filter(
          (item) => variantStatusLaudo(item.status_card) === "aprovado",
        ).length;

        clearElement(container);
        [
          {
            accent: "attention",
            label: "Acao agora",
            value: formatarInteiro(ajustes),
            meta: "Laudos devolvidos para ajuste e que pedem resposta do time.",
          },
          {
            accent: "live",
            label: "Em operacao",
            value: formatarInteiro(abertos),
            meta: "Conversas abertas e prontas para continuar no chat.",
          },
          {
            accent: "waiting",
            label: "Na Mesa",
            value: formatarInteiro(aguardando),
            meta: "Laudos que ja sairam do campo e estao esperando retorno da Revisão Técnica.",
          },
          {
            accent: prioridade ? prioridade.tone : "done",
            label: "Foco do laudo selecionado",
            value: prioridade ? prioridade.badge : "Sem selecao",
            meta: prioridade
              ? prioridade.acao
              : `${formatarInteiro(concluidos)} concluidos sem urgencia na fila.`,
          },
        ].forEach((metric) => {
          container.appendChild(criarChatMetricCardNode(metric));
        });
        atualizarResumoSecaoChat();
      }

      function criarChatEmptyStateNode(titleText, detailText) {
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

      function criarChatToolbarButton(label, situacao, { ghost = false } = {}) {
        const button = documentRef.createElement("button");
        button.className = ghost ? "btn ghost" : "btn";
        button.type = "button";
        button.dataset.act = situacao
          ? "filtrar-chat-status"
          : "limpar-chat-filtro";
        if (situacao) {
          button.dataset.situacao = situacao;
        }
        button.textContent = label;
        return button;
      }

      function criarChatTriagemToolbar(filtroAtivo) {
        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        [
          ["Ver ajustes", "ajustes"],
          ["Ver abertos", "abertos"],
          ["Ver na Revisão Técnica", "aguardando"],
          ["Ver parados", "parados"],
        ].forEach(([label, situacao]) => {
          toolbar.appendChild(criarChatToolbarButton(label, situacao));
        });
        toolbar.appendChild(
          criarChatToolbarButton("Limpar filtro rapido", "", { ghost: true }),
        );
        if (filtroAtivo) {
          const chip = documentRef.createElement("span");
          chip.className = "hero-chip";
          chip.textContent = `Filtro rapido: ${filtroAtivo}`;
          toolbar.appendChild(chip);
        }
        return toolbar;
      }

      function criarChatPrioridadeActivity(laudo) {
        const prioridade = prioridadeChat(laudo);
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo || "Laudo do chat");
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent = `${texto(laudo.tipo_template_label || "Inspeção")} • ${texto(laudo.data_br || "Sem data")}`;
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
        detail.textContent = `${texto(prioridade.acao)}${laudoChatParado(laudo) ? ` ${resumoEsperaHoras(horasDesdeAtualizacao(laudo.atualizado_em))}.` : ""}`;
        article.appendChild(detail);

        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        const button = documentRef.createElement("button");
        button.className = "btn";
        button.type = "button";
        button.dataset.act = "abrir-prioridade";
        button.dataset.kind = "chat-laudo";
        button.dataset.canal = "chat";
        button.dataset.laudo = String(laudo.id || "");
        button.dataset.target = "chat-contexto";
        button.textContent = "Abrir laudo prioritario";
        toolbar.appendChild(button);
        article.appendChild(toolbar);

        return article;
      }

      function renderChatTriagem() {
        const container = $("chat-triagem");
        const laudos = state.bootstrap?.chat?.laudos || [];
        if (!container) return;

        const ajustes = ordenarPorPrioridade(
          laudos.filter(
            (item) => variantStatusLaudo(item.status_card) === "ajustes",
          ),
          prioridadeChat,
        );
        const abertos = ordenarPorPrioridade(
          laudos.filter(
            (item) => variantStatusLaudo(item.status_card) === "aberto",
          ),
          prioridadeChat,
        );
        const aguardando = ordenarPorPrioridade(
          laudos.filter(
            (item) => variantStatusLaudo(item.status_card) === "aguardando",
          ),
          prioridadeChat,
        );
        const parados = ordenarPorPrioridade(
          laudos.filter((item) => laudoChatParado(item)),
          prioridadeChat,
        );
        const filtroAtivo = rotuloSituacaoChat(state.ui.chatSituacao);
        const destaque =
          ajustes[0] || parados[0] || aguardando[0] || abertos[0] || null;

        clearElement(container);
        container.appendChild(criarChatTriagemToolbar(filtroAtivo));
        container.appendChild(
          destaque
            ? criarChatPrioridadeActivity(destaque)
            : criarChatEmptyStateNode(
                "Fila do chat controlada",
                "Nenhum laudo pede atenção imediata agora. Use os filtros rápidos se quiser revisar a fila por status.",
              ),
        );
        atualizarResumoSecaoChat();
      }

      function criarChatMovimentoItem(laudo) {
        const prioridade = prioridadeChat(laudo);
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo || "Laudo do chat");
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent = `${texto(laudo.data_br || "Sem data")} • ${texto(laudo.tipo_template_label || "Inspecao")}`;
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
        detail.textContent = texto(
          laudo.preview || "Sem resumo recente no chat.",
        );
        article.appendChild(detail);

        const toolbar = documentRef.createElement("div");
        toolbar.className = "toolbar-meta";
        if (laudoChatParado(laudo)) {
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
        button.dataset.kind = "chat-laudo";
        button.dataset.canal = "chat";
        button.dataset.laudo = String(laudo.id || "");
        button.dataset.target = "chat-contexto";
        button.textContent = "Abrir laudo";
        toolbar.appendChild(button);
        article.appendChild(toolbar);

        return article;
      }

      function renderChatMovimentos() {
        const container = $("chat-movimentos");
        const laudos = ordenarPorPrioridade(
          state.bootstrap?.chat?.laudos || [],
          (item) => ({
            score: parseDataIso(item?.atualizado_em),
          }),
        ).slice(0, 3);
        if (!container) return;

        if (!laudos.length) {
          clearElement(container);
          container.appendChild(
            criarChatEmptyStateNode(
              "Sem movimentos recentes no chat",
              "Os laudos mais novos da empresa vao aparecer aqui assim que o chat começar a rodar.",
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
        title.textContent = "Movimentos recentes do chat";
        const meta = documentRef.createElement("span");
        meta.className = "activity-meta";
        meta.textContent =
          "Os ultimos laudos tocados pela empresa no canal operacional.";
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
          list.appendChild(criarChatMovimentoItem(laudo));
        });
        article.appendChild(list);
        container.appendChild(article);
      }

      function criarChatLaudoItem(laudo) {
        const prioridade = prioridadeChat(laudo);
        const item = documentRef.createElement("article");
        item.className = "item";
        if (Number(state.chat.laudoId) === Number(laudo.id)) {
          item.classList.add("active");
        }
        item.dataset.chat = String(laudo.id || "");
        item.tabIndex = 0;

        const head = documentRef.createElement("div");
        head.className = "item-head";
        const title = documentRef.createElement("strong");
        title.textContent = texto(laudo.titulo);
        head.appendChild(title);
        const badgeHtml = laudoBadge(
          laudo.status_card_label,
          laudo.status_card,
        );
        if (badgeHtml) {
          head.insertAdjacentHTML("beforeend", badgeHtml);
        }
        item.appendChild(head);

        const preview = documentRef.createElement("div");
        preview.className = "item-preview";
        preview.textContent = texto(
          laudo.preview || "Sem resumo da conversa ainda.",
        );
        item.appendChild(preview);

        const footer = documentRef.createElement("div");
        footer.className = "item-footer";

        const prioridadeChip = documentRef.createElement("span");
        prioridadeChip.className = "pill";
        prioridadeChip.dataset.kind = "priority";
        prioridadeChip.dataset.status = texto(prioridade.tone).trim();
        prioridadeChip.textContent = texto(prioridade.badge);
        footer.appendChild(prioridadeChip);

        const templateChip = documentRef.createElement("span");
        templateChip.className = "hero-chip";
        templateChip.textContent = texto(
          laudo.tipo_template_label || "Inspecao",
        );
        footer.appendChild(templateChip);

        if (laudoChatParado(laudo)) {
          const esperaChip = documentRef.createElement("span");
          esperaChip.className = "hero-chip";
          esperaChip.textContent = resumoEsperaHoras(
            horasDesdeAtualizacao(laudo.atualizado_em),
          );
          footer.appendChild(esperaChip);
        }

        const data = documentRef.createElement("small");
        data.textContent = texto(laudo.data_br || "Sem data");
        footer.appendChild(data);

        item.appendChild(footer);
        return item;
      }

      function renderChatList() {
        const laudos = ordenarPorPrioridade(
          filtrarLaudosChat(),
          prioridadeChat,
        );
        const lista = $("lista-chat-laudos");
        const resumo = $("chat-lista-resumo");
        const filtroAtivo = rotuloSituacaoChat(state.ui.chatSituacao);
        if (!lista || !resumo) return;

        const chipsResumo = [
          `${formatarInteiro(laudos.length)} laudos visiveis`,
          `${formatarInteiro((state.bootstrap?.chat?.laudos || []).filter((item) => variantStatusLaudo(item.status_card) === "aberto").length)} abertos`,
          `${formatarInteiro((state.bootstrap?.chat?.laudos || []).filter((item) => variantStatusLaudo(item.status_card) === "ajustes").length)} em ajuste`,
        ];
        if (filtroAtivo) chipsResumo.push(`Filtro rapido: ${filtroAtivo}`);
        renderHeroChipList(resumo, chipsResumo);

        if (!laudos.length) {
          renderEmptyState(lista, {
            title: "Nenhum laudo encontrado",
            detail:
              "Ajuste a busca ou crie um novo laudo para operar o chat por aqui.",
          });
          atualizarResumoSecaoChat();
          return;
        }

        clearElement(lista);
        laudos.forEach((laudo) => {
          lista.appendChild(criarChatLaudoItem(laudo));
        });
        atualizarResumoSecaoChat();
      }

      function renderChatContext() {
        const alvo = obterLaudoChatSelecionado();
        const contexto = $("chat-contexto");
        const finalizar = $("btn-chat-finalizar");
        const reabrir = $("btn-chat-reabrir");
        const caseActionsEnabled = chatCaseActionsEnabled();
        if (!contexto) return;

        if (!alvo) {
          clearElement(contexto);
          contexto.appendChild(
            criarChatEmptyStateNode(
              "Selecione um laudo do lado esquerdo",
              "Quando um laudo for selecionado, o contexto operacional e o historico aparecem aqui.",
            ),
          );
          if (finalizar) finalizar.disabled = true;
          if (reabrir) reabrir.disabled = true;
          if ($("chat-titulo")) {
            $("chat-titulo").textContent = "Selecione um laudo";
          }
          renderChatDocumentoPendente();
          atualizarResumoSecaoChat();
          return;
        }

        const prioridade = prioridadeChat(alvo);
        const canFinalize =
          caseActionsEnabled && laudoHasSurfaceAction(alvo, "chat_finalize");
        const canReopen =
          caseActionsEnabled && laudoHasSurfaceAction(alvo, "chat_reopen");
        if ($("chat-titulo")) {
          $("chat-titulo").textContent = alvo.titulo || "Laudo selecionado";
        }
        if (finalizar) finalizar.disabled = !canFinalize;
        if (reabrir) reabrir.disabled = !canReopen;

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
        subtitle.textContent = texto(alvo.preview || "Sem resumo registrado.");
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
          ["Modelo atual", alvo.tipo_template_label || "Inspecao padrao"],
          ["Ultima atualizacao", alvo.data_br || "Sem data"],
          ["Setor", alvo.setor_industrial || "Geral"],
          [
            "Fluxo do caso",
            `${humanizarLifecycleStatus(alvo.case_lifecycle_status)} / ${humanizarOwnerRole(alvo.active_owner_role)}`,
          ],
        ].forEach(([label, value]) => {
          grid.appendChild(criarChatContextBlockNode(label, value));
        });
        card.appendChild(grid);

        card.appendChild(
          criarChatContextGuidanceNode({
            tone: prioridade.tone,
            eyebrow: "Proximo passo recomendado",
            title: prioridade.badge,
            detail: prioridade.acao,
            pillText: prioridade.badge,
            pillTone: prioridade.tone,
          }),
        );

        const overrideNotice = criarChatHumanOverrideNoticeNode(alvo);
        if (overrideNotice) {
          card.appendChild(overrideNotice);
        }

        if (laudoChatParado(alvo)) {
          card.appendChild(
            criarChatContextGuidanceNode({
              tone: "aguardando",
              eyebrow: "Item parado",
              title: resumoEsperaHoras(
                horasDesdeAtualizacao(alvo.atualizado_em),
              ),
              detail:
                "Vale retomar este laudo para nao perder ritmo operacional no chat.",
              pillText: "Retomar",
              pillTone: "aguardando",
            }),
          );
        }

        clearElement(contexto);
        contexto.appendChild(card);
        renderChatDocumentoPendente();
        atualizarResumoSecaoChat();
      }

      function renderChatMensagens() {
        const container = $("chat-mensagens");
        const mensagens = Array.isArray(state.chat.mensagens)
          ? state.chat.mensagens
          : [];
        if (!container) return;

        if (!mensagens.length) {
          renderEmptyState(container, {
            title: "Nenhuma mensagem carregada",
            detail:
              "Assim que voce conversar com o assistente ou com a Revisão Técnica, o historico aparece aqui.",
          });
          atualizarResumoSecaoChat();
          return;
        }

        clearElement(container);
        mensagens.forEach((mensagem) => {
          const papel = texto(mensagem.papel).toLowerCase();
          const classe =
            papel === "usuario"
              ? "msg--usuario"
              : papel === "assistente"
                ? "msg--assistente"
                : "msg--whisper";
          const titulo =
            papel === "usuario"
              ? "Usuario"
              : papel === "assistente"
                ? "Assistente"
                : "Mesa";

          const article = documentRef.createElement("article");
          article.className = `msg ${classe}`;

          const head = documentRef.createElement("div");
          head.className = "msg-head";
          const meta = documentRef.createElement("div");
          meta.className = "msg-meta";

          const title = documentRef.createElement("span");
          title.className = "msg-title";
          title.textContent = titulo;
          meta.appendChild(title);

          const time = documentRef.createElement("span");
          time.className = "msg-time";
          time.textContent = texto(mensagem.tipo || "mensagem");
          meta.appendChild(time);

          head.appendChild(meta);
          article.appendChild(head);

          const body = documentRef.createElement("div");
          body.className = "msg-body";
          appendChatTextWithBreaks(body, mensagem.texto || "(sem conteudo)");
          article.appendChild(body);

          if (appendAnexos) {
            appendAnexos(article, mensagem.anexos);
          } else {
            article.insertAdjacentHTML(
              "beforeend",
              renderAnexos(mensagem.anexos),
            );
          }

          container.appendChild(article);
        });
        atualizarResumoSecaoChat();
      }

      return {
        abrirSecaoChat,
        documentoChatPendenteAtivo,
        importarDocumentoChat,
        limparDocumentoChatPendente,
        laudoHasSurfaceAction,
        obterLaudoChatSelecionado,
        resolverSecaoChatPorTarget,
        renderChatCapacidade,
        renderChatContext,
        renderChatDocumentoPendente,
        renderChatList,
        renderChatMensagens,
        renderChatMovimentos,
        renderChatResumo,
        renderChatTriagem,
      };
    };
})();
