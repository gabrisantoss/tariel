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
    if (typeof InspectorRuntime?.guardOnce === "function") {
        if (!InspectorRuntime.guardOnce("chat_index_page")) return;
    } else {
        if (window.__TARIEL_CHAT_INDEX_PAGE_WIRED__) return;
        window.__TARIEL_CHAT_INDEX_PAGE_WIRED__ = true;
    }

    // =========================================================
    // CONSTANTES
    // =========================================================
    const ROTA_SSE_NOTIFICACOES = "/app/api/notificacoes/sse";
    const TEMPO_BANNER_MS = 8000;
    const TEMPO_RECONEXAO_SSE_MS = 5000;
    const BREAKPOINT_LAYOUT_INSPETOR_COMPACTO = 1199;
    const sharedGlobals =
        InspectorRuntime?.resolveSharedGlobals?.() || {
            perf: window.TarielPerf || window.TarielCore?.TarielPerf || null,
            caseLifecycle: window.TarielCaseLifecycle,
        };
    const InspectorStateSnapshots = window.TarielInspectorStateSnapshots || {};
    const InspectorStateAuthority = window.TarielInspectorStateAuthority || {};
    const InspectorStateRuntimeSync = window.TarielInspectorStateRuntimeSync || {};
    const InspectorStateNormalization = window.TarielInspectorStateNormalization || {};
    const InspectorHistoryBuilders = window.TarielInspectorHistoryBuilders || {};
    const InspectorWorkspaceHistoryContext = window.TarielInspectorWorkspaceHistoryContext || {};
    const InspectorWorkspaceMesaStatus = window.TarielInspectorWorkspaceMesaStatus || {};
    const InspectorSidebarHistory = window.TarielInspectorSidebarHistory || {};
    const InspectorWorkspaceRail = window.TarielInspectorWorkspaceRail || {};
    const InspectorWorkspaceScreen = window.TarielInspectorWorkspaceScreen || {};
    const InspectorWorkspaceUtils = window.TarielInspectorWorkspaceUtils || {};
    const InspectorWorkspaceStage = window.TarielInspectorWorkspaceStage || {};
    const InspectorWorkspaceMesaAttachments = window.TarielInspectorWorkspaceMesaAttachments || {};
    const InspectorWorkspaceContextFlow = window.TarielInspectorWorkspaceContextFlow || {};
    const InspectorWorkspaceHomeFlow = window.TarielInspectorWorkspaceHomeFlow || {};
    const InspectorWorkspaceComposer = window.TarielInspectorWorkspaceComposer || {};
    const InspectorWorkspaceDeliveryFlow = window.TarielInspectorWorkspaceDeliveryFlow || {};
    const PERF = sharedGlobals.perf;
    const CaseLifecycle = sharedGlobals.caseLifecycle;

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
            texto: "Mesa pronta",
        },
        canal_ativo: {
            icone: "alternate_email",
            texto: "Canal da mesa ativo",
        },
        aguardando: {
            icone: "hourglass_top",
            texto: "Aguardando mesa",
        },
        respondeu: {
            icone: "mark_chat_read",
            texto: "Mesa respondeu",
        },
        pendencia_aberta: {
            icone: "assignment_late",
            texto: "Pendência aberta",
        },
        offline: {
            icone: "wifi_off",
            texto: "Mesa indisponível",
        },
    };

    const CONFIG_CONEXAO_MESA_WIDGET = {
        conectado: "Conectado",
        reconectando: "Reconectando",
        offline: "Offline",
    };

    const EM_PRODUCAO =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";
    const LIMITE_RECONEXAO_SSE_OFFLINE = 3;
    const MAX_BYTES_ANEXO_MESA = 12 * 1024 * 1024;
    const CHAVE_FORCE_HOME_LANDING = "tariel_force_home_landing";
    const CHAVE_RETOMADA_HOME_PENDENTE = "tariel_workspace_retomada_home_pendente";
    const CHAVE_CONTEXTO_VISUAL_LAUDOS = "tariel_workspace_contexto_visual_laudos";
    const LIMITE_CONTEXTO_VISUAL_LAUDOS_STORAGE = 50;
    const MENSAGEM_MESA_EXIGE_INSPECAO =
        "A conversa com a mesa avaliadora só é permitida após iniciar uma nova inspeção.";
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
            prompt: "Liste as pendências atuais desta inspeção em ordem de prioridade operacional, indicando o que falta coletar, o motivo e o impacto no envio para a mesa.",
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
            prompt: "Monte um plano de ação curto para concluir esta inspeção, com sequência prática de coleta, anexos necessários e pontos que precisam de validação da mesa.",
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
            prompt: "Redija uma conclusão preliminar profissional desta inspeção, separando condições observadas, limitações de evidência, pendências e recomendação para envio à mesa.",
            atalho: "/gerar-conclusao",
            sugestao: true,
            icone: "article",
        },
        {
            id: "mesa",
            titulo: "Enviar resumo para a mesa",
            descricao: "Abre o canal da mesa com uma minuta pronta para validação.",
            prompt: "",
            atalho: "/mesa",
            sugestao: true,
            icone: "support_agent",
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
        title: "Assistente Tariel IA",
        subtitle: "Conversa inicial • nenhum laudo ativo",
        statusBadge: "CHAT LIVRE",
    });

    const COPY_WORKSPACE_STAGE = Object.freeze({
        assistant: {
            eyebrow: "Chat livre",
            headline: "Novo Chat",
            description:
                "Descreva o equipamento, o cenário ou a dúvida técnica. A primeira mensagem abre o contexto do laudo.",
            placeholder: "Descreva o equipamento, o cenário ou a dúvida técnica",
            contextTitle: "Envie a primeira mensagem",
            contextStatus: "A IA organiza o laudo enquanto voce descreve o cenario.",
        },
        inspection: {
            eyebrow: "Sessão técnica em andamento",
            headline: "Registro Técnico",
            description:
                "Documente evidências, anexe arquivos e interaja com o assistente técnico.",
            placeholder: "Descreva a evidência, anexe arquivos ou use / para comandos",
        },
        focusedConversation: {
            eyebrow: "Chat livre",
            headline: "Conversa com a IA",
            description:
                "Continue a conversa normalmente. O fluxo funcional do laudo segue o comportamento atual em segundo plano.",
            placeholder: "Escreva a continuação da conversa",
            contextTitle: "Conversa com a IA",
            contextStatus: "A conversa segue focada no histórico e no composer.",
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
        workspaceVisualContext: { ...CONTEXTO_WORKSPACE_ASSISTENTE },
        contextoVisualPorLaudo: {},
        ultimoStatusRelatorioPayload: null,
        workspaceRailExpanded: true,
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
            texto: "Assistente pronto",
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
    const el = {
        modal: document.getElementById("modal-nova-inspecao"),
        overlayHost: document.getElementById("inspetor-overlay-host"),
        btnAbrirModal: document.getElementById("btn-abrir-modal-novo"),
        btnFecharModal: document.querySelector("#modal-nova-inspecao .btn-fechar-modal"),
        btnConfirmarInspecao: document.getElementById("btn-confirmar-inspecao"),
        selectTemplate: document.getElementById("select-template-inspecao"),
        selectTemplateCustom: document.getElementById("select-template-custom"),
        btnSelectTemplateCustom: document.getElementById("btn-select-template-custom"),
        valorSelectTemplateCustom: document.getElementById("valor-select-template-custom"),
        painelSelectTemplateCustom: document.getElementById("painel-select-template-custom"),
        listaSelectTemplateCustom: document.getElementById("lista-select-template-custom"),
        inputClienteInspecao: document.getElementById("input-cliente-inspecao"),
        inputUnidadeInspecao: document.getElementById("input-unidade-inspecao"),
        inputLocalInspecao: document.getElementById("input-local-inspecao"),
        textareaObjetivoInspecao: document.getElementById("textarea-objetivo-inspecao"),
        entryModeInputs: Array.from(document.querySelectorAll('input[name="entry-mode-preference"]')),
        modalEntryModeSummary: document.getElementById("modal-entry-mode-summary"),
        previewNomeInspecao: document.getElementById("preview-nome-inspecao"),
        btnEditarNomeInspecao: document.getElementById("btn-editar-nome-inspecao"),
        inputNomeInspecao: document.getElementById("input-nome-inspecao"),
        btnCancelarModalInspecao: document.getElementById("btn-cancelar-modal-inspecao"),
        modalGateQualidade: document.getElementById("modal-gate-qualidade"),
        btnFecharModalGateQualidade: document.getElementById("btn-fechar-modal-gate-qualidade"),
        btnEntendiGateQualidade: document.getElementById("btn-entendi-gate-qualidade"),
        btnPreencherGateQualidade: document.getElementById("btn-gate-preencher-no-chat"),
        tituloTemplateGateQualidade: document.getElementById("titulo-gate-template"),
        textoGateQualidadeResumo: document.getElementById("texto-gate-qualidade-resumo"),
        blocoGateRoteiroTemplate: document.getElementById("bloco-gate-roteiro-template"),
        tituloGateRoteiroTemplate: document.getElementById("titulo-gate-roteiro-template"),
        textoGateRoteiroTemplate: document.getElementById("texto-gate-roteiro-template"),
        listaGateRoteiroTemplate: document.getElementById("lista-gate-roteiro-template"),
        listaGateFaltantes: document.getElementById("lista-gate-faltantes"),
        listaGateChecklist: document.getElementById("lista-gate-checklist"),
        blocoGateOverrideHumano: document.getElementById("bloco-gate-override-humano"),
        textoGateOverrideHumano: document.getElementById("texto-gate-override-humano"),
        listaGateOverrideCasos: document.getElementById("lista-gate-override-casos"),
        textareaGateOverrideJustificativa: document.getElementById("textarea-gate-override-justificativa"),
        textoGateOverrideResponsabilidade: document.getElementById("texto-gate-override-responsabilidade"),
        btnGateOverrideContinuar: document.getElementById("btn-gate-override-continuar"),

        telaBoasVindas: document.getElementById("tela-boas-vindas"),
        painelChat: document.getElementById("painel-chat"),
        portalScreenRoot: document.querySelector('[data-screen-root="portal"]'),
        workspaceScreenRoot: document.querySelector('[data-screen-root="workspace"]'),
        mesaWidgetScreenRoot: document.querySelector('[data-screen-root="mesa-widget"]'),
        workspaceAssistantViewRoot: document.querySelector('[data-workspace-view-root="assistant_landing"]'),
        workspaceHistoryViewRoot: document.querySelector('[data-workspace-view-root="inspection_history"]'),
        workspaceRecordViewRoot: document.querySelector('[data-workspace-view-root="inspection_record"]'),
        workspaceConversationViewRoot: document.querySelector('[data-workspace-view-root="inspection_conversation"]'),
        workspaceMesaViewRoot: document.querySelector('[data-workspace-view-root="inspection_mesa"]'),
        workspaceHistoryRoot: document.querySelector("[data-workspace-history-root]"),
        workspaceHeader: document.querySelector("[data-workspace-header]"),
        chatThreadToolbar: document.querySelector(".chat-thread-toolbar"),
        threadNav: document.querySelector(".thread-nav"),
        chatDashboardRail: document.querySelector(".chat-dashboard-rail"),
        workspaceTituloLaudo: document.getElementById("workspace-titulo-laudo"),
        workspaceSubtituloLaudo: document.getElementById("workspace-subtitulo-laudo"),
        workspaceStatusBadge: document.getElementById("workspace-status-badge"),
        workspaceEyebrow: document.getElementById("workspace-eyebrow"),
        workspaceHeadline: document.getElementById("workspace-headline"),
        workspaceDescription: document.getElementById("workspace-description"),
        workspaceEntryModeNote: document.getElementById("workspace-entry-mode-note"),
        workspaceSummaryState: document.getElementById("workspace-summary-state"),
        workspaceSummaryEvidencias: document.getElementById("workspace-summary-evidencias"),
        workspaceSummaryPendencias: document.getElementById("workspace-summary-pendencias"),
        workspaceSummaryMesa: document.getElementById("workspace-summary-mesa"),
        workspacePublicVerification: document.getElementById("workspace-public-verification"),
        workspacePublicVerificationTitle: document.getElementById("workspace-public-verification-title"),
        workspacePublicVerificationMeta: document.getElementById("workspace-public-verification-meta"),
        workspacePublicVerificationLink: document.getElementById("workspace-public-verification-link"),
        btnWorkspaceCopyVerification: document.getElementById("btn-workspace-copy-verification"),
        workspaceOfficialIssue: document.getElementById("workspace-official-issue"),
        workspaceOfficialIssueTitle: document.getElementById("workspace-official-issue-title"),
        workspaceOfficialIssueMeta: document.getElementById("workspace-official-issue-meta"),
        workspaceOfficialIssueChip: document.getElementById("workspace-official-issue-chip"),
        workspaceNavCaption: document.getElementById("workspace-nav-caption"),
        workspaceNavStatus: document.getElementById("workspace-nav-status"),
        workspaceAssistantLanding: document.getElementById("workspace-assistant-landing"),
        workspaceAssistantGovernance: document.getElementById("workspace-assistant-governance"),
        workspaceAssistantGovernanceTitle: document.getElementById("workspace-assistant-governance-title"),
        workspaceAssistantGovernanceDetail: document.getElementById("workspace-assistant-governance-detail"),
        btnAssistantLandingOpenInspecaoModal: document.getElementById("btn-assistant-landing-open-inspecao-modal"),
        btnSidebarOpenInspecaoModal: document.getElementById("btn-sidebar-open-inspecao-modal"),
        btnWorkspaceOpenInspecaoModal: document.getElementById("btn-workspace-open-inspecao-modal"),
        painelPendenciasMesa: document.getElementById("painel-pendencias-mesa"),
        listaPendenciasMesa: document.getElementById("lista-pendencias-mesa"),
        estadoLoadingPendenciasMesa: document.getElementById("estado-loading-pendencias-mesa"),
        textoVazioPendenciasMesa: document.getElementById("texto-vazio-pendencias-mesa"),
        textoVazioPendenciasMesaTexto: document.querySelector("#texto-vazio-pendencias-mesa [data-pendencias-empty-text]"),
        estadoErroPendenciasMesa: document.getElementById("estado-erro-pendencias-mesa"),
        estadoErroPendenciasMesaTexto: document.querySelector("#estado-erro-pendencias-mesa [data-pendencias-error-text]"),
        resumoPendenciasMesa: document.getElementById("resumo-pendencias-mesa"),
        acoesPendenciasMesa: document.querySelector("#painel-pendencias-mesa .acoes-pendencias"),
        filtrosPendenciasMesa: document.querySelector("#painel-pendencias-mesa .filtros-pendencias"),
        btnExportarPendenciasPdf: document.getElementById("btn-exportar-pendencias-pdf"),
        btnCarregarMaisPendencias: document.getElementById("btn-carregar-mais-pendencias"),
        botoesFiltroPendencias: Array.from(document.querySelectorAll("[data-filtro-pendencias]")),
        btnMarcarPendenciasLidas: document.getElementById("btn-marcar-pendencias-lidas"),
        btnFecharPendenciasMesa: document.getElementById("btn-fechar-pendencias-mesa"),
        btnFinalizarInspecao: document.getElementById("btn-finalizar-inspecao"),
        botoesFinalizarInspecao: Array.from(document.querySelectorAll("[data-finalizar-inspecao]")),
        btnRailFinalizarInspecao: document.getElementById("btn-rail-finalizar-inspecao"),
        btnWorkspaceToggleRail: document.getElementById("btn-workspace-toggle-rail"),
        btnWorkspacePreview: document.getElementById("btn-workspace-preview"),
        rodapeEntrada: document.querySelector(".rodape-entrada"),
        areaMensagens: document.getElementById("area-mensagens"),
        rodapeContextoTitulo: document.getElementById("rodape-contexto-titulo"),
        rodapeContextoStatus: document.getElementById("rodape-contexto-status"),
        btnIrFimChat: document.getElementById("btn-ir-fim-chat"),
        btnHomeVerHistorico: document.getElementById("btn-home-ver-historico"),
        btnHomeToggleHistoricoCompleto: document.getElementById("btn-home-toggle-historico-completo"),
        secaoHomeRecentes: document.getElementById("secao-home-recentes"),
        portalGovernanceSummary: document.getElementById("portal-governance-summary"),
        portalGovernanceSummaryTitle: document.getElementById("portal-governance-summary-title"),
        portalGovernanceSummaryDetail: document.getElementById("portal-governance-summary-detail"),
        historicoHomeExtras: Array.from(document.querySelectorAll("[data-home-historico-extra]")),
        botoesHomeLaudosRecentes: Array.from(document.querySelectorAll("[data-home-laudo-id]")),
        botoesAbrirChatLivre: Array.from(document.querySelectorAll('[data-action="open-assistant-chat"]')),
        inputBuscaHistorico: document.getElementById("busca-historico-input"),
        sidebarHistoricoLista: document.getElementById("lista-historico"),
        sidebarBuscaVazio: document.getElementById("estado-vazio-historico"),
        sidebarLaudosTabButtons: Array.from(document.querySelectorAll("[data-sidebar-laudos-tab-trigger]")),

        campoMensagem: document.getElementById("campo-mensagem"),
        btnEnviar: document.getElementById("btn-enviar"),
        btnAnexo: document.getElementById("btn-anexo"),
        btnFotoRapida: document.getElementById("btn-foto-rapida"),
        composerAttachmentTriggerButtons: Array.from(document.querySelectorAll("[data-composer-attachment-trigger]")),
        btnToggleHumano: document.getElementById("btn-toggle-humano"),
        backdropHighlight: document.getElementById("highlight-backdrop"),
        pilulaEntrada: document.querySelector(".pilula-entrada"),

        bannerEngenharia: document.getElementById("banner-notificacao-engenharia"),
        textoBannerEngenharia: document.getElementById("texto-previa-notificacao"),
        btnFecharBanner: document.querySelector(".btn-fechar-banner"),

        botoesAcoesRapidas: Array.from(document.querySelectorAll(".btn-acao-rapida")),

        btnMesaWidgetToggle: document.getElementById("btn-mesa-widget-toggle"),
        painelMesaWidget: document.getElementById("painel-mesa-widget"),
        btnFecharMesaWidget: document.getElementById("btn-fechar-mesa-widget"),
        statusConexaoMesaWidget: document.getElementById("status-conexao-mesa-widget"),
        textoConexaoMesaWidget: document.getElementById("texto-conexao-mesa-widget"),
        mesaWidgetResumo: document.getElementById("mesa-widget-resumo"),
        mesaWidgetResumoTitulo: document.getElementById("mesa-widget-resumo-titulo"),
        mesaWidgetResumoTexto: document.getElementById("mesa-widget-resumo-texto"),
        mesaWidgetChipStatus: document.getElementById("mesa-widget-chip-status"),
        mesaWidgetChipPendencias: document.getElementById("mesa-widget-chip-pendencias"),
        mesaWidgetChipNaoLidas: document.getElementById("mesa-widget-chip-nao-lidas"),
        mesaWidgetLista: document.getElementById("mesa-widget-lista"),
        mesaWidgetPreviewAnexo: document.getElementById("mesa-widget-preview-anexo"),
        mesaWidgetInput: document.getElementById("mesa-widget-input"),
        mesaWidgetBtnAnexo: document.getElementById("mesa-widget-btn-anexo"),
        mesaWidgetBtnFoto: document.getElementById("mesa-widget-btn-foto"),
        mesaWidgetInputAnexo: document.getElementById("mesa-widget-input-anexo"),
        mesaWidgetEnviar: document.getElementById("mesa-widget-enviar"),
        mesaWidgetCarregarMais: document.getElementById("mesa-widget-carregar-mais"),
        mesaWidgetRefAtiva: document.getElementById("mesa-widget-ref-ativa"),
        mesaWidgetRefTitulo: document.getElementById("mesa-widget-ref-titulo"),
        mesaWidgetRefTexto: document.getElementById("mesa-widget-ref-texto"),
        mesaWidgetRefLimpar: document.getElementById("mesa-widget-ref-limpar"),
        workspaceAnexosPanel: document.getElementById("workspace-anexos-panel"),
        workspaceAnexosGrid: document.getElementById("workspace-anexos-grid"),
        workspaceAnexosEmpty: document.getElementById("workspace-anexos-empty"),
        workspaceAnexosCount: document.getElementById("workspace-anexos-count"),
        workspaceHistoryTimeline: document.querySelector("[data-history-timeline]"),
        workspaceHistoryEmpty: document.querySelector("[data-history-empty]"),
        botoesWorkspaceHistoryContinue: Array.from(document.querySelectorAll("[data-history-continue]")),
        workspaceHistorySource: document.getElementById("workspace-history-source"),
        workspaceHistoryActiveFilter: document.getElementById("workspace-history-active-filter"),
        workspaceHistoryTotal: document.getElementById("workspace-history-total"),
        workspaceHistoryGovernance: document.getElementById("workspace-history-governance"),
        workspaceHistoryGovernanceTitle: document.getElementById("workspace-history-governance-title"),
        workspaceHistoryGovernanceDetail: document.getElementById("workspace-history-governance-detail"),
        btnWorkspaceHistoryReissue: document.getElementById("btn-workspace-history-reissue"),
        workspaceMesaStage: document.getElementById("workspace-mesa-stage"),
        workspaceMesaWidgetHost: document.getElementById("workspace-mesa-widget-host"),
        workspaceMesaStageStatus: document.getElementById("workspace-mesa-stage-status"),
        workspaceMesaStagePendencias: document.getElementById("workspace-mesa-stage-pendencias"),
        workspaceMesaStageEvidencias: document.getElementById("workspace-mesa-stage-evidencias"),
        workspaceMesaStageUnread: document.getElementById("workspace-mesa-stage-unread"),
        workspaceMesaStageSummary: document.getElementById("workspace-mesa-stage-summary"),
        workspaceMesaStageNextStep: document.getElementById("workspace-mesa-stage-next-step"),
        workspaceMesaStageTemplate: document.getElementById("workspace-mesa-stage-template"),
        workspaceMesaStageOperation: document.getElementById("workspace-mesa-stage-operation"),
        workspaceMesaStageEquipment: document.getElementById("workspace-mesa-stage-equipment"),
        workspaceMesaStageLastMovement: document.getElementById("workspace-mesa-stage-last-movement"),
        workspaceProgressCard: document.getElementById("workspace-progress-card"),
        workspaceProgressPercent: document.getElementById("workspace-progress-percent"),
        workspaceProgressBar: document.getElementById("workspace-progress-bar"),
        workspaceProgressEvidencias: document.getElementById("workspace-progress-evidencias"),
        workspaceProgressPendencias: document.getElementById("workspace-progress-pendencias"),
        workspaceActivityList: document.getElementById("workspace-activity-list"),
        chatThreadSearch: document.querySelector("[data-workspace-history-search]"),
        chatThreadResults: document.getElementById("chat-thread-results"),
        workspaceConversationEmpty: document.getElementById("workspace-conversation-empty"),
        workspaceChannelTabButtons: Array.from(document.querySelectorAll("[data-workspace-channel-tab]")),
        chatFilterButtons: Array.from(document.querySelectorAll("[data-chat-filter]")),
        historyTypeFilterButtons: Array.from(document.querySelectorAll("[data-history-type-filter]")),
        workspaceRailThreadTabButtons: Array.from(document.querySelectorAll("[data-rail-thread-tab]")),
        workspaceRailToggleButtons: Array.from(document.querySelectorAll("[data-rail-toggle]")),
        btnWorkspacePreviewRail: document.getElementById("btn-workspace-preview-rail"),
        composerSuggestions: document.getElementById("composer-suggestions"),
        slashCommandPalette: document.getElementById("slash-command-palette"),
        workspaceContextTemplate: document.getElementById("workspace-context-template"),
        workspaceContextEvidencias: document.getElementById("workspace-context-evidencias"),
        workspaceContextPendencias: document.getElementById("workspace-context-pendencias"),
        workspaceContextMesa: document.getElementById("workspace-context-mesa"),
        workspaceContextEquipment: document.getElementById("workspace-context-equipment"),
        workspaceContextOperation: document.getElementById("workspace-context-operation"),
        workspaceContextSummary: document.getElementById("workspace-context-summary"),
        workspacePinnedCard: document.getElementById("workspace-pinned-card"),
        workspaceContextPinnedCount: document.getElementById("workspace-context-pinned-count"),
        workspaceContextPinnedList: document.getElementById("workspace-context-pinned-list"),
        btnWorkspaceContextCopy: document.getElementById("btn-workspace-context-copy"),
        btnWorkspaceContextClear: document.getElementById("btn-workspace-context-clear"),
        workspaceMesaCardText: document.getElementById("workspace-mesa-card-text"),
        workspaceMesaCardStatus: document.getElementById("workspace-mesa-card-status"),
        workspaceMesaCardUnread: document.getElementById("workspace-mesa-card-unread"),
    };

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
        if (typeof window.mostrarToast === "function") {
            window.mostrarToast(mensagem, tipo, duracao);
        }
    }

    function debugRuntime(...args) {
        if (EM_PRODUCAO) return;

        if (typeof window.TarielCore?.debug === "function") {
            window.TarielCore.debug(...args);
            return;
        }
    }

    function logOnceRuntime(chave, nivel, ...args) {
        if (typeof window.TarielCore?.logOnce === "function") {
            window.TarielCore.logOnce(chave, nivel, ...args);
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
        if (typeof window.TarielInspectorEvents?.emit === "function") {
            window.TarielInspectorEvents.emit(nome, detail, {
                target: document,
                bubbles: true,
            });
            return;
        }

        document.dispatchEvent(new CustomEvent(nome, {
            detail,
            bubbles: true,
        }));
    }

    function ouvirEventoTariel(nome, handler) {
        if (typeof window.TarielInspectorEvents?.on === "function") {
            return window.TarielInspectorEvents.on(nome, handler, {
                target: document,
            });
        }

        document.addEventListener(nome, handler);
        return () => {
            document.removeEventListener(nome, handler);
        };
    }

    function obterResumoPerfInspector(snapshot = estado.snapshotEstadoInspector || null) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        return {
            screen: String(
                payload.inspectorScreen ||
                document.body?.dataset?.inspectorScreen ||
                ""
            ).trim(),
            baseScreen: String(
                payload.inspectorBaseScreen ||
                document.body?.dataset?.inspectorBaseScreen ||
                ""
            ).trim(),
            modoInspecaoUI: String(
                payload.modoInspecaoUI ||
                document.body?.dataset?.inspecaoUi ||
                ""
            ).trim(),
            workspaceStage: String(
                payload.workspaceStage ||
                document.body?.dataset?.workspaceStage ||
                ""
            ).trim(),
            threadTab: String(
                payload.threadTab ||
                document.body?.dataset?.threadTab ||
                ""
            ).trim(),
            laudoAtualId: Number(
                payload.laudoAtualId ||
                document.body?.dataset?.laudoAtualId ||
                0
            ) || null,
        };
    }

    function reportarProntidaoInspector(snapshot = estado.snapshotEstadoInspector || null) {
        if (!PERF?.enabled) return;

        const resumo = obterResumoPerfInspector(snapshot);
        const portalVisivel = !!(
            el.portalScreenRoot &&
            !el.portalScreenRoot.hidden &&
            el.portalScreenRoot.getClientRects().length > 0
        );
        const workspaceVisivel = !!(
            el.workspaceScreenRoot &&
            !el.workspaceScreenRoot.hidden &&
            el.workspaceScreenRoot.getClientRects().length > 0
        );
        const composerUtilizavel = !!(
            el.campoMensagem &&
            !el.campoMensagem.disabled &&
            el.campoMensagem.getClientRects().length > 0
        );

        if (portalVisivel) {
            PERF.markOnce("inspetor.portal.usable", resumo);
        }
        if (workspaceVisivel) {
            PERF.markOnce("inspetor.workspace.usable", resumo);
        }
        if (composerUtilizavel) {
            PERF.markOnce("inspetor.composer.usable", resumo);
        }
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
        if (status === "aguardando_mesa") return "AGUARDANDO MESA";
        if (status === "em_revisao_mesa") return "MESA EM REVISÃO";
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

    function registrarUltimoPayloadStatusRelatorioWorkspace(payload = null) {
        estado.ultimoStatusRelatorioPayload = clonarPayloadStatusRelatorioWorkspace(payload);
        return estado.ultimoStatusRelatorioPayload;
    }

    function obterPayloadStatusRelatorioWorkspaceAtual() {
        const snapshot = clonarPayloadStatusRelatorioWorkspace(
            window.TarielAPI?.obterSnapshotStatusRelatorioAtual?.() || null
        );
        const fallback = clonarPayloadStatusRelatorioWorkspace(estado.ultimoStatusRelatorioPayload);
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

        const allowedNextLifecycleStatuses = (
            Array.isArray(snapshot?.allowed_next_lifecycle_statuses)
                ? snapshot.allowed_next_lifecycle_statuses
                : Array.isArray(snapshot?.laudo_card?.allowed_next_lifecycle_statuses)
                    ? snapshot.laudo_card.allowed_next_lifecycle_statuses
                    : Array.isArray(fallback?.allowed_next_lifecycle_statuses)
                        ? fallback.allowed_next_lifecycle_statuses
                        : Array.isArray(fallback?.laudo_card?.allowed_next_lifecycle_statuses)
                            ? fallback.laudo_card.allowed_next_lifecycle_statuses
                            : []
        )
            .map((item) => normalizarCaseLifecycleStatusSeguro(item))
            .filter(Boolean);
        const allowedLifecycleTransitions = normalizarAllowedLifecycleTransitionsSeguro(
            Array.isArray(snapshot?.allowed_lifecycle_transitions)
                ? snapshot.allowed_lifecycle_transitions
                : Array.isArray(snapshot?.laudo_card?.allowed_lifecycle_transitions)
                    ? snapshot.laudo_card.allowed_lifecycle_transitions
                    : Array.isArray(fallback?.allowed_lifecycle_transitions)
                        ? fallback.allowed_lifecycle_transitions
                        : Array.isArray(fallback?.laudo_card?.allowed_lifecycle_transitions)
                            ? fallback.laudo_card.allowed_lifecycle_transitions
                            : []
        );
        const allowedSurfaceActions = normalizarAllowedSurfaceActionsSeguro(
            Array.isArray(snapshot?.allowed_surface_actions)
                ? snapshot.allowed_surface_actions
                : Array.isArray(snapshot?.laudo_card?.allowed_surface_actions)
                    ? snapshot.laudo_card.allowed_surface_actions
                    : Array.isArray(fallback?.allowed_surface_actions)
                        ? fallback.allowed_surface_actions
                        : Array.isArray(fallback?.laudo_card?.allowed_surface_actions)
                            ? fallback.laudo_card.allowed_surface_actions
                            : []
        );
        const caseLifecycleStatus = normalizarCaseLifecycleStatusSeguro(
            snapshot?.case_lifecycle_status ||
            snapshot?.laudo_card?.case_lifecycle_status ||
            fallback?.case_lifecycle_status ||
            fallback?.laudo_card?.case_lifecycle_status ||
            ""
        );
        const caseWorkflowMode = String(
            snapshot?.case_workflow_mode ||
            snapshot?.laudo_card?.case_workflow_mode ||
            fallback?.case_workflow_mode ||
            fallback?.laudo_card?.case_workflow_mode ||
            ""
        ).trim().toLowerCase();
        const activeOwnerRole = normalizarActiveOwnerRoleSeguro(
            snapshot?.active_owner_role ||
            snapshot?.laudo_card?.active_owner_role ||
            fallback?.active_owner_role ||
            fallback?.laudo_card?.active_owner_role ||
            ""
        );

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
                    allowed_next_lifecycle_statuses: allowedNextLifecycleStatuses,
                    allowed_lifecycle_transitions: allowedLifecycleTransitions,
                    allowed_surface_actions: allowedSurfaceActions,
                }
                : null,
            case_lifecycle_status: caseLifecycleStatus,
            case_workflow_mode: caseWorkflowMode,
            active_owner_role: activeOwnerRole,
            allowed_next_lifecycle_statuses: allowedNextLifecycleStatuses,
            allowed_lifecycle_transitions: allowedLifecycleTransitions,
            allowed_surface_actions: allowedSurfaceActions,
        };
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
        return !!ctx.shared.modoEntradaEvidenceFirstAtivo?.();
    }

    function resolverThreadTabInicialPorModoEntrada(payload = {}, fallback = "historico") {
        return ctx.shared.resolverThreadTabInicialPorModoEntrada?.(payload, fallback)
            || normalizarThreadTab(fallback);
    }

    function normalizarRetomadaHomePendenteSeguro(payload = null) {
        return ctx.shared.normalizarRetomadaHomePendenteSeguro?.(payload) || null;
    }

    function retomadaHomePendenteEhValida(payload = null) {
        return !!ctx.shared.retomadaHomePendenteEhValida?.(payload);
    }

    function sanitizarMapaContextoVisualLaudos(payload = null) {
        return ctx.shared.sanitizarMapaContextoVisualLaudos?.(payload) || {};
    }

    function persistirContextoVisualLaudosStorage(payload = null) {
        return ctx.shared.persistirContextoVisualLaudosStorage?.(payload) || {};
    }

    function lerContextoVisualLaudosStorage() {
        return ctx.shared.lerContextoVisualLaudosStorage?.() || {};
    }

    function registrarContextoVisualLaudo(laudoId, contextoVisual = null) {
        return ctx.actions.registrarContextoVisualLaudo?.(laudoId, contextoVisual) || null;
    }

    function obterContextoVisualLaudoRegistrado(laudoId) {
        return ctx.actions.obterContextoVisualLaudoRegistrado?.(laudoId) || null;
    }

    function lerRetomadaHomePendenteStorage() {
        return ctx.shared.lerRetomadaHomePendenteStorage?.() || null;
    }

    function lerFlagForcaHomeStorage() {
        return !!ctx.shared.lerFlagForcaHomeStorage?.();
    }

    estado.contextoVisualPorLaudo = {};

    function paginaSolicitaHomeLandingViaURL() {
        try {
            const url = new URL(window.location.href);
            return url.searchParams.get("home") === "1" && !url.searchParams.get("laudo");
        } catch (_) {
            return false;
        }
    }

    function obterLaudoIdDaURLInspector() {
        try {
            const valor = new URL(window.location.href).searchParams.get("laudo");
            return normalizarLaudoAtualId(valor);
        } catch (_) {
            return null;
        }
    }

    function obterThreadTabDaURLInspector() {
        try {
            const valor = new URL(window.location.href).searchParams.get("aba");
            return valor ? normalizarThreadTab(valor) : undefined;
        } catch (_) {
            return undefined;
        }
    }

    function obterSnapshotCompatCoreInspector() {
        return InspectorStateSnapshots.obterSnapshotCompatCoreInspector({
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
        });
    }

    function obterSnapshotCompatApiInspector() {
        return InspectorStateSnapshots.obterSnapshotCompatApiInspector({
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
        });
    }

    function obterSnapshotDatasetInspector() {
        return InspectorStateSnapshots.obterSnapshotDatasetInspector({
            body: document.body,
            painelChat: el.painelChat,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarModoInspecaoUI,
            normalizarWorkspaceStage,
            normalizarThreadTab,
            normalizarBooleanoEstado,
            normalizarOverlayOwner,
        });
    }

    function obterSnapshotSSRInspector() {
        return InspectorStateSnapshots.obterSnapshotSSRInspector({
            painelChat: el.painelChat,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarModoInspecaoUI,
            normalizarWorkspaceStage,
        });
    }

    function obterSnapshotStorageInspector() {
        return InspectorStateSnapshots.obterSnapshotStorageInspector({
            normalizarLaudoAtualId,
            obterLaudoIdDaURLInspector,
            obterThreadTabDaURLInspector,
            lerFlagForcaHomeStorage,
            lerRetomadaHomePendenteStorage,
            paginaSolicitaHomeLandingViaURL,
        });
    }

    function obterSnapshotMemoriaInspector() {
        return InspectorStateSnapshots.obterSnapshotMemoriaInspector({
            snapshotEstadoInspector: estado.snapshotEstadoInspector,
            estadoAtual: estado,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarModoInspecaoUI,
            normalizarWorkspaceStage,
            normalizarThreadTab,
            normalizarBooleanoEstado,
            normalizarOverlayOwner,
            retomadaHomePendenteEhValida,
            normalizarRetomadaHomePendenteSeguro,
        });
    }

    function obterSnapshotBootstrapInspector() {
        return InspectorStateSnapshots.obterSnapshotBootstrapInspector({
            obterSnapshotSSRInspector,
            obterSnapshotDatasetInspector,
            obterSnapshotStorageInspector,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarModoInspecaoUI,
            normalizarWorkspaceStage,
            normalizarThreadTab,
            retomadaHomePendenteEhValida,
            normalizarRetomadaHomePendenteSeguro,
        });
    }

    function escolherCampoEstadoInspector(candidatos = [], { fallback = null, aceitarNulo = false } = {}) {
        return InspectorStateSnapshots.escolherCampoEstadoInspector(
            candidatos,
            { fallback, aceitarNulo }
        );
    }

    function registrarDivergenciaEstadoInspector(campo, mapaFontes = {}, valorEscolhido) {
        const entradas = Object.entries(mapaFontes)
            .map(([origem, valor]) => [origem, valor])
            .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "");

        const valoresDistintos = [...new Set(entradas.map(([, valor]) => JSON.stringify(valor)))];
        const divergente = valoresDistintos.length > 1;

        if (!divergente) {
            divergenciasEstadoInspector.delete(campo);
            return false;
        }

        if (!EM_PRODUCAO) {
            const chaveAviso = `${campo}:${valoresDistintos.join("|")}`;
            const agora = Date.now();
            const anterior = divergenciasEstadoInspector.get(campo);

            if (!anterior || anterior.key !== chaveAviso) {
                divergenciasEstadoInspector.set(campo, {
                    key: chaveAviso,
                    count: 1,
                    firstAt: agora,
                    warned: false,
                });
                debugRuntime(`[INSPECTOR_STATE] Divergência transitória detectada em ${campo}.`, {
                    escolhido: valorEscolhido,
                    fontes: mapaFontes,
                });
                return true;
            }

            anterior.count += 1;

            if (!anterior.warned && (anterior.count >= 3 || (agora - anterior.firstAt) >= 1200)) {
                anterior.warned = true;
                logOnceRuntime(`inspector-state:${chaveAviso}`, "warn", `[INSPECTOR_STATE] Divergência persistente em ${campo}.`, {
                    escolhido: valorEscolhido,
                    fontes: mapaFontes,
                    ocorrencias: anterior.count,
                    persistenciaMs: agora - anterior.firstAt,
                });
            }
        }

        return divergente;
    }

    function resolverInspectorBaseScreenPorSnapshot(snapshot = {}) {
        return InspectorStateSnapshots.resolverInspectorBaseScreenPorSnapshot(snapshot);
    }

    function resolverEstadoAutoritativoInspector(overrides = {}) {
        return InspectorStateAuthority.resolverEstadoAutoritativoInspector({
            overrides,
            obterSnapshotMemoriaInspector,
            obterSnapshotCompatCoreInspector,
            obterSnapshotCompatApiInspector,
            obterSnapshotDatasetInspector,
            obterSnapshotSSRInspector,
            obterSnapshotStorageInspector,
            obterSnapshotBootstrapInspector,
            escolherCampoEstadoInspector,
            normalizarLaudoAtualId,
            normalizarEstadoRelatorio,
            normalizarModoInspecaoUI,
            normalizarWorkspaceStage,
            normalizarThreadTab,
            normalizarOverlayOwner,
            normalizarBooleanoEstado,
            normalizarRetomadaHomePendenteSeguro,
            retomadaHomePendenteEhValida,
            estadoRelatorioPossuiContexto,
            resolverInspectorBaseScreenPorSnapshot,
            registrarDivergenciaEstadoInspector,
            paginaSolicitaHomeLandingViaURL,
            modalNovaInspecaoEstaAberta,
        });
    }

    function espelharEstadoInspectorCompat(snapshot = {}) {
        return InspectorStateRuntimeSync.espelharEstadoInspectorCompat(snapshot);
    }

    function espelharEstadoInspectorNoDataset(snapshot = {}) {
        return InspectorStateRuntimeSync.espelharEstadoInspectorNoDataset({
            snapshot,
            body: document.body,
            painelChat: el.painelChat,
            overlayHost: el.overlayHost,
            sincronizarConversationVariantNoDom,
        });
    }

    function espelharEstadoInspectorNoStorage(snapshot = {}, opts = {}) {
        return InspectorStateRuntimeSync.espelharEstadoInspectorNoStorage({
            snapshot,
            opts,
            contextoVisualPorLaudo: estado.contextoVisualPorLaudo,
            persistirContextoVisualLaudosStorage,
            chaveForceHomeLanding: CHAVE_FORCE_HOME_LANDING,
            chaveRetomadaHomePendente: CHAVE_RETOMADA_HOME_PENDENTE,
        });
    }

    function emitirEstadoInspectorSincronizado(snapshot = {}) {
        return InspectorStateRuntimeSync.emitirEstadoInspectorSincronizado({
            snapshot,
            emitirEventoTariel,
        });
    }

    function aplicarSnapshotEstadoInspector(snapshot = {}, opts = {}) {
        return InspectorStateRuntimeSync.aplicarSnapshotEstadoInspector({
            snapshot,
            opts,
            estado,
            setInspectorStateGlobal: (stateSnapshot) => {
                if (window.TarielInspectorState && typeof window.TarielInspectorState === "object") {
                    window.TarielInspectorState.state = stateSnapshot;
                }
            },
            espelharEstadoInspectorNoDataset,
            espelharEstadoInspectorCompat,
            espelharEstadoInspectorNoStorage,
            sincronizandoInspectorScreen,
            syncInspectorScreenRaf,
            cancelAnimationFrameFn: window.cancelAnimationFrame.bind(window),
            requestAnimationFrameFn: window.requestAnimationFrame.bind(window),
            sincronizarInspectorScreen,
            emitirEstadoInspectorSincronizado,
            atualizarSyncInspectorScreenRaf: (valor) => {
                syncInspectorScreenRaf = valor;
            },
        });
    }

    function sincronizarEstadoInspector(overrides = {}, opts = {}) {
        const snapshot = resolverEstadoAutoritativoInspector(overrides);
        return aplicarSnapshotEstadoInspector(snapshot, opts);
    }

    function obterSnapshotEstadoInspectorAtual() {
        return InspectorStateRuntimeSync.obterSnapshotEstadoInspectorAtual({
            snapshotEstadoInspector: estado.snapshotEstadoInspector,
            resolverEstadoAutoritativoInspector,
        });
    }

    window.TarielInspectorState = Object.assign(
        window.TarielInspectorState || {},
        {
            resolverEstadoAutoritativoInspector,
            sincronizarEstadoInspector,
            obterSnapshotEstadoInspectorAtual,
            atualizarThreadWorkspace,
            state: estado.snapshotEstadoInspector ? { ...estado.snapshotEstadoInspector } : null,
        }
    );

    function definirRetomadaHomePendente(payload = null) {
        const snapshot = sincronizarEstadoInspector({
            retomadaHomePendente: payload ? normalizarRetomadaHomePendenteSeguro(payload) : null,
        });

        return snapshot.retomadaHomePendente;
    }

    function obterRetomadaHomePendente() {
        const snapshot = resolverEstadoAutoritativoInspector();
        return snapshot.retomadaHomePendente;
    }

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
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const baseScreen = payload.inspectorBaseScreen || resolverInspectorBaseScreenPorSnapshot(payload);

        return normalizarModoInspecaoUI(payload.modoInspecaoUI) === "workspace"
            && baseScreen === "assistant_landing";
    }

    function conversaNovoChatFocadaAtiva(snapshot = obterSnapshotEstadoInspectorAtual()) {
        if (!normalizarBooleanoEstado(snapshot?.freeChatConversationActive, false)) {
            return false;
        }

        return !obterBaseRealConversaNovoChat(snapshot).pronta;
    }

    function obterTotalMensagensReaisWorkspace(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const totalHistorico = Math.max(
            0,
            Number(
                payload.historyRealCount ??
                estado.historyRealCount ??
                document.body?.dataset?.historyRealCount ??
                0
            ) || 0
        );

        return Math.max(totalHistorico, coletarLinhasWorkspace().length);
    }

    function conversaWorkspaceModoChatAtivo(
        screen = estado.inspectorScreen || resolveInspectorScreen(),
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const screenAtual = screen || payload.inspectorScreen || payload.inspectorBaseScreen || resolveInspectorScreen();
        const workspaceView = resolveWorkspaceView(screenAtual);
        const laudoAtivoId = normalizarLaudoAtualId(
            payload.laudoAtualId ??
            estado.laudoAtualId ??
            obterLaudoAtivoIdSeguro()
        );
        const estadoRelatorio = normalizarEstadoRelatorio(
            payload.estadoRelatorio ??
            estado.estadoRelatorio ??
            obterEstadoRelatorioAtualSeguro()
        );

        if (laudoAtivoId || estadoRelatorioPossuiContexto(estadoRelatorio)) {
            return false;
        }

        return normalizarModoInspecaoUI(payload.modoInspecaoUI) === "workspace"
            && workspaceView === "inspection_conversation"
            && (
                normalizarBooleanoEstado(payload.freeChatConversationActive, false)
                || obterTotalMensagensReaisWorkspace(payload) > 0
            );
    }

    function fluxoNovoChatFocadoAtivoOuPendente(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return conversaNovoChatFocadaAtiva(snapshot)
            || !!normalizarBooleanoEstado(snapshot?.assistantLandingFirstSendPending, false);
    }

    function conversaNovoChatFocadaVisivel(
        screen = estado.inspectorScreen || resolveInspectorScreen(),
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        if (!conversaNovoChatFocadaAtiva(snapshot)) {
            return false;
        }

        return resolveWorkspaceView(screen) === "inspection_conversation";
    }

    function resolverConversationVariant(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const screen = payload.inspectorScreen || payload.inspectorBaseScreen || resolverInspectorBaseScreenPorSnapshot(payload);
        return conversaWorkspaceModoChatAtivo(screen, payload)
            ? "focused"
            : "technical";
    }

    function aplicarConversationVariantElemento(elemento, variant = "technical") {
        if (!elemento) return;
        elemento.dataset.conversationVariant = String(variant || "technical");
    }

    function sincronizarURLConversaFocada(
        variant = "technical",
        snapshot = obterSnapshotEstadoInspectorAtual()
    ) {
        if (variant !== "focused") {
            return;
        }

        try {
            const url = new URL(window.location.href);
            const laudoAtivo = normalizarLaudoAtualId(
                snapshot?.laudoAtualId ??
                obterLaudoAtivoIdSeguro() ??
                estado.laudoAtualId
            );
            const laudoAtualNaURL = url.searchParams.get("laudo") || "";
            const abaAtualNaURL = normalizarThreadTab(url.searchParams.get("aba") || "");

            if (!laudoAtivo && !laudoAtualNaURL && !abaAtualNaURL && !url.searchParams.get("home")) {
                return;
            }

            if (laudoAtivo) {
                url.searchParams.set("laudo", String(laudoAtivo));
                url.searchParams.set("aba", "conversa");
            } else {
                url.searchParams.delete("laudo");
                url.searchParams.delete("aba");
            }
            url.searchParams.delete("home");

            history.replaceState({
                ...(history.state && typeof history.state === "object" ? history.state : {}),
                laudoId: laudoAtivo,
                threadTab: "conversa",
            }, "", url.toString());
        } catch (_) {
            // silêncio intencional
        }
    }

    function sincronizarConversationVariantNoDom(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const variant = resolverConversationVariant(snapshot);

        aplicarConversationVariantElemento(document.body, variant);
        aplicarConversationVariantElemento(el.painelChat, variant);
        aplicarConversationVariantElemento(el.workspaceScreenRoot, variant);
        aplicarConversationVariantElemento(el.workspaceHeader, variant);
        aplicarConversationVariantElemento(el.workspaceConversationViewRoot, variant);
        aplicarConversationVariantElemento(el.chatThreadToolbar, variant);
        aplicarConversationVariantElemento(el.rodapeEntrada, variant);
        aplicarConversationVariantElemento(el.areaMensagens || document.getElementById("area-mensagens"), variant);
        sincronizarURLConversaFocada(variant, snapshot);

        return variant;
    }

    function armarPrimeiroEnvioNovoChatPendente() {
        return InspectorWorkspaceComposer.armarPrimeiroEnvioNovoChatPendente?.(
            obterDependenciasWorkspaceComposer()
        ) || false;
    }

    function limparFluxoNovoChatFocado() {
        const snapshot = obterSnapshotEstadoInspectorAtual();
        if (!snapshot.assistantLandingFirstSendPending && !snapshot.freeChatConversationActive) {
            return false;
        }

        sincronizarEstadoInspector({
            assistantLandingFirstSendPending: false,
            freeChatConversationActive: false,
        }, {
            persistirStorage: false,
        });

        return true;
    }

    function obterBaseRealConversaNovoChat(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const totalMensagensReais = coletarLinhasWorkspace().length;
        const temContextoReal =
            !!normalizarLaudoAtualId(snapshot?.laudoAtualId) ||
            estadoRelatorioPossuiContexto(snapshot?.estadoRelatorio);

        return {
            totalMensagensReais,
            temContextoReal,
            pronta: totalMensagensReais > 0 || temContextoReal,
        };
    }

    function exibirConversaFocadaNovoChat({ tipoTemplate = estado.tipoTemplateAtivo, focarComposer = false } = {}) {
        const tipoNormalizado = normalizarTipoTemplate(tipoTemplate);
        const totalMensagensReais = coletarLinhasWorkspace().length;

        sincronizarResumoHistoricoWorkspace({ totalMensagensReais });
        sincronizarEstadoInspector({
            forceHomeLanding: false,
            modoInspecaoUI: "workspace",
            workspaceStage: "inspection",
            threadTab: "conversa",
            overlayOwner: "",
            assistantLandingFirstSendPending: false,
            freeChatConversationActive: true,
        }, {
            persistirStorage: false,
        });

        atualizarNomeTemplateAtivo(tipoNormalizado);
        atualizarControlesWorkspaceStage();
        atualizarContextoWorkspaceAtivo();
        atualizarThreadWorkspace("conversa");
        renderizarSugestoesComposer();
        atualizarStatusChatWorkspace(estado.chatStatusIA.status, estado.chatStatusIA.texto);

        if (focarComposer) {
            focarComposerInspector();
        }

        return true;
    }

    function promoverPrimeiraMensagemNovoChatSePronta({ forcar = false, focarComposer = false } = {}) {
        const snapshot = obterSnapshotEstadoInspectorAtual();
        if (!fluxoNovoChatFocadoAtivoOuPendente(snapshot)) {
            return false;
        }

        const base = obterBaseRealConversaNovoChat(snapshot);
        if (!forcar && !snapshot.freeChatConversationActive && !base.pronta) {
            return false;
        }

        return exibirConversaFocadaNovoChat({ focarComposer });
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

    function obterSecaoSidebarLaudos(tab) {
        if (tab === "fixados") return document.getElementById("secao-laudos-pinados");
        if (tab === "recentes") return document.getElementById("secao-laudos-historico");
        return null;
    }

    function itemSidebarHistoricoEstaVisivel(item) {
        return !!item && !item.hidden && item.style.display !== "none";
    }

    function contarItensVisiveisSecaoSidebar(secao) {
        if (!secao) return 0;

        return Array.from(secao.querySelectorAll(".item-historico[data-laudo-id]"))
            .filter((item) => itemSidebarHistoricoEstaVisivel(item))
            .length;
    }

    function resolverSidebarLaudosTab(preferida = estado.sidebarLaudosTab) {
        const pinados = contarItensVisiveisSecaoSidebar(obterSecaoSidebarLaudos("fixados"));
        const recentes = contarItensVisiveisSecaoSidebar(obterSecaoSidebarLaudos("recentes"));

        if (preferida === "fixados" && pinados > 0) {
            return {
                ativa: "fixados",
                pinados,
                recentes,
            };
        }

        if (preferida === "recentes" && recentes > 0) {
            return {
                ativa: "recentes",
                pinados,
                recentes,
            };
        }

        if (recentes > 0) {
            return {
                ativa: "recentes",
                pinados,
                recentes,
            };
        }

        if (pinados > 0) {
            return {
                ativa: "fixados",
                pinados,
                recentes,
            };
        }

        return {
            ativa: preferida === "fixados" ? "fixados" : "recentes",
            pinados,
            recentes,
        };
    }

    function obterDependenciasSidebarHistory() {
        return {
            el,
            estado,
            obterSecaoSidebarLaudos,
            resolverSidebarLaudosTab,
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

        const viaApi = window.TarielAPI?.obterHistoricoLaudoAtual?.();
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

        if (papel === "mesa") return "Mesa";
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
            copiarTextoWorkspace,
            coletarLinhasWorkspace,
            el,
            escaparHtml,
            estado,
            mostrarToast,
            normalizarFiltroTipoHistorico,
            obterDetalheLinhaWorkspace,
            obterLaudoAtivoIdSeguro,
            obterPapelLinhaWorkspace,
            obterResumoOperacionalMesa,
            pluralizarChat,
            resumirTexto,
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
        estado.chatBuscaTermo = "";
        estado.chatFiltroTimeline = "todos";
        estado.historyTypeFilter = "todos";

        if (el.chatThreadSearch) {
            el.chatThreadSearch.value = "";
        }

        el.chatFilterButtons.forEach((botao) => {
            const ativo = String(botao.dataset.chatFilter || "") === "todos";
            botao.setAttribute("aria-pressed", ativo ? "true" : "false");
        });

        el.historyTypeFilterButtons.forEach((botao) => {
            const ativo = String(botao.dataset.historyTypeFilter || "") === "todos";
            botao.setAttribute("aria-pressed", ativo ? "true" : "false");
        });
    }

    function obterRotuloFiltroAtorHistoricoWorkspace(filtro = "todos") {
        if (filtro === "inspetor") return "Inspetor";
        if (filtro === "ia") return "IA";
        if (filtro === "mesa") return "Mesa";
        if (filtro === "sistema") return "Sistema";
        return "Todos os atores";
    }

    function obterRotuloFiltroTipoHistoricoWorkspace(filtro = "todos") {
        if (filtro === "mensagens") return "Mensagens";
        if (filtro === "eventos") return "Eventos";
        if (filtro === "anexos") return "Anexos";
        if (filtro === "decisoes") return "Decisões";
        return "Todos os tipos";
    }

    function obterDescricaoFonteHistoricoWorkspace() {
        const canonicosEmEstado = Array.isArray(estado.historyCanonicalItems) ? estado.historyCanonicalItems.length : 0;
        const canonicosViaApi = Array.isArray(window.TarielAPI?.obterHistoricoLaudoAtual?.())
            ? window.TarielAPI.obterHistoricoLaudoAtual().length
            : 0;

        return (canonicosEmEstado > 0 || canonicosViaApi > 0)
            ? "Histórico estruturado"
            : "Registros transitórios";
    }

    function renderizarMetaHistoricoWorkspace({ filteredCount, totalCount } = {}) {
        const totalReal = Math.max(0, Number(totalCount ?? estado.historyRealCount ?? 0) || 0);
        const totalFiltrado = Math.max(0, Number(filteredCount ?? estado.chatResultados ?? totalReal) || 0);
        const filtroAtor = obterRotuloFiltroAtorHistoricoWorkspace(normalizarFiltroChat(estado.chatFiltroTimeline));
        const filtroTipo = obterRotuloFiltroTipoHistoricoWorkspace(normalizarFiltroTipoHistorico(estado.historyTypeFilter));
        const busca = String(estado.chatBuscaTermo || "").trim();
        const partes = [];

        if (filtroAtor !== "Todos os atores") {
            partes.push(filtroAtor);
        }
        if (filtroTipo !== "Todos os tipos") {
            partes.push(filtroTipo);
        }
        if (busca) {
            partes.push(`Busca "${busca}"`);
        }

        if (el.workspaceHistorySource) {
            el.workspaceHistorySource.textContent = obterDescricaoFonteHistoricoWorkspace();
        }
        if (el.workspaceHistoryActiveFilter) {
            el.workspaceHistoryActiveFilter.textContent = partes.length ? partes.join(" • ") : "Todos os registros";
        }
        if (el.workspaceHistoryTotal) {
            el.workspaceHistoryTotal.textContent = `${totalReal} ${pluralizarChat(totalReal, "registro real", "registros reais")}`;
        }
        if (el.chatThreadResults && totalFiltrado > totalReal) {
            el.chatThreadResults.textContent = `${totalReal} ${pluralizarChat(totalReal, "registro", "registros")}`;
        }
    }

    function renderizarResultadosChatWorkspace(total = 0) {
        if (!el.chatThreadResults) return;
        const quantidade = Number(total || 0);
        const tabAtual = normalizarThreadTab(obterSnapshotEstadoInspectorAtual().threadTab);
        if (estado.workspaceStage === "assistant" && quantidade === 0) {
            el.chatThreadResults.textContent = "Nova conversa";
            renderizarMetaHistoricoWorkspace({ filteredCount: quantidade });
            return;
        }
        if (tabAtual === "historico" && Number(estado.historyRealCount || 0) === 0) {
            el.chatThreadResults.textContent = "Histórico vazio";
            renderizarMetaHistoricoWorkspace({ filteredCount: quantidade });
            return;
        }
        el.chatThreadResults.textContent = `${quantidade} ${pluralizarChat(quantidade, "registro", "registros")}`;
        renderizarMetaHistoricoWorkspace({ filteredCount: quantidade });
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
        const termo = String(estado.chatBuscaTermo || "").trim().toLowerCase();
        const filtro = normalizarFiltroChat(estado.chatFiltroTimeline);
        const tipo = normalizarFiltroTipoHistorico(estado.historyTypeFilter);
        const itens = construirItensHistoricoWorkspace();
        const totalLinhasReais = itens.length;
        const filtrados = itens.filter((item) => itemHistoricoWorkspaceAtendeFiltros(item, {
            termo,
            ator: filtro,
            tipo,
        }));

        sincronizarResumoHistoricoWorkspace({
            totalMensagensReais: totalLinhasReais,
        });
        estado.chatResultados = filtrados.length;
        renderizarResultadosChatWorkspace(filtrados.length);
        renderizarHistoricoWorkspace(filtrados, {
            totalMensagensReais: totalLinhasReais,
        });

        const landingAssistenteAtivo = estado.workspaceStage === "assistant" && filtrados.length === 0;
        if (el.workspaceAssistantLanding) {
            el.workspaceAssistantLanding.hidden = !landingAssistenteAtivo;
        }

        atualizarEmptyStateHonestoConversa();
        sincronizarInspectorScreen();
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
        botao.innerHTML = `
            <span class="material-symbols-rounded" aria-hidden="true">${icone}</span>
            <span>${escaparHtml(rotulo)}</span>
        `;
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
            acoes.appendChild(criarBotaoAcaoWorkspace("support_agent", "Mesa", "enviar-mesa", detalhe));
            acoes.appendChild(criarBotaoAcaoWorkspace("keep", "Fixar", "fixar-contexto", detalhe));
            corpo.appendChild(acoes);
        });
    }

    function coletarLinhasWorkspace() {
        return Array.from(document.querySelectorAll("#area-mensagens .linha-mensagem"))
            .filter((linha) => linha.id !== "indicador-digitando");
    }

    function atualizarThreadWorkspace(tab = "conversa", options = {}) {
        const { persistirURL = false, replaceURL = false } = options && typeof options === "object"
            ? options
            : {};
        const tabNormalizada = normalizarThreadTab(tab);

        sincronizarEstadoInspector({
            threadTab: tabNormalizada,
            ...(tabNormalizada !== "conversa"
                ? {
                    assistantLandingFirstSendPending: false,
                    freeChatConversationActive: false,
                }
                : {}),
        }, { persistirStorage: false });

        if (typeof window.TarielChatPainel?.selecionarThreadTab === "function") {
            window.TarielChatPainel.selecionarThreadTab(tabNormalizada, { emit: false });
        }
        if (persistirURL && typeof window.TarielChatPainel?.definirThreadTabNaURL === "function") {
            window.TarielChatPainel.definirThreadTabNaURL(tabNormalizada, {
                replace: replaceURL,
                laudoId: obterLaudoAtivoIdSeguro() || estado.laudoAtualId || null,
            });
        }
        if (el.workspaceAnexosPanel) {
            el.workspaceAnexosPanel.setAttribute(
                "aria-hidden",
                String(tabNormalizada !== "anexos")
            );
        }

        if (tabNormalizada === "anexos") {
            renderizarAnexosWorkspace();
        } else if (tabNormalizada === "historico") {
            filtrarTimelineWorkspace();
        }

        renderizarResumoNavegacaoWorkspace();
        sincronizarInspectorScreen();
        window.requestAnimationFrame(() => {
            atualizarControlesWorkspaceStage();
        });
    }

    function montarDiagnosticoPreviewWorkspace() {
        const diagnosticoAtual = String(window.TarielAPI?.obterUltimoDiagnosticoBruto?.() || "").trim();
        if (diagnosticoAtual) {
            return diagnosticoAtual;
        }

        const linhas = coletarLinhasWorkspace();
        if (!linhas.length) {
            return "";
        }

        const titulo = String(estado.workspaceVisualContext?.title || "Registro Técnico").trim();
        const subtitulo = String(estado.workspaceVisualContext?.subtitle || "").trim();
        const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
        const evidencias = contarEvidenciasWorkspace();
        const blocos = [
            `Registro Técnico: ${titulo}`,
            subtitulo || "Sem subtítulo operacional disponível.",
            `Evidências mapeadas: ${evidencias}`,
            `Pendências abertas: ${pendencias}`,
            "",
            "Resumo auditável da sessão:",
        ];

        linhas.slice(-12).forEach((linha) => {
            const meta = extrairMetaLinhaWorkspace(linha);
            const resumo = String(meta.resumo || "").trim();
            if (!resumo) return;

            const prefixo = [meta.autor, meta.tempo].filter(Boolean).join(" • ");
            blocos.push(`- ${prefixo ? `${prefixo}: ` : ""}${resumo}`);
        });

        return blocos.join("\n").trim();
    }

    async function abrirPreviewWorkspace() {
        return InspectorWorkspaceDeliveryFlow.abrirPreviewWorkspace?.({
            montarDiagnosticoPreviewWorkspace,
            mostrarToast,
            obterLaudoAtivoIdSeguro,
            obterHeadersComCSRF,
            extrairMensagemErroHTTP,
            estado,
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
        return Number(window.TarielAPI?.obterLaudoAtualId?.() || 0) || null;
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

    function obterTokenCsrf() {
        return document.querySelector('meta[name="csrf-token"]')?.content || "";
    }

    function limparEstadoHomeNoCliente() {
        try {
            localStorage.removeItem("tariel_laudo_atual");
        } catch (_) {
            // silêncio intencional
        }

        try {
            const url = new URL(window.location.href);
            url.searchParams.delete("laudo");
            url.searchParams.delete("aba");
            history.replaceState({ laudoId: null, threadTab: null }, "", url.toString());
        } catch (_) {
            // silêncio intencional
        }

        sincronizarEstadoInspector({
            laudoAtualId: null,
            forceHomeLanding: false,
        }, {
            persistirStorage: false,
        });
    }

    async function desativarContextoAtivoParaHome() {
        const laudoAtivo = obterLaudoAtivo();
        const estadoAtual = obterEstadoRelatorioAtualSeguro();

        if (!laudoAtivo && estadoAtual !== "relatorio_ativo") {
            return true;
        }

        try {
            const resposta = await fetch("/app/api/laudo/desativar", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-Token": obterTokenCsrf(),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            return resposta.ok;
        } catch (_) {
            return false;
        }
    }

    function marcarForcaTelaInicial() {
        sincronizarEstadoInspector({ forceHomeLanding: true });
    }

    function paginaSolicitaHomeLanding() {
        const snapshot = obterSnapshotEstadoInspectorAtual();
        return !!snapshot.forceHomeLanding || lerFlagForcaHomeStorage() || paginaSolicitaHomeLandingViaURL();
    }

    function limparForcaTelaInicial() {
        sincronizarEstadoInspector({ forceHomeLanding: false });

        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("home") === "1") {
                url.searchParams.delete("home");
                history.replaceState(history.state || {}, "", url.toString());
            }
        } catch (_) {
            // silêncio intencional
        }
    }

    function homeForcadoAtivo() {
        return !!obterSnapshotEstadoInspectorAtual().forceHomeLanding || paginaSolicitaHomeLandingViaURL();
    }

    function entradaChatLivreDisponivel(snapshot = obterSnapshotEstadoInspectorAtual()) {
        return !normalizarLaudoAtualId(snapshot?.laudoAtualId) && !estadoRelatorioPossuiContexto(snapshot?.estadoRelatorio);
    }

    function origemChatLivreEhPortal(origem = "") {
        return String(origem || "").trim() === "portal-open-chat";
    }

    function resolverDisponibilidadeBotaoChatLivre(botao, snapshot = obterSnapshotEstadoInspectorAtual()) {
        if (!botao) return false;

        if (origemChatLivreEhPortal(botao.dataset.inspectorEntry)) {
            return true;
        }

        return entradaChatLivreDisponivel(snapshot);
    }

    function modoFocoPodePromoverPortalParaChat(snapshot = obterSnapshotEstadoInspectorAtual()) {
        if (!document.body.classList.contains("modo-foco")) {
            return false;
        }

        const screenBase = String(
            snapshot?.inspectorBaseScreen ||
            resolveInspectorBaseScreen()
        ).trim();
        if (screenBase !== "portal_dashboard") {
            return false;
        }

        if (String(snapshot?.overlayOwner || "").trim()) {
            return false;
        }

        const laudoId = normalizarLaudoAtualId(
            snapshot?.laudoAtualId ??
            estado.laudoAtualId ??
            obterLaudoAtivoIdSeguro()
        );
        const estadoRelatorio = normalizarEstadoRelatorio(
            snapshot?.estadoRelatorio ??
            estado.estadoRelatorio ??
            obterEstadoRelatorioAtualSeguro()
        );
        const workspaceStage = normalizarWorkspaceStage(
            snapshot?.workspaceStage ??
            estado.workspaceStage
        );

        return !laudoId
            && !estadoRelatorioPossuiContexto(estadoRelatorio)
            && workspaceStage === "assistant";
    }

    function sincronizarVisibilidadeAcoesChatLivre(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const botoes = Array.isArray(el.botoesAbrirChatLivre) ? el.botoesAbrirChatLivre : [];
        let algumDisponivel = false;

        botoes.forEach((botao) => {
            if (!botao) return;
            const disponivel = resolverDisponibilidadeBotaoChatLivre(botao, snapshot);
            botao.hidden = !disponivel;
            botao.disabled = !disponivel;
            botao.setAttribute("aria-hidden", String(!disponivel));
            algumDisponivel = algumDisponivel || disponivel;
        });

        return algumDisponivel;
    }

    function layoutInspectorCompacto() {
        return window.innerWidth <= BREAKPOINT_LAYOUT_INSPETOR_COMPACTO;
    }

    function resolverMatrizVisibilidadeInspector(screen = resolveInspectorScreen(), snapshot = obterSnapshotEstadoInspectorAtual()) {
        const screenBase = screen === "new_inspection"
            ? (snapshot.inspectorBaseScreen || resolveInspectorBaseScreen())
            : (snapshot.inspectorBaseScreen || screen);
        const overlayAtivo = screen === "new_inspection" || snapshot.overlayOwner === "new_inspection";
        const compacto = layoutInspectorCompacto();
        const portalAtivo = screenBase === "portal_dashboard";
        const assistantAtivo = screenBase === "assistant_landing";
        const inspectionAtivo = [
            "inspection_workspace",
            "inspection_conversation",
            "inspection_history",
            "inspection_record",
            "inspection_mesa",
        ].includes(screenBase);
        const workspaceView = resolveWorkspaceView(screen);
        const laudoAtivoId = normalizarLaudoAtualId(
            snapshot?.laudoAtualId
            ?? estado.laudoAtualId
            ?? obterLaudoAtivoIdSeguro()
        );
        const conversaLivreFocada =
            workspaceView === "inspection_conversation" &&
            conversaWorkspaceModoChatAtivo(screen, snapshot);
        const chatLivreDisponivel = entradaChatLivreDisponivel(snapshot);
        const quickDock = !overlayAtivo && compacto && (
            assistantAtivo ||
            (inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada)
        )
            ? "visible"
            : "hidden";
        const contextRail = inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada && !overlayAtivo && !compacto
            ? "visible"
            : "hidden";
        const mesaEntry = inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada && !overlayAtivo
            ? (compacto ? "composer" : "rail")
            : "hidden";
        const finalizeEntry = inspectionAtivo && workspaceView !== "inspection_mesa" && !overlayAtivo && !!laudoAtivoId
            ? "header"
            : "hidden";
        let novaInspecaoEntry = "hidden";
        if (portalAtivo && !overlayAtivo) {
            novaInspecaoEntry = "portal";
        } else if ((assistantAtivo || inspectionAtivo) && !overlayAtivo) {
            novaInspecaoEntry = "header";
        }

        let abrirChatEntry = "hidden";
        if (portalAtivo && !overlayAtivo) {
            abrirChatEntry = "portal";
        } else if (screen === "new_inspection" && chatLivreDisponivel) {
            abrirChatEntry = "modal";
        }

        return {
            screen,
            screenBase,
            workspaceView,
            overlayAtivo,
            compacto,
            portalAtivo,
            assistantAtivo,
            inspectionAtivo,
            quickDock,
            contextRail,
            mesaWidget: inspectionAtivo && !conversaLivreFocada && !overlayAtivo ? "contextual" : "hidden",
            novaInspecaoEntry,
            abrirChatEntry,
            landingNewInspection: assistantAtivo && !overlayAtivo ? "visible" : "hidden",
            workspaceHeaderNewInspection: (assistantAtivo || inspectionAtivo) && !overlayAtivo ? "visible" : "hidden",
            sidebarNewInspection: "hidden",
            headerFinalize: finalizeEntry === "header" ? "visible" : "hidden",
            railFinalize: finalizeEntry === "rail" ? "visible" : "hidden",
            mesaEntry,
            operationalShortcuts: inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada && !overlayAtivo
                ? "inspection"
                : (assistantAtivo && !overlayAtivo ? "assistant" : "hidden"),
        };
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
        return Boolean(el.modal && !el.modal.hidden && el.modal.classList.contains("ativo"));
    }

    function resolveInspectorBaseScreen() {
        return resolverInspectorBaseScreenPorSnapshot(obterSnapshotEstadoInspectorAtual());
    }

    function definirRootAtivo(root, ativo) {
        if (!root) return;

        const deveAtivar = !!ativo;
        root.dataset.active = deveAtivar ? "true" : "false";
        root.setAttribute("aria-hidden", String(!deveAtivar));

        if (deveAtivar) {
            root.removeAttribute("hidden");
        } else {
            root.setAttribute("hidden", "");
        }

        try {
            root.inert = !deveAtivar;
        } catch (_) {
            if (deveAtivar) {
                root.removeAttribute("inert");
            } else {
                root.setAttribute("inert", "");
            }
        }
    }

    function resolveInspectorScreen() {
        return obterSnapshotEstadoInspectorAtual().inspectorScreen || resolveInspectorBaseScreen();
    }

    function resolveWorkspaceView(screen = estado.inspectorScreen || resolveInspectorScreen()) {
        const snapshot = obterSnapshotEstadoInspectorAtual();
        const screenBase = screen === "new_inspection"
            ? snapshot.inspectorBaseScreen || resolveInspectorBaseScreen()
            : screen;

        if (screenBase === "assistant_landing") {
            return "assistant_landing";
        }

        if ([
            "inspection_conversation",
            "inspection_history",
            "inspection_record",
            "inspection_mesa",
        ].includes(screenBase)) {
            return screenBase;
        }

        if (screenBase !== "inspection_workspace") {
            return "inspection_history";
        }

        const threadTabAtual = normalizarThreadTab(snapshot.threadTab);
        if (threadTabAtual === "anexos") return "inspection_record";
        if (threadTabAtual === "mesa") return "inspection_mesa";
        if (threadTabAtual === "historico") return "inspection_history";
        return "inspection_conversation";
    }

    function workspaceViewSuportaRail(view = resolveWorkspaceView()) {
        return view === "inspection_history"
            || view === "inspection_record"
            || view === "inspection_conversation";
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
        if (screen === "new_inspection") {
            return false;
        }

        const snapshot = obterSnapshotEstadoInspectorAtual();
        if (conversaWorkspaceModoChatAtivo(screen, snapshot)) {
            return false;
        }

        const laudoId = normalizarLaudoAtualId(
            snapshot?.laudoAtualId ??
            estado.laudoAtualId ??
            obterLaudoAtivoIdSeguro()
        );
        if (!laudoId) {
            return false;
        }

        const view = resolveWorkspaceView(screen);
        return [
            "inspection_history",
            "inspection_record",
            "inspection_conversation",
            "inspection_mesa",
        ].includes(view);
    }

    function contextoTecnicoPrecisaRefresh(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const screenBase = snapshot?.inspectorBaseScreen || resolveInspectorBaseScreen();
        return screenBase === "inspection_workspace";
    }

    function contextoPrecisaSSE(snapshot = obterSnapshotEstadoInspectorAtual()) {
        const screenBase = snapshot?.inspectorBaseScreen || resolveInspectorBaseScreen();
        const laudoId = normalizarLaudoAtualId(
            snapshot?.laudoAtualId
            ?? estado.laudoAtualId
            ?? obterLaudoAtivoIdSeguro()
        );

        if (!laudoId) {
            return false;
        }

        return screenBase === "inspection_workspace";
    }

    function sincronizarSSEPorContexto(opcoes = {}) {
        if (!contextoPrecisaSSE()) {
            fecharSSE();
            limparTimerReconexaoSSE();
            PERF?.count?.("inspetor.sse.suprimido_orquestrador", 1, {
                category: "request_churn",
                detail: {
                    laudoId: obterLaudoAtivoIdSeguro(),
                    screen: resolveInspectorBaseScreen(),
                },
            });
            return false;
        }

        inicializarNotificacoesSSE(opcoes);
        return true;
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
        if (!el.painelMesaWidget) return;

        const hostMesaWorkspace = el.workspaceMesaWidgetHost || el.workspaceMesaStage;

        const embutirNoWorkspace =
            mesaWidgetPermitido &&
            view === "inspection_mesa" &&
            hostMesaWorkspace;
        const estavaEmbutido = el.painelMesaWidget.dataset.workspaceEmbedded === "true";

        if (embutirNoWorkspace) {
            if (el.painelMesaWidget.parentElement !== hostMesaWorkspace) {
                hostMesaWorkspace.appendChild(el.painelMesaWidget);
            }

            el.painelMesaWidget.dataset.workspaceEmbedded = "true";
            el.painelMesaWidget.hidden = false;
            el.painelMesaWidget.classList.remove("fechando");
            el.painelMesaWidget.classList.add("aberto", "painel-mesa-widget--workspace");
            estado.mesaWidgetAberto = true;
            if (el.btnMesaWidgetToggle) {
                el.btnMesaWidgetToggle.setAttribute("aria-expanded", "true");
            }
            atualizarEstadoVisualBotaoMesaWidget();

            if (!estavaEmbutido) {
                carregarMensagensMesaWidget({ silencioso: true }).catch(() => {});
            }

            return;
        }

        if (mesaWidgetDockOriginal && el.painelMesaWidget.parentElement !== mesaWidgetDockOriginal) {
            mesaWidgetDockOriginal.appendChild(el.painelMesaWidget);
        }

        el.painelMesaWidget.dataset.workspaceEmbedded = "false";
        el.painelMesaWidget.classList.remove("painel-mesa-widget--workspace");

        if (estavaEmbutido) {
            estado.mesaWidgetAberto = false;
            el.painelMesaWidget.hidden = true;
            el.painelMesaWidget.classList.remove("aberto", "fechando");
            if (el.btnMesaWidgetToggle) {
                el.btnMesaWidgetToggle.setAttribute("aria-expanded", "false");
            }
            atualizarEstadoVisualBotaoMesaWidget();
        }
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

    async function navegarParaHome(destino = "/app/?home=1", { preservarContexto = true } = {}) {
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
        "registerWorkspaceDerivatives",
    ]);

    const noop = () => {};
    const noopAsync = async () => null;
    const noopFalse = () => false;
    const noopNull = () => null;

    function criarResumoMesaPadraoInspetor() {
        return {
            status: "pronta",
            titulo: "Mesa disponível",
            descricao: "",
            chipStatus: "",
            chipPendencias: "",
            chipNaoLidas: "",
        };
    }

    function criarContextoVisualPadraoInspetor() {
        return {
            title: "Assistente Tariel IA",
            subtitle: "Conversa inicial • nenhum laudo ativo",
            statusBadge: "CHAT LIVRE",
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
                title: "Reemissão recomendada",
                detail: "PDF emitido divergente detectado no caso atual.",
                actionLabel: "Abrir reemissão na Mesa",
            }),
            lifecyclePermiteVerificacaoPublicaWorkspace: noopFalse,
            mostrarBannerEngenharia: noop,
            obterModoEntradaSelecionadoModal: () => "auto_recommended",
            obterMensagemMesaPorId: noopNull,
            obterResumoOperacionalMesa: criarResumoMesaPadraoInspetor,
            obterRotuloAcaoFinalizacaoWorkspace: () => "Enviar para Mesa",
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
    window.TarielInspetorRuntime = ctx;
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
        atualizarPainelWorkspaceDerivado,
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
        const proximoStage = normalizarWorkspaceStage(stage);
        sincronizarEstadoInspector({ workspaceStage: proximoStage }, { persistirStorage: false });

        atualizarCopyWorkspaceStage(proximoStage);
        atualizarControlesWorkspaceStage();
    }

    function atualizarContextoWorkspaceAtivo() {
        InspectorWorkspaceStage.atualizarContextoWorkspaceAtivo?.({
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
        InspectorWorkspaceContextFlow.definirModoInspecaoUI?.(modo, {
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
        InspectorWorkspaceContextFlow.exibirInterfaceInspecaoAtiva?.(tipo, {
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

    function exibirLandingAssistenteIA({ limparTimeline = false } = {}) {
        InspectorWorkspaceContextFlow.exibirLandingAssistenteIA?.(
            { limparTimeline },
            {
                definirRetomadaHomePendente,
                limparFluxoNovoChatFocado,
                atualizarEstadoModoEntrada,
                estado,
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

    function abrirChatLivreInspector({ origem = "chat_free_entry" } = {}) {
        return InspectorWorkspaceContextFlow.abrirChatLivreInspector?.(
            { origem },
            {
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
    }

    function promoverPortalParaChatNoModoFoco({ origem = "focus_mode_toggle" } = {}) {
        return InspectorWorkspaceContextFlow.promoverPortalParaChatNoModoFoco?.(
            { origem },
            {
                obterSnapshotEstadoInspectorAtual,
                modoFocoPodePromoverPortalParaChat,
                abrirChatLivreInspector,
            }
        ) || false;
    }

    function restaurarTelaSemRelatorio({ limparTimeline = false } = {}) {
        InspectorWorkspaceContextFlow.restaurarTelaSemRelatorio?.(
            { limparTimeline },
            {
                homeForcadoAtivo,
                resetarInterfaceInspecao,
                exibirLandingAssistenteIA,
            }
        );
    }

    function resetarInterfaceInspecao() {
        InspectorWorkspaceContextFlow.resetarInterfaceInspecao?.({
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
        return InspectorWorkspaceHomeFlow.abrirLaudoPeloHome?.(
            laudoId,
            origem,
            tipoTemplate,
            contextoVisual,
            threadTabPreferida,
            modoEntradaPayload,
            {
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

        const tipoSubmissao = String(tipo || "padrao").trim() || "padrao";
        const tipoNormalizado = normalizarTipoTemplate(runtimeTipoTemplate || tipoSubmissao);
        limparForcaTelaInicial();

        if (!window.TarielAPI?.iniciarRelatorio) {
            mostrarToast("A API do chat ainda não está pronta.", "erro", 3000);
            return null;
        }

        estado.iniciandoInspecao = true;
        definirBotaoIniciarCarregando(true);

        try {
            const respostaBruta = await window.TarielAPI.iniciarRelatorio(tipoSubmissao, {
                dadosFormulario,
                entryModePreference,
            });
            const resposta = enriquecerPayloadLaudoComContextoVisual(
                respostaBruta,
                contextoVisual
            );

            if (!resposta) {
                return null;
            }

            if (modalNovaInspecaoEstaAberta()) {
                fecharNovaInspecaoComScreenSync({ forcar: true, restaurarFoco: false });
            }

            const laudoId = Number(resposta?.laudo_id ?? resposta?.laudoId ?? 0) || null;
            registrarContextoVisualLaudo(laudoId, contextoVisual);
            atualizarEstadoModoEntrada(resposta, { atualizarPadrao: true });
            emitirSincronizacaoLaudo(resposta, { selecionar: true });
            const threadTabInicial = resolverThreadTabInicialPorModoEntrada(resposta, "historico");

            definirRetomadaHomePendente({
                laudoId,
                tipoTemplate: tipoNormalizado,
                contextoVisual: contextoVisual || null,
                expiresAt: Date.now() + 15000,
            });

            if (laudoId) {
                await abrirLaudoPeloHome(
                    laudoId,
                    "new_inspection",
                    tipoNormalizado,
                    contextoVisual || null,
                    threadTabInicial
                );
                return resposta;
            }

            exibirInterfaceInspecaoAtiva(tipoNormalizado);
            return resposta;
        } finally {
            estado.iniciandoInspecao = false;
            definirBotaoIniciarCarregando(false);
        }
    }

    async function finalizarInspecao() {
        return InspectorWorkspaceDeliveryFlow.finalizarInspecao?.({
            estado,
            mostrarToast,
            definirBotaoFinalizarCarregando,
        }) || null;
    }

    // =========================================================
    // HIGHLIGHT / ESTADO VISUAL DO COMPOSER
    // =========================================================

    function obterModoMarcador(texto = "") {
        const valor = String(texto || "").trimStart();

        if (/^@insp\b/i.test(valor)) return "insp";
        if (/^eng\b/i.test(valor) || /^@eng\b/i.test(valor)) return "eng";

        return "";
    }

    function atualizarVisualComposer(texto = "") {
        const modo = obterModoMarcador(texto);

        el.campoMensagem?.classList.toggle("modo-humano-ativo", modo === "insp");
        el.campoMensagem?.classList.toggle("modo-eng-ativo", modo === "eng");

        el.pilulaEntrada?.classList.toggle("estado-insp", modo === "insp");
        el.pilulaEntrada?.classList.toggle("estado-eng", modo === "eng");

        atualizarStatusMesaPorComposer(modo);
    }

    function aplicarHighlightComposer(texto = "") {
        if (el.backdropHighlight) {
            el.backdropHighlight.innerHTML = "";
        }
        atualizarVisualComposer(texto);
    }

    function sincronizarScrollBackdrop() {
        return;
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
        obterEstadoRelatorioAtualSeguro,
        obterLaudoIdDaURLInspector,
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
    function bindEventosModal() {
        ctx.actions.bindEventosNovaInspecao?.();
        ctx.actions.bindUiBindings?.();
    }

    function bindEventosPagina() {
        ctx.actions.bindUiBindings?.();
    }

    function bindEventosSistema() {
        ctx.actions.bindSystemEvents?.();

        const onModoFocoAlterado = (event) => {
            if (event?.detail?.ativo !== true) {
                return;
            }

            promoverPortalParaChatNoModoFoco({ origem: "focus_mode_toggle" });
        };

        document.addEventListener("tariel:focus-mode-changed", onModoFocoAlterado);

        window.addEventListener("pagehide", () => {
            fecharSSE();
            limparTimerReconexaoSSE();
            limparTimerFecharMesaWidget();
            limparTimerBanner();
            cancelarCarregamentoPendenciasMesa();
            cancelarCarregamentoMensagensMesaWidget();
            atualizarConexaoMesaWidget("offline");
            ctx.actions.limparObserversInspector?.();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                fecharSSE();
                limparTimerReconexaoSSE();
                return;
            }

            if (!estado.fonteSSE) {
                limparTimerReconexaoSSE();
                sincronizarSSEPorContexto();
            }

            if (contextoTecnicoPrecisaRefresh()) {
                carregarPendenciasMesa({ silencioso: true }).catch(() => {});
            }
        });
    }

    if (PERF?.enabled) {
        const resolverInspectorBaseScreenPorSnapshotOriginal = resolverInspectorBaseScreenPorSnapshot;
        resolverInspectorBaseScreenPorSnapshot = function resolverInspectorBaseScreenPorSnapshotComPerf(...args) {
            const snapshot = args[0] && typeof args[0] === "object" ? args[0] : {};
            return PERF.measureSync(
                "inspetor.resolverInspectorBaseScreenPorSnapshot",
                () => resolverInspectorBaseScreenPorSnapshotOriginal.apply(this, args),
                {
                    category: "state",
                    detail: {
                        modoInspecaoUI: snapshot.modoInspecaoUI || "",
                        workspaceStage: snapshot.workspaceStage || "",
                        overlayOwner: snapshot.overlayOwner || "",
                    },
                }
            );
        };

        const resolverEstadoAutoritativoInspectorOriginal = resolverEstadoAutoritativoInspector;
        resolverEstadoAutoritativoInspector = function resolverEstadoAutoritativoInspectorComPerf(...args) {
            const overrides = args[0] && typeof args[0] === "object" ? args[0] : {};
            return PERF.measureSync(
                "inspetor.resolverEstadoAutoritativoInspector",
                () => resolverEstadoAutoritativoInspectorOriginal.apply(this, args),
                {
                    category: "state",
                    detail: {
                        overrideKeys: Object.keys(overrides),
                    },
                }
            );
        };

        const espelharEstadoInspectorNoDatasetOriginal = espelharEstadoInspectorNoDataset;
        espelharEstadoInspectorNoDataset = function espelharEstadoInspectorNoDatasetComPerf(...args) {
            const snapshot = args[0] && typeof args[0] === "object" ? args[0] : {};
            PERF.count("inspetor.dataset.sync", 1, {
                category: "counter",
                detail: {
                    screen: snapshot.inspectorScreen || "",
                    baseScreen: snapshot.inspectorBaseScreen || "",
                },
            });
            return PERF.measureSync(
                "inspetor.espelharEstadoInspectorNoDataset",
                () => espelharEstadoInspectorNoDatasetOriginal.apply(this, args),
                {
                    category: "state",
                    detail: {
                        screen: snapshot.inspectorScreen || "",
                        baseScreen: snapshot.inspectorBaseScreen || "",
                    },
                }
            );
        };

        const espelharEstadoInspectorNoStorageOriginal = espelharEstadoInspectorNoStorage;
        espelharEstadoInspectorNoStorage = function espelharEstadoInspectorNoStorageComPerf(...args) {
            const snapshot = args[0] && typeof args[0] === "object" ? args[0] : {};
            const opts = args[1] && typeof args[1] === "object" ? args[1] : {};
            PERF.count("inspetor.storage.sync", 1, {
                category: "counter",
                detail: {
                    persistirStorage: opts.persistirStorage !== false,
                },
            });
            return PERF.measureSync(
                "inspetor.espelharEstadoInspectorNoStorage",
                () => espelharEstadoInspectorNoStorageOriginal.apply(this, args),
                {
                    category: "storage",
                    detail: {
                        laudoAtualId: snapshot.laudoAtualId || null,
                        persistirStorage: opts.persistirStorage !== false,
                    },
                }
            );
        };

        const sincronizarEstadoInspectorOriginal = sincronizarEstadoInspector;
        sincronizarEstadoInspector = function sincronizarEstadoInspectorComPerf(...args) {
            const overrides = args[0] && typeof args[0] === "object" ? args[0] : {};
            const opts = args[1] && typeof args[1] === "object" ? args[1] : {};
            return PERF.measureSync(
                "inspetor.sincronizarEstadoInspector",
                () => {
                    const snapshot = sincronizarEstadoInspectorOriginal.apply(this, args);
                    reportarProntidaoInspector(snapshot);
                    return snapshot;
                },
                {
                    category: "state",
                    detail: {
                        overrideKeys: Object.keys(overrides),
                        persistirStorage: opts.persistirStorage !== false,
                    },
                }
            );
        };

        if (window.TarielInspectorState) {
            window.TarielInspectorState.resolverEstadoAutoritativoInspector = resolverEstadoAutoritativoInspector;
            window.TarielInspectorState.sincronizarEstadoInspector = sincronizarEstadoInspector;
            window.TarielInspectorState.atualizarThreadWorkspace = atualizarThreadWorkspace;
        }

        const exibirConversaFocadaNovoChatOriginal = exibirConversaFocadaNovoChat;
        exibirConversaFocadaNovoChat = function exibirConversaFocadaNovoChatComPerf(...args) {
            return PERF.measureSync(
                "inspetor.exibirConversaFocadaNovoChat",
                () => {
                    const resultado = exibirConversaFocadaNovoChatOriginal.apply(this, args);
                    PERF.finish("transition.primeira_mensagem_novo_chat", obterResumoPerfInspector());
                    reportarProntidaoInspector();
                    PERF.snapshotDOM?.("inspetor:focused-conversation");
                    return resultado;
                },
                {
                    category: "transition",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const promoverPrimeiraMensagemNovoChatSeProntaOriginal = promoverPrimeiraMensagemNovoChatSePronta;
        promoverPrimeiraMensagemNovoChatSePronta = function promoverPrimeiraMensagemNovoChatSeProntaComPerf(...args) {
            const opcoes = args[0] && typeof args[0] === "object" ? args[0] : {};
            return PERF.measureSync(
                "inspetor.promoverPrimeiraMensagemNovoChatSePronta",
                () => promoverPrimeiraMensagemNovoChatSeProntaOriginal.apply(this, args),
                {
                    category: "transition",
                    detail: {
                        forcar: opcoes.forcar === true,
                        focarComposer: opcoes.focarComposer === true,
                        ...obterResumoPerfInspector(),
                    },
                }
            );
        };

        const atualizarPainelWorkspaceDerivadoOriginal = atualizarPainelWorkspaceDerivado;
        atualizarPainelWorkspaceDerivado = function atualizarPainelWorkspaceDerivadoComPerf(...args) {
            return PERF.measureSync(
                "inspetor.atualizarPainelWorkspaceDerivado",
                () => atualizarPainelWorkspaceDerivadoOriginal.apply(this, args),
                {
                    category: "render",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const atualizarThreadWorkspaceOriginal = atualizarThreadWorkspace;
        atualizarThreadWorkspace = function atualizarThreadWorkspaceComPerf(...args) {
            const tab = String(args[0] || "conversa").trim().toLowerCase() || "conversa";
            return PERF.measureSync(
                "inspetor.atualizarThreadWorkspace",
                () => {
                    const resultado = atualizarThreadWorkspaceOriginal.apply(this, args);
                    PERF.finish(`transition.thread_tab.${tab}`, {
                        tab,
                        ...obterResumoPerfInspector(),
                    });
                    reportarProntidaoInspector();
                    return resultado;
                },
                {
                    category: "render",
                    detail: {
                        tab,
                        ...obterResumoPerfInspector(),
                    },
                }
            );
        };

        const aplicarMatrizVisibilidadeInspectorOriginal = aplicarMatrizVisibilidadeInspector;
        aplicarMatrizVisibilidadeInspector = function aplicarMatrizVisibilidadeInspectorComPerf(...args) {
            return PERF.measureSync(
                "inspetor.aplicarMatrizVisibilidadeInspector",
                () => aplicarMatrizVisibilidadeInspectorOriginal.apply(this, args),
                {
                    category: "state",
                    detail: obterResumoPerfInspector(args[1]),
                }
            );
        };

        const resolveInspectorScreenOriginal = resolveInspectorScreen;
        resolveInspectorScreen = function resolveInspectorScreenComPerf(...args) {
            return PERF.measureSync(
                "inspetor.resolveInspectorScreen",
                () => resolveInspectorScreenOriginal.apply(this, args),
                {
                    category: "state",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const sincronizarWorkspaceRailOriginal = sincronizarWorkspaceRail;
        sincronizarWorkspaceRail = function sincronizarWorkspaceRailComPerf(...args) {
            return PERF.measureSync(
                "inspetor.sincronizarWorkspaceRail",
                () => sincronizarWorkspaceRailOriginal.apply(this, args),
                {
                    category: "state",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const sincronizarWidgetsGlobaisWorkspaceOriginal = sincronizarWidgetsGlobaisWorkspace;
        sincronizarWidgetsGlobaisWorkspace = function sincronizarWidgetsGlobaisWorkspaceComPerf(...args) {
            return PERF.measureSync(
                "inspetor.sincronizarWidgetsGlobaisWorkspace",
                () => sincronizarWidgetsGlobaisWorkspaceOriginal.apply(this, args),
                {
                    category: "state",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const sincronizarInspectorScreenOriginal = sincronizarInspectorScreen;
        sincronizarInspectorScreen = function sincronizarInspectorScreenComPerf(...args) {
            return PERF.measureSync(
                "inspetor.sincronizarInspectorScreen",
                () => {
                    const screen = sincronizarInspectorScreenOriginal.apply(this, args);
                    reportarProntidaoInspector();
                    PERF.snapshotDOM?.(`inspetor:screen:${String(screen || "unknown")}`);
                    if (screen === "assistant_landing") {
                        PERF.finish("transition.novo_chat", {
                            ...obterResumoPerfInspector(),
                            screen,
                        });
                    }
                    if (screen === "new_inspection") {
                        PERF.finish("transition.abrir_nova_inspecao", {
                            ...obterResumoPerfInspector(),
                            screen,
                        });
                    }
                    return screen;
                },
                {
                    category: "state",
                    detail: obterResumoPerfInspector(),
                }
            );
        };

        const abrirChatLivreInspectorOriginal = abrirChatLivreInspector;
        abrirChatLivreInspector = function abrirChatLivreInspectorComPerf(...args) {
            const payload = args[0] && typeof args[0] === "object" ? args[0] : {};
            return PERF.measureSync(
                "inspetor.abrirChatLivreInspector",
                () => abrirChatLivreInspectorOriginal.apply(this, args),
                {
                    category: "transition",
                    detail: {
                        origem: payload.origem || "chat_free_entry",
                        ...obterResumoPerfInspector(),
                    },
                }
            );
        };

        const abrirNovaInspecaoComScreenSyncOriginal = abrirNovaInspecaoComScreenSync;
        abrirNovaInspecaoComScreenSync = function abrirNovaInspecaoComScreenSyncComPerf(...args) {
            const payload = args[0] && typeof args[0] === "object" ? args[0] : {};
            return PERF.measureSync(
                "inspetor.abrirNovaInspecaoComScreenSync",
                () => abrirNovaInspecaoComScreenSyncOriginal.apply(this, args),
                {
                    category: "transition",
                    detail: {
                        tipoPrefill: payload.tipoPrefill || "",
                        possuiPrePrompt: !!String(payload.prePrompt || "").trim(),
                        ...obterResumoPerfInspector(),
                    },
                }
            );
        };
    }

    // =========================================================
    // BOOT
    // =========================================================

    async function boot() {
        await ctx.actions.bootInspector?.();
    }

    if (PERF?.enabled) {
        const bootOriginal = boot;
        boot = async function bootComPerf(...args) {
            PERF.begin("transition.boot_inspetor", {
                readyState: document.readyState,
            });
            return PERF.measureAsync(
                "inspetor.boot",
                async () => {
                    const resultado = await bootOriginal.apply(this, args);
                    reportarProntidaoInspector();
                    PERF.finish("transition.boot_inspetor", obterResumoPerfInspector());
                    PERF.snapshotDOM?.("inspetor:boot-final");
                    return resultado;
                },
                {
                    category: "boot",
                    detail: {
                        readyState: document.readyState,
                    },
                }
            );
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
