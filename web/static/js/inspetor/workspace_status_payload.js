(function attachTarielInspectorWorkspaceStatusPayload(global) {
    "use strict";

    function normalizarPublicVerificationSeguro(payload = null) {
        if (!payload || typeof payload !== "object") return null;

        const verificationUrl = String(
            payload.verification_url || payload.verificationUrl || ""
        ).trim();
        const hashShort = String(
            payload.hash_short || payload.hashShort || payload.codigo_hash || ""
        ).trim();
        const statusVisualLabel = String(
            payload.status_visual_label || payload.statusVisualLabel || ""
        ).trim();
        const statusRevisao = String(
            payload.status_revisao || payload.statusRevisao || ""
        ).trim();
        const caseLifecycleStatus = String(
            payload.case_lifecycle_status || payload.caseLifecycleStatus || ""
        ).trim();
        const activeOwnerRole = String(
            payload.active_owner_role || payload.activeOwnerRole || ""
        ).trim();
        const statusConformidade = String(
            payload.status_conformidade || payload.statusConformidade || ""
        ).trim();
        const documentOutcome = String(
            payload.document_outcome || payload.documentOutcome || ""
        ).trim();

        if (!verificationUrl && !hashShort) return null;

        return {
            verificationUrl,
            hashShort,
            statusVisualLabel,
            statusRevisao,
            caseLifecycleStatus,
            activeOwnerRole,
            statusConformidade,
            documentOutcome,
        };
    }

    function normalizarEmissaoOficialSeguro(payload = null) {
        if (!payload || typeof payload !== "object") return null;

        const currentIssue = payload.current_issue && typeof payload.current_issue === "object"
            ? { ...payload.current_issue }
            : null;
        const issueStatus = String(payload.issue_status || "").trim();
        const issueStatusLabel = String(payload.issue_status_label || "").trim();

        if (!issueStatus && !issueStatusLabel && !currentIssue) return null;

        return {
            issueStatus,
            issueStatusLabel,
            issueActionLabel: String(payload.issue_action_label || "").trim(),
            blockerCount: Number(payload.blocker_count || 0) || 0,
            eligibleSignatoryCount: Number(payload.eligible_signatory_count || 0) || 0,
            readyForIssue: !!payload.ready_for_issue,
            reissueRecommended: !!payload.reissue_recommended,
            alreadyIssued: !!payload.already_issued,
            currentIssue,
            blockers: Array.isArray(payload.blockers) ? payload.blockers : [],
        };
    }

    function clonarPayloadStatusRelatorioWorkspace(payload = null) {
        if (!payload || typeof payload !== "object") return null;

        return {
            ...payload,
            allowed_next_lifecycle_statuses: Array.isArray(payload?.allowed_next_lifecycle_statuses)
                ? [...payload.allowed_next_lifecycle_statuses]
                : [],
            allowed_lifecycle_transitions: Array.isArray(payload?.allowed_lifecycle_transitions)
                ? payload.allowed_lifecycle_transitions.map((item) =>
                    item && typeof item === "object" ? { ...item } : item
                )
                : [],
            allowed_surface_actions: Array.isArray(payload?.allowed_surface_actions)
                ? [...payload.allowed_surface_actions]
                : [],
            public_verification:
                payload?.public_verification && typeof payload.public_verification === "object"
                    ? { ...payload.public_verification }
                    : payload?.public_verification ?? null,
            emissao_oficial:
                payload?.emissao_oficial && typeof payload.emissao_oficial === "object"
                    ? { ...payload.emissao_oficial }
                    : payload?.emissao_oficial ?? null,
            laudo_card:
                payload?.laudo_card && typeof payload.laudo_card === "object"
                    ? {
                        ...payload.laudo_card,
                        allowed_next_lifecycle_statuses: Array.isArray(
                            payload?.laudo_card?.allowed_next_lifecycle_statuses
                        )
                            ? [...payload.laudo_card.allowed_next_lifecycle_statuses]
                            : [],
                        allowed_lifecycle_transitions: Array.isArray(
                            payload?.laudo_card?.allowed_lifecycle_transitions
                        )
                            ? payload.laudo_card.allowed_lifecycle_transitions.map((item) =>
                                item && typeof item === "object" ? { ...item } : item
                            )
                            : [],
                        allowed_surface_actions: Array.isArray(
                            payload?.laudo_card?.allowed_surface_actions
                        )
                            ? [...payload.laudo_card.allowed_surface_actions]
                            : [],
                    }
                    : payload?.laudo_card ?? null,
        };
    }

    function resolverCampoPrimarioStatusWorkspace(
        principal = null,
        fallback = null,
        campo = "",
        {
            cardFallback = true,
            defaultValue = "",
            normalizer = null,
        } = {},
    ) {
        const chave = String(campo || "").trim();
        if (!chave) {
            return typeof normalizer === "function"
                ? normalizer(defaultValue)
                : defaultValue;
        }

        const candidatos = [
            principal?.[chave],
            fallback?.[chave],
        ];
        if (cardFallback) {
            candidatos.push(
                principal?.laudo_card?.[chave],
                fallback?.laudo_card?.[chave],
            );
        }

        for (const valor of candidatos) {
            if (
                valor !== undefined
                && valor !== null
                && !(typeof valor === "string" && !String(valor).trim())
            ) {
                return typeof normalizer === "function" ? normalizer(valor) : valor;
            }
        }

        return typeof normalizer === "function"
            ? normalizer(defaultValue)
            : defaultValue;
    }

    function resolverListaPrimariaStatusWorkspace(
        principal = null,
        fallback = null,
        campo = "",
        normalizer = (valor) => valor,
    ) {
        const valor = resolverCampoPrimarioStatusWorkspace(
            principal,
            fallback,
            campo,
            {
                defaultValue: [],
                normalizer: (item) => (Array.isArray(item) ? item : []),
            }
        );
        return normalizer(valor);
    }

    function obterPayloadStatusRelatorioWorkspaceAtual(
        dependencies = {},
    ) {
        const {
            estado = {},
            apiRef = global.TarielAPI || null,
            clonarPayload = clonarPayloadStatusRelatorioWorkspace,
            normalizarCaseLifecycleStatusSeguro = (valor) => String(valor || "").trim().toLowerCase(),
            normalizarActiveOwnerRoleSeguro = (valor) => String(valor || "").trim().toLowerCase(),
            normalizarAllowedLifecycleTransitionsSeguro = (valor) =>
                Array.isArray(valor) ? valor : [],
            normalizarAllowedSurfaceActionsSeguro = (valor) =>
                Array.isArray(valor) ? valor : [],
        } = dependencies;

        const snapshot = clonarPayload(
            apiRef?.obterSnapshotStatusRelatorioAtual?.() || null
        );
        const fallback = clonarPayload(estado.ultimoStatusRelatorioPayload);
        const mergedLaudoCard = (
            snapshot?.laudo_card && typeof snapshot.laudo_card === "object"
        ) || (
            fallback?.laudo_card && typeof fallback.laudo_card === "object"
        )
            ? {
                ...(fallback?.laudo_card && typeof fallback.laudo_card === "object"
                    ? fallback.laudo_card
                    : {}),
                ...(snapshot?.laudo_card && typeof snapshot.laudo_card === "object"
                    ? snapshot.laudo_card
                    : {}),
            }
            : (snapshot?.laudo_card ?? fallback?.laudo_card ?? null);

        if (!snapshot && !fallback) {
            return {};
        }

        const allowedNextLifecycleStatuses = resolverListaPrimariaStatusWorkspace(
            snapshot,
            fallback,
            "allowed_next_lifecycle_statuses",
            (valor) => valor
        )
            .map((item) => normalizarCaseLifecycleStatusSeguro(item))
            .filter(Boolean);
        const allowedLifecycleTransitions = normalizarAllowedLifecycleTransitionsSeguro(
            resolverListaPrimariaStatusWorkspace(
                snapshot,
                fallback,
                "allowed_lifecycle_transitions",
                (valor) => valor
            )
        );
        const allowedSurfaceActions = normalizarAllowedSurfaceActionsSeguro(
            resolverListaPrimariaStatusWorkspace(
                snapshot,
                fallback,
                "allowed_surface_actions",
                (valor) => valor
            )
        );
        const caseLifecycleStatus = resolverCampoPrimarioStatusWorkspace(
            snapshot,
            fallback,
            "case_lifecycle_status",
            {
                normalizer: normalizarCaseLifecycleStatusSeguro,
            }
        );
        const caseWorkflowMode = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "case_workflow_mode",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim().toLowerCase();
        const activeOwnerRole = resolverCampoPrimarioStatusWorkspace(
            snapshot,
            fallback,
            "active_owner_role",
            {
                normalizer: normalizarActiveOwnerRoleSeguro,
            }
        );
        const caseOperationalPhase = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "case_operational_phase",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const caseOperationalPhaseLabel = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "case_operational_phase_label",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const caseOperationalSummary = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "case_operational_summary",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const reviewPhase = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "review_phase",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const reviewPhaseLabel = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "review_phase_label",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const nextActionLabel = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "next_action_label",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();
        const nextActionSummary = String(
            resolverCampoPrimarioStatusWorkspace(
                snapshot,
                fallback,
                "next_action_summary",
                {
                    defaultValue: "",
                }
            ) || ""
        ).trim();

        return {
            ...(fallback || {}),
            ...(snapshot || {}),
            public_verification:
                snapshot?.public_verification ??
                fallback?.public_verification ??
                null,
            emissao_oficial:
                snapshot?.emissao_oficial ??
                fallback?.emissao_oficial ??
                null,
            laudo_card: mergedLaudoCard
                ? {
                    ...mergedLaudoCard,
                    case_lifecycle_status: caseLifecycleStatus,
                    case_workflow_mode: caseWorkflowMode,
                    active_owner_role: activeOwnerRole,
                    case_operational_phase: caseOperationalPhase,
                    case_operational_phase_label: caseOperationalPhaseLabel,
                    case_operational_summary: caseOperationalSummary,
                    review_phase: reviewPhase,
                    review_phase_label: reviewPhaseLabel,
                    next_action_label: nextActionLabel,
                    next_action_summary: nextActionSummary,
                    allowed_next_lifecycle_statuses: allowedNextLifecycleStatuses,
                    allowed_lifecycle_transitions: allowedLifecycleTransitions,
                    allowed_surface_actions: allowedSurfaceActions,
                }
                : null,
            case_lifecycle_status: caseLifecycleStatus,
            case_workflow_mode: caseWorkflowMode,
            active_owner_role: activeOwnerRole,
            case_operational_phase: caseOperationalPhase,
            case_operational_phase_label: caseOperationalPhaseLabel,
            case_operational_summary: caseOperationalSummary,
            review_phase: reviewPhase,
            review_phase_label: reviewPhaseLabel,
            next_action_label: nextActionLabel,
            next_action_summary: nextActionSummary,
            allowed_next_lifecycle_statuses: allowedNextLifecycleStatuses,
            allowed_lifecycle_transitions: allowedLifecycleTransitions,
            allowed_surface_actions: allowedSurfaceActions,
        };
    }

    global.TarielInspectorWorkspaceStatusPayload = {
        clonarPayloadStatusRelatorioWorkspace,
        normalizarEmissaoOficialSeguro,
        normalizarPublicVerificationSeguro,
        obterPayloadStatusRelatorioWorkspaceAtual,
    };
})(window);
