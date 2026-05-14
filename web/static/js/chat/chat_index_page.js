// ==========================================
// TARIEL CONTROL TOWER — CHAT_INDEX_PAGE.JS
// Página principal do chat.
// Responsável por:
// - modal de nova inspeção
// - barra de sessão ativa
// - ações rápidas
// - destaque visual do textarea
// - banner de resposta da engenharia
// - SSE de notificações da página
// ==========================================

(function () {
    "use strict";

    const InspectorRuntime = window.TarielInspectorRuntime || null;
    const ChatIndexRuntime = window.TarielChatIndexPageRuntime || null;
    if (typeof ChatIndexRuntime?.guardOnce === "function") {
        if (!ChatIndexRuntime.guardOnce(InspectorRuntime, "chat_index_page")) return;
    } else if (typeof InspectorRuntime?.guardOnce === "function") {
        if (!InspectorRuntime.guardOnce("chat_index_page")) return;
    } else if (window.__TARIEL_CHAT_INDEX_PAGE_WIRED__) {
        return;
    } else {
        window.__TARIEL_CHAT_INDEX_PAGE_WIRED__ = true;
    }

    // =========================================================
    // CONSTANTES
    // =========================================================
    const ROTA_SSE_NOTIFICACOES = "/app/api/notificacoes/sse";
    const TEMPO_BANNER_MS = 8000;
    const TEMPO_RECONEXAO_SSE_MS = 5000;
    const BREAKPOINT_LAYOUT_INSPETOR_COMPACTO = 1199;
    const resolvedRuntimeModules =
        ChatIndexRuntime?.resolveModules?.(InspectorRuntime)
        || window.TarielInspectorWorkspaceRuntimeRegistry?.resolveInspectorRuntimeModules?.(InspectorRuntime)
        || {};
    const sharedGlobals =
        ChatIndexRuntime?.resolveSharedGlobals?.(resolvedRuntimeModules)
        || resolvedRuntimeModules.sharedGlobals
        || {
            perf: window.TarielPerf || window.TarielCore?.TarielPerf || null,
            caseLifecycle: window.TarielCaseLifecycle,
        };
    const InspectorStateSnapshots = resolvedRuntimeModules.InspectorStateSnapshots || {};
    const InspectorStateAuthority = resolvedRuntimeModules.InspectorStateAuthority || {};
    const InspectorStateRuntimeSync = resolvedRuntimeModules.InspectorStateRuntimeSync || {};
    const InspectorStateNormalization = resolvedRuntimeModules.InspectorStateNormalization || {};
    const InspectorHistoryBuilders = resolvedRuntimeModules.InspectorHistoryBuilders || {};
    const InspectorWorkspaceHistoryContext = resolvedRuntimeModules.InspectorWorkspaceHistoryContext || {};
    const InspectorWorkspaceMesaStatus = resolvedRuntimeModules.InspectorWorkspaceMesaStatus || {};
    const InspectorSidebarHistory = resolvedRuntimeModules.InspectorSidebarHistory || {};
    const InspectorWorkspaceRail = resolvedRuntimeModules.InspectorWorkspaceRail || {};
    const InspectorWorkspaceRuntimeState = resolvedRuntimeModules.InspectorWorkspaceRuntimeState || {};
    const InspectorWorkspaceRuntimeScreen = resolvedRuntimeModules.InspectorWorkspaceRuntimeScreen || {};
    const InspectorWorkspaceScreen = resolvedRuntimeModules.InspectorWorkspaceScreen || {};
    const InspectorWorkspaceThread = resolvedRuntimeModules.InspectorWorkspaceThread || {};
    const InspectorWorkspaceUtils = resolvedRuntimeModules.InspectorWorkspaceUtils || {};
    const InspectorWorkspaceStage = resolvedRuntimeModules.InspectorWorkspaceStage || {};
    const InspectorWorkspaceMesaAttachments = resolvedRuntimeModules.InspectorWorkspaceMesaAttachments || {};
    const InspectorWorkspaceContextFlow = resolvedRuntimeModules.InspectorWorkspaceContextFlow || {};
    const InspectorWorkspaceHomeFlow = resolvedRuntimeModules.InspectorWorkspaceHomeFlow || {};
    const InspectorWorkspaceComposer = resolvedRuntimeModules.InspectorWorkspaceComposer || {};
    const InspectorWorkspaceDeliveryFlow = resolvedRuntimeModules.InspectorWorkspaceDeliveryFlow || {};
    const InspectorWorkspaceOrchestration = resolvedRuntimeModules.InspectorWorkspaceOrchestration || {};
    const InspectorWorkspacePageBoot = resolvedRuntimeModules.InspectorWorkspacePageBoot || {};
    const PERF = sharedGlobals.perf;
    const CaseLifecycle = sharedGlobals.caseLifecycle;

    function obterStatusPayloadRuntime() {
        return ChatIndexRuntime?.resolveStatusPayload?.()
            || window.TarielInspectorWorkspaceStatusPayload
            || {};
    }

    function obterTarielApiRuntime() {
        return ChatIndexRuntime?.resolveApi?.() || window.TarielAPI || null;
    }

    function obterInspectorSharedRuntime() {
        return ChatIndexRuntime?.resolveInspectorShared?.()
            || window.TarielInspetorRuntime?.shared
            || {};
    }

    function obterLocationRuntime() {
        return ChatIndexRuntime?.resolveLocation?.() || window.location;
    }

    function obterViewportWidthRuntime() {
        return ChatIndexRuntime?.getViewportWidth?.() || Number(window.innerWidth || 0);
    }

    if (!CaseLifecycle) {
        return;
    }

    PERF?.noteModule?.("chat/chat_index_page.js", {
        readyState: document.readyState,
    });

    const NOMES_TEMPLATES = {
        avcb: "Laudo AVCB (Projeto e Conformidade)",
        cbmgo: "Checklist Bombeiros GO (CMAR / Estrutura)",
        nr12maquinas: "Laudo de Adequação NR-12",
        nr13: "Inspeção NR-13 (Caldeiras e Vasos)",
        rti: "RTI - Instalações Elétricas",
        pie: "PIE - Prontuário Elétrico",
        spda: "Inspeção SPDA — NBR 5419",
        padrao: "Inspeção Geral",
    };

    const CONFIG_STATUS_MESA = {
        pronta: {
            icone: "support_agent",
            texto: "Revisão pronta",
        },
        canal_ativo: {
            icone: "alternate_email",
            texto: "Revisão ativa",
        },
        aguardando: {
            icone: "hourglass_top",
            texto: "Aguardando revisão",
        },
        respondeu: {
            icone: "mark_chat_read",
            texto: "Revisão respondida",
        },
        pendencia_aberta: {
            icone: "assignment_late",
            texto: "Pendência aberta",
        },
        offline: {
            icone: "wifi_off",
            texto: "Revisão indisponível",
        },
    };

    const CONFIG_CONEXAO_MESA_WIDGET = {
        conectado: "Conectado",
        reconectando: "Reconectando",
        offline: "Offline",
    };

    const EM_PRODUCAO =
        ChatIndexRuntime?.isProductionLocation?.(obterLocationRuntime())
        ?? (
            obterLocationRuntime().hostname !== "localhost" &&
            obterLocationRuntime().hostname !== "127.0.0.1"
        );
    const LIMITE_RECONEXAO_SSE_OFFLINE = 3;
    const MAX_BYTES_ANEXO_MESA = 12 * 1024 * 1024;
    const CHAVE_FORCE_HOME_LANDING = "tariel_force_home_landing";
    const CHAVE_RETOMADA_HOME_PENDENTE = "tariel_workspace_retomada_home_pendente";
    const CHAVE_CONTEXTO_VISUAL_LAUDOS = "tariel_workspace_contexto_visual_laudos";
    const LIMITE_CONTEXTO_VISUAL_LAUDOS_STORAGE = 50;
    const MENSAGEM_MESA_EXIGE_INSPECAO =
        "A revisão só fica disponível após iniciar uma nova inspeção.";
    const MIME_ANEXOS_MESA_PERMITIDOS = new Set([
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const WORKSPACE_REISSUE_SUGGESTION_ACTION = 'data-suggestion-action="reissue"';

    const COMANDOS_SLASH = [
        {
            id: "resumir",
            titulo: "Resumir coleta",
            descricao: "Gera um resumo técnico curto com fatos confirmados, lacunas e próximos passos.",
            prompt: "Resuma a coleta atual em tópicos objetivos, destacando fatos confirmados, riscos observados, lacunas de evidência e próximo passo recomendado.",
            atalho: "/resumir",
            sugestao: true,
            icone: "notes",
        },
        {
            id: "pendencias",
            titulo: "Mapear pendências",
            descricao: "Lista o que ainda falta para fechar a inspeção com prioridade operacional.",
            prompt: "Liste as pendências atuais desta inspeção em ordem de prioridade operacional, indicando o que falta coletar, o motivo e o impacto no fechamento do laudo.",
            atalho: "/pendencias",
            sugestao: true,
            icone: "assignment_late",
        },
        {
            id: "proxima-pergunta",
            titulo: "Próxima pergunta",
            descricao: "Sugere a melhor próxima pergunta técnica para avançar a coleta.",
            prompt: "Com base no histórico atual, qual é a próxima pergunta técnica mais útil para avançar esta inspeção com qualidade auditável?",
            atalho: "/proxima-pergunta",
            sugestao: true,
            icone: "help",
        },
        {
            id: "plano-acao",
            titulo: "Plano de ação",
            descricao: "Organiza um plano de coleta com sequência prática para o inspetor.",
            prompt: "Monte um plano de ação curto para concluir esta inspeção, com sequência prática de coleta, anexos necessários e pontos que precisam de validação técnica.",
            atalho: "/plano-acao",
            sugestao: false,
            icone: "checklist",
        },
        {
            id: "nao-conformidades",
            titulo: "Não conformidades",
            descricao: "Extrai potenciais não conformidades e classifica por criticidade.",
            prompt: "A partir do histórico atual, identifique potenciais não conformidades, classifique por criticidade e aponte quais evidências sustentam cada uma.",
            atalho: "/nao-conformidades",
            sugestao: true,
            icone: "warning",
        },
        {
            id: "gerar-conclusao",
            titulo: "Gerar conclusão",
            descricao: "Redige uma conclusão preliminar profissional com ressalvas auditáveis.",
            prompt: "Redija uma conclusão preliminar profissional desta inspeção, separando condições observadas, limitações de evidência, pendências e recomendação final.",
            atalho: "/gerar-conclusao",
            sugestao: true,
            icone: "article",
        },
    ];

    const SUGESTOES_ENTRADA_ASSISTENTE = Object.freeze([
        {
            id: "guided-inspection",
            titulo: "Iniciar inspeção guiada",
            prioridade: "primary",
            prompt: "Quero iniciar uma inspeção guiada. Me ajude a estruturar o contexto inicial e o que devo coletar primeiro.",
        },
        {
            id: "structure-context",
            titulo: "Estruturar contexto",
            prioridade: "secondary",
            prompt: "Vou te passar o contexto do equipamento e do cenário. Estruture a sessão técnica e diga o que preciso observar primeiro.",
        },
        {
            id: "technical-question",
            titulo: "Dúvida técnica",
            prioridade: "secondary",
            prompt: "Tenho uma dúvida técnica. Me responda de forma objetiva, auditável e com os critérios que preciso verificar em campo.",
        },
    ]);

    const CONTEXTO_WORKSPACE_ASSISTENTE = Object.freeze({
        title: "Tariel",
        subtitle: "Chat técnico",
        statusBadge: "IA",
    });

    const COPY_WORKSPACE_STAGE = Object.freeze({
        assistant: {
            eyebrow: "Tariel IA",
            headline: "Por onde começamos?",
            description:
                "Chat técnico para perguntas, evidências e geração NR editável.",
            placeholder: "Peça ao Tariel",
            contextTitle: "Chat",
            contextStatus: "Tariel responde e estrutura o próximo passo.",
        },
        inspection: {
            eyebrow: "Inspeção",
            headline: "Registro Técnico",
            description:
                "Documente evidências, anexe arquivos e interaja com o assistente técnico.",
            placeholder: "Descreva a evidência, anexe arquivos ou use / para comandos",
        },
        focusedConversation: {
            eyebrow: "Tariel IA",
            headline: "Chat",
            description:
                "Continue a conversa normalmente.",
            placeholder: "Peça ao Tariel",
            contextTitle: "Chat",
            contextStatus: "Histórico e composer em foco.",
        },
    });

    // =========================================================
    // ESTADO LOCAL DA PÁGINA
    // =========================================================
    const estado = {
        tipoTemplateAtivo: "padrao",
        statusMesa: "pronta",
        laudoAtualId: null,
        estadoRelatorio: "sem_relatorio",
        modoInspecaoUI: "workspace",
        workspaceStage: "assistant",
        inspectorScreen: "assistant_landing",
        inspectorBaseScreen: "assistant_landing",
        threadTab: "conversa",
        forceHomeLanding: false,
        homeActionVisible: false,
        overlayOwner: "",
        assistantLandingFirstSendPending: false,
        freeChatConversationActive: false,
        freeChatTemplateContext: null,
        workspaceVisualContext: { ...CONTEXTO_WORKSPACE_ASSISTENTE },
        contextoVisualPorLaudo: {},
        ultimoStatusRelatorioPayload: null,
        workspaceRailExpanded: false,
        workspaceRailAccordionState: Object.create(null),
        workspaceRailViewKey: "",
        pendenciasItens: [],
        carregandoPendencias: false,
        laudoPendenciasAtual: null,
        qtdPendenciasAbertas: 0,
        filtroPendencias: "abertas",
        paginaPendenciasAtual: 1,
        tamanhoPaginaPendencias: 25,
        totalPendenciasFiltradas: 0,
        totalPendenciasExibidas: 0,
        temMaisPendencias: false,
        pendenciasAbortController: null,
        pendenciasRealCount: 0,
        pendenciasFilteredCount: 0,
        pendenciasLoading: false,
        pendenciasEmpty: false,
        pendenciasSynthetic: false,
        pendenciasHonestEmpty: false,
        pendenciasError: false,
        fonteSSE: null,
        timerBanner: null,
        timerReconexaoSSE: null,
        ultimoElementoFocado: null,
        iniciandoInspecao: false,
        finalizandoInspecao: false,
        mesaWidgetAberto: false,
        mesaWidgetCarregando: false,
        mesaWidgetMensagens: [],
        mesaWidgetCursor: null,
        mesaWidgetTemMais: false,
        mesaWidgetAbortController: null,
        mesaWidgetReferenciaAtiva: null,
        mesaWidgetAnexoPendente: null,
        mesaWidgetNaoLidas: 0,
        mesaWidgetConexao: "conectado",
        systemEventsBound: false,
        tentativasReconexaoSSE: 0,
        timerFecharMesaWidget: null,
        retomadaHomePendente: null,
        modalNovaInspecaoPrePrompt: "",
        entryModePreferenceDefault: "auto_recommended",
        entryModeRememberLastCaseMode: false,
        entryModeLastCaseMode: null,
        entryModePreference: "auto_recommended",
        entryModeEffective: "chat_first",
        entryModeReason: "default_product_fallback",
        termoBuscaSidebar: "",
        sidebarLaudosTab: "recentes",
        chatBuscaTermo: "",
        chatFiltroTimeline: "todos",
        historyTypeFilter: "todos",
        chatResultados: 0,
        chatStatusIA: {
            status: "pronto",
            texto: "Tariel pronto",
        },
        atualizandoPainelWorkspaceDerivado: false,
        atualizarPainelWorkspaceDerivadoPendente: false,
        contextoFixado: [],
        historicoPrompts: [],
        indiceHistoricoPrompt: -1,
        rascunhoHistoricoPrompt: "",
        slashIndiceAtivo: 0,
        historyRealCount: 0,
        historyEmpty: true,
        historySynthetic: false,
        historyHonestEmpty: false,
        historyRenderedItems: [],
        historyCanonicalItems: [],
        snapshotEstadoInspector: null,
        snapshotEstadoInspectorOrigem: {},
        divergenciasEstadoInspector: {},
    };

    // Compatibilidade com trechos legados do projeto.
    window.tipoTemplateAtivo = estado.tipoTemplateAtivo;

    // =========================================================
    // REFERÊNCIAS DOS ELEMENTOS DA PÁGINA
    // =========================================================
    const el =
        ChatIndexRuntime?.resolvePageElements?.(document)
        || window.TarielInspectorWorkspacePageElements?.buildInspectorPageElements?.(document)
        || {};

    const avisosEstadoInspector = new Set();
    const divergenciasEstadoInspector = new Map();
    let sincronizandoInspectorScreen = false;
    let sincronizacaoInspectorScreenPendente = false;
    let syncInspectorScreenRaf = 0;
    const mesaWidgetDockOriginal = el.painelMesaWidget?.parentElement || null;

    // =========================================================
    // UTILITÁRIOS
    // =========================================================

    function mostrarToast(mensagem, tipo = "info", duracao = 3000) {
        if (typeof ChatIndexRuntime?.showToast === "function") {
            ChatIndexRuntime.showToast(mensagem, tipo, duracao);
            return;
        }
        if (typeof window.mostrarToast === "function") {
            window.mostrarToast(mensagem, tipo, duracao);
        }
    }

    function debugRuntime(...args) {
        if (EM_PRODUCAO) return;

        if (typeof ChatIndexRuntime?.debug === "function") {
            ChatIndexRuntime.debug(...args);
            return;
        }
        if (typeof window.TarielCore?.debug === "function") {
            window.TarielCore.debug(...args);
        }
    }

    function logOnceRuntime(chave, nivel, ...args) {
        if (ChatIndexRuntime?.logOnce?.(chave, nivel, ...args)) {
            return;
        }

        const key = String(chave || "").trim();
        if (!key || avisosEstadoInspector.has(key)) return;
        avisosEstadoInspector.add(key);

        try {
            (console?.[nivel] ?? console?.log)?.call(console, "[TARIEL][CHAT_INDEX_PAGE]", ...args);
        } catch (_) {}
    }

    function emitirEventoTariel(nome, detail = {}) {
        if (typeof ChatIndexRuntime?.emitInspectorEvent === "function") {
            ChatIndexRuntime.emitInspectorEvent(nome, detail, document);
            return;
        }

        document.dispatchEvent(new CustomEvent(nome, {
            detail,
            bubbles: true,
        }));
    }

    function ouvirEventoTariel(nome, handler) {
        if (typeof ChatIndexRuntime?.onInspectorEvent === "function") {
            return ChatIndexRuntime.onInspectorEvent(nome, handler, document);
        }

        document.addEventListener(nome, handler);
        return () => {
            document.removeEventListener(nome, handler);
        };
    }

    function obterResumoPerfInspector(snapshot = estado.snapshotEstadoInspector || null) {
        return InspectorWorkspaceRuntimeState.obterResumoPerfInspector?.(snapshot, {
            document,
        }) || {};
    }

    function reportarProntidaoInspector(snapshot = estado.snapshotEstadoInspector || null) {
        InspectorWorkspaceRuntimeState.reportarProntidaoInspector?.(snapshot, {
            PERF,
            el,
            obterResumoPerfInspector,
        });
    }

    function normalizarTipoTemplate(tipo) {
        const valor = String(tipo || "padrao").trim().toLowerCase();

        if (valor === "nr12" || valor === "nr12_maquinas") return "nr12maquinas";
        if (valor === "nr13_caldeira") return "nr13";
        if (valor === "nr10_rti") return "rti";
        return valor || "padrao";
    }

    function normalizarContextoVisualSeguro(contexto = null) {
        if (!contexto || typeof contexto !== "object") return null;

        const title = String(contexto.title || "").trim();
        const subtitle = String(contexto.subtitle || "").trim();
        const statusBadge = String(contexto.statusBadge || "").trim();

        if (!title && !subtitle && !statusBadge) return null;

        return {
            title,
            subtitle,
            statusBadge,
        };
    }

    const normalizarCaseLifecycleStatusSeguro = (valor) =>
        CaseLifecycle.normalizarCaseLifecycleStatus(valor);

    function obterBadgeLifecycleCase(valor) {
        const status = normalizarCaseLifecycleStatusSeguro(valor);
        if (status === "analise_livre") return "ANÁLISE LIVRE";
        if (status === "pre_laudo") return "PRÉ-LAUDO";
        if (status === "laudo_em_coleta") return "EM COLETA";
        if (status === "aguardando_mesa") return "AGUARDANDO REVISÃO";
        if (status === "em_revisao_mesa") return "EM REVISÃO";
        if (status === "devolvido_para_correcao") return "CORREÇÃO";
        if (status === "aprovado") return "APROVADO";
        if (status === "emitido") return "EMITIDO";
        return "";
    }

    const normalizarActiveOwnerRoleSeguro = (valor) =>
        CaseLifecycle.normalizarActiveOwnerRole(valor);
    const normalizarSurfaceActionSeguro = (valor) =>
        CaseLifecycle.normalizarSurfaceAction(valor);
    const normalizarAllowedSurfaceActionsSeguro = (valores = []) =>
        CaseLifecycle.normalizarAllowedSurfaceActions(valores);
    const normalizarAllowedLifecycleTransitionsSeguro = (valores = []) =>
        CaseLifecycle.normalizarAllowedLifecycleTransitions(valores);

    function workspaceAllowedSurfaceActions(snapshot = null) {
        const valores = Array.isArray(snapshot?.allowed_surface_actions)
            ? snapshot.allowed_surface_actions
            : Array.isArray(snapshot?.laudo_card?.allowed_surface_actions)
                ? snapshot.laudo_card.allowed_surface_actions
                : [];
        return normalizarAllowedSurfaceActionsSeguro(valores);
    }

    function workspaceAllowedLifecycleTransitions(snapshot = null) {
        const valores = Array.isArray(snapshot?.allowed_lifecycle_transitions)
            ? snapshot.allowed_lifecycle_transitions
            : Array.isArray(snapshot?.laudo_card?.allowed_lifecycle_transitions)
                ? snapshot.laudo_card.allowed_lifecycle_transitions
                : [];
        return normalizarAllowedLifecycleTransitionsSeguro(valores);
    }

    function workspaceTemContratoLifecycle(snapshot = null) {
        const nextStatuses = Array.isArray(snapshot?.allowed_next_lifecycle_statuses)
            ? snapshot.allowed_next_lifecycle_statuses
            : Array.isArray(snapshot?.laudo_card?.allowed_next_lifecycle_statuses)
                ? snapshot.laudo_card.allowed_next_lifecycle_statuses
                : [];

        return (
            workspaceAllowedSurfaceActions(snapshot).length > 0 ||
            workspaceAllowedLifecycleTransitions(snapshot).length > 0 ||
            nextStatuses.length > 0
        );
    }

    function workspaceHasSurfaceAction(snapshot = null, actionKey = "") {
        const action = normalizarSurfaceActionSeguro(actionKey);
        return !!action && workspaceAllowedSurfaceActions(snapshot).includes(action);
    }

    function normalizarPublicVerificationSeguro(payload = null) {
        return obterStatusPayloadRuntime().normalizarPublicVerificationSeguro?.(payload) || null;
    }

    function normalizarEmissaoOficialSeguro(payload = null) {
        return obterStatusPayloadRuntime().normalizarEmissaoOficialSeguro?.(payload) || null;
    }

    function clonarPayloadStatusRelatorioWorkspace(payload = null) {
        return obterStatusPayloadRuntime().clonarPayloadStatusRelatorioWorkspace?.(payload) || null;
    }

    function registrarUltimoPayloadStatusRelatorioWorkspace(payload = null) {
        estado.ultimoStatusRelatorioPayload = clonarPayloadStatusRelatorioWorkspace(payload);
        return estado.ultimoStatusRelatorioPayload;
    }

    function obterPayloadStatusRelatorioWorkspaceAtual() {
        return obterStatusPayloadRuntime().obterPayloadStatusRelatorioWorkspaceAtual?.({
            estado,
            apiRef: obterTarielApiRuntime(),
            clonarPayload: clonarPayloadStatusRelatorioWorkspace,
            normalizarCaseLifecycleStatusSeguro,
            normalizarActiveOwnerRoleSeguro,
            normalizarAllowedLifecycleTransitionsSeguro,
            normalizarAllowedSurfaceActionsSeguro,
        }) || {};
    }

    function normalizarLaudoAtualId(valor) {
        return InspectorStateNormalization.normalizarLaudoAtualId(valor);
    }

    function normalizarModoInspecaoUI(valor) {
        return InspectorStateNormalization.normalizarModoInspecaoUI(valor);
    }

    function normalizarWorkspaceStage(valor) {
        return InspectorStateNormalization.normalizarWorkspaceStage(valor);
    }

    function normalizarThreadTab(valor) {
        return InspectorStateNormalization.normalizarThreadTab(valor);
    }

    function normalizarEntryModePreference(valor, fallback = "auto_recommended") {
        return InspectorStateNormalization.normalizarEntryModePreference(valor, fallback);
    }

    function normalizarEntryModeEffective(valor, fallback = "chat_first") {
        return InspectorStateNormalization.normalizarEntryModeEffective(valor, fallback);
    }

    function normalizarEntryModeEffectiveOpcional(valor) {
        return InspectorStateNormalization.normalizarEntryModeEffectiveOpcional(valor);
    }

    function normalizarEntryModeReason(valor, fallback = "default_product_fallback") {
        return InspectorStateNormalization.normalizarEntryModeReason(valor, fallback);
    }

    function normalizarOverlayOwner(valor) {
        return InspectorStateNormalization.normalizarOverlayOwner(valor);
    }

    function normalizarBooleanoEstado(valor, fallback = false) {
        return InspectorStateNormalization.normalizarBooleanoEstado(valor, fallback);
    }

    function atualizarWorkspaceEntryModeNote() {
        return ctx.shared.atualizarWorkspaceEntryModeNote?.();
    }

    function atualizarEstadoModoEntrada(
        payload = {},
        { reset = false, atualizarPadrao = false } = {}
    ) {
        return runtimeAtualizarEstadoModoEntrada?.(payload, {
            reset,
            atualizarPadrao,
        }) || {
            preference: estado.entryModePreference,
            effective: estado.entryModeEffective,
            reason: estado.entryModeReason,
        };
    }

    function modoEntradaEvidenceFirstAtivo() {
        return !!obterInspectorSharedRuntime().modoEntradaEvidenceFirstAtivo?.();
    }

    function resolverThreadTabInicialPorModoEntrada(payload = {}, fallback = "conversa") {
        return ctx.shared.resolverThreadTabInicialPorModoEntrada?.(payload, fallback)
            || normalizarThreadTab(fallback);
    }

    function normalizarRetomadaHomePendenteSeguro(payload = null) {
        const helper = obterInspectorSharedRuntime().normalizarRetomadaHomePendenteSeguro;
        if (typeof helper === "function") {
            return helper(payload) || null;
        }
        if (!payload || typeof payload !== "object") return null;

        const contextoVisual = normalizarContextoVisualSeguro(payload?.contextoVisual);
        const expiresAt = Number(payload?.expiresAt || 0) || (Date.now() + 10000);

        return {
            laudoId: normalizarLaudoAtualId(payload?.laudoId),
            tipoTemplate: normalizarTipoTemplate(payload?.tipoTemplate || estado.tipoTemplateAtivo),
            contextoVisual,
            expiresAt,
        };
    }

    function retomadaHomePendenteEhValida(payload = null) {
        const helper = obterInspectorSharedRuntime().retomadaHomePendenteEhValida;
        if (typeof helper === "function") {
            return !!helper(payload);
        }
        return !!payload && Number(payload?.expiresAt || 0) > Date.now();
    }

    function sanitizarMapaContextoVisualLaudos(payload = null) {
        const helper = obterInspectorSharedRuntime().sanitizarMapaContextoVisualLaudos;
        if (typeof helper === "function") {
            return helper(payload) || {};
        }
        if (!payload || typeof payload !== "object") return {};

        const entradas = Object.entries(payload)
            .map(([laudoId, contextoVisual]) => {
                const id = normalizarLaudoAtualId(laudoId);
                const contexto = normalizarContextoVisualSeguro(contextoVisual);
                if (!id || !contexto) return null;
                return [String(id), contexto];
            })
            .filter(Boolean)
            .sort((atual, proximo) => Number(proximo[0]) - Number(atual[0]))
            .slice(0, LIMITE_CONTEXTO_VISUAL_LAUDOS_STORAGE);

        return Object.fromEntries(entradas);
    }

    function persistirContextoVisualLaudosStorage(payload = null) {
        const helper = obterInspectorSharedRuntime().persistirContextoVisualLaudosStorage;
        if (typeof helper === "function") {
            return helper(payload) || {};
        }
        const mapa = sanitizarMapaContextoVisualLaudos(payload);

        try {
            if (Object.keys(mapa).length) {
                sessionStorage.setItem(CHAVE_CONTEXTO_VISUAL_LAUDOS, JSON.stringify(mapa));
            } else {
                sessionStorage.removeItem(CHAVE_CONTEXTO_VISUAL_LAUDOS);
            }
        } catch (_) {
            // armazenamento opcional
        }

        return mapa;
    }

    function lerContextoVisualLaudosStorage() {
        const helper = obterInspectorSharedRuntime().lerContextoVisualLaudosStorage;
        if (typeof helper === "function") {
            return helper() || {};
        }
        try {
            const bruto = sessionStorage.getItem(CHAVE_CONTEXTO_VISUAL_LAUDOS);
            if (!bruto) return {};
            return sanitizarMapaContextoVisualLaudos(JSON.parse(bruto));
        } catch (_) {
            return {};
        }
    }

    function registrarContextoVisualLaudo(laudoId, contextoVisual = null) {
        const id = normalizarLaudoAtualId(laudoId);
        const contexto = normalizarContextoVisualSeguro(contextoVisual);
        if (!id || !contexto) return null;

        estado.contextoVisualPorLaudo = persistirContextoVisualLaudosStorage({
            ...(estado.contextoVisualPorLaudo && typeof estado.contextoVisualPorLaudo === "object"
                ? estado.contextoVisualPorLaudo
                : {}),
            [id]: contexto,
        });

        return contexto;
    }

    function obterContextoVisualLaudoRegistrado(laudoId) {
        const id = normalizarLaudoAtualId(laudoId);
        if (!id) return null;
        return normalizarContextoVisualSeguro(estado.contextoVisualPorLaudo?.[id]);
    }

    function lerRetomadaHomePendenteStorage() {
        const helper = obterInspectorSharedRuntime().lerRetomadaHomePendenteStorage;
        if (typeof helper === "function") {
            return helper() || null;
        }
        try {
            const bruto = sessionStorage.getItem(CHAVE_RETOMADA_HOME_PENDENTE);
            if (!bruto) return null;
            return normalizarRetomadaHomePendenteSeguro(JSON.parse(bruto));
        } catch (_) {
            return null;
        }
    }

    function lerFlagForcaHomeStorage() {
        const helper = obterInspectorSharedRuntime().lerFlagForcaHomeStorage;
        if (typeof helper === "function") {
            return !!helper();
        }
        try {
            return sessionStorage.getItem(CHAVE_FORCE_HOME_LANDING) === "1";
        } catch (_) {
            return false;
        }
    }

    estado.contextoVisualPorLaudo = {};

    let {
        paginaSolicitaHomeLandingViaURL,
        obterLaudoIdDaURLInspector,
        obterThreadTabDaURLInspector,
        resolverInspectorBaseScreenPorSnapshot,
        resolverEstadoAutoritativoInspector,
        espelharEstadoInspectorNoDataset,
        espelharEstadoInspectorNoStorage,
        sincronizarEstadoInspector,
        obterSnapshotEstadoInspectorAtual,
        definirRetomadaHomePendente,
        obterRetomadaHomePendente,
    } = InspectorWorkspaceRuntimeState.criarBindingsEstadoInspector?.({
        InspectorStateAuthority,
        InspectorStateRuntimeSync,
        InspectorStateSnapshots,
        CHAVE_FORCE_HOME_LANDING,
        CHAVE_RETOMADA_HOME_PENDENTE,
        EM_PRODUCAO,
        atualizarThreadWorkspace,
        debugRuntime,
        divergenciasEstadoInspector,
        documentRef: document,
        el,
        emitirEventoTariel,
        estado,
        estadoRelatorioPossuiContexto,
        lerFlagForcaHomeStorage,
        lerRetomadaHomePendenteStorage,
        logOnceRuntime,
        modalNovaInspecaoEstaAberta,
        normalizarBooleanoEstado,
        normalizarLaudoAtualId,
        normalizarModoInspecaoUI,
        normalizarOverlayOwner,
        normalizarRetomadaHomePendenteSeguro,
        normalizarEstadoRelatorio,
        normalizarThreadTab,
        normalizarWorkspaceStage,
        obterLocationRuntime,
        persistirContextoVisualLaudosStorage,
        retomadaHomePendenteEhValida,
        setInspectorStateGlobal: (stateSnapshot) => {
            if (ChatIndexRuntime?.setInspectorStateGlobal?.(stateSnapshot)) {
                return;
            }
            if (window.TarielInspectorState && typeof window.TarielInspectorState === "object") {
                window.TarielInspectorState.state = stateSnapshot;
            }
        },
        sincronizarConversationVariantNoDom,
        sincronizarInspectorScreen,
        stateRef: {
            get sincronizandoInspectorScreen() {
                return sincronizandoInspectorScreen;
            },
            get syncInspectorScreenRaf() {
                return syncInspectorScreenRaf;
            },
            setSyncInspectorScreenRaf: (valor) => {
                syncInspectorScreenRaf = valor;
            },
        },
        windowRef: window,
    }) || {};

    function normalizarEstadoRelatorio(valor) {
        const estadoBruto = String(valor || "").trim().toLowerCase();

        if (estadoBruto === "relatorioativo" || estadoBruto === "relatorio_ativo") {
            return "relatorio_ativo";
        }

        if (estadoBruto === "semrelatorio" || estadoBruto === "sem_relatorio") {
            return "sem_relatorio";
        }

        if (estadoBruto === "aguardando" || estadoBruto === "aguardando_avaliacao") {
            return "aguardando";
        }

        if (estadoBruto === "ajustes" || estadoBruto === "aprovado") {
            return estadoBruto;
        }

        return estadoBruto || "sem_relatorio";
    }

    function estadoRelatorioPossuiContexto(valor) {
        return normalizarEstadoRelatorio(valor) !== "sem_relatorio";
    }

    function obterContextoVisualAssistente() {
        return { ...CONTEXTO_WORKSPACE_ASSISTENTE };
    }

    function landingNovoChatAtivo(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceThread.landingNovoChatAtivo?.(
            snapshot,
            {
                normalizarModoInspecaoUI,
                resolverInspectorBaseScreenPorSnapshot,
            }
        );
    }

    function conversaNovoChatFocadaAtiva(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceThread.conversaNovoChatFocadaAtiva?.(
            snapshot,
            {
                normalizarBooleanoEstado,
                obterBaseRealConversaNovoChat,
            }
        );
    }

    function obterTotalMensagensReaisWorkspace(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceThread.obterTotalMensagensReaisWorkspace?.(
            snapshot,
            {
                estado,
                documentRef: document,
                coletarLinhasWorkspace,
            }
        ) || 0;
    }

    function conversaWorkspaceModoChatAtivo(
        screen = estado.inspectorScreen || resolveInspectorScreen(),
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        return !!InspectorWorkspaceThread.conversaWorkspaceModoChatAtivo?.(
            screen,
            snapshot,
            {
                estado,
                resolveInspectorScreen,
                resolveWorkspaceView,
                normalizarLaudoAtualId,
                obterLaudoAtivoIdSeguro,
                normalizarEstadoRelatorio,
                obterEstadoRelatorioAtualSeguro,
                estadoRelatorioPossuiContexto,
                normalizarModoInspecaoUI,
                normalizarBooleanoEstado,
                obterTotalMensagensReaisWorkspace,
            }
        );
    }

    function fluxoNovoChatFocadoAtivoOuPendente(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceThread.fluxoNovoChatFocadoAtivoOuPendente?.(
            snapshot,
            {
                conversaNovoChatFocadaAtiva,
                normalizarBooleanoEstado,
            }
        );
    }

    function conversaNovoChatFocadaVisivel(
        screen = estado.inspectorScreen || resolveInspectorScreen(),
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        return !!InspectorWorkspaceThread.conversaNovoChatFocadaVisivel?.(
            screen,
            snapshot,
            {
                conversaNovoChatFocadaAtiva,
                resolveWorkspaceView,
            }
        );
    }

    function resolverConversationVariant(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceThread.resolverConversationVariant?.(
            snapshot,
            {
                resolverInspectorBaseScreenPorSnapshot,
                conversaWorkspaceModoChatAtivo,
            }
        ) || "technical";
    }

    function aplicarConversationVariantElemento(elemento, variant = "technical") {
        InspectorWorkspaceThread.aplicarConversationVariantElemento?.(elemento, variant);
    }

    function sincronizarURLConversaFocada(
        variant = "technical",
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        InspectorWorkspaceThread.sincronizarURLConversaFocada?.(
            variant,
            snapshot,
            {
                windowRef: window,
                estado,
                normalizarLaudoAtualId,
                obterLaudoAtivoIdSeguro,
                normalizarThreadTab,
            }
        );
    }

    function sincronizarConversationVariantNoDom(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceThread.sincronizarConversationVariantNoDom?.(
            snapshot,
            {
                documentRef: document,
                el,
                resolverConversationVariant,
                sincronizarURLConversaFocada,
            }
        ) || "technical";
    }

    function armarPrimeiroEnvioNovoChatPendente() {
        return InspectorWorkspaceComposer.armarPrimeiroEnvioNovoChatPendente?.(
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    function limparFluxoNovoChatFocado() {
        return !!InspectorWorkspaceThread.limparFluxoNovoChatFocado?.({
            obterSnapshotEstadoInspectorAtual,
            sincronizarEstadoInspector,
        });
    }

    function obterBaseRealConversaNovoChat(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceThread.obterBaseRealConversaNovoChat?.(
            snapshot,
            {
                coletarLinhasWorkspace,
                normalizarLaudoAtualId,
                estadoRelatorioPossuiContexto,
            }
        ) || {
            totalMensagensReais: 0,
            temContextoReal: false,
            pronta: false,
        };
    }

    function exibirConversaFocadaNovoChat({ tipoTemplate = estado.tipoTemplateAtivo, focarComposer = false } = {}) {
        return !!InspectorWorkspaceThread.exibirConversaFocadaNovoChat?.(
            { tipoTemplate, focarComposer },
            {
                estado,
                normalizarTipoTemplate,
                coletarLinhasWorkspace,
                sincronizarResumoHistoricoWorkspace,
                sincronizarEstadoInspector,
                atualizarNomeTemplateAtivo,
                atualizarControlesWorkspaceStage,
                atualizarContextoWorkspaceAtivo,
                atualizarThreadWorkspace,
                renderizarSugestoesComposer,
                atualizarStatusChatWorkspace,
                focarComposerInspector,
            }
        );
    }

    function promoverPrimeiraMensagemNovoChatSePronta({ forcar = false, focarComposer = false } = {}) {
        return !!InspectorWorkspaceThread.promoverPrimeiraMensagemNovoChatSePronta?.(
            { forcar, focarComposer },
            {
                obterSnapshotEstadoInspectorAtual,
                fluxoNovoChatFocadoAtivoOuPendente,
                obterBaseRealConversaNovoChat,
                exibirConversaFocadaNovoChat,
            }
        );
    }

    function normalizarFiltroPendencias(valor) {
        const filtro = String(valor || "").trim().toLowerCase();
        if (filtro === "abertas" || filtro === "resolvidas" || filtro === "todas") {
            return filtro;
        }
        return "abertas";
    }

    function obterEstadoRelatorioAtualSeguro() {
        return normalizarEstadoRelatorio(
            obterSnapshotEstadoInspectorAtual().estadoRelatorio || "sem_relatorio"
        );
    }

    function escaparHtml(texto = "") {
        return String(texto)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatarTamanhoBytes(totalBytes) {
        return InspectorWorkspaceMesaAttachments.formatarTamanhoBytes?.(totalBytes) || "0 KB";
    }

    function normalizarAnexoMesa(payload = {}) {
        return InspectorWorkspaceMesaAttachments.normalizarAnexoMesa?.(payload) || null;
    }

    function renderizarLinksAnexosMesa(anexos = []) {
        return InspectorWorkspaceMesaAttachments.renderizarLinksAnexosMesa?.(anexos) || "";
    }

    function pluralizarWorkspace(total, singular, plural) {
        return Number(total || 0) === 1 ? singular : plural;
    }

    function obterDependenciasSidebarHistory() {
        return {
            document,
            el,
            estado,
        };
    }

    function sincronizarSidebarLaudosTabs(preferida = estado.sidebarLaudosTab) {
        return InspectorSidebarHistory.sincronizarSidebarLaudosTabs?.(
            preferida,
            obterDependenciasSidebarHistory()
        ) || {
            ativa: "recentes",
            pinados: 0,
            recentes: 0,
            totalItens: 0,
            visiveisNaAbaAtiva: 0,
        };
    }

    function filtrarSidebarHistorico(termo = "") {
        InspectorSidebarHistory.filtrarSidebarHistorico?.(
            termo,
            {
                ...obterDependenciasSidebarHistory(),
                sincronizarSidebarLaudosTabs,
            }
        );
    }

    function normalizarFiltroChat(valor = "") {
        const filtro = String(valor || "").trim().toLowerCase();
        if (["ia", "inspetor", "mesa", "sistema"].includes(filtro)) return filtro;
        return "todos";
    }

    function normalizarFiltroTipoHistorico(valor = "") {
        const filtro = String(valor || "").trim().toLowerCase();
        if (["mensagens", "eventos", "anexos", "decisoes"].includes(filtro)) return filtro;
        return "todos";
    }

    function pluralizarChat(total, singular, plural) {
        return Number(total || 0) === 1 ? singular : plural;
    }

    function obterPapelLinhaWorkspace(linha) {
        const papelDataset = String(linha?.dataset?.messageRole || "").trim().toLowerCase();
        if (papelDataset) return papelDataset;
        if (linha?.classList?.contains("mensagem-sistema")) return "sistema";
        if (linha?.classList?.contains("mensagem-ia")) return "ia";
        if (linha?.classList?.contains("mensagem-origem-mesa")) return "mesa";
        return "inspetor";
    }

    function obterDetalheLinhaWorkspace(linha) {
        const meta = extrairMetaLinhaWorkspace(linha);
        const papel = obterPapelLinhaWorkspace(linha);
        const texto = String(
            linha?.querySelector(".texto-msg")?.textContent ||
            linha?.querySelector(".texto-msg-origem")?.textContent ||
            meta.resumo ||
            ""
        ).replace(/\s+/g, " ").trim();

        return {
            mensagemId: Number(linha?.dataset?.mensagemId || 0) || null,
            autor: String(linha?.dataset?.messageAuthor || meta.autor || "Registro").trim() || "Registro",
            papel,
            tempo: meta.tempo || "",
            texto,
        };
    }

    function obterTextoBuscaLinhaWorkspace(linha) {
        const detalhe = obterDetalheLinhaWorkspace(linha);
        const anexos = Array.from(linha.querySelectorAll(".mensagem-anexo-chip"))
            .map((chip) => String(chip.textContent || "").trim())
            .filter(Boolean);

        return [
            detalhe.autor,
            detalhe.tempo,
            detalhe.papel,
            detalhe.texto,
            ...anexos,
        ]
            .join(" ")
            .toLowerCase();
    }

    function obterDataLinhaWorkspace(linha) {
        const datetime = String(
            linha?.querySelector("time")?.getAttribute("datetime") ||
            linha?.dataset?.createdAt ||
            ""
        ).trim();
        if (!datetime) return null;

        const data = new Date(datetime);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function obterTipoRegistroHistoricoWorkspace(linha, detalhe = obterDetalheLinhaWorkspace(linha)) {
        const papel = detalhe.papel || obterPapelLinhaWorkspace(linha);
        const texto = String(detalhe.texto || "").trim();
        const possuiAnexos = !!linha?.querySelector?.(".mensagem-anexo-chip, .img-anexo");

        if (papel === "sistema") return "eventos";
        if (papel === "mesa" && /(aprova|rejeita|ajuste|decis|valid|conclus|parecer)/i.test(texto)) {
            return "decisoes";
        }
        if (possuiAnexos && !texto) return "anexos";
        return "mensagens";
    }

    function obterRotuloGrupoHistoricoWorkspace(data = null) {
        if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
            return "Registro técnico";
        }

        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
        const diffDias = Math.round((inicioHoje - inicioData) / 86400000);

        if (diffDias === 0) return "Hoje";
        if (diffDias === 1) return "Ontem";

        return new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "short",
        }).format(data);
    }

    function obterIconeHistoricoWorkspace(tipo = "mensagens", papel = "inspetor") {
        if (tipo === "anexos") return "attach_file";
        if (tipo === "eventos") return "tune";
        if (tipo === "decisoes") return "gavel";
        if (papel === "ia") return "smart_toy";
        if (papel === "mesa") return "support_agent";
        if (papel === "sistema") return "settings";
        return "person";
    }

    function escaparAtributoHistoricoWorkspace(payload = {}) {
        return escaparHtml(JSON.stringify(payload));
    }

    function obterItensCanonicosHistoricoWorkspace() {
        if (Array.isArray(estado.historyCanonicalItems) && estado.historyCanonicalItems.length) {
            return estado.historyCanonicalItems.map((item) => ({ ...item }));
        }

        const viaApi = obterTarielApiRuntime()?.obterHistoricoLaudoAtual?.();
        return Array.isArray(viaApi) ? viaApi.map((item) => ({ ...item })) : [];
    }

    function obterPapelItemHistoricoCanonico(item = {}) {
        const papel = String(item?.papel || "").trim().toLowerCase();
        const tipo = String(item?.tipo || "").trim().toLowerCase();

        if (papel === "assistente") return "ia";
        if (papel === "engenheiro") return "mesa";
        if (papel === "usuario") return "inspetor";
        if (papel === "sistema") return "sistema";

        if (tipo.includes("humano_eng") || tipo.includes("engenheiro")) return "mesa";
        if (tipo.includes("humano_insp") || tipo === "user" || tipo === "usuario") return "inspetor";
        if (tipo.includes("system") || tipo.includes("sistema") || tipo.includes("evento")) return "sistema";
        if (tipo.includes("ia") || tipo.includes("assistant")) return "ia";

        return "ia";
    }

    function obterAutorItemHistoricoCanonico(item = {}, papel = obterPapelItemHistoricoCanonico(item)) {
        const candidatos = [
            item?.autor,
            item?.autor_nome,
            item?.nome_autor,
            item?.remetente_nome,
            item?.actor_name,
        ]
            .map((valor) => String(valor || "").trim())
            .filter(Boolean);

        if (candidatos.length) {
            return candidatos[0];
        }

        if (papel === "mesa") return "Revisão";
        if (papel === "inspetor") return "Inspetor";
        if (papel === "sistema") return "Sistema";
        return "Assistente IA";
    }

    function extrairAnexosHistoricoCanonico(item = {}) {
        const anexos = Array.isArray(item?.anexos) ? item.anexos : [];
        return anexos
            .map((anexo, index) => {
                if (!anexo) return null;

                if (typeof anexo === "string") {
                    const nome = String(anexo || "").trim();
                    if (!nome) return null;
                    return {
                        nome,
                        url: "",
                        tipo: "documento",
                        chave: `str-${index}-${nome}`,
                    };
                }

                const nome = String(
                    anexo?.nome ||
                    anexo?.filename ||
                    anexo?.arquivo_nome ||
                    anexo?.label ||
                    anexo?.titulo ||
                    ""
                ).trim();
                const url = String(
                    anexo?.url ||
                    anexo?.download_url ||
                    anexo?.href ||
                    anexo?.path ||
                    ""
                ).trim();
                const tipo = anexo?.eh_imagem ? "imagem" : String(anexo?.tipo || "documento").trim().toLowerCase() || "documento";
                if (!nome && !url) return null;

                return {
                    nome: nome || `Anexo ${index + 1}`,
                    url,
                    tipo,
                    chave: String(anexo?.id || anexo?.uuid || `${tipo}-${index}-${nome || url}`),
                };
            })
            .filter(Boolean);
    }

    function obterDependenciasHistoricoWorkspace() {
        return {
            coletarLinhasWorkspace,
            extrairAnexosHistoricoCanonico,
            obterAutorItemHistoricoCanonico,
            obterDataLinhaWorkspace,
            obterDetalheLinhaWorkspace,
            obterIconeHistoricoWorkspace,
            obterItensCanonicosHistoricoWorkspace,
            obterPapelItemHistoricoCanonico,
            obterPapelLinhaWorkspace,
            obterRotuloGrupoHistoricoWorkspace,
            obterTextoBuscaLinhaWorkspace,
            obterTipoRegistroHistoricoWorkspace,
        };
    }

    function obterDataItemHistoricoCanonico(item = {}) {
        return InspectorHistoryBuilders.obterDataItemHistoricoCanonico?.(item) || null;
    }

    function obterTipoRegistroHistoricoCanonico(
        item = {},
        papel = obterPapelItemHistoricoCanonico(item),
        anexos = extrairAnexosHistoricoCanonico(item)
    ) {
        return InspectorHistoryBuilders.obterTipoRegistroHistoricoCanonico?.(item, papel, anexos) || "mensagens";
    }

    function construirResumoBuscaHistoricoCanonico(item = {}, papel = "ia", autor = "", anexos = []) {
        return InspectorHistoryBuilders.construirResumoBuscaHistoricoCanonico?.(item, papel, autor, anexos) || "";
    }

    function construirItemHistoricoWorkspaceDoPayload(item = {}, index = 0) {
        return InspectorHistoryBuilders.construirItemHistoricoWorkspaceDoPayload?.(
            item,
            index,
            obterDependenciasHistoricoWorkspace()
        ) || null;
    }

    function construirItemHistoricoWorkspaceDoDom(linha, index = 0) {
        return InspectorHistoryBuilders.construirItemHistoricoWorkspaceDoDom?.(
            linha,
            index,
            obterDependenciasHistoricoWorkspace()
        ) || null;
    }

    function coletarItensSuplementaresHistoricoWorkspace(itensCanonicos = []) {
        return InspectorHistoryBuilders.coletarItensSuplementaresHistoricoWorkspace?.(
            itensCanonicos,
            obterDependenciasHistoricoWorkspace()
        ) || [];
    }

    function construirItensHistoricoWorkspace() {
        return InspectorHistoryBuilders.construirItensHistoricoWorkspace?.(
            obterDependenciasHistoricoWorkspace()
        ) || [];
    }

    function itemHistoricoWorkspaceAtendeFiltros(item, { termo = "", ator = "todos", tipo = "todos" } = {}) {
        return InspectorHistoryBuilders.itemHistoricoWorkspaceAtendeFiltros?.(item, { termo, ator, tipo }) ?? true;
    }

    function obterDependenciasWorkspaceHistoryContext() {
        return {
            NOMES_TEMPLATES,
            construirResumoGovernancaHistoricoWorkspace,
            contarEvidenciasWorkspace,
            construirItensHistoricoWorkspace,
            itemHistoricoWorkspaceAtendeFiltros,
            copiarTextoWorkspace,
            coletarLinhasWorkspace,
            el,
            escaparHtml,
            estado,
            mostrarToast,
            normalizarFiltroChat,
            normalizarFiltroTipoHistorico,
            normalizarThreadTab,
            obterDetalheLinhaWorkspace,
            obterHistoricoLaudoAtual: () => obterTarielApiRuntime()?.obterHistoricoLaudoAtual?.(),
            obterLaudoAtivoIdSeguro,
            obterPapelLinhaWorkspace,
            obterResumoOperacionalMesa,
            obterSnapshotEstadoInspectorAtual,
            pluralizarChat,
            resumirTexto,
            sincronizarInspectorScreen,
            sincronizarResumoHistoricoWorkspace,
            atualizarEmptyStateHonestoConversa,
        };
    }

    function renderizarHistoricoWorkspace(itens = [], { totalMensagensReais = 0 } = {}) {
        InspectorWorkspaceHistoryContext.renderizarHistoricoWorkspace?.(
            itens,
            { totalMensagensReais },
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function resetarFiltrosHistoricoWorkspace() {
        InspectorWorkspaceHistoryContext.resetarFiltrosHistoricoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function obterRotuloFiltroAtorHistoricoWorkspace(filtro = "todos") {
        return InspectorWorkspaceHistoryContext.obterRotuloFiltroAtorHistoricoWorkspace?.(filtro) || "Todos os atores";
    }

    function obterRotuloFiltroTipoHistoricoWorkspace(filtro = "todos") {
        return InspectorWorkspaceHistoryContext.obterRotuloFiltroTipoHistoricoWorkspace?.(filtro) || "Todos os tipos";
    }

    function obterDescricaoFonteHistoricoWorkspace() {
        return InspectorWorkspaceHistoryContext.obterDescricaoFonteHistoricoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        ) || "Registros transitórios";
    }

    function renderizarMetaHistoricoWorkspace({ filteredCount, totalCount } = {}) {
        InspectorWorkspaceHistoryContext.renderizarMetaHistoricoWorkspace?.(
            { filteredCount, totalCount },
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function renderizarResultadosChatWorkspace(total = 0) {
        InspectorWorkspaceHistoryContext.renderizarResultadosChatWorkspace?.(
            total,
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function copiarTextoWorkspace(texto = "") {
        const valor = String(texto || "").trim();
        if (!valor) return Promise.reject(new Error("TEXTO_VAZIO"));

        if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(valor);
        }

        return new Promise((resolve, reject) => {
            try {
                const textarea = document.createElement("textarea");
                textarea.value = valor;
                textarea.setAttribute("readonly", "");
                textarea.style.cssText = "position:fixed;left:-9999px;top:0;";
                document.body.appendChild(textarea);
                textarea.select();
                const copiou = !!document.execCommand?.("copy");
                document.body.removeChild(textarea);
                if (copiou) {
                    resolve();
                } else {
                    reject(new Error("COPY_FALHOU"));
                }
            } catch (erro) {
                reject(erro);
            }
        });
    }

    function filtrarTimelineWorkspace() {
        InspectorWorkspaceHistoryContext.filtrarTimelineWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function carregarContextoFixadoWorkspace() {
        InspectorWorkspaceHistoryContext.carregarContextoFixadoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function obterOperacaoWorkspace() {
        return InspectorWorkspaceHistoryContext.obterOperacaoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        ) || "Operação não identificada";
    }

    function obterResumoSinteseIAWorkspace() {
        return InspectorWorkspaceHistoryContext.obterResumoSinteseIAWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        ) || "A última resposta consolidada da IA aparecerá aqui.";
    }

    function montarResumoContextoIAWorkspace() {
        return InspectorWorkspaceHistoryContext.montarResumoContextoIAWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        ) || "";
    }

    function renderizarContextoIAWorkspace() {
        InspectorWorkspaceHistoryContext.renderizarContextoIAWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function fixarContextoWorkspace(detail = {}) {
        InspectorWorkspaceHistoryContext.fixarContextoWorkspace?.(
            detail,
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function removerContextoFixadoWorkspace(index) {
        InspectorWorkspaceHistoryContext.removerContextoFixadoWorkspace?.(
            index,
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function limparContextoFixadoWorkspace() {
        InspectorWorkspaceHistoryContext.limparContextoFixadoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    async function copiarResumoContextoWorkspace() {
        await InspectorWorkspaceHistoryContext.copiarResumoContextoWorkspace?.(
            obterDependenciasWorkspaceHistoryContext()
        );
    }

    function obterDependenciasWorkspaceMesaStatus() {
        return {
            NOMES_TEMPLATES,
            contarEvidenciasWorkspace,
            el,
            estado,
            normalizarStatusMesa,
            obterOperacaoWorkspace,
            obterResumoOperacionalMesa,
        };
    }

    function atualizarStatusChatWorkspace(status = "pronto", texto = "") {
        InspectorWorkspaceMesaStatus.atualizarStatusChatWorkspace?.(
            status,
            texto,
            obterDependenciasWorkspaceMesaStatus()
        );
    }

    function renderizarMesaCardWorkspace() {
        InspectorWorkspaceMesaStatus.renderizarMesaCardWorkspace?.(
            obterDependenciasWorkspaceMesaStatus()
        );
    }

    function obterDependenciasWorkspaceComposer() {
        return {
            COMANDOS_SLASH,
            SUGESTOES_ENTRADA_ASSISTENTE,
            abrirMesaWidget,
            atualizarStatusChatWorkspace,
            atualizarThreadWorkspace,
            avisarMesaExigeInspecao,
            construirResumoGovernancaHistoricoWorkspace,
            conversaWorkspaceModoChatAtivo,
            definirReferenciaMesaWidget,
            el,
            escaparHtml,
            estado,
            estadoRelatorioPossuiContexto,
            mostrarToast,
            montarResumoContextoIAWorkspace,
            modoEntradaEvidenceFirstAtivo,
            landingNovoChatAtivo,
            normalizarLaudoAtualId,
            obterLaudoAtivoIdSeguro,
            resolveInspectorScreen,
            obterSnapshotEstadoInspectorAtual,
            sincronizarEstadoInspector,
            resolveWorkspaceView,
        };
    }

    function obterListaComandosSlash(query = "") {
        return InspectorWorkspaceComposer.obterListaComandosSlash?.(
            query,
            obterDependenciasWorkspaceComposer()
        ) || [];
    }

    function fecharSlashCommandPalette() {
        InspectorWorkspaceComposer.fecharSlashCommandPalette?.(
            obterDependenciasWorkspaceComposer()
        );
    }

    function renderizarSlashCommandPalette(query = "") {
        InspectorWorkspaceComposer.renderizarSlashCommandPalette?.(
            query,
            obterDependenciasWorkspaceComposer()
        );
    }

    function definirValorComposer(texto = "", { substituir = true } = {}) {
        return InspectorWorkspaceComposer.definirValorComposer?.(
            texto,
            { substituir },
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    async function abrirMesaComContexto(detail = {}) {
        await InspectorWorkspaceComposer.abrirMesaComContexto?.(
            detail,
            obterDependenciasWorkspaceComposer()
        );
    }

    function montarMensagemReemissaoWorkspace(detail = {}) {
        return InspectorWorkspaceComposer.montarMensagemReemissaoWorkspace?.(
            detail,
            obterDependenciasWorkspaceComposer()
        ) || "";
    }

    async function abrirReemissaoWorkspace(detail = {}) {
        await InspectorWorkspaceComposer.abrirReemissaoWorkspace?.(
            detail,
            obterDependenciasWorkspaceComposer()
        );
    }

    function obterEntradaReemissaoWorkspace(detail = {}) {
        return InspectorWorkspaceComposer.obterEntradaReemissaoWorkspace?.(
            detail,
            obterDependenciasWorkspaceComposer()
        ) || null;
    }

    function limparComposerWorkspace() {
        definirValorComposer("", { substituir: true });
        if (el.campoMensagem) {
            el.campoMensagem.value = "";
            el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    function obterTextoDeApoioComposer() {
        return InspectorWorkspaceComposer.obterTextoDeApoioComposer?.(
            obterDependenciasWorkspaceComposer()
        ) || "";
    }

    function redirecionarEntradaParaReemissaoWorkspace(detail = {}) {
        return InspectorWorkspaceComposer.redirecionarEntradaParaReemissaoWorkspace?.(
            detail,
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    function executarComandoSlash(comandoId, { origem = "palette" } = {}) {
        return InspectorWorkspaceComposer.executarComandoSlash?.(
            comandoId,
            { origem },
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    function renderizarSugestoesComposer() {
        InspectorWorkspaceComposer.renderizarSugestoesComposer?.(
            obterDependenciasWorkspaceComposer()
        );
    }

    function atualizarRecursosComposerWorkspace() {
        InspectorWorkspaceComposer.atualizarRecursosComposerWorkspace?.(
            obterDependenciasWorkspaceComposer()
        );
    }

    function registrarPromptHistorico(texto = "") {
        InspectorWorkspaceComposer.registrarPromptHistorico?.(
            texto,
            obterDependenciasWorkspaceComposer()
        );
    }

    function navegarHistoricoPrompts(direcao = -1) {
        return InspectorWorkspaceComposer.navegarHistoricoPrompts?.(
            direcao,
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    function onCampoMensagemWorkspaceKeydown(event) {
        InspectorWorkspaceComposer.onCampoMensagemWorkspaceKeydown?.(
            event,
            obterDependenciasWorkspaceComposer()
        );
    }

    function prepararComposerParaEnvioModoEntrada() {
        InspectorWorkspaceComposer.prepararComposerParaEnvioModoEntrada?.(
            obterDependenciasWorkspaceComposer()
        );
    }

    function citarMensagemWorkspace(detail = {}) {
        const texto = String(detail?.texto || "").trim() || (
            Array.isArray(detail?.anexos)
                ? detail.anexos.map((anexo) => String(anexo?.nome || "").trim()).filter(Boolean).join(" • ")
                : ""
        );
        if (!texto) return;

        const autor = String(detail?.autor || "Registro").trim() || "Registro";
        definirValorComposer(`> ${autor}: ${texto}`, { substituir: false });
        mostrarToast("Trecho citado no composer.", "info", 1800);
    }

    function normalizarPapelLinhaWorkspace(linha) {
        if (!linha) return "assistant";
        if (linha.classList.contains("mensagem-sistema")) return "system";
        if (linha.classList.contains("mensagem-origem-mesa")) return "mesa";
        if (linha.classList.contains("mensagem-inspetor") || linha.classList.contains("mensagem-usuario")) return "user";
        return "assistant";
    }

    function aplicarModifierLinhaWorkspace(linha, papel = "assistant") {
        if (!linha) return;

        linha.classList.add("workspace-message-row");
        linha.classList.remove(
            "workspace-message-row--assistant",
            "workspace-message-row--user",
            "workspace-message-row--mesa",
            "workspace-message-row--system"
        );

        if (papel === "user") {
            linha.classList.add("workspace-message-row--user");
        } else if (papel === "mesa") {
            linha.classList.add("workspace-message-row--mesa");
        } else if (papel === "system") {
            linha.classList.add("workspace-message-row--system");
        } else {
            linha.classList.add("workspace-message-row--assistant");
        }

        linha.dataset.messageVariant = papel;
    }

    function normalizarEstruturaLinhaWorkspace(linha) {
        if (!linha) return { papel: "assistant", corpo: null };

        const papel = normalizarPapelLinhaWorkspace(linha);
        aplicarModifierLinhaWorkspace(linha, papel);

        const shell = linha.querySelector(".conteudo-mensagem");
        if (shell) {
            shell.classList.add("workspace-message-shell");
        }

        const avatar = linha.querySelector(".avatar");
        if (avatar) {
            avatar.classList.add("workspace-message-avatar");
        }

        const corpo = linha.querySelector(".corpo-texto");
        if (!corpo) {
            return { papel, corpo: null };
        }

        corpo.classList.add("workspace-message-card");
        corpo.querySelectorAll(".mensagem-meta").forEach((meta) => {
            meta.classList.add("workspace-message-meta");
        });
        corpo.querySelectorAll(".texto-msg, .texto-msg-origem").forEach((blocoTexto) => {
            blocoTexto.classList.add("workspace-message-body");
        });
        corpo.querySelectorAll(".bloco-referencia-chat").forEach((referencia) => {
            referencia.classList.add("workspace-message-reference");
        });
        corpo.querySelectorAll(".mensagem-anexos").forEach((anexos) => {
            anexos.classList.add("workspace-message-attachments");
        });
        corpo.querySelectorAll(".mensagem-anexo-chip").forEach((chip) => {
            chip.classList.add("workspace-message-attachment");
        });

        const blocosAcoes = Array.from(linha.querySelectorAll(".acoes-mensagem, .workspace-message-actions"));
        let blocoPrincipal = null;
        blocosAcoes.forEach((bloco) => {
            if (!blocoPrincipal) {
                blocoPrincipal = bloco;
                return;
            }
            bloco.remove();
        });

        if (blocoPrincipal) {
            blocoPrincipal.classList.add("workspace-message-actions");
            blocoPrincipal.querySelectorAll(".sep-acao").forEach((separador) => {
                separador.remove();
            });
            blocoPrincipal.querySelectorAll(".btn-acao-msg, .workspace-message-action").forEach((botao) => {
                botao.classList.add("workspace-message-action");
                const spans = botao.querySelectorAll("span");
                if (spans.length <= 1) {
                    botao.classList.add("workspace-message-action--icon-only");
                }
            });
            if (blocoPrincipal.parentElement !== corpo) {
                corpo.appendChild(blocoPrincipal);
            }
        }

        return { papel, corpo };
    }

    function criarBotaoAcaoWorkspace(icone, rotulo, nomeEvento, detalhe) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "workspace-message-action";
        botao.dataset.workspaceAction = nomeEvento;
        const iconNode = document.createElement("span");
        iconNode.className = "material-symbols-rounded";
        iconNode.setAttribute("aria-hidden", "true");
        iconNode.textContent = String(icone || "");
        const labelNode = document.createElement("span");
        labelNode.textContent = String(rotulo || "");
        botao.append(iconNode, labelNode);
        botao.addEventListener("click", () => {
            document.dispatchEvent(new CustomEvent(`tariel:mensagem-${nomeEvento}`, {
                detail: detalhe,
                bubbles: true,
            }));
        });
        return botao;
    }

    function decorarLinhasWorkspace() {
        coletarLinhasWorkspace().forEach((linha) => {
            const { papel, corpo } = normalizarEstruturaLinhaWorkspace(linha);
            if (!corpo || papel === "assistant" || papel === "system") return;
            if (linha.querySelector(".workspace-message-actions")) return;

            const detalhe = obterDetalheLinhaWorkspace(linha);
            if (!detalhe.texto) return;

            const acoes = document.createElement("div");
            acoes.className = `workspace-message-actions workspace-message-actions--${papel}`;
            acoes.appendChild(criarBotaoAcaoWorkspace("content_copy", "Copiar", "copiar", detalhe));
            acoes.appendChild(criarBotaoAcaoWorkspace("format_quote", "Citar", "citar", detalhe));
            acoes.appendChild(criarBotaoAcaoWorkspace("keep", "Fixar", "fixar-contexto", detalhe));
            corpo.appendChild(acoes);
        });
    }

    function coletarLinhasWorkspace() {
        return Array.from(document.querySelectorAll("#area-mensagens .linha-mensagem"))
            .filter((linha) => linha.id !== "indicador-digitando");
    }

    function atualizarThreadWorkspace(tab = "conversa", options = {}) {
        InspectorWorkspaceThread.atualizarThreadWorkspace?.(
            tab,
            options,
            {
                normalizarThreadTab,
                sincronizarEstadoInspector,
                windowRef: window,
                estado,
                el,
                obterLaudoAtivoIdSeguro,
                renderizarAnexosWorkspace,
                filtrarTimelineWorkspace,
                renderizarResumoNavegacaoWorkspace,
                sincronizarInspectorScreen,
                atualizarControlesWorkspaceStage,
            }
        );
    }

    async function abrirPreviewWorkspace() {
        return InspectorWorkspaceDeliveryFlow.abrirPreviewWorkspace?.({
            mostrarToast,
            obterLaudoAtivoIdSeguro,
            obterHeadersComCSRF,
            extrairMensagemErroHTTP,
            estado,
            contarEvidenciasWorkspace,
            coletarLinhasWorkspace,
            extrairMetaLinhaWorkspace,
        });
    }
    function obterElementosFocaveis(container) {
        if (!container) return [];

        return Array.from(
            container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((node) =>
            !node.disabled &&
            !node.hidden &&
            !node.classList?.contains("select-proxy-ativo") &&
            node.getClientRects().length > 0
        );
    }

    function limparTimerBanner() {
        if (!estado.timerBanner) return;
        window.clearTimeout(estado.timerBanner);
        estado.timerBanner = null;
    }

    function limparTimerReconexaoSSE() {
        if (!estado.timerReconexaoSSE) return;
        window.clearTimeout(estado.timerReconexaoSSE);
        estado.timerReconexaoSSE = null;
    }

    function limparTimerFecharMesaWidget() {
        if (!estado.timerFecharMesaWidget) return;
        window.clearTimeout(estado.timerFecharMesaWidget);
        estado.timerFecharMesaWidget = null;
    }

    function ehAbortError(erro) {
        return erro?.name === "AbortError" || erro?.code === DOMException.ABORT_ERR;
    }

    function cancelarCarregamentoPendenciasMesa() {
        if (!estado.pendenciasAbortController) return;
        estado.pendenciasAbortController.abort();
        estado.pendenciasAbortController = null;
        estado.carregandoPendencias = false;
    }

    function cancelarCarregamentoMensagensMesaWidget() {
        if (!estado.mesaWidgetAbortController) return;
        estado.mesaWidgetAbortController.abort();
        estado.mesaWidgetAbortController = null;
        estado.mesaWidgetCarregando = false;
    }

    function fecharSSE(fonte = estado.fonteSSE) {
        if (!fonte) return;

        try {
            fonte.close();
        } catch (_) {
            // silêncio intencional
        }

        if (estado.fonteSSE === fonte) {
            estado.fonteSSE = null;
        }
    }

    function definirBotaoIniciarCarregando(ativo) {
        if (!el.btnConfirmarInspecao) return;

        const rotulo = ativo ? "Criando..." : "Criar Inspeção";
        const alvoTexto = el.btnConfirmarInspecao.querySelector("span:last-child");
        if (alvoTexto) {
            alvoTexto.textContent = rotulo;
        } else {
            el.btnConfirmarInspecao.textContent = rotulo;
        }
        el.btnConfirmarInspecao.setAttribute("aria-busy", String(!!ativo));
        atualizarEstadoAcaoModalNovaInspecao();
    }

    function definirBotaoFinalizarCarregando(ativo) {
        const botoes = el.botoesFinalizarInspecao?.length
            ? el.botoesFinalizarInspecao
            : (el.btnFinalizarInspecao ? [el.btnFinalizarInspecao] : []);

        botoes.forEach((botao) => {
            botao.disabled = !!ativo;
            botao.setAttribute("aria-busy", String(!!ativo));
        });
        sincronizarRotuloAcaoFinalizacaoWorkspace({ carregando: !!ativo });
    }

    function definirBotaoPreviewCarregando(ativo) {
        [el.btnWorkspacePreview, el.btnWorkspacePreviewRail].forEach((botao) => {
            if (!botao) return;
            botao.disabled = !!ativo;
            botao.setAttribute("aria-busy", String(!!ativo));
            botao.textContent = ativo ? "Gerando..." : "Pré-visualizar";
        });
    }

    function definirBotaoLaudoCarregando(botao, ativo) {
        if (!botao) return;

        botao.disabled = !!ativo;
        botao.setAttribute("aria-busy", String(!!ativo));
    }

    function normalizarStatusMesa(valor) {
        const status = String(valor || "").trim().toLowerCase();

        if (!status) return "pronta";
        if (status === "canal" || status === "ativo") return "canal_ativo";
        if (status === "pendencia" || status === "pendencia_aberta") return "pendencia_aberta";

        return CONFIG_STATUS_MESA[status] ? status : "pronta";
    }

    function obterLaudoAtivo() {
        return Number(obterTarielApiRuntime()?.obterLaudoAtualId?.() || 0) || null;
    }

    function avisarMesaExigeInspecao() {
        mostrarToast(MENSAGEM_MESA_EXIGE_INSPECAO, "aviso", 3200);
    }

    function emitirSincronizacaoLaudo(payload = {}, { selecionar = false } = {}) {
        const laudoId = Number(
            payload?.laudo_id ??
            payload?.laudoId ??
            payload?.laudo_card?.id ??
            0
        ) || null;
        const payloadSincronizado = laudoId
            ? enriquecerPayloadLaudoComContextoVisual(
                payload,
                obterContextoVisualLaudoRegistrado(laudoId)
            )
            : payload;
        registrarUltimoPayloadStatusRelatorioWorkspace(payloadSincronizado);

        if (payloadSincronizado?.laudo_card?.id) {
            emitirEventoTariel("tariel:laudo-card-sincronizado", {
                card: payloadSincronizado.laudo_card,
                selecionar,
            });
        }

        if (!payloadSincronizado?.estado) return;

        emitirEventoTariel("tariel:estado-relatorio", {
            estado: payloadSincronizado.estado,
            laudo_id: payloadSincronizado.laudo_id ?? payloadSincronizado.laudoId ?? payloadSincronizado?.laudo_card?.id ?? null,
            permite_reabrir: !!payloadSincronizado.permite_reabrir,
            permite_edicao: !!payloadSincronizado.permite_edicao,
            status_card: payloadSincronizado.status_card || payloadSincronizado?.laudo_card?.status_card || "",
            case_lifecycle_status:
                payloadSincronizado.case_lifecycle_status ??
                payloadSincronizado?.laudo_card?.case_lifecycle_status ??
                "",
            case_workflow_mode:
                payloadSincronizado.case_workflow_mode ??
                payloadSincronizado?.laudo_card?.case_workflow_mode ??
                "",
            active_owner_role:
                payloadSincronizado.active_owner_role ??
                payloadSincronizado?.laudo_card?.active_owner_role ??
                "",
            allowed_next_lifecycle_statuses:
                payloadSincronizado.allowed_next_lifecycle_statuses ??
                payloadSincronizado?.laudo_card?.allowed_next_lifecycle_statuses ??
                [],
            allowed_lifecycle_transitions:
                payloadSincronizado.allowed_lifecycle_transitions ??
                payloadSincronizado?.laudo_card?.allowed_lifecycle_transitions ??
                [],
            allowed_surface_actions:
                payloadSincronizado.allowed_surface_actions ??
                payloadSincronizado?.laudo_card?.allowed_surface_actions ??
                [],
            entry_mode_preference:
                payloadSincronizado.entry_mode_preference ??
                payloadSincronizado.entryModePreference ??
                payloadSincronizado?.laudo_card?.entry_mode_preference ??
                null,
            entry_mode_effective:
                payloadSincronizado.entry_mode_effective ??
                payloadSincronizado.entryModeEffective ??
                payloadSincronizado?.laudo_card?.entry_mode_effective ??
                null,
            entry_mode_reason:
                payloadSincronizado.entry_mode_reason ??
                payloadSincronizado.entryModeReason ??
                payloadSincronizado?.laudo_card?.entry_mode_reason ??
                null,
            public_verification:
                payloadSincronizado.public_verification ??
                null,
            emissao_oficial:
                payloadSincronizado.emissao_oficial ??
                null,
        });
    }

    function limparEstadoHomeNoCliente() {
        return InspectorWorkspaceUtils.limparEstadoHomeNoCliente?.({
            sincronizarEstadoInspector,
        });
    }

    async function desativarContextoAtivoParaHome() {
        return InspectorWorkspaceUtils.desativarContextoAtivoParaHome?.({
            document,
            obterLaudoAtivo,
            obterEstadoRelatorioAtualSeguro,
        }) || false;
    }

    function marcarForcaTelaInicial() {
        InspectorWorkspaceUtils.marcarForcaTelaInicial?.({
            sincronizarEstadoInspector,
        });
    }

    function paginaSolicitaHomeLanding() {
        return !!InspectorWorkspaceUtils.paginaSolicitaHomeLanding?.({
            obterSnapshotEstadoInspectorAtual,
            lerFlagForcaHomeStorage,
            paginaSolicitaHomeLandingViaURL,
        });
    }

    function limparForcaTelaInicial() {
        InspectorWorkspaceUtils.limparForcaTelaInicial?.({
            sincronizarEstadoInspector,
        });
    }

    function homeForcadoAtivo() {
        return !!InspectorWorkspaceUtils.homeForcadoAtivo?.({
            obterSnapshotEstadoInspectorAtual,
            paginaSolicitaHomeLandingViaURL,
        });
    }

    function entradaChatLivreDisponivel(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.entradaChatLivreDisponivel?.(
            snapshot,
            {
                normalizarLaudoAtualId,
                estadoRelatorioPossuiContexto,
            }
        );
    }

    function origemChatLivreEhPortal(origem = "") {
        return !!InspectorWorkspaceRuntimeScreen.origemChatLivreEhPortal?.(origem);
    }

    function resolverDisponibilidadeBotaoChatLivre(botao, snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.resolverDisponibilidadeBotaoChatLivre?.(
            botao,
            snapshot,
            {
                normalizarLaudoAtualId,
                estadoRelatorioPossuiContexto,
            }
        );
    }

    function modoFocoPodePromoverPortalParaChat(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.modoFocoPodePromoverPortalParaChat?.(
            snapshot,
            {
                document,
                estado,
                resolveInspectorBaseScreen,
                normalizarLaudoAtualId,
                obterLaudoAtivoIdSeguro,
                normalizarEstadoRelatorio,
                obterEstadoRelatorioAtualSeguro,
                normalizarWorkspaceStage,
                estadoRelatorioPossuiContexto,
            }
        );
    }

    function sincronizarVisibilidadeAcoesChatLivre(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.sincronizarVisibilidadeAcoesChatLivre?.(
            snapshot,
            {
                el,
                normalizarLaudoAtualId,
                estadoRelatorioPossuiContexto,
            }
        );
    }

    function layoutInspectorCompacto() {
        return obterViewportWidthRuntime() <= BREAKPOINT_LAYOUT_INSPETOR_COMPACTO;
    }

    function resolverMatrizVisibilidadeInspector(screen = resolveInspectorScreen(), snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceRuntimeScreen.resolverMatrizVisibilidadeInspector?.(
            screen,
            snapshot,
            {
                layoutInspectorCompacto,
                resolveInspectorBaseScreen,
                resolveWorkspaceView,
                normalizarLaudoAtualId,
                estado,
                obterLaudoAtivoIdSeguro,
                conversaWorkspaceModoChatAtivo,
                entradaChatLivreDisponivel,
            }
        ) || {};
    }

    function aplicarMatrizVisibilidadeInspector(screen = resolveInspectorScreen(), snapshot = obterSnapshotEstadoInspectorAtual()) {
        return InspectorWorkspaceScreen.aplicarMatrizVisibilidadeInspector?.(
            screen,
            snapshot,
            {
                document,
                el,
                resolverMatrizVisibilidadeInspector,
            }
        ) || resolverMatrizVisibilidadeInspector(screen, snapshot);
    }

    function modalNovaInspecaoEstaAberta() {
        return !!InspectorWorkspaceRuntimeScreen.modalNovaInspecaoEstaAberta?.({ el });
    }

    function resolveInspectorBaseScreen() {
        return InspectorWorkspaceRuntimeScreen.resolveInspectorBaseScreen?.({
            resolverInspectorBaseScreenPorSnapshot,
            obterSnapshotEstadoInspectorAtual,
        }) || "assistant_landing";
    }

    function definirRootAtivo(root, ativo) {
        InspectorWorkspaceRuntimeScreen.definirRootAtivo?.(root, ativo);
    }

    function resolveInspectorScreen() {
        return InspectorWorkspaceRuntimeScreen.resolveInspectorScreen?.({
            obterSnapshotEstadoInspectorAtual,
            resolveInspectorBaseScreen,
        }) || resolveInspectorBaseScreen();
    }

    function resolveWorkspaceView(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceRuntimeScreen.resolveWorkspaceView?.(screen, {
            obterSnapshotEstadoInspectorAtual,
            resolveInspectorBaseScreen,
            normalizarThreadTab,
        }) || "inspection_conversation";
    }

    function workspaceViewSuportaRail(view = resolveWorkspaceView()) {
        return !!InspectorWorkspaceRuntimeScreen.workspaceViewSuportaRail?.(view);
    }

    function resolveWorkspaceRailVisibility(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceRail.resolveWorkspaceRailVisibility?.(
            screen,
            {
                estado,
                resolveInspectorScreen,
                resolveWorkspaceView,
                workspaceViewSuportaRail,
                obterSnapshotEstadoInspectorAtual,
                conversaWorkspaceModoChatAtivo,
            }
        ) || false;
    }

    function atualizarBotaoWorkspaceRail({
        chromeTecnicoOperacional = false,
        layoutCompacto = layoutInspectorCompacto(),
        view = resolveWorkspaceView(),
        railVisivel = resolveWorkspaceRailVisibility(),
    } = {}) {
        InspectorWorkspaceRail.atualizarBotaoWorkspaceRail?.(
            {
                chromeTecnicoOperacional,
                layoutCompacto,
                view,
                railVisivel,
            },
            {
                el,
                layoutInspectorCompacto,
                resolveWorkspaceView,
                resolveWorkspaceRailVisibility,
                workspaceViewSuportaRail,
            }
        );
    }

    function resolveMesaWidgetDisponibilidade(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceScreen.resolveMesaWidgetDisponibilidade?.(
            screen,
            {
                estado,
                resolveInspectorScreen,
                obterSnapshotEstadoInspectorAtual,
                conversaWorkspaceModoChatAtivo,
                normalizarLaudoAtualId,
                obterLaudoAtivoIdSeguro,
                resolveWorkspaceView,
            }
        ) || false;
    }

    function contextoTecnicoPrecisaRefresh(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.contextoTecnicoPrecisaRefresh?.(
            snapshot,
            {
                resolveInspectorBaseScreen,
            }
        );
    }

    function contextoPrecisaSSE(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !!InspectorWorkspaceRuntimeScreen.contextoPrecisaSSE?.(
            snapshot,
            {
                resolveInspectorBaseScreen,
                normalizarLaudoAtualId,
                estado,
                obterLaudoAtivoIdSeguro,
            }
        );
    }

    function sincronizarSSEPorContexto(opcoes = {}) {
        return !!InspectorWorkspaceRuntimeScreen.sincronizarSSEPorContexto?.(
            opcoes,
            {
                contextoPrecisaSSE,
                fecharSSE,
                limparTimerReconexaoSSE,
                PERF,
                obterLaudoAtivoIdSeguro,
                resolveInspectorBaseScreen,
                inicializarNotificacoesSSE,
            }
        );
    }

    function resolverEstadoPadraoAcordeoesRail(view = resolveWorkspaceView()) {
        return InspectorWorkspaceRail.resolverEstadoPadraoAcordeoesRail?.(view) || {
            history: false,
            progress: false,
            context: false,
            pendencias: false,
            mesa: false,
            pinned: false,
        };
    }

    function sincronizarAcordeoesRailWorkspace(view = resolveWorkspaceView()) {
        InspectorWorkspaceRail.sincronizarAcordeoesRailWorkspace?.(
            view,
            {
                estado,
                el,
                resolveWorkspaceView,
                resolverEstadoPadraoAcordeoesRail,
                aplicarEstadoAcordeaoRailWorkspace,
            }
        );
    }

    function aplicarEstadoAcordeaoRailWorkspace(botao, aberto, { persist = true } = {}) {
        InspectorWorkspaceRail.aplicarEstadoAcordeaoRailWorkspace?.(
            botao,
            aberto,
            { persist },
            {
                estado,
                document,
                CSS,
            }
        );
    }

    function sincronizarMesaStageWorkspace(view = resolveWorkspaceView(), mesaWidgetPermitido = resolveMesaWidgetDisponibilidade()) {
        InspectorWorkspaceScreen.sincronizarMesaStageWorkspace?.(
            view,
            mesaWidgetPermitido,
            {
                estado,
                el,
                resolveWorkspaceView,
                resolveMesaWidgetDisponibilidade,
                mesaWidgetDockOriginal,
                atualizarEstadoVisualBotaoMesaWidget,
                carregarMensagensMesaWidget,
            }
        );
    }

    function sincronizarWorkspaceRail(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceRail.sincronizarWorkspaceRail?.(
            screen,
            {
                el,
                document,
                estado,
                resolveInspectorScreen,
                resolveWorkspaceView,
                resolveWorkspaceRailVisibility,
                workspaceViewSuportaRail,
                sincronizarAcordeoesRailWorkspace,
            }
        ) || false;
    }

    function sincronizarWidgetsGlobaisWorkspace(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceScreen.sincronizarWidgetsGlobaisWorkspace?.(
            screen,
            {
                document,
                estado,
                el,
                resolveInspectorScreen,
                resolveMesaWidgetDisponibilidade,
                resolveWorkspaceView,
                definirRootAtivo,
                sincronizarMesaStageWorkspace,
                fecharMesaWidget,
                sincronizarClasseBodyMesaWidget,
            }
        ) || false;
    }

    function sincronizarWorkspaceViews(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        return InspectorWorkspaceScreen.sincronizarWorkspaceViews?.(
            screen,
            {
                document,
                estado,
                el,
                resolveInspectorScreen,
                resolveWorkspaceView,
                conversaWorkspaceModoChatAtivo,
                obterSnapshotEstadoInspectorAtual,
                definirRootAtivo,
                atualizarEmptyStateHonestoConversa,
            }
        ) || resolveWorkspaceView(screen);
    }

    function sincronizarInspectorScreen() {
        return InspectorWorkspaceScreen.sincronizarInspectorScreen?.({
            windowRef: window,
            document,
            state: {
                estado,
                el,
                get sincronizandoInspectorScreen() {
                    return sincronizandoInspectorScreen;
                },
                set sincronizandoInspectorScreen(value) {
                    sincronizandoInspectorScreen = value;
                },
                get sincronizacaoInspectorScreenPendente() {
                    return sincronizacaoInspectorScreenPendente;
                },
                set sincronizacaoInspectorScreenPendente(value) {
                    sincronizacaoInspectorScreenPendente = value;
                },
            },
            sincronizarEstadoInspector,
            resolveInspectorBaseScreen,
            definirRootAtivo,
            sincronizarWorkspaceViews,
            sincronizarWorkspaceRail,
            sincronizarWidgetsGlobaisWorkspace,
            sincronizarVisibilidadeAcoesChatLivre,
            aplicarMatrizVisibilidadeInspector,
        }) || (estado.inspectorScreen || resolveInspectorBaseScreen());
    }

    async function navegarParaHome(destino = "/", { preservarContexto = true } = {}) {
        return InspectorWorkspaceUtils.navegarParaHome?.(
            destino,
            { preservarContexto },
            {
                windowRef: window,
                desativarContextoAtivoParaHome,
                mostrarToast,
                definirRetomadaHomePendente,
                limparEstadoHomeNoCliente,
                marcarForcaTelaInicial,
            }
        );
    }

    function processarAcaoHome(detail = {}) {
        return InspectorWorkspaceUtils.processarAcaoHome?.(detail, {
            navegarParaHome,
        });
    }

    function resumirTexto(texto, limite = 140) {
        return InspectorWorkspaceUtils.resumirTexto?.(texto, limite) || "Mensagem sem conteúdo";
    }

    function normalizarConexaoMesaWidget(valor) {
        return InspectorWorkspaceUtils.normalizarConexaoMesaWidget?.(valor) || "conectado";
    }

    function pluralizarMesa(total, singular, plural) {
        return InspectorWorkspaceUtils.pluralizarMesa?.(total, singular, plural) || singular;
    }

    function atualizarStatusMesa(status = "pronta", detalhe = "") {
        InspectorWorkspaceMesaStatus.atualizarStatusMesa?.(
            status,
            detalhe,
            obterDependenciasWorkspaceMesaStatus()
        );
    }

    function atualizarStatusMesaPorComposer(modoMarcador) {
        InspectorWorkspaceMesaStatus.atualizarStatusMesaPorComposer?.(
            modoMarcador,
            obterDependenciasWorkspaceMesaStatus()
        );
    }

    function obterTipoTemplateDoPayload(dados = {}) {
        return InspectorWorkspaceUtils.obterTipoTemplateDoPayload?.(
            dados,
            {
                normalizarTipoTemplate,
                estado,
            }
        );
    }

    function inserirTextoNoComposer(texto) {
        return InspectorWorkspaceUtils.inserirTextoNoComposer?.(
            texto,
            {
                el,
            }
        ) || false;
    }

    function aplicarPrePromptDaAcaoRapida(botao) {
        return InspectorWorkspaceUtils.aplicarPrePromptDaAcaoRapida?.(
            botao,
            {
                inserirTextoNoComposer,
            }
        ) || false;
    }

    function normalizarContextoChatLivrePersonalizado(contexto = null) {
        return InspectorWorkspaceUtils.normalizarContextoChatLivrePersonalizado?.(
            contexto,
            {
                normalizarTipoTemplate,
            }
        ) || null;
    }

    function obterContextoChatLivrePersonalizadoAtivo() {
        try {
            const snapshotAtual = obterSnapshotEstadoInspectorAtual();
            const screenBaseAtual = String(
                snapshotAtual?.inspectorBaseScreen || resolveInspectorBaseScreen()
            ).trim();
            const superficieChatLivre =
                screenBaseAtual === "assistant_landing"
                || screenBaseAtual === "portal_dashboard"
                || snapshotAtual?.freeChatConversationActive === true;

            if (!superficieChatLivre && obterLaudoAtivoIdSeguro()) {
                return null;
            }
        } catch (_) {
            // Se a tela ainda estiver sincronizando, nao bloqueia o envio do chat livre.
        }
        return normalizarContextoChatLivrePersonalizado(estado.freeChatTemplateContext);
    }

    function obterPreferenciasIAMobileChatAtiva() {
        return InspectorWorkspaceUtils.montarPreferenciasOcultasChatLivrePersonalizado?.(
            obterContextoChatLivrePersonalizadoAtivo(),
            {
                normalizarTipoTemplate,
            }
        ) || "";
    }

    function aplicarContextoChatLivrePersonalizado(contexto = null, options = {}) {
        const silencioso = options.silencioso === true;
        const normalizado = contexto
            ? normalizarContextoChatLivrePersonalizado(contexto)
            : null;
        const snapshotAtual = obterSnapshotEstadoInspectorAtual();
        const screenBaseAtual = String(
            snapshotAtual?.inspectorBaseScreen || resolveInspectorBaseScreen()
        ).trim();
        const conversaLivreAtiva = snapshotAtual?.freeChatConversationActive === true;
        const superficieChatLivre =
            screenBaseAtual === "assistant_landing"
            || screenBaseAtual === "portal_dashboard"
            || conversaLivreAtiva;
        const igualAoAtual = InspectorWorkspaceUtils.contextosChatLivrePersonalizadosSaoIguais?.(
            estado.freeChatTemplateContext,
            normalizado,
            {
                normalizarTipoTemplate,
            }
        );

        if (!normalizado) {
            if (!estado.freeChatTemplateContext) {
                return false;
            }

            estado.freeChatTemplateContext = null;
            atualizarContextoWorkspaceAtivo();
            if (!obterLaudoAtivoIdSeguro() && options.sincronizarThread !== false) {
                window.TarielAPI?.sincronizarThreadChatLivreAtiva?.({ selecionar: false });
            }
            if (!silencioso) {
                mostrarToast("Chat livre voltou ao contexto geral.", "info", 1800);
            }
            return true;
        }

        if (
            normalizado
            && superficieChatLivre
            && (obterLaudoAtivoIdSeguro() || obterEstadoRelatorioAtualSeguro() === "relatorio_ativo")
        ) {
            sincronizarEstadoInspector(
                {
                    laudoAtualId: null,
                    estadoRelatorio: "sem_relatorio",
                    forceHomeLanding: false,
                    modoInspecaoUI: "workspace",
                    workspaceStage: conversaLivreAtiva ? "inspection" : "assistant",
                    threadTab: "conversa",
                    assistantLandingFirstSendPending: false,
                    freeChatConversationActive: !!conversaLivreAtiva,
                },
                {
                    persistirStorage: false,
                }
            );
        }

        estado.freeChatTemplateContext = normalizado;
        atualizarContextoWorkspaceAtivo();
        if (!obterLaudoAtivoIdSeguro() && options.sincronizarThread !== false) {
            window.TarielAPI?.sincronizarThreadChatLivreAtiva?.({ selecionar: false });
        }
        if (!silencioso) {
            mostrarToast(
                igualAoAtual
                    ? `${normalizado.title} continua ativo neste chat livre.`
                    : `${normalizado.title} agora guia este chat livre.`,
                "sucesso",
                2200
            );
        }
        return true;
    }

    function limparContextoChatLivrePersonalizado(options = {}) {
        return aplicarContextoChatLivrePersonalizado(null, options);
    }

    function aplicarContextoChatLivrePersonalizadoDaAcaoRapida(botao) {
        const contexto = InspectorWorkspaceUtils.criarContextoChatLivrePersonalizadoDoBotao?.(
            botao,
            {
                normalizarTipoTemplate,
            }
        );
        if (!contexto) return false;
        return aplicarContextoChatLivrePersonalizado(contexto, {
            origem: "guided_nr_card",
        });
    }

    function obterLaudoAtivoIdSeguro() {
        return InspectorWorkspaceUtils.obterLaudoAtivoIdSeguro?.(
            {
                obterSnapshotEstadoInspectorAtual,
                normalizarLaudoAtualId,
            }
        );
    }

    function obterHeadersComCSRF(extra = {}) {
        return InspectorWorkspaceUtils.obterHeadersComCSRF?.(
            extra,
            { document }
        ) || { Accept: "application/json", ...extra };
    }

    function obterTokenCsrf() {
        return InspectorWorkspaceUtils.obterTokenCsrf?.({ document })
            || document.querySelector('meta[name="csrf-token"]')?.content
            || "";
    }

    async function extrairMensagemErroHTTP(resposta, fallback = "") {
        return InspectorWorkspaceUtils.extrairMensagemErroHTTP?.(resposta, fallback) || String(fallback || "").trim();
    }

    // =========================================================
    // MÓDULOS DO PORTAL DO INSPETOR
    // =========================================================

    const REGISTROS_MODULOS_INSPETOR = Object.freeze([
        "registerBootstrap",
        "registerEntryMode",
        "registerModals",
        "registerObservers",
        "registerPendencias",
        "registerMesaWidget",
        "registerNotifications",
        "registerSystemEvents",
        "registerUiBindings",
        "registerGovernance",
        "registerWorkspaceOverview",
        "registerWorkspaceCorrections",
        "registerWorkspaceDerivatives",
    ]);

    const noop = () => {};
    const noopAsync = async () => null;
    const noopFalse = () => false;
    const noopNull = () => null;

    function criarResumoMesaPadraoInspetor() {
        return {
            status: "pronta",
            titulo: "Revisão disponível",
            descricao: "",
            chipStatus: "",
            chipPendencias: "",
            chipNaoLidas: "",
        };
    }

    function criarContextoVisualPadraoInspetor() {
        return {
            title: "Tariel",
            subtitle: "Chat técnico",
            statusBadge: "IA",
        };
    }

    function criarSharedRuntimeInspetor() {
        return {
            ROTA_SSE_NOTIFICACOES,
            TEMPO_BANNER_MS,
            TEMPO_RECONEXAO_SSE_MS,
            NOMES_TEMPLATES,
            COMANDOS_SLASH,
            CONFIG_STATUS_MESA,
            CONFIG_CONEXAO_MESA_WIDGET,
            LIMITE_RECONEXAO_SSE_OFFLINE,
            MAX_BYTES_ANEXO_MESA,
            MIME_ANEXOS_MESA_PERMITIDOS,
            CHAVE_FORCE_HOME_LANDING,
            CHAVE_RETOMADA_HOME_PENDENTE,
            CHAVE_CONTEXTO_VISUAL_LAUDOS,
            LIMITE_CONTEXTO_VISUAL_LAUDOS_STORAGE,
            CONTEXTO_WORKSPACE_ASSISTENTE,
            mostrarToast,
            ouvirEventoTariel,
            escaparHtml,
            normalizarTipoTemplate,
            normalizarContextoVisualSeguro,
            normalizarFiltroPendencias,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarThreadTab,
            normalizarWorkspaceStage,
            normalizarEntryModePreference,
            normalizarEntryModeEffective,
            normalizarEntryModeEffectiveOpcional,
            normalizarEntryModeReason,
            normalizarCaseLifecycleStatusSeguro,
            normalizarEmissaoOficialSeguro,
            normalizarPublicVerificationSeguro,
            estadoRelatorioPossuiContexto,
            obterLaudoAtivoIdSeguro,
            obterPayloadStatusRelatorioWorkspaceAtual,
            obterHeadersComCSRF,
            extrairMensagemErroHTTP,
            obterElementosFocaveis,
            formatarTamanhoBytes,
            normalizarAnexoMesa,
            renderizarLinksAnexosMesa,
            pluralizarMesa,
            resumirTexto,
            normalizarConexaoMesaWidget,
            normalizarStatusMesa,
            pluralizarWorkspace,
            obterLaudoAtivo,
            obterItensCanonicosHistoricoWorkspace,
            obterTokenCsrf,
            emitirSincronizacaoLaudo,
            avisarMesaExigeInspecao,
            ehAbortError,
            limparTimerBanner,
            limparTimerReconexaoSSE,
            limparTimerFecharMesaWidget,
            cancelarCarregamentoPendenciasMesa,
            cancelarCarregamentoMensagensMesaWidget,
            fecharSSE,
            workspaceHasSurfaceAction,
            workspaceTemContratoLifecycle,
        };
    }

    function criarAcoesPadraoRuntimeInspetor() {
        return {
            aplicarContextoVisualWorkspace: noop,
            abrirMesaWidget: noop,
            abrirModalGateQualidade: noop,
            abrirModalNovaInspecao: noop,
            abrirNovaInspecaoComScreenSync: noop,
            atualizarBotoesFiltroPendencias: noop,
            atualizarConexaoMesaWidget: noop,
            atualizarEstadoAcaoModalNovaInspecao: noop,
            atualizarEstadoVisualBotaoMesaWidget: noop,
            atualizarBadgeMesaWidget: noop,
            atualizarChatAoVivoComMesa: noop,
            atualizarEmptyStateHonestoConversa: noop,
            atualizarPendenciaIndividual: noop,
            atualizarPainelWorkspaceDerivado: noop,
            atualizarPreviewNomeInspecao: noop,
            carregarMensagensMesaWidget: noopAsync,
            carregarPendenciasMesa: noopAsync,
            criarContextoVisualDoModal: criarContextoVisualPadraoInspetor,
            criarContextoVisualPadrao: criarContextoVisualPadraoInspetor,
            continuarComOverrideHumanoGateQualidade: noopAsync,
            definirReferenciaMesaWidget: noop,
            enviarMensagemMesaWidget: noopAsync,
            exportarPendenciasPdf: noopAsync,
            extrairContextoVisualWorkspace: criarContextoVisualPadraoInspetor,
            fecharBannerEngenharia: noop,
            fecharMesaWidget: noop,
            fecharModalGateQualidade: noop,
            fecharModalNovaInspecao: noop,
            fecharNovaInspecaoComScreenSync: () => true,
            fecharSelectTemplateCustom: noop,
            bindEventosNovaInspecao: noop,
            inicializarNotificacoesSSE: noop,
            inicializarSelectTemplateCustom: noop,
            iniciarInspecao: noopAsync,
            inserirComandoPendenciasNoChat: noop,
            irParaMensagemPrincipal: noopAsync,
            limparAnexoMesaWidget: noop,
            limparPainelPendencias: noop,
            limparReferenciaMesaWidget: noop,
            marcarPendenciasComoLidas: noopAsync,
            modalNovaInspecaoEstaValida: noopFalse,
            montarResumoContextoModal: () => "",
            coletarDadosFormularioNovaInspecao: () => ({}),
            construirMetaVerificacaoPublicaWorkspace: () => "",
            construirResumoEmissaoOficialWorkspace: () => ({
                title: "Aguardando governança documental",
                meta: "A etapa oficial de emissão ainda não começou.",
                chip: "PENDENTE",
                tone: "neutral",
            }),
            construirResumoGovernancaHistoricoWorkspace: () => ({
                visible: false,
                title: "Governança do caso",
                detail: "Os sinais canônicos do caso aparecerão aqui conforme o fluxo evoluir.",
                actionLabel: "",
                actionKey: "",
            }),
            lifecyclePermiteVerificacaoPublicaWorkspace: noopFalse,
            mostrarBannerEngenharia: noop,
            obterModoEntradaSelecionadoModal: () => "auto_recommended",
            obterMensagemMesaPorId: noopNull,
            obterResumoOperacionalMesa: criarResumoMesaPadraoInspetor,
            obterRotuloAcaoFinalizacaoWorkspace: () => "Finalizar laudo",
            renderizarResumoOperacionalMesa: noop,
            renderizarGovernancaEntradaInspetor: noop,
            renderizarGovernancaHistoricoWorkspace: noop,
            renderizarResumoExecutivoWorkspace: noop,
            renderizarResumoNavegacaoWorkspace: noop,
            selecionarModoEntradaModal: () => "auto_recommended",
            selecionarAnexoMesaWidget: noop,
            selectTemplateCustomEstaAberto: noopFalse,
            sincronizarClasseBodyMesaWidget: noop,
            toggleEdicaoNomeInspecao: noop,
            togglePainelPendencias: noop,
            toggleMesaWidget: noop,
            tratarTrapFocoModal: noop,
            tratarTrapFocoModalGate: noop,
            atualizarResumoModoEntradaModal: noop,
            bootInspector: noopAsync,
            inicializarObservadorSidebarHistorico: noop,
            inicializarObservadorWorkspace: noop,
            limparObserversInspector: noop,
            bindSystemEvents: noop,
            bindUiBindings: noop,
            contarEvidenciasWorkspace: () => 0,
            extrairMetaLinhaWorkspace: () => ({ autor: "", tempo: "", resumo: "" }),
            renderizarAnexosWorkspace: noop,
            renderizarAtividadeWorkspace: noop,
            renderizarWorkspaceOfficialIssue: noop,
            renderizarWorkspacePublicVerification: noop,
            renderizarProgressoWorkspace: noop,
            sincronizarRotuloAcaoFinalizacaoWorkspace: noop,
            workspacePermiteFinalizacao: noopFalse,
        };
    }

    function criarRuntimeInspetor() {
        return {
            state: estado,
            elements: el,
            shared: criarSharedRuntimeInspetor(),
            actions: criarAcoesPadraoRuntimeInspetor(),
        };
    }

    function registrarModulosInspetor(ctx) {
        const modulosInspetor = window.TarielInspetorModules || {};

        REGISTROS_MODULOS_INSPETOR.forEach((nomeRegistro) => {
            const registrar = modulosInspetor[nomeRegistro];
            if (typeof registrar === "function") {
                try {
                    registrar(ctx);
                } catch (erro) {
                    logOnceRuntime(`inspetor-modulo-falha:${nomeRegistro}`, "warn", `Falha ao registrar módulo do inspetor: ${nomeRegistro}`, erro);
                }
                return;
            }

            debugRuntime(`Módulo do inspetor não carregado: ${nomeRegistro}`);
        });
    }

    const ctx = criarRuntimeInspetor();
    if (typeof ChatIndexRuntime?.publishInspectorRuntime === "function") {
        ChatIndexRuntime.publishInspectorRuntime(ctx);
    } else {
        window.TarielInspetorRuntime = ctx;
    }
    registrarModulosInspetor(ctx);
    const runtimeAtualizarEstadoModoEntrada = ctx.actions.atualizarEstadoModoEntrada;

    const {
        aplicarContextoVisualWorkspace,
        abrirMesaWidget,
        abrirModalGateQualidade,
        abrirModalNovaInspecao,
        atualizarBotoesFiltroPendencias,
        atualizarConexaoMesaWidget,
        atualizarEstadoAcaoModalNovaInspecao,
        atualizarEstadoVisualBotaoMesaWidget,
        atualizarBadgeMesaWidget,
        atualizarChatAoVivoComMesa,
        atualizarEmptyStateHonestoConversa,
        atualizarPendenciaIndividual,
        atualizarPreviewNomeInspecao,
        carregarMensagensMesaWidget,
        carregarPendenciasMesa,
        contarEvidenciasWorkspace,
        criarContextoVisualDoModal,
        criarContextoVisualPadrao,
        construirMetaVerificacaoPublicaWorkspace,
        construirResumoEmissaoOficialWorkspace,
        construirResumoGovernancaHistoricoWorkspace,
        continuarComOverrideHumanoGateQualidade,
        extrairMetaLinhaWorkspace,
        definirReferenciaMesaWidget,
        enviarMensagemMesaWidget,
        exportarPendenciasPdf,
        extrairContextoVisualWorkspace,
        fecharBannerEngenharia,
        fecharMesaWidget,
        fecharModalGateQualidade,
        fecharModalNovaInspecao,
        fecharSelectTemplateCustom,
        inicializarNotificacoesSSE,
        inicializarSelectTemplateCustom,
        inserirComandoPendenciasNoChat,
        irParaMensagemPrincipal,
        lifecyclePermiteVerificacaoPublicaWorkspace,
        limparAnexoMesaWidget,
        limparPainelPendencias,
        limparReferenciaMesaWidget,
        marcarPendenciasComoLidas,
        modalNovaInspecaoEstaValida,
        montarResumoContextoModal,
        coletarDadosFormularioNovaInspecao,
        mostrarBannerEngenharia,
        obterModoEntradaSelecionadoModal,
        obterMensagemMesaPorId,
        obterRotuloAcaoFinalizacaoWorkspace,
        obterResumoOperacionalMesa,
        renderizarAnexosWorkspace,
        renderizarAtividadeWorkspace,
        renderizarGovernancaEntradaInspetor,
        renderizarGovernancaHistoricoWorkspace,
        renderizarProgressoWorkspace,
        renderizarResumoExecutivoWorkspace,
        renderizarResumoNavegacaoWorkspace,
        renderizarResumoOperacionalMesa,
        renderizarWorkspaceOfficialIssue,
        renderizarWorkspacePublicVerification,
        selecionarModoEntradaModal,
        selecionarAnexoMesaWidget,
        selectTemplateCustomEstaAberto,
        sincronizarRotuloAcaoFinalizacaoWorkspace,
        sincronizarResumoHistoricoWorkspace,
        sincronizarResumoPendenciasWorkspace,
        sincronizarClasseBodyMesaWidget,
        toggleEdicaoNomeInspecao,
        togglePainelPendencias,
        toggleMesaWidget,
        tratarTrapFocoModal,
        tratarTrapFocoModalGate,
        atualizarResumoModoEntradaModal,
        workspacePermiteFinalizacao,
    } = ctx.actions;
    let atualizarPainelWorkspaceDerivado = ctx.actions.atualizarPainelWorkspaceDerivado;

    function atualizarNomeTemplateAtivo(tipo) {
        InspectorWorkspaceStage.atualizarNomeTemplateAtivo?.(tipo, {
            normalizarTipoTemplate,
            estado,
            atualizarContextoWorkspaceAtivo,
        });
    }

    function abrirNovaInspecaoComScreenSync(config = {}) {
        InspectorWorkspaceStage.abrirNovaInspecaoComScreenSync?.(config, {
            abrirModalNovaInspecao,
            sincronizarInspectorScreen,
        });
    }

    function fecharNovaInspecaoComScreenSync(opcoes = {}) {
        return InspectorWorkspaceStage.fecharNovaInspecaoComScreenSync?.(opcoes, {
            fecharModalNovaInspecao,
            sincronizarInspectorScreen,
        });
    }

    function atualizarCopyWorkspaceStage(stage = "inspection") {
        InspectorWorkspaceStage.atualizarCopyWorkspaceStage?.(stage, {
            COPY_WORKSPACE_STAGE,
            estado,
            modoEntradaEvidenceFirstAtivo,
            conversaWorkspaceModoChatAtivo,
            el,
            atualizarWorkspaceEntryModeNote,
        });
    }

    function atualizarControlesWorkspaceStage() {
        InspectorWorkspaceStage.atualizarControlesWorkspaceStage?.({
            el,
            estado,
            resolveInspectorBaseScreen,
            resolveWorkspaceView,
            modalNovaInspecaoEstaAberta,
            layoutInspectorCompacto,
            normalizarLaudoAtualId,
            obterSnapshotEstadoInspectorAtual,
            obterLaudoAtivoIdSeguro,
            conversaWorkspaceModoChatAtivo,
            workspacePermiteFinalizacao,
            obterPayloadStatusRelatorioWorkspaceAtual,
            resolveWorkspaceRailVisibility,
            modoEntradaEvidenceFirstAtivo,
            atualizarBotaoWorkspaceRail,
            sincronizarRotuloAcaoFinalizacaoWorkspace,
            coletarLinhasWorkspace,
            atualizarWorkspaceEntryModeNote,
            sincronizarInspectorScreen,
        });
    }

    function focarComposerInspector() {
        InspectorWorkspaceComposer.focarComposerInspector?.({ el });
    }

    function detailPossuiContextoVisual(detail = {}) {
        return InspectorWorkspaceContextFlow.detailPossuiContextoVisual?.(detail) || false;
    }

    function enriquecerCardLaudoComContextoVisual(card = {}, contextoVisual = null) {
        return InspectorWorkspaceContextFlow.enriquecerCardLaudoComContextoVisual?.(
            card,
            contextoVisual,
            {
                normalizarContextoVisualSeguro,
                obterBadgeLifecycleCase,
            }
        ) || (card && typeof card === "object" ? { ...card } : {});
    }

    function enriquecerPayloadLaudoComContextoVisual(payload = {}, contextoVisual = null) {
        return InspectorWorkspaceContextFlow.enriquecerPayloadLaudoComContextoVisual?.(
            payload,
            contextoVisual,
            {
                normalizarContextoVisualSeguro,
                enriquecerCardLaudoComContextoVisual,
            }
        ) || (payload && typeof payload === "object" ? { ...payload } : {});
    }

    function resolverContextoVisualWorkspace(detail = {}) {
        return InspectorWorkspaceContextFlow.resolverContextoVisualWorkspace?.(
            detail,
            {
                detailPossuiContextoVisual,
                extrairContextoVisualWorkspace,
                obterContextoVisualLaudoRegistrado,
                obterRetomadaHomePendente,
                normalizarContextoVisualSeguro,
                estado,
                criarContextoVisualPadrao,
            }
        ) || criarContextoVisualPadrao();
    }

    function definirWorkspaceStage(stage = "assistant") {
        InspectorWorkspaceOrchestration.definirWorkspaceStage?.(stage, {
            normalizarWorkspaceStage,
            sincronizarEstadoInspector,
            atualizarCopyWorkspaceStage,
            atualizarControlesWorkspaceStage,
        });
    }

    function atualizarContextoWorkspaceAtivo() {
        InspectorWorkspaceOrchestration.atualizarContextoWorkspaceAtivo?.({
            InspectorWorkspaceStage,
            el,
            estado,
            aplicarContextoVisualWorkspace,
            obterContextoVisualAssistente,
            atualizarCopyWorkspaceStage,
            atualizarPainelWorkspaceDerivado,
            conversaWorkspaceModoChatAtivo,
            NOMES_TEMPLATES,
            obterResumoOperacionalMesa,
            modoEntradaEvidenceFirstAtivo,
            atualizarWorkspaceEntryModeNote,
        });
    }

    function definirModoInspecaoUI(modo = "home") {
        InspectorWorkspaceOrchestration.definirModoInspecaoUI?.(modo, {
            InspectorWorkspaceContextFlow,
            normalizarModoInspecaoUI,
            sincronizarEstadoInspector,
            atualizarControlesWorkspaceStage,
            estado,
            el,
            fecharMesaWidget,
            limparReferenciaMesaWidget,
            limparAnexoMesaWidget,
            atualizarContextoWorkspaceAtivo,
        });
    }

    function exibirInterfaceInspecaoAtiva(tipo) {
        InspectorWorkspaceOrchestration.exibirInterfaceInspecaoAtiva?.(tipo, {
            InspectorWorkspaceContextFlow,
            limparFluxoNovoChatFocado,
            definirWorkspaceStage,
            atualizarNomeTemplateAtivo,
            carregarContextoFixadoWorkspace,
            definirModoInspecaoUI,
            renderizarResumoOperacionalMesa,
            renderizarSugestoesComposer,
            atualizarStatusChatWorkspace,
            estado,
        });
    }

    function exibirLandingAssistenteIA({ limparTimeline = false, limparContextoChatLivre = false } = {}) {
        InspectorWorkspaceOrchestration.exibirLandingAssistenteIA?.(
            { limparTimeline, limparContextoChatLivre },
            {
                InspectorWorkspaceContextFlow,
                definirRetomadaHomePendente,
                limparFluxoNovoChatFocado,
                atualizarEstadoModoEntrada,
                estado,
                sincronizarEstadoInspector,
                resetarFiltrosHistoricoWorkspace,
                definirWorkspaceStage,
                aplicarContextoVisualWorkspace,
                obterContextoVisualAssistente,
                definirModoInspecaoUI,
                atualizarThreadWorkspace,
                limparPainelPendencias,
                fecharSlashCommandPalette,
                renderizarResumoOperacionalMesa,
                renderizarSugestoesComposer,
                atualizarStatusChatWorkspace,
            }
        );
    }

    function abrirChatLivreInspector({ origem = "chat_free_entry", forcarLanding = false } = {}) {
        const abriu = InspectorWorkspaceOrchestration.abrirChatLivreInspector?.(
            { origem, forcarLanding },
            {
                InspectorWorkspaceContextFlow,
                obterSnapshotEstadoInspectorAtual,
                redirecionarEntradaParaReemissaoWorkspace,
                origemChatLivreEhPortal,
                entradaChatLivreDisponivel,
                sincronizarVisibilidadeAcoesChatLivre,
                mostrarToast,
                fecharModalGateQualidade,
                modalNovaInspecaoEstaAberta,
                fecharNovaInspecaoComScreenSync,
                limparForcaTelaInicial,
                sincronizarEstadoInspector,
                exibirLandingAssistenteIA,
                sincronizarInspectorScreen,
                focarComposerInspector,
                emitirEventoTariel,
            }
        ) || false;
        if (abriu) {
            limparContextoChatLivrePersonalizado({
                silencioso: true,
                sincronizarThread: false,
            });
        }
        return abriu;
    }

    function definirRootAtivoChatLivre(root, ativo) {
        if (!root) return;
        const ativoBoolean = !!ativo;
        root.dataset.active = ativoBoolean ? "true" : "false";
        root.setAttribute("aria-hidden", String(!ativoBoolean));
        if (ativoBoolean) {
            root.removeAttribute("hidden");
        } else {
            root.setAttribute("hidden", "");
        }
        try {
            root.inert = !ativoBoolean;
        } catch (_) {
            if (ativoBoolean) {
                root.removeAttribute("inert");
            } else {
                root.setAttribute("inert", "");
            }
        }
    }

    function limparModoNrVisualChatLivre() {
        const painel = el.painelChat || document.getElementById("painel-chat");
        [document.body, painel].forEach((alvo) => {
            if (!alvo?.dataset) return;
            delete alvo.dataset.nrVisualMode;
            delete alvo.dataset.nrVisualTitle;
            delete alvo.dataset.nrVisualBadge;
        });

        const tituloWorkspace = el.workspaceTituloLaudo || document.getElementById("workspace-titulo-laudo");
        if (tituloWorkspace) {
            tituloWorkspace.textContent = "Tariel";
            tituloWorkspace.dataset.nrTitleActive = "false";
        }

        const tituloModo = el.workspaceNrModeTitle || document.getElementById("workspace-nr-mode-title");
        if (tituloModo) {
            tituloModo.textContent = "";
            tituloModo.hidden = true;
            tituloModo.setAttribute("aria-hidden", "true");
        }
    }

    function forcarLandingChatLivreDom({ limparTimeline = true } = {}) {
        const painel = el.painelChat || document.getElementById("painel-chat");
        const portalRoot = document.querySelector('[data-screen-root="portal"]');
        const workspaceRoot = document.querySelector('[data-screen-root="workspace"]');
        const workspaceShell = document.querySelector('[data-inspector-region="workspace-shell"]');
        const assistantRoot = document.querySelector('[data-workspace-view-root="assistant_landing"]');
        const rodape = el.rodapeEntrada || document.querySelector(".rodape-entrada");
        const areaMensagens = el.areaMensagens || document.getElementById("area-mensagens");
        const campo = el.campoMensagem || document.getElementById("campo-mensagem");
        const threadNav = el.threadNav || document.querySelector(".thread-nav");

        estado.freeChatTemplateContext = null;
        estado.laudoAtualId = null;
        estado.estadoRelatorio = "sem_relatorio";
        estado.forceHomeLanding = false;
        estado.modoInspecaoUI = "workspace";
        estado.workspaceStage = "assistant";
        estado.inspectorScreen = "assistant_landing";
        estado.inspectorBaseScreen = "assistant_landing";
        estado.threadTab = "conversa";
        estado.overlayOwner = "";
        estado.assistantLandingFirstSendPending = false;
        estado.freeChatConversationActive = false;

        sincronizarEstadoInspector?.(
            {
                laudoAtualId: null,
                estadoRelatorio: "sem_relatorio",
                forceHomeLanding: false,
                modoInspecaoUI: "workspace",
                workspaceStage: "assistant",
                inspectorScreen: "assistant_landing",
                inspectorBaseScreen: "assistant_landing",
                threadTab: "conversa",
                overlayOwner: "",
                assistantLandingFirstSendPending: false,
                freeChatConversationActive: false,
            },
            {
                persistirStorage: false,
                syncScreen: false,
            }
        );

        if (painel?.dataset) {
            painel.dataset.inspecaoUi = "workspace";
            painel.dataset.workspaceStage = "assistant";
            painel.dataset.inspectorScreen = "assistant_landing";
            painel.dataset.threadTab = "conversa";
            painel.dataset.laudoAtualId = "";
            painel.dataset.estadoRelatorio = "sem_relatorio";
            painel.dataset.freeChatConversationActive = "false";
        }

        definirRootAtivoChatLivre(portalRoot, false);
        definirRootAtivoChatLivre(workspaceRoot, true);
        if (workspaceShell?.dataset) {
            workspaceShell.dataset.workspaceView = "assistant_landing";
            workspaceShell.dataset.workspaceLayout = "thread-only";
            workspaceShell.dataset.workspaceRailVisible = "false";
        }

        document.querySelectorAll("[data-workspace-view-root]").forEach((root) => {
            definirRootAtivoChatLivre(root, root === assistantRoot);
        });

        if (rodape) {
            rodape.removeAttribute("hidden");
            rodape.setAttribute("aria-hidden", "false");
        }
        if (threadNav) {
            threadNav.hidden = true;
            threadNav.setAttribute("aria-hidden", "true");
        }
        if (limparTimeline) {
            areaMensagens
                ?.querySelectorAll(".linha-mensagem:not(#indicador-digitando), .controle-historico-antigo, .skeleton-carregamento")
                .forEach((node) => node.remove());
            window.TarielAPI?.limparHistoricoChat?.({ emitirEstadoRelatorio: false });
        }
        limparModoNrVisualChatLivre();
        if (campo) {
            campo.placeholder = "Peça ao Tariel";
        }
    }

    function instalarFallbackBotaoChatLivre() {
        if (document.documentElement.dataset.chatLivreLandingFallbackBound === "true") return;
        document.documentElement.dataset.chatLivreLandingFallbackBound = "true";

        const processarAberturaChatLivre = (event) => {
            const botao = event.target?.closest?.('[data-action="open-assistant-chat"]');
            if (!botao) return;

            const agora = Date.now();
            const ate = Number(document.documentElement.dataset.chatLivreLandingHandlingUntil || 0) || 0;
            if (ate > agora) {
                event.preventDefault?.();
                event.stopImmediatePropagation?.();
                return;
            }
            document.documentElement.dataset.chatLivreLandingHandlingUntil = String(agora + 450);

            event.preventDefault?.();
            event.stopImmediatePropagation?.();

            limparContextoChatLivrePersonalizado({
                silencioso: true,
                sincronizarThread: false,
            });

            try {
                abrirChatLivreInspector({
                    origem: botao.dataset?.inspectorEntry || botao.id || "chat_free_entry",
                    forcarLanding: true,
                });
            } catch (_) {}

            const aplicar = () => forcarLandingChatLivreDom({ limparTimeline: true });
            aplicar();
            window.requestAnimationFrame?.(aplicar);
            window.setTimeout(aplicar, 80);
            window.setTimeout(aplicar, 240);

            document.dispatchEvent(new CustomEvent("tariel:toggle-sidebar", {
                detail: {
                    aberta: false,
                    origem: "chat_livre_landing",
                },
                bubbles: true,
            }));

            window.setTimeout(() => {
                focarComposerInspector?.();
            }, 90);
        };

        document.addEventListener("pointerdown", processarAberturaChatLivre, true);
        document.addEventListener("click", processarAberturaChatLivre, true);
    }

    function promoverPortalParaChatNoModoFoco({ origem = "focus_mode_toggle" } = {}) {
        return InspectorWorkspaceOrchestration.promoverPortalParaChatNoModoFoco?.(
            { origem },
            {
                InspectorWorkspaceContextFlow,
                obterSnapshotEstadoInspectorAtual,
                modoFocoPodePromoverPortalParaChat,
                abrirChatLivreInspector,
            }
        ) || false;
    }

    function restaurarTelaSemRelatorio({ limparTimeline = false } = {}) {
        InspectorWorkspaceOrchestration.restaurarTelaSemRelatorio?.(
            { limparTimeline },
            {
                InspectorWorkspaceContextFlow,
                homeForcadoAtivo,
                resetarInterfaceInspecao,
                exibirLandingAssistenteIA,
            }
        );
    }

    function resetarInterfaceInspecao() {
        InspectorWorkspaceOrchestration.resetarInterfaceInspecao?.({
            InspectorWorkspaceContextFlow,
            definirRetomadaHomePendente,
            limparFluxoNovoChatFocado,
            atualizarEstadoModoEntrada,
            estado,
            resetarFiltrosHistoricoWorkspace,
            definirWorkspaceStage,
            definirModoInspecaoUI,
            atualizarThreadWorkspace,
            atualizarHistoricoHomeExpandido,
            renderizarResumoOperacionalMesa,
            limparPainelPendencias,
            fecharSlashCommandPalette,
            atualizarStatusChatWorkspace,
        });
    }

    function atualizarHistoricoHomeExpandido(expandir = false) {
        InspectorSidebarHistory.atualizarHistoricoHomeExpandido?.(
            expandir,
            obterDependenciasSidebarHistory()
        );
    }

    function rolarParaHistoricoHome({ expandir = false } = {}) {
        InspectorSidebarHistory.rolarParaHistoricoHome?.(
            { expandir },
            obterDependenciasSidebarHistory()
        );
    }

    async function abrirLaudoPeloHome(
        laudoId,
        origem = "home_recent",
        tipoTemplate = "padrao",
        contextoVisual = null,
        threadTabPreferida = "",
        modoEntradaPayload = null
    ) {
        return InspectorWorkspaceOrchestration.abrirLaudoPeloHome?.(
            laudoId,
            origem,
            tipoTemplate,
            contextoVisual,
            threadTabPreferida,
            modoEntradaPayload,
            {
                InspectorWorkspaceHomeFlow,
                mostrarToast,
                limparForcaTelaInicial,
                normalizarTipoTemplate,
                normalizarThreadTab,
                resolverThreadTabInicialPorModoEntrada,
                definirRetomadaHomePendente,
                registrarContextoVisualLaudo,
                aplicarContextoVisualWorkspace,
                criarContextoVisualPadrao,
                atualizarEstadoModoEntrada,
                sincronizarEstadoInspector,
                exibirInterfaceInspecaoAtiva,
                atualizarThreadWorkspace,
                carregarPendenciasMesa,
                emitirEventoTariel,
            }
        ) || false;
    }

    async function iniciarInspecao(
        tipo,
        { contextoVisual = null, dadosFormulario = null, entryModePreference = null, runtimeTipoTemplate = null } = {}
    ) {
        if (estado.iniciandoInspecao) return null;
        return InspectorWorkspaceOrchestration.iniciarInspecao?.(
            tipo,
            {
                contextoVisual,
                dadosFormulario,
                entryModePreference,
                runtimeTipoTemplate,
            },
            {
                estado,
                normalizarTipoTemplate,
                limparForcaTelaInicial,
                mostrarToast,
                definirBotaoIniciarCarregando,
                enriquecerPayloadLaudoComContextoVisual,
                modalNovaInspecaoEstaAberta,
                fecharNovaInspecaoComScreenSync,
                registrarContextoVisualLaudo,
                atualizarEstadoModoEntrada,
                emitirSincronizacaoLaudo,
                resolverThreadTabInicialPorModoEntrada,
                definirRetomadaHomePendente,
                abrirLaudoPeloHome,
                exibirInterfaceInspecaoAtiva,
            }
        ) || null;
    }

    async function finalizarInspecao() {
        return InspectorWorkspaceOrchestration.finalizarInspecao?.({
            InspectorWorkspaceDeliveryFlow,
            estado,
            mostrarToast,
            definirBotaoFinalizarCarregando,
        }) || null;
    }

    // =========================================================
    // HIGHLIGHT / ESTADO VISUAL DO COMPOSER
    // =========================================================

    function aplicarHighlightComposer(texto = "") {
        InspectorWorkspaceComposer.aplicarHighlightComposer?.(texto, {
            el,
            atualizarStatusMesaPorComposer,
        });
    }

    function atualizarVisualComposer(texto = "") {
        InspectorWorkspaceComposer.atualizarVisualComposer?.(texto, {
            el,
            atualizarStatusMesaPorComposer,
        });
    }

    function sincronizarScrollBackdrop() {
        return InspectorWorkspaceComposer.sincronizarScrollBackdrop?.();
    }

    // =========================================================
    // BANNER TEMPORÁRIO DA ENGENHARIA
    // =========================================================


    Object.assign(ctx.actions, {
        abrirChatLivreInspector,
        abrirLaudoPeloHome,
        abrirMesaComContexto,
        abrirNovaInspecaoComScreenSync,
        abrirPreviewWorkspace,
        abrirReemissaoWorkspace,
        aplicarContextoChatLivrePersonalizado,
        aplicarContextoChatLivrePersonalizadoDaAcaoRapida,
        aplicarEstadoAcordeaoRailWorkspace,
        aplicarMatrizVisibilidadeInspector,
        aplicarHighlightComposer,
        aplicarPrePromptDaAcaoRapida,
        armarPrimeiroEnvioNovoChatPendente,
        atualizarContextoWorkspaceAtivo,
        atualizarEstadoModoEntrada,
        atualizarHistoricoHomeExpandido,
        atualizarEmptyStateHonestoConversa: ctx.actions.atualizarEmptyStateHonestoConversa,
        atualizarPainelWorkspaceDerivado: ctx.actions.atualizarPainelWorkspaceDerivado,
        atualizarRecursosComposerWorkspace,
        atualizarStatusChatWorkspace,
        atualizarStatusMesa,
        atualizarThreadWorkspace,
        bindEventosModal,
        bindEventosNovaInspecao: ctx.actions.bindEventosNovaInspecao,
        bindEventosPagina,
        bindEventosSistema,
        bindSystemEvents: ctx.actions.bindSystemEvents,
        bootInspector: ctx.actions.bootInspector,
        carregarContextoFixadoWorkspace,
        fecharNovaInspecaoComScreenSync,
        filtrarSidebarHistorico,
        filtrarTimelineWorkspace,
        finalizarInspecao,
        fixarContextoWorkspace,
        focarComposerInspector,
        iniciarInspecao,
        inserirTextoNoComposer,
        citarMensagemWorkspace,
        coletarLinhasWorkspace,
        copiarResumoContextoWorkspace,
        copiarTextoWorkspace,
        criarContextoVisualPadrao,
        definirBotaoLaudoCarregando,
        definirBotaoPreviewCarregando,
        definirRetomadaHomePendente,
        definirModoInspecaoUI,
        definirWorkspaceStage,
        executarComandoSlash,
        estadoRelatorioPossuiContexto,
        exibirConversaFocadaNovoChat,
        exibirInterfaceInspecaoAtiva,
        fluxoNovoChatFocadoAtivoOuPendente,
        homeForcadoAtivo,
        limparContextoChatLivrePersonalizado,
        limparContextoFixadoWorkspace,
        limparObserversInspector: ctx.actions.limparObserversInspector,
        montarResumoContextoIAWorkspace,
        contarEvidenciasWorkspace: ctx.actions.contarEvidenciasWorkspace,
        decorarLinhasWorkspace,
        extrairMetaLinhaWorkspace: ctx.actions.extrairMetaLinhaWorkspace,
        normalizarFiltroChat,
        normalizarFiltroTipoHistorico,
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
        normalizarThreadTab,
        obterContextoChatLivrePersonalizadoAtivo,
        obterEstadoRelatorioAtualSeguro,
        obterLaudoIdDaURLInspector,
        obterPreferenciasIAMobileChatAtiva,
        obterRetomadaHomePendente,
        obterSnapshotEstadoInspectorAtual,
        obterTextoDeApoioComposer,
        obterTipoTemplateDoPayload,
        obterContextoVisualLaudoRegistrado,
        onCampoMensagemWorkspaceKeydown,
        prepararComposerParaEnvioModoEntrada,
        processarAcaoHome,
        promoverPortalParaChatNoModoFoco,
        promoverPrimeiraMensagemNovoChatSePronta,
        registrarPromptHistorico,
        registrarContextoVisualLaudo,
        registrarUltimoPayloadStatusRelatorioWorkspace,
        redirecionarEntradaParaReemissaoWorkspace,
        removerContextoFixadoWorkspace,
        renderizarAnexosWorkspace: ctx.actions.renderizarAnexosWorkspace,
        renderizarAtividadeWorkspace: ctx.actions.renderizarAtividadeWorkspace,
        renderizarContextoIAWorkspace,
        renderizarGovernancaEntradaInspetor,
        renderizarGovernancaHistoricoWorkspace,
        renderizarMesaCardWorkspace,
        renderizarProgressoWorkspace: ctx.actions.renderizarProgressoWorkspace,
        renderizarResumoExecutivoWorkspace,
        renderizarResumoNavegacaoWorkspace,
        renderizarSugestoesComposer,
        renderizarWorkspaceOfficialIssue,
        renderizarWorkspacePublicVerification,
        resolverContextoVisualWorkspace,
        restaurarTelaSemRelatorio,
        resolveInspectorScreen,
        resolveWorkspaceView,
        rolarParaHistoricoHome,
        resetarInterfaceInspecao,
        sincronizarInspectorScreen,
        sincronizarEstadoInspector,
        sincronizarResumoHistoricoWorkspace: ctx.actions.sincronizarResumoHistoricoWorkspace,
        sincronizarResumoPendenciasWorkspace: ctx.actions.sincronizarResumoPendenciasWorkspace,
        sincronizarScrollBackdrop,
        sincronizarSSEPorContexto,
        sincronizarSidebarLaudosTabs,
        sincronizarVisibilidadeAcoesChatLivre,
        workspaceViewSuportaRail,
        atualizarVisualComposer,
        inicializarObservadorSidebarHistorico: ctx.actions.inicializarObservadorSidebarHistorico,
        inicializarObservadorWorkspace: ctx.actions.inicializarObservadorWorkspace,
    });

    window.TarielInspectorState = Object.assign(window.TarielInspectorState || {}, {
        aplicarContextoChatLivrePersonalizado,
        limparContextoChatLivrePersonalizado,
        obterContextoChatLivrePersonalizadoAtivo,
        obterPreferenciasIAMobileChatAtiva,
    });

    function bindEventosModal() {
        InspectorWorkspacePageBoot.bindEventosModal?.({ ctx });
    }

    function bindEventosPagina() {
        InspectorWorkspacePageBoot.bindEventosPagina?.({ ctx });
    }

    function bindEventosSistema() {
        InspectorWorkspacePageBoot.bindEventosSistema?.({
            ctx,
            documentRef: document,
            windowRef: window,
            estado,
            origemModoFocoPayload: { origem: "focus_mode_toggle" },
            promoverPortalParaChatNoModoFoco,
            fecharSSE,
            limparTimerReconexaoSSE,
            limparTimerFecharMesaWidget,
            limparTimerBanner,
            cancelarCarregamentoPendenciasMesa,
            cancelarCarregamentoMensagensMesaWidget,
            atualizarConexaoMesaWidget,
            sincronizarSSEPorContexto,
            contextoTecnicoPrecisaRefresh,
            carregarPendenciasMesa,
        });
    }

    async function boot() {
        await InspectorWorkspacePageBoot.boot?.({ ctx });
    }

    const perfInstrumentation = window.TarielInspectorWorkspacePerf?.instrument?.({
        PERF,
        windowRef: window,
        documentRef: document,
        obterResumoPerfInspector,
        reportarProntidaoInspector,
        resolverInspectorBaseScreenPorSnapshot,
        resolverEstadoAutoritativoInspector,
        espelharEstadoInspectorNoDataset,
        espelharEstadoInspectorNoStorage,
        sincronizarEstadoInspector,
        exibirConversaFocadaNovoChat,
        promoverPrimeiraMensagemNovoChatSePronta,
        atualizarPainelWorkspaceDerivado,
        atualizarThreadWorkspace,
        aplicarMatrizVisibilidadeInspector,
        resolveInspectorScreen,
        sincronizarWorkspaceRail,
        sincronizarWidgetsGlobaisWorkspace,
        sincronizarInspectorScreen,
        abrirChatLivreInspector,
        abrirNovaInspecaoComScreenSync,
        boot,
    }) || {};

    resolverInspectorBaseScreenPorSnapshot = perfInstrumentation.resolverInspectorBaseScreenPorSnapshot || resolverInspectorBaseScreenPorSnapshot;
    resolverEstadoAutoritativoInspector = perfInstrumentation.resolverEstadoAutoritativoInspector || resolverEstadoAutoritativoInspector;
    espelharEstadoInspectorNoDataset = perfInstrumentation.espelharEstadoInspectorNoDataset || espelharEstadoInspectorNoDataset;
    espelharEstadoInspectorNoStorage = perfInstrumentation.espelharEstadoInspectorNoStorage || espelharEstadoInspectorNoStorage;
    sincronizarEstadoInspector = perfInstrumentation.sincronizarEstadoInspector || sincronizarEstadoInspector;
    exibirConversaFocadaNovoChat = perfInstrumentation.exibirConversaFocadaNovoChat || exibirConversaFocadaNovoChat;
    promoverPrimeiraMensagemNovoChatSePronta = perfInstrumentation.promoverPrimeiraMensagemNovoChatSePronta || promoverPrimeiraMensagemNovoChatSePronta;
    atualizarPainelWorkspaceDerivado = perfInstrumentation.atualizarPainelWorkspaceDerivado || atualizarPainelWorkspaceDerivado;
    atualizarThreadWorkspace = perfInstrumentation.atualizarThreadWorkspace || atualizarThreadWorkspace;
    aplicarMatrizVisibilidadeInspector = perfInstrumentation.aplicarMatrizVisibilidadeInspector || aplicarMatrizVisibilidadeInspector;
    resolveInspectorScreen = perfInstrumentation.resolveInspectorScreen || resolveInspectorScreen;
    sincronizarWorkspaceRail = perfInstrumentation.sincronizarWorkspaceRail || sincronizarWorkspaceRail;
    sincronizarWidgetsGlobaisWorkspace = perfInstrumentation.sincronizarWidgetsGlobaisWorkspace || sincronizarWidgetsGlobaisWorkspace;
    sincronizarInspectorScreen = perfInstrumentation.sincronizarInspectorScreen || sincronizarInspectorScreen;
    abrirChatLivreInspector = perfInstrumentation.abrirChatLivreInspector || abrirChatLivreInspector;
    abrirNovaInspecaoComScreenSync = perfInstrumentation.abrirNovaInspecaoComScreenSync || abrirNovaInspecaoComScreenSync;
    boot = perfInstrumentation.boot || boot;

    instalarFallbackBotaoChatLivre();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
