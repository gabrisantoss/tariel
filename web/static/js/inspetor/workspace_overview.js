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

        function mesaAvaliadoraDisponivelParaUsuario() {
            return window.TARIEL?.hasUserCapability?.("inspector_send_to_mesa", true) ?? true;
        }

        function sincronizarVisibilidadeMesaGovernada() {
            const mesaDisponivel = mesaAvaliadoraDisponivelParaUsuario();
            document
                .querySelectorAll(
                    "[data-tab='mesa'], [data-workspace-channel-tab='mesa'], [data-rail-thread-tab='mesa'], .technical-record-card--mesa"
                )
                .forEach((item) => {
                    item.hidden = !mesaDisponivel;
                    item.setAttribute("aria-hidden", String(!mesaDisponivel));
                    if ("disabled" in item) {
                        item.disabled = !mesaDisponivel;
                    }
                });
            document.body.dataset.inspectorMesaContract = mesaDisponivel ? "enabled" : "disabled";
        }

        function renderizarResumoNavegacaoWorkspace() {
            const snapshot = ctx.actions.obterSnapshotEstadoInspectorAtual?.() || {};
            const stage = normalizarWorkspaceStage(snapshot.workspaceStage);
            const tab = normalizarThreadTab(snapshot.threadTab);
            const mesaGovernada = !mesaAvaliadoraDisponivelParaUsuario();
            let caption = "Workspace técnico do laudo";
            let status = "Leitura e ação separadas";

            sincronizarVisibilidadeMesaGovernada();

            if (stage === "assistant") {
                caption = "Chat";
                status = "IA";
            } else if (tab === "historico") {
                caption = "Histórico";
                status = "Conversas";
            } else if (tab === "anexos") {
                caption = "Anexos";
                status = "Evidências";
            } else if (tab === "correcoes") {
                caption = "Correções";
                status = "Laudo";
            } else if (tab === "mesa") {
                caption = "Revisão";
                status = "Mesa";
            } else {
                caption = "Chat";
                status = "IA";
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
                        ? "A conversa com a Revisão Técnica está desabilitada para esta empresa pelo Admin-CEO."
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
            const laudoAtivo = !!obterLaudoAtivoIdSeguro();
            const contextoChatLivre = !laudoAtivo
                && estado.freeChatTemplateContext
                && typeof estado.freeChatTemplateContext === "object"
                ? estado.freeChatTemplateContext
                : null;
            const conversaLivrePersonalizada =
                !!contextoChatLivre
                && (stage === "assistant" || ctx.actions.conversaWorkspaceModoChatAtivo?.());
            const statusAtual = stage === "assistant"
                ? (
                    conversaLivrePersonalizada
                        ? `Chat ${String(contextoChatLivre.title || "livre").trim()}`
                        : "Chat livre"
                )
                : (
                    conversaLivrePersonalizada
                        ? `Chat ${String(contextoChatLivre.title || "livre").trim()}`
                        : String(
                            estado.workspaceVisualContext?.statusBadge ||
                            el.workspaceStatusBadge?.textContent ||
                            "Em coleta"
                        ).trim() || "Em coleta"
                );

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
                el.workspaceSummaryMesa.textContent = mesaAvaliadoraDisponivelParaUsuario()
                    ? (resumoMesa.chipStatus || resumoMesa.titulo || "")
                    : "Mesa fora do plano";
            }
            if (el.workspaceModeChip) {
                const nomeTemplate = NOMES_TEMPLATES?.[estado.tipoTemplateAtivo] || NOMES_TEMPLATES?.padrao || "Laudo";
                let modo = "Chat livre";
                if (tab === "correcoes") {
                    modo = "Correções";
                } else if (conversaLivrePersonalizada) {
                    modo = `Chat ${String(contextoChatLivre.title || "livre").trim()}`;
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
            ) || "Finalizar laudo";
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
