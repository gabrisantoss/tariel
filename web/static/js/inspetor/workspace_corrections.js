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

        function renderizarPainelCorrecoesWorkspace() {
            if (!el.workspaceCorrectionsTitle) return;

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
        });
    };
})();
