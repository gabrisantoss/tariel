(function () {
    "use strict";

    const inspectorRuntime = window.TarielInspectorRuntime || null;
    const modules = typeof inspectorRuntime?.resolveModuleBucket === "function"
        ? inspectorRuntime.resolveModuleBucket("TarielInspetorModules")
        : (window.TarielInspetorModules = window.TarielInspetorModules || {});

    modules.registerGovernance = function registerGovernance(ctx) {
        const el = ctx.elements;
        const {
            normalizarCaseLifecycleStatusSeguro,
            normalizarEmissaoOficialSeguro,
            obterPayloadStatusRelatorioWorkspaceAtual,
            workspaceHasSurfaceAction,
            workspaceTemContratoLifecycle,
        } = ctx.shared;

        function humanizarMarcadorWorkspace(valor = "") {
            return String(valor || "")
                .trim()
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ")
                .replace(/\b\w/g, (letra) => letra.toUpperCase());
        }

        function obterAcoesSuperficieWorkspace(snapshot = null) {
            const valores = Array.isArray(snapshot?.allowed_surface_actions)
                ? snapshot.allowed_surface_actions
                : Array.isArray(snapshot?.laudo_card?.allowed_surface_actions)
                    ? snapshot.laudo_card.allowed_surface_actions
                    : [];
            return valores
                .map((item) => String(item || "").trim())
                .filter(Boolean);
        }

        function obterTransicoesLifecycleWorkspace(snapshot = null) {
            const valores = Array.isArray(snapshot?.allowed_lifecycle_transitions)
                ? snapshot.allowed_lifecycle_transitions
                : Array.isArray(snapshot?.laudo_card?.allowed_lifecycle_transitions)
                    ? snapshot.laudo_card.allowed_lifecycle_transitions
                    : [];
            return valores.filter((item) => item && typeof item === "object");
        }

        function humanizarAcaoSuperficieWorkspace(actionKey = "") {
            const chave = String(actionKey || "").trim().toLowerCase();
            if (chave === "chat_finalize") return "Enviar para Mesa";
            if (chave === "mesa_approve") return "Aprovar";
            if (chave === "mesa_return") return "Devolver para correção";
            if (chave === "review_approve") return "Aprovar revisão";
            return humanizarMarcadorWorkspace(chave);
        }

        function resumirAcoesSuperficieWorkspace(snapshot = null) {
            return obterAcoesSuperficieWorkspace(snapshot)
                .slice(0, 3)
                .map((item) => humanizarAcaoSuperficieWorkspace(item));
        }

        function resumirProximasTransicoesWorkspace(snapshot = null) {
            return obterTransicoesLifecycleWorkspace(snapshot)
                .slice(0, 2)
                .map((item) => {
                    const label = String(item?.label || "").trim();
                    const targetStatus = String(item?.target_status || "").trim();
                    return label || humanizarMarcadorWorkspace(targetStatus);
                })
                .filter(Boolean);
        }

        function lifecyclePermiteVerificacaoPublicaWorkspace(valor = "") {
            const status = normalizarCaseLifecycleStatusSeguro(valor);
            return status === "aprovado" || status === "emitido";
        }

        function lifecycleBloqueiaEnvioMesaWorkspace(valor = "") {
            const status = normalizarCaseLifecycleStatusSeguro(valor);
            return (
                status === "aguardando_mesa" ||
                status === "em_revisao_mesa" ||
                status === "aprovado" ||
                status === "emitido"
            );
        }

        function obterRotuloAcaoFinalizacaoWorkspace(valor = "") {
            const status = normalizarCaseLifecycleStatusSeguro(valor);
            if (status === "devolvido_para_correcao") {
                return "Reenviar para Mesa";
            }
            return "Enviar para Mesa";
        }

        function workspacePermiteFinalizacao(snapshot = null) {
            if (workspaceTemContratoLifecycle(snapshot)) {
                return workspaceHasSurfaceAction(snapshot, "chat_finalize");
            }

            return !lifecycleBloqueiaEnvioMesaWorkspace(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
        }

        function construirMetaVerificacaoPublicaWorkspace(lifecycleStatus, verification = null) {
            const partes = [];
            if (verification?.hashShort) {
                partes.push(`Hash ${verification.hashShort}`);
            }
            partes.push(
                normalizarCaseLifecycleStatusSeguro(lifecycleStatus) === "emitido"
                    ? "PDF final emitido"
                    : "Pronto para emissão"
            );
            if (verification?.statusVisualLabel) {
                partes.push(verification.statusVisualLabel);
            }
            if (verification?.statusConformidade) {
                partes.push(verification.statusConformidade);
            } else if (verification?.documentOutcome) {
                partes.push(humanizarMarcadorWorkspace(verification.documentOutcome));
            } else if (verification?.statusRevisao) {
                partes.push(humanizarMarcadorWorkspace(verification.statusRevisao));
            }
            return partes.join(" • ");
        }

        function construirResumoEmissaoOficialWorkspace(officialIssue = null) {
            if (!officialIssue) {
                return {
                    title: "Aguardando governança documental",
                    meta: "A etapa oficial de emissão ainda não começou.",
                    chip: "PENDENTE",
                    tone: "neutral",
                };
            }

            const currentIssue = officialIssue.currentIssue;
            const primeiroBloqueio = Array.isArray(officialIssue.blockers) ? officialIssue.blockers[0] : null;

            if (currentIssue) {
                const primaryPdfDiverged = !!(
                    currentIssue.primary_pdf_diverged ||
                    String(currentIssue.primary_pdf_comparison_status || "").trim().toLowerCase() === "diverged"
                );
                const frozenVersion = String(currentIssue.primary_pdf_storage_version || "").trim();
                const currentVersion = String(currentIssue.current_primary_pdf_storage_version || "").trim();
                const documentSummary = primaryPdfDiverged
                    ? [
                        "PDF atual divergiu do emitido",
                        frozenVersion && currentVersion && frozenVersion !== currentVersion
                            ? `${frozenVersion} → ${currentVersion}`
                            : currentVersion && currentVersion !== frozenVersion
                                ? `Atual ${currentVersion}`
                                : frozenVersion
                                    ? `Emitido ${frozenVersion}`
                                    : "",
                    ].filter(Boolean).join(" • ")
                    : officialIssue.reissueRecommended
                        ? "Reemissão recomendada"
                        : "";
                return {
                    title: String(currentIssue.issue_number || officialIssue.issueStatusLabel || "Emissão oficial ativa"),
                    meta: [
                        currentIssue.signatory_name || "",
                        currentIssue.signatory_registration || "",
                        documentSummary,
                    ].filter(Boolean).join(" • ") || "Pacote emitido e congelado.",
                    chip: primaryPdfDiverged || officialIssue.reissueRecommended ? "REEMITIR" : "EMITIDO",
                    tone: primaryPdfDiverged || officialIssue.reissueRecommended ? "warning" : "accepted",
                };
            }

            if (officialIssue.readyForIssue) {
                return {
                    title: String(officialIssue.issueStatusLabel || "Pronto para emissão oficial"),
                    meta: [
                        officialIssue.issueActionLabel || "Emitir oficialmente",
                        officialIssue.eligibleSignatoryCount
                            ? `${officialIssue.eligibleSignatoryCount} signatário(s) elegível(is)`
                            : "",
                    ].filter(Boolean).join(" • "),
                    chip: "PRONTO",
                    tone: "accepted",
                };
            }

            return {
                title: String(officialIssue.issueStatusLabel || "Bloqueado por governança"),
                meta: String(primeiroBloqueio?.message || "A emissão oficial ainda tem bloqueios pendentes."),
                chip: officialIssue.blockerCount ? `${officialIssue.blockerCount} BLOQ.` : "PENDENTE",
                tone: "neutral",
            };
        }

        function contarFotosSelecionadasParaEmissaoWorkspace(reportPackDraft = null) {
            const analysisBasis = reportPackDraft?.analysis_basis;
            const selectedPhotoEvidence = Array.isArray(analysisBasis?.selected_photo_evidence)
                ? analysisBasis.selected_photo_evidence
                : [];
            const issuedPhotoSelection = analysisBasis?.issued_photo_selection;
            const selectedCount = Number(issuedPhotoSelection?.selected_count || 0) || 0;
            return Math.max(selectedPhotoEvidence.length, selectedCount, 0);
        }

        function formatarModoValidacaoWorkspace(valor = "") {
            const modo = String(valor || "").trim().toLowerCase();
            if (!modo) return "";
            if (modo === "mesa_required") return "Mesa obrigatória";
            if (modo === "mobile_autonomous") return "Autonomia assistida";
            if (modo === "human_override") return "Override humano";
            return modo.replace(/[_-]+/g, " ");
        }

        function construirResumoReadinessWorkspace(snapshot = {}) {
            const reportPackDraft = snapshot?.report_pack_draft && typeof snapshot.report_pack_draft === "object"
                ? snapshot.report_pack_draft
                : {};
            const preLaudoSummary = snapshot?.pre_laudo_summary && typeof snapshot.pre_laudo_summary === "object"
                ? snapshot.pre_laudo_summary
                : {};
            const qualityGates = reportPackDraft?.quality_gates && typeof reportPackDraft.quality_gates === "object"
                ? reportPackDraft.quality_gates
                : {};
            const missingEvidence = Array.isArray(qualityGates?.missing_evidence)
                ? qualityGates.missing_evidence
                : [];
            const missingEvidenceCount = missingEvidence.length;
            const missingFieldCount = Number(preLaudoSummary?.missing_field_count || 0) || 0;
            const selectedPhotoCount = contarFotosSelecionadasParaEmissaoWorkspace(reportPackDraft);
            const humanValidationRequired = !!snapshot?.human_validation_required;
            const officialIssue = normalizarEmissaoOficialSeguro(snapshot?.emissao_oficial);
            const readinessMode = formatarModoValidacaoWorkspace(
                preLaudoSummary?.final_validation_mode || qualityGates?.final_validation_mode
            );
            const reissueSummary = snapshot?.laudo_card?.issued_document_reopen_summary;
            const reissueRecommended = !!(
                officialIssue?.reissueRecommended ||
                reissueSummary?.reissue_recommended
            );
            const readyForFinalization = !!preLaudoSummary?.ready_for_finalization;
            const readyForIssue = !!officialIssue?.readyForIssue;
            const autonomyReady = !!qualityGates?.autonomy_ready;

            const metaParts = [];
            if (missingEvidenceCount > 0) {
                metaParts.push(
                    missingEvidenceCount === 1
                        ? "1 evidência obrigatória pendente"
                        : `${missingEvidenceCount} evidências obrigatórias pendentes`
                );
            } else {
                metaParts.push("Evidências obrigatórias completas");
            }
            if (missingFieldCount > 0) {
                metaParts.push(
                    missingFieldCount === 1
                        ? "1 campo crítico pendente"
                        : `${missingFieldCount} campos críticos pendentes`
                );
            } else if (readyForFinalization) {
                metaParts.push("Pré-laudo consistente");
            }
            if (selectedPhotoCount > 0) {
                metaParts.push(
                    selectedPhotoCount === 1
                        ? "1 foto curada para emissão"
                        : `${selectedPhotoCount} fotos curadas para emissão`
                );
            }
            if (readinessMode) {
                metaParts.push(readinessMode);
            }
            if (reissueRecommended) {
                metaParts.push("Reemissão recomendada");
            }

            if (readyForIssue) {
                return {
                    visible: true,
                    title: "Pronto para emissão oficial",
                    detail: metaParts.join(" • ") || "Checklist documental consolidado para emissão.",
                    chip: "PRONTO",
                    tone: "accepted",
                };
            }

            if (readyForFinalization && humanValidationRequired) {
                return {
                    visible: true,
                    title: "Pronto para revisão humana",
                    detail: metaParts.join(" • ") || "Pré-laudo consolidado aguardando validação humana.",
                    chip: "REVISAR",
                    tone: reissueRecommended ? "warning" : "accepted",
                };
            }

            if (readyForFinalization && autonomyReady) {
                return {
                    visible: true,
                    title: "Checklist documental consolidado",
                    detail: metaParts.join(" • ") || "Laudo pronto para avançar sem pendências estruturais.",
                    chip: "PRONTO",
                    tone: "accepted",
                };
            }

            const hasSignals = !!(
                snapshot?.report_pack_draft ||
                snapshot?.pre_laudo_summary ||
                snapshot?.emissao_oficial ||
                snapshot?.human_validation_required ||
                snapshot?.case_lifecycle_status ||
                snapshot?.laudo_card?.case_lifecycle_status
            );

            return {
                visible: hasSignals,
                title: "Completar prontidão antes de emitir",
                detail: metaParts.join(" • ") || "Ainda há pendências documentais para consolidar o laudo.",
                chip: "PENDENTE",
                tone: reissueRecommended ? "warning" : "neutral",
            };
        }

        function resumirReemissaoRecomendadaPortal(total = 0) {
            const quantidade = Number(total || 0);
            return quantidade === 1
                ? "1 caso com reemissão recomendada"
                : `${quantidade} casos com reemissão recomendada`;
        }

        function detalharReemissaoRecomendadaPortal(total = 0) {
            return Number(total || 0) === 1
                ? "PDF oficial divergente detectado no ponto de entrada do inspetor."
                : "PDF oficial divergente detectado em casos já emitidos do inspetor.";
        }

        function coletarResumoGovernancaPortal() {
            const itens = Array.from(
                document.querySelectorAll("[data-home-laudo-id][data-official-issue-diverged='true']")
            );
            const laudosDivergentes = new Set();
            itens.forEach((item) => {
                const laudoId = Number(item.dataset.homeLaudoId || 0) || 0;
                if (laudoId > 0) {
                    laudosDivergentes.add(laudoId);
                }
            });
            const total = laudosDivergentes.size;
            return {
                visible: total > 0,
                reissueRecommendedCount: total,
                label: resumirReemissaoRecomendadaPortal(total),
                detail: detalharReemissaoRecomendadaPortal(total),
            };
        }

        function renderizarGovernancaEntradaInspetor() {
            const resumo = coletarResumoGovernancaPortal();

            if (el.portalGovernanceSummary) {
                el.portalGovernanceSummary.hidden = !resumo.visible;
            }
            if (el.portalGovernanceSummaryTitle) {
                el.portalGovernanceSummaryTitle.textContent = resumo.label;
            }
            if (el.portalGovernanceSummaryDetail) {
                el.portalGovernanceSummaryDetail.textContent = resumo.detail;
            }

            if (el.workspaceAssistantGovernance) {
                el.workspaceAssistantGovernance.hidden = !resumo.visible;
            }
            if (el.workspaceAssistantGovernanceTitle) {
                el.workspaceAssistantGovernanceTitle.textContent = resumo.label;
            }
            if (el.workspaceAssistantGovernanceDetail) {
                el.workspaceAssistantGovernanceDetail.textContent = resumo.detail;
            }
        }

        function construirResumoGovernancaHistoricoWorkspace() {
            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const officialIssue = normalizarEmissaoOficialSeguro(snapshot?.emissao_oficial);
            const currentIssue = officialIssue?.currentIssue;
            const reopenSummary = snapshot?.laudo_card?.issued_document_reopen_summary
                && typeof snapshot.laudo_card.issued_document_reopen_summary === "object"
                ? snapshot.laudo_card.issued_document_reopen_summary
                : null;
            const primaryPdfDiverged = !!(
                currentIssue?.primary_pdf_diverged ||
                String(currentIssue?.primary_pdf_comparison_status || "").trim().toLowerCase() === "diverged"
            );
            const lifecycleStatus = normalizarCaseLifecycleStatusSeguro(
                snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status
            );
            const reviewModeFinal = String(snapshot?.review_mode_final || snapshot?.laudo_card?.review_mode_final || "").trim();
            const verification = snapshot?.public_verification && typeof snapshot.public_verification === "object"
                ? snapshot.public_verification
                : null;
            const documentVisibilityDetail = reopenSummary
                ? (
                    reopenSummary.visible_in_active_case
                        ? "O PDF emitido anterior continua visível no caso atual."
                        : "O PDF emitido anterior segue preservado apenas no histórico interno."
                )
                : "";
            const reopenedDocumentLabel = String(reopenSummary?.file_name || "").trim();
            const reopenedDocumentMeta = [
                reopenedDocumentLabel,
                String(reopenSummary?.storage_version || "").trim(),
            ].filter(Boolean).join(" • ");

            if (primaryPdfDiverged) {
                const frozenVersion = String(currentIssue?.primary_pdf_storage_version || "").trim();
                const currentVersion = String(currentIssue?.current_primary_pdf_storage_version || "").trim();
                const versionSummary = (
                    frozenVersion && currentVersion && frozenVersion !== currentVersion
                        ? `${frozenVersion} → ${currentVersion}`
                        : currentVersion && currentVersion !== frozenVersion
                            ? `Atual ${currentVersion}`
                            : frozenVersion
                                ? `Emitido ${frozenVersion}`
                                : ""
                );

                return {
                    visible: true,
                    title: "Reemissão recomendada",
                    detail: [
                        "PDF emitido divergente",
                        versionSummary,
                        documentVisibilityDetail,
                        reopenedDocumentMeta,
                        String(currentIssue?.issue_number || "").trim(),
                    ].filter(Boolean).join(" • "),
                    actionLabel: "Abrir reemissão na Mesa",
                    actionKey: "reissue",
                };
            }

            if (reopenSummary) {
                return {
                    visible: true,
                    title: reopenSummary.visible_in_active_case
                        ? "Documento emitido anterior ainda visível"
                        : "Documento emitido anterior preservado em histórico",
                    detail: [
                        documentVisibilityDetail,
                        reopenedDocumentMeta,
                        "Nova revisão em andamento",
                    ].filter(Boolean).join(" • "),
                    actionLabel: "Abrir Mesa",
                    actionKey: "mesa",
                };
            }

            if (workspaceTemContratoLifecycle(snapshot)) {
                const resumoAcoes = resumirAcoesSuperficieWorkspace(snapshot);
                const resumoTransicoes = resumirProximasTransicoesWorkspace(snapshot);
                const validacaoHumanaObrigatoria = snapshot?.human_validation_required !== false;

                if (workspaceHasSurfaceAction(snapshot, "chat_finalize")) {
                    return {
                        visible: true,
                        title: "Caso pronto para próximo handoff",
                        detail: [
                            humanizarMarcadorWorkspace(lifecycleStatus),
                            resumoTransicoes[0] || "Próximo passo humano disponível",
                            validacaoHumanaObrigatoria ? "Validação humana obrigatória" : "",
                        ].filter(Boolean).join(" • "),
                        actionLabel: "Abrir Mesa",
                        actionKey: "mesa",
                    };
                }

                if (
                    workspaceHasSurfaceAction(snapshot, "mesa_approve") ||
                    workspaceHasSurfaceAction(snapshot, "mesa_return")
                ) {
                    return {
                        visible: true,
                        title: "Mesa com decisão pendente",
                        detail: [
                            humanizarMarcadorWorkspace(lifecycleStatus),
                            resumoAcoes.join(" • "),
                            resumoTransicoes[0] || "",
                        ].filter(Boolean).join(" • "),
                        actionLabel: "Abrir Mesa",
                        actionKey: "mesa",
                    };
                }

                if (reviewModeFinal || resumoTransicoes.length) {
                    return {
                        visible: true,
                        title: "Contrato canônico do caso ativo",
                        detail: [
                            humanizarMarcadorWorkspace(lifecycleStatus),
                            reviewModeFinal ? `Revisão ${humanizarMarcadorWorkspace(reviewModeFinal)}` : "",
                            resumoTransicoes.join(" • "),
                        ].filter(Boolean).join(" • "),
                        actionLabel: "",
                        actionKey: "",
                    };
                }
            }

            if (verification && (lifecycleStatus === "aprovado" || lifecycleStatus === "emitido")) {
                return {
                    visible: true,
                    title: lifecycleStatus === "emitido"
                        ? "Entrega verificável disponível"
                        : "Verificação pública pronta",
                    detail: [
                        String(verification.hashShort || "").trim(),
                        String(verification.statusVisualLabel || "").trim(),
                        String(verification.statusConformidade || "").trim(),
                    ].filter(Boolean).join(" • "),
                    actionLabel: "",
                    actionKey: "",
                };
            }

            return {
                visible: false,
                title: "Governança do caso",
                detail: "Os sinais canônicos do caso aparecerão aqui conforme o fluxo evoluir.",
                actionLabel: "",
                actionKey: "",
            };
        }

        function renderizarGovernancaHistoricoWorkspace() {
            const resumo = construirResumoGovernancaHistoricoWorkspace();

            if (el.workspaceHistoryGovernance) {
                el.workspaceHistoryGovernance.hidden = !resumo.visible;
            }
            if (el.workspaceHistoryGovernanceTitle) {
                el.workspaceHistoryGovernanceTitle.textContent = resumo.title;
            }
            if (el.workspaceHistoryGovernanceDetail) {
                el.workspaceHistoryGovernanceDetail.textContent = resumo.detail;
            }
            if (el.btnWorkspaceHistoryReissue) {
                el.btnWorkspaceHistoryReissue.textContent = resumo.actionLabel;
                el.btnWorkspaceHistoryReissue.hidden = !resumo.visible || !String(resumo.actionLabel || "").trim();
                el.btnWorkspaceHistoryReissue.dataset.historyGovernanceAction = String(resumo.actionKey || "").trim();
            }
        }

        function renderizarReadinessHistoricoWorkspace() {
            if (
                !el.workspaceHistoryReadiness ||
                !el.workspaceHistoryReadinessTitle ||
                !el.workspaceHistoryReadinessDetail ||
                !el.workspaceHistoryReadinessChip
            ) {
                return;
            }

            const snapshot = obterPayloadStatusRelatorioWorkspaceAtual();
            const resumo = construirResumoReadinessWorkspace(snapshot);
            el.workspaceHistoryReadiness.hidden = !resumo.visible;
            el.workspaceHistoryReadinessTitle.textContent = resumo.title || "";
            el.workspaceHistoryReadinessDetail.textContent = resumo.detail || "";
            el.workspaceHistoryReadinessChip.textContent = resumo.chip || "";
            el.workspaceHistoryReadiness.classList.toggle(
                "workspace-history-insight--accepted",
                resumo.tone === "accepted"
            );
            el.workspaceHistoryReadiness.classList.toggle(
                "workspace-history-insight--warning",
                resumo.tone === "warning"
            );
            el.workspaceHistoryReadinessChip.classList.toggle("accepted", resumo.tone === "accepted");
            el.workspaceHistoryReadinessChip.classList.toggle("warning", resumo.tone === "warning");
        }

        Object.assign(ctx.actions, {
            lifecyclePermiteVerificacaoPublicaWorkspace,
            obterRotuloAcaoFinalizacaoWorkspace,
            workspacePermiteFinalizacao,
            construirMetaVerificacaoPublicaWorkspace,
            construirResumoEmissaoOficialWorkspace,
            construirResumoReadinessWorkspace,
            construirResumoGovernancaHistoricoWorkspace,
            renderizarGovernancaEntradaInspetor,
            renderizarGovernancaHistoricoWorkspace,
            renderizarReadinessHistoricoWorkspace,
        });
    };
})();
