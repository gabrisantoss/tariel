(function () {
    "use strict";

    const inspectorRuntime = window.TarielInspectorRuntime || null;
    const modules = typeof inspectorRuntime?.resolveModuleBucket === "function"
        ? inspectorRuntime.resolveModuleBucket("TarielInspetorModules")
        : (window.TarielInspetorModules = window.TarielInspetorModules || {});

    modules.registerWorkspaceCorrections = function registerWorkspaceCorrections(ctx) {
        const estado = ctx.state;
        const el = ctx.elements;
        const {
            normalizarCaseLifecycleStatusSeguro,
            normalizarEmissaoOficialSeguro,
            normalizarThreadTab,
            obterLaudoAtivoIdSeguro,
            obterPayloadStatusRelatorioWorkspaceAtual,
        } = ctx.shared;
        const STORAGE_PREFIX = "tariel:workspace-corrections:";
        const CORRECTION_BLOCKS = {
            evidencias: {
                label: "Evidências/fotos",
                placeholder: "Ex.: Substituir a foto borrada do ponto superior pela imagem anexada e manter o slot como evidência principal.",
                prompt: "Corrija o bloco de evidências/fotos do laudo.",
            },
            checklist: {
                label: "Checklist",
                placeholder: "Ex.: Alterar o item guarda de proteção para NC e explicar que o acesso estava sem bloqueio físico.",
                prompt: "Corrija o checklist técnico do laudo.",
            },
            conclusao: {
                label: "Conclusão/status",
                placeholder: "Ex.: Revisar a conclusão para pendente por acesso parcial e indicar reinspeção após adequação.",
                prompt: "Revise a conclusão e o status técnico do laudo.",
            },
            observacoes: {
                label: "Observações",
                placeholder: "Ex.: Adicionar ressalva de que a decisão humana manteve o item com divergência controlada.",
                prompt: "Adicione ou ajuste as observações técnicas do laudo.",
            },
        };
        const CORRECTION_INTENTS = {
            corrigir: "corrigir informação existente",
            adicionar: "adicionar item faltante",
            substituir: "substituir evidência ou texto",
            validar: "validar antes de aplicar",
        };

        function coletarAllowedSurfaceActions(snapshot = {}) {
            const raw = Array.isArray(snapshot?.allowed_surface_actions)
                ? snapshot.allowed_surface_actions
                : Array.isArray(snapshot?.laudo_card?.allowed_surface_actions)
                    ? snapshot.laudo_card.allowed_surface_actions
                    : [];
            return raw
                .map((item) => String(item || "").trim().toLowerCase())
                .filter(Boolean);
        }

        function formatarLifecycleTitulo(status = "") {
            const valor = String(status || "").trim().toLowerCase();
            if (valor === "emitido") return "Documento emitido";
            if (valor === "aprovado") return "Documento aprovado";
            if (valor === "aguardando_mesa" || valor === "em_revisao_mesa") return "Documento em validação";
            if (valor === "rascunho" || valor === "coleta") return "Documento em rascunho";
            return "Documento em revisão";
        }

        function construirResumoVersao(snapshot = {}, officialIssue = null) {
            const lifecycle = normalizarCaseLifecycleStatusSeguro(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
            const alreadyIssued = !!officialIssue?.alreadyIssued || lifecycle === "emitido";
            const currentIssue = officialIssue?.currentIssue || null;
            const versionRef = String(
                currentIssue?.issue_number ||
                currentIssue?.codigo ||
                currentIssue?.code ||
                ""
            ).trim();

            if (alreadyIssued && versionRef) {
                return {
                    title: `Versão emitida ${versionRef}`,
                    detail: "O laudo já possui emissão registrada. As próximas alterações devem seguir por reabertura e nova versão.",
                };
            }

            if (alreadyIssued) {
                return {
                    title: "Versão emitida disponível",
                    detail: "O laudo já foi emitido. A correção precisa preservar histórico e gerar uma nova emissão controlada.",
                };
            }

            return {
                title: "Rascunho ativo para revisão",
                detail: "As correções desta aba ainda operam sobre o documento estruturado atual antes da emissão final.",
            };
        }

        function construirRadarOperacional(snapshot = {}) {
            const evidencias = ctx.actions.contarEvidenciasWorkspace?.() || 0;
            const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
            const allowedActions = coletarAllowedSurfaceActions(snapshot);
            const podeReabrir = allowedActions.includes("chat_reopen");

            if (pendencias > 0) {
                return {
                    title: `${pendencias} pendência${pendencias === 1 ? "" : "s"} em aberto`,
                    detail: `O laudo segue com ${evidencias} evidência${evidencias === 1 ? "" : "s"} visível${evidencias === 1 ? "" : "eis"} e exige correção controlada antes da próxima emissão.`,
                };
            }

            if (podeReabrir) {
                return {
                    title: "Correção pós-emissão habilitada",
                    detail: `Há ${evidencias} evidência${evidencias === 1 ? "" : "s"} no caso e o fluxo atual permite reabrir o documento para nova versão.`,
                };
            }

            return {
                title: "Contexto pronto para revisar",
                detail: `Há ${evidencias} evidência${evidencias === 1 ? "" : "s"} visível${evidencias === 1 ? "" : "eis"} no workspace para orientar foto, checklist e conclusão.`,
            };
        }

        function storageKeyCorrecoes(laudoId = obterLaudoAtivoIdSeguro()) {
            const id = Number(laudoId || 0) || 0;
            return id ? `${STORAGE_PREFIX}${id}` : "";
        }

        function escaparHtml(valor = "") {
            return String(valor || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function carregarFilaCorrecoes(laudoId = obterLaudoAtivoIdSeguro()) {
            const chave = storageKeyCorrecoes(laudoId);
            if (!chave) return [];
            try {
                const payload = JSON.parse(window.localStorage?.getItem(chave) || "[]");
                return Array.isArray(payload)
                    ? payload.filter((item) => item && typeof item === "object").slice(-12)
                    : [];
            } catch (_) {
                return [];
            }
        }

        function salvarFilaCorrecoes(fila = [], laudoId = obterLaudoAtivoIdSeguro()) {
            const chave = storageKeyCorrecoes(laudoId);
            if (!chave) return;
            try {
                window.localStorage?.setItem(chave, JSON.stringify((Array.isArray(fila) ? fila : []).slice(-12)));
            } catch (_) {
                // localStorage pode estar indisponível em ambientes restritos; a UI segue sem persistência.
            }
        }

        function obterBlocoSelecionado() {
            const bloco = String(el.workspaceCorrectionsBlock?.value || "evidencias").trim().toLowerCase();
            return CORRECTION_BLOCKS[bloco] ? bloco : "evidencias";
        }

        function obterIntencaoSelecionada() {
            const intent = String(el.workspaceCorrectionsIntent?.value || "corrigir").trim().toLowerCase();
            return CORRECTION_INTENTS[intent] ? intent : "corrigir";
        }

        function montarPromptCorrecao(item = {}) {
            const bloco = CORRECTION_BLOCKS[item.block] || CORRECTION_BLOCKS.evidencias;
            const intencao = CORRECTION_INTENTS[item.intent] || CORRECTION_INTENTS.corrigir;
            const detalhe = String(item.description || "").trim();
            const titulo = String(estado.workspaceVisualContext?.title || "laudo atual").trim();
            const resumo = ctx.actions.montarResumoContextoIAWorkspace?.() || "";
            return [
                "[CORRECAO ESTRUTURADA DO LAUDO]",
                bloco.prompt,
                `Bloco: ${bloco.label}.`,
                `Tipo de ajuste: ${intencao}.`,
                titulo ? `Laudo: ${titulo}.` : "",
                detalhe ? `Correção solicitada: ${detalhe}` : "",
                "Antes de alterar o documento, aponte impacto técnico, campos afetados e se falta evidência.",
                resumo ? `Contexto atual:\n${resumo}` : "",
            ].filter(Boolean).join("\n\n");
        }

        function aplicarPromptNoComposer(item = {}) {
            const prompt = montarPromptCorrecao(item);
            const inseriu = ctx.actions.inserirTextoNoComposer?.(prompt, { substituir: true });
            if (!inseriu && el.campoMensagem) {
                el.campoMensagem.value = prompt;
                el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
                el.campoMensagem.focus?.();
            }
            ctx.actions.atualizarThreadWorkspace?.("conversa", {
                persistirURL: true,
                replaceURL: true,
            });
            ctx.actions.mostrarToast?.("Correção estruturada pronta no chat. Revise e envie para a IA.", "sucesso", 2600);
        }

        function renderizarFilaCorrecoes() {
            const laudoId = obterLaudoAtivoIdSeguro();
            const fila = carregarFilaCorrecoes(laudoId);
            const possuiFila = fila.length > 0;

            if (el.workspaceCorrectionsQueueEmpty) {
                el.workspaceCorrectionsQueueEmpty.hidden = possuiFila;
            }
            if (el.workspaceCorrectionsQueueList) {
                el.workspaceCorrectionsQueueList.hidden = !possuiFila;
                el.workspaceCorrectionsQueueList.innerHTML = fila.map((item, index) => {
                    const bloco = CORRECTION_BLOCKS[item.block] || CORRECTION_BLOCKS.evidencias;
                    const intencao = CORRECTION_INTENTS[item.intent] || CORRECTION_INTENTS.corrigir;
                    const texto = String(item.description || "").trim();
                    return `
                        <li class="workspace-corrections-queue-item" data-correction-queue-index="${index}">
                            <span class="workspace-corrections-queue-item__index">${index + 1}</span>
                            <div>
                                <strong>${escaparHtml(bloco.label)}</strong>
                                <p>${escaparHtml(intencao)}${texto ? ` · ${escaparHtml(texto)}` : ""}</p>
                            </div>
                            <button
                                type="button"
                                class="workspace-corrections-queue-item__send"
                                data-correction-send-index="${index}"
                                aria-label="Enviar correção ${index + 1} para o chat"
                            >
                                <span class="material-symbols-rounded" aria-hidden="true">send</span>
                            </button>
                        </li>
                    `;
                }).join("");
            }
            if (el.btnWorkspaceCorrectionsSendLatest) {
                el.btnWorkspaceCorrectionsSendLatest.disabled = !possuiFila;
            }
            if (el.btnWorkspaceCorrectionsClear) {
                el.btnWorkspaceCorrectionsClear.disabled = !possuiFila;
            }
            if (el.workspaceCorrectionsQueueTitle && possuiFila) {
                el.workspaceCorrectionsQueueTitle.textContent = `${fila.length} alteração${fila.length === 1 ? "" : "es"} pendente${fila.length === 1 ? "" : "s"}`;
            }
            if (el.workspaceCorrectionsQueueChip && possuiFila) {
                el.workspaceCorrectionsQueueChip.textContent = "Fila estruturada";
            }
        }

        function prepararCorrecao({ block = obterBlocoSelecionado(), intent = obterIntencaoSelecionada(), description = "" } = {}) {
            const laudoId = obterLaudoAtivoIdSeguro();
            if (!laudoId) {
                ctx.actions.mostrarToast?.("Selecione ou inicie um laudo antes de preparar correções.", "aviso", 2600);
                return null;
            }
            const descricao = String(description || el.workspaceCorrectionsDescription?.value || "").trim();
            if (!descricao) {
                el.workspaceCorrectionsDescription?.focus?.();
                ctx.actions.mostrarToast?.("Descreva a correção necessária antes de preparar a fila.", "aviso", 2600);
                return null;
            }
            const item = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                block,
                intent,
                description: descricao,
                createdAt: new Date().toISOString(),
            };
            const fila = [...carregarFilaCorrecoes(laudoId), item].slice(-12);
            salvarFilaCorrecoes(fila, laudoId);
            if (el.workspaceCorrectionsDescription) {
                el.workspaceCorrectionsDescription.value = "";
            }
            renderizarFilaCorrecoes();
            ctx.actions.mostrarToast?.("Correção adicionada à fila estruturada.", "sucesso", 2200);
            return item;
        }

        function selecionarBlocoCorrecao(block = "evidencias") {
            const bloco = CORRECTION_BLOCKS[block] ? block : "evidencias";
            if (el.workspaceCorrectionsBlock) {
                el.workspaceCorrectionsBlock.value = bloco;
            }
            if (el.workspaceCorrectionsDescription) {
                el.workspaceCorrectionsDescription.placeholder = CORRECTION_BLOCKS[bloco].placeholder;
                el.workspaceCorrectionsDescription.focus?.({ preventScroll: true });
            }
        }

        function bindCorrecoesEstruturadas() {
            if (estado.workspaceCorrectionsBound) return;
            estado.workspaceCorrectionsBound = true;

            el.workspaceCorrectionQuickActions?.forEach((botao) => {
                botao.addEventListener("click", () => {
                    selecionarBlocoCorrecao(String(botao.dataset.correctionQuickAction || "evidencias"));
                });
            });
            el.workspaceCorrectionsBlock?.addEventListener("change", () => {
                selecionarBlocoCorrecao(obterBlocoSelecionado());
            });
            el.workspaceCorrectionsForm?.addEventListener("submit", (event) => {
                event.preventDefault();
                const item = prepararCorrecao();
                if (item) aplicarPromptNoComposer(item);
            });
            el.btnWorkspaceCorrectionsSendLatest?.addEventListener("click", () => {
                const fila = carregarFilaCorrecoes();
                const item = fila[fila.length - 1];
                if (item) aplicarPromptNoComposer(item);
            });
            el.btnWorkspaceCorrectionsClear?.addEventListener("click", () => {
                salvarFilaCorrecoes([]);
                renderizarFilaCorrecoes();
                ctx.actions.mostrarToast?.("Fila de correções limpa para este laudo.", "info", 2200);
            });
            el.workspaceCorrectionsQueueList?.addEventListener("click", (event) => {
                const botao = event.target?.closest?.("[data-correction-send-index]");
                if (!botao) return;
                const index = Number(botao.dataset.correctionSendIndex || -1);
                const item = carregarFilaCorrecoes()[index];
                if (item) aplicarPromptNoComposer(item);
            });
        }

        function renderizarPainelCorrecoesWorkspace() {
            if (!el.workspaceCorrectionsTitle) return;
            bindCorrecoesEstruturadas();

            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const tabAtual = normalizarThreadTab(
                ctx.actions.obterSnapshotEstadoInspectorAtual?.()?.threadTab
            );
            const officialIssue = normalizarEmissaoOficialSeguro(snapshot?.emissao_oficial);
            const lifecycle = normalizarCaseLifecycleStatusSeguro(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
            const allowedActions = coletarAllowedSurfaceActions(snapshot);
            const laudoId = obterLaudoAtivoIdSeguro();
            const tituloLaudo = String(
                estado.workspaceVisualContext?.title || "Registro técnico"
            ).trim() || "Registro técnico";
            const subtituloLaudo = String(
                estado.workspaceVisualContext?.subtitle || ""
            ).trim();
            const versionSummary = construirResumoVersao(snapshot, officialIssue);
            const radar = construirRadarOperacional(snapshot);
            const podeReabrir = allowedActions.includes("chat_reopen");
            const podeCorrigir = !!laudoId;

            el.workspaceCorrectionsTitle.textContent = podeCorrigir
                ? `Correções do laudo • ${tituloLaudo}`
                : "Corrigir o laudo sem sair do workspace";
            el.workspaceCorrectionsSubtitle.textContent = podeCorrigir
                ? (
                    subtituloLaudo ||
                    "Use esta superfície para revisar blocos, preparar alterações e controlar a próxima emissão."
                )
                : "A aba de correções fica ativa quando houver um laudo selecionado no workspace.";

            el.workspaceCorrectionsVersionTitle.textContent = versionSummary.title;
            el.workspaceCorrectionsVersionDetail.textContent = versionSummary.detail;
            el.workspaceCorrectionsLifecycleTitle.textContent = formatarLifecycleTitulo(lifecycle);
            el.workspaceCorrectionsLifecycleDetail.textContent = podeCorrigir
                ? (
                    podeReabrir
                        ? "O lifecycle atual já admite reabertura no chat. A próxima etapa deve preservar a versão anterior e preparar uma nova emissão."
                        : "As correções desta aba devem continuar sobre o rascunho ativo até a emissão final do documento."
                )
                : "Selecione ou inicie um laudo para que o lifecycle do documento apareça aqui.";
            el.workspaceCorrectionsRadarTitle.textContent = radar.title;
            el.workspaceCorrectionsRadarDetail.textContent = radar.detail;

            el.workspaceCorrectionsQueueTitle.textContent = podeCorrigir
                ? "Fila de correções pronta para receber operações"
                : "Nenhum laudo ativo para corrigir";
            el.workspaceCorrectionsQueueChip.textContent = podeCorrigir
                ? (tabAtual === "correcoes" ? "Aba ativa" : "Contexto carregado")
                : "Aguardando laudo";
            el.workspaceCorrectionsQueueDetail.textContent = podeCorrigir
                ? "Na próxima etapa, substituições de foto, ajustes de checklist e revisão da conclusão devem aparecer aqui antes da reemissão."
                : "Abra um laudo pelo histórico ou gere um novo documento no chat para habilitar a fila de correções.";
            renderizarFilaCorrecoes();

            if (el.btnWorkspaceCorrectionsReopen) {
                const alvoTexto = el.btnWorkspaceCorrectionsReopen.querySelector("span:last-child");
                el.btnWorkspaceCorrectionsReopen.disabled = !podeReabrir;
                el.btnWorkspaceCorrectionsReopen.setAttribute("aria-disabled", podeReabrir ? "false" : "true");
                el.btnWorkspaceCorrectionsReopen.title = podeReabrir
                    ? "Reabrir o laudo atual para preparar uma nova versão."
                    : (
                        podeCorrigir
                            ? "A reabertura ainda não está disponível para o estado atual deste laudo."
                            : "Selecione um laudo para habilitar a reabertura."
                    );
                if (alvoTexto) {
                    alvoTexto.textContent = podeReabrir
                        ? "Reabrir para correção"
                        : "Reabertura indisponível";
                }
            }
        }

        Object.assign(ctx.actions, {
            renderizarPainelCorrecoesWorkspace,
            prepararCorrecaoWorkspace: prepararCorrecao,
            renderizarFilaCorrecoesWorkspace: renderizarFilaCorrecoes,
        });
    };
})();
