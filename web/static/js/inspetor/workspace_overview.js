(function () {
    "use strict";

    const inspectorRuntime = window.TarielInspectorRuntime || null;
    const modules = typeof inspectorRuntime?.resolveModuleBucket === "function"
        ? inspectorRuntime.resolveModuleBucket("TarielInspetorModules")
        : (window.TarielInspetorModules = window.TarielInspetorModules || {});

    modules.registerWorkspaceOverview = function registerWorkspaceOverview(ctx) {
        const estado = ctx.state;
        const el = ctx.elements;
        const {
            CONTEXTO_WORKSPACE_ASSISTENTE,
            NOMES_TEMPLATES,
            normalizarCaseLifecycleStatusSeguro,
            normalizarPublicVerificationSeguro,
            normalizarThreadTab,
            normalizarWorkspaceStage,
            obterLaudoAtivoIdSeguro,
            obterPayloadStatusRelatorioWorkspaceAtual,
        } = ctx.shared;

        function renderizarResumoNavegacaoWorkspace() {
            const snapshot = ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {};
            const stage = normalizarWorkspaceStage(snapshot.workspaceStage);
            const tab = normalizarThreadTab(snapshot.threadTab);
            const mesaGovernada =
                !(window.TARIEL?.hasUserCapability?.("inspector_send_to_mesa", true) ?? true);
            let caption = "Workspace técnico do laudo";
            let status = "Leitura e ação separadas";

            if (stage === "assistant") {
                caption = "Canal IA";
                status = "Composer em foco";
            } else if (tab === "historico") {
                caption = "Histórico técnico do laudo";
                status = "Leitura sem composer";
            } else if (tab === "anexos") {
                caption = "Evidências e anexos do laudo";
                status = "Arquivos e provas em foco";
            } else if (tab === "correcoes") {
                caption = "Correções estruturadas do laudo";
                status = "Revisão, ajuste e reemissão guiadas";
            } else if (tab === "mesa") {
                caption = "Canal Mesa Avaliadora";
                status = "Validação e retorno técnico";
            } else {
                caption = "Canal IA";
                status = "Coleta e conversa no mesmo eixo";
            }

            if (el.workspaceNavCaption) {
                el.workspaceNavCaption.textContent = caption;
            }
            if (el.workspaceNavStatus) {
                el.workspaceNavStatus.textContent = status;
            }

            el.workspaceRailThreadTabButtons.forEach((botao) => {
                const ativo = String(botao.dataset.railThreadTab || "").trim() === tab;
                botao.setAttribute("aria-pressed", ativo ? "true" : "false");
                botao.classList.toggle("is-active", ativo);
            });

            const mesaDisponivel = !!obterLaudoAtivoIdSeguro();
            el.workspaceChannelTabButtons.forEach((botao) => {
                const alvo = normalizarThreadTab(botao.dataset.workspaceChannelTab || "conversa");
                const ativo = alvo === tab;
                const desabilitado = (
                    (alvo === "mesa" && (!mesaDisponivel || mesaGovernada))
                    || (alvo === "correcoes" && !mesaDisponivel)
                );
                botao.classList.toggle("is-active", ativo);
                botao.setAttribute("aria-selected", ativo ? "true" : "false");
                botao.disabled = desabilitado;
                botao.setAttribute("aria-disabled", desabilitado ? "true" : "false");
                if (alvo === "mesa") {
                    botao.title = mesaGovernada
                        ? "A conversa com a Mesa Avaliadora está desabilitada para esta empresa pelo Admin-CEO."
                        : "";
                } else if (alvo === "correcoes") {
                    botao.title = !mesaDisponivel
                        ? "As correções ficam disponíveis quando houver um laudo ativo no workspace."
                        : "";
                }
            });
        }

        function renderizarResumoExecutivoWorkspace() {
            const snapshotAtual = ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {};
            const stage = normalizarWorkspaceStage(snapshotAtual.workspaceStage);
            const tab = normalizarThreadTab(snapshotAtual.threadTab);
            const evidencias = ctx.actions.contarEvidenciasWorkspace?.() || 0;
            const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
            const resumoMesa = ctx.actions.obterResumoOperacionalMesa?.() || {};
            const statusAtual = stage === "assistant"
                ? CONTEXTO_WORKSPACE_ASSISTENTE.statusBadge
                : String(
                    estado.workspaceVisualContext?.statusBadge ||
                    el.workspaceStatusBadge?.textContent ||
                    "EM COLETA"
                ).trim().toUpperCase() || "EM COLETA";

            if (el.workspaceSummaryState) {
                el.workspaceSummaryState.textContent = statusAtual;
            }
            if (el.workspaceSummaryEvidencias) {
                el.workspaceSummaryEvidencias.textContent = String(evidencias);
            }
            if (el.workspaceSummaryPendencias) {
                el.workspaceSummaryPendencias.textContent = String(pendencias);
            }
            if (el.workspaceSummaryMesa) {
                el.workspaceSummaryMesa.textContent = resumoMesa.chipStatus || resumoMesa.titulo || "";
            }
            if (el.workspaceModeChip) {
                const laudoAtivo = !!obterLaudoAtivoIdSeguro();
                const nomeTemplate = NOMES_TEMPLATES?.[estado.tipoTemplateAtivo] || NOMES_TEMPLATES?.padrao || "Laudo";
                let modo = "Chat livre";
                if (tab === "correcoes") {
                    modo = "Correções";
                } else if (stage !== "assistant" && laudoAtivo) {
                    modo = estado.tipoTemplateAtivo === "padrao"
                        ? "Laudo livre"
                        : nomeTemplate;
                }
                el.workspaceModeChip.textContent = modo;
                el.workspaceModeChip.dataset.mode = modo.toLowerCase().replace(/\s+/g, "_");
            }
            window.TarielInspectorReportMode?.sync?.();
        }

        function renderizarWorkspacePublicVerification() {
            if (
                !el.workspacePublicVerification ||
                !el.workspacePublicVerificationTitle ||
                !el.workspacePublicVerificationMeta ||
                !el.workspacePublicVerificationLink ||
                !el.btnWorkspaceCopyVerification
            ) {
                return;
            }

            const stage = normalizarWorkspaceStage((ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {}).workspaceStage);
            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const lifecycleStatus = normalizarCaseLifecycleStatusSeguro(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
            const verification = normalizarPublicVerificationSeguro(snapshot?.public_verification);
            const podeExibir = (
                stage !== "assistant" &&
                ctx.actions.lifecyclePermiteVerificacaoPublicaWorkspace?.(lifecycleStatus) &&
                verification
            );

            if (!podeExibir) {
                el.workspacePublicVerification.hidden = true;
                el.workspacePublicVerificationTitle.textContent = "Entrega verificável pronta";
                el.workspacePublicVerificationMeta.textContent =
                    "Hash e link prontos para conferência documental.";
                el.workspacePublicVerificationLink.href = "#";
                el.workspacePublicVerificationLink.hidden = true;
                el.workspacePublicVerificationLink.title = "";
                el.btnWorkspaceCopyVerification.dataset.verificationUrl = "";
                el.btnWorkspaceCopyVerification.hidden = true;
                return;
            }

            const verificationUrl = String(verification.verificationUrl || "").trim();
            el.workspacePublicVerification.hidden = false;
            el.workspacePublicVerificationTitle.textContent =
                lifecycleStatus === "emitido"
                    ? "Entrega verificável disponível"
                    : "Verificação pública pronta";
            el.workspacePublicVerificationMeta.textContent =
                ctx.actions.construirMetaVerificacaoPublicaWorkspace?.(lifecycleStatus, verification)
                || "Hash e link prontos para conferência documental.";
            el.workspacePublicVerificationLink.href = verificationUrl || "#";
            el.workspacePublicVerificationLink.hidden = !verificationUrl;
            el.workspacePublicVerificationLink.title = verificationUrl || "";
            el.btnWorkspaceCopyVerification.dataset.verificationUrl = verificationUrl;
            el.btnWorkspaceCopyVerification.hidden = !verificationUrl;
        }

        function renderizarWorkspaceOfficialIssue() {
            if (
                !el.workspaceOfficialIssue ||
                !el.workspaceOfficialIssueTitle ||
                !el.workspaceOfficialIssueMeta ||
                !el.workspaceOfficialIssueChip
            ) {
                return;
            }

            const stage = normalizarWorkspaceStage((ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {}).workspaceStage);
            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const lifecycleStatus = normalizarCaseLifecycleStatusSeguro(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
            const officialIssue = ctx.shared.normalizarEmissaoOficialSeguro(snapshot?.emissao_oficial);
            const podeExibir =
                stage !== "assistant" &&
                (
                    ctx.actions.lifecyclePermiteVerificacaoPublicaWorkspace?.(lifecycleStatus) ||
                    !!officialIssue?.currentIssue ||
                    !!officialIssue?.issueStatus
                );

            if (!podeExibir) {
                el.workspaceOfficialIssue.hidden = true;
                el.workspaceOfficialIssueTitle.textContent = "Aguardando governança documental";
                el.workspaceOfficialIssueMeta.textContent = "A etapa oficial de emissão ainda não começou.";
                el.workspaceOfficialIssueChip.textContent = "PENDENTE";
                el.workspaceOfficialIssueChip.classList.remove("accepted", "warning");
                return;
            }

            const resumo = ctx.actions.construirResumoEmissaoOficialWorkspace?.(officialIssue) || {};
            el.workspaceOfficialIssue.hidden = false;
            el.workspaceOfficialIssueTitle.textContent = resumo.title || "";
            el.workspaceOfficialIssueMeta.textContent = resumo.meta || "";
            el.workspaceOfficialIssueChip.textContent = resumo.chip || "";
            el.workspaceOfficialIssueChip.classList.toggle("accepted", resumo.tone === "accepted");
            el.workspaceOfficialIssueChip.classList.toggle("warning", resumo.tone === "warning");
        }

        function renderizarWorkspaceReadiness() {
            if (
                !el.workspaceReadiness ||
                !el.workspaceReadinessTitle ||
                !el.workspaceReadinessMeta ||
                !el.workspaceReadinessChip
            ) {
                return;
            }

            const stage = normalizarWorkspaceStage((ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {}).workspaceStage);
            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const resumo = ctx.actions.construirResumoReadinessWorkspace?.(snapshot) || null;
            const podeExibir = stage !== "assistant" && !!resumo?.visible;

            if (!podeExibir) {
                el.workspaceReadiness.hidden = true;
                el.workspaceReadinessTitle.textContent = "Pronto para revisão humana";
                el.workspaceReadinessMeta.textContent =
                    "Evidências, pré-laudo e validação humana ainda não foram consolidados.";
                el.workspaceReadinessChip.textContent = "PENDENTE";
                el.workspaceReadinessChip.classList.remove("accepted", "warning");
                return;
            }

            el.workspaceReadiness.hidden = false;
            el.workspaceReadinessTitle.textContent = resumo.title || "";
            el.workspaceReadinessMeta.textContent = resumo.detail || "";
            el.workspaceReadinessChip.textContent = resumo.chip || "";
            el.workspaceReadinessChip.classList.toggle("accepted", resumo.tone === "accepted");
            el.workspaceReadinessChip.classList.toggle("warning", resumo.tone === "warning");
        }

        function sincronizarRotuloAcaoFinalizacaoWorkspace({ carregando = false } = {}) {
            const botoes = el.botoesFinalizarInspecao?.length
                ? el.botoesFinalizarInspecao
                : (el.btnFinalizarInspecao ? [el.btnFinalizarInspecao] : []);
            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const rotuloBase = ctx.actions.obterRotuloAcaoFinalizacaoWorkspace?.(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            ) || "Enviar para Mesa";
            const algumCarregando = botoes.some(
                (botao) => botao?.getAttribute("aria-busy") === "true"
            );
            const rotulo = (carregando || algumCarregando) ? "Enviando..." : rotuloBase;

            botoes.forEach((botao) => {
                const alvoTexto = botao.querySelector("span:last-child");
                if (alvoTexto) {
                    alvoTexto.textContent = rotulo;
                } else {
                    botao.textContent = rotulo;
                }
            });
        }

        Object.assign(ctx.actions, {
            renderizarResumoExecutivoWorkspace,
            renderizarResumoNavegacaoWorkspace,
            renderizarWorkspaceOfficialIssue,
            renderizarWorkspacePublicVerification,
            renderizarWorkspaceReadiness,
            sincronizarRotuloAcaoFinalizacaoWorkspace,
        });
    };
})();
