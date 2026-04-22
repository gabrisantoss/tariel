(function attachTarielInspectorWorkspaceScreen(global) {
    "use strict";

    function aplicarMatrizVisibilidadeInspector(screen, snapshot, dependencies = {}) {
        const matriz = dependencies.resolverMatrizVisibilidadeInspector?.(screen, snapshot) || {};
        const body = dependencies.document?.body || global.document?.body;
        const el = dependencies.el || {};
        const painel = el.painelChat;
        const mesaEntry = matriz.mesaEntry;
        const finalizeEntry = matriz.headerFinalize === "visible"
            ? "header"
            : (matriz.railFinalize === "visible" ? "rail" : "hidden");

        if (body) {
            body.dataset.inspectorCompactLayout = matriz.compacto ? "true" : "false";
            body.dataset.inspectorQuickDock = matriz.quickDock;
            body.dataset.inspectorContextRail = matriz.contextRail;
            body.dataset.inspectorMesaEntry = mesaEntry;
            body.dataset.inspectorMesaWidgetSurface = matriz.mesaWidget;
            body.dataset.inspectorFinalizeEntry = finalizeEntry;
            body.dataset.inspectorNovaInspecaoEntry = matriz.novaInspecaoEntry;
            body.dataset.inspectorAbrirChatEntry = matriz.abrirChatEntry;
            body.dataset.inspectorOperationalShortcuts = matriz.operationalShortcuts;
        }

        if (painel) {
            painel.dataset.inspectorCompactLayout = matriz.compacto ? "true" : "false";
            painel.dataset.inspectorQuickDock = matriz.quickDock;
            painel.dataset.inspectorContextRail = matriz.contextRail;
            painel.dataset.inspectorMesaEntry = mesaEntry;
            painel.dataset.inspectorMesaWidgetSurface = matriz.mesaWidget;
            painel.dataset.inspectorFinalizeEntry = finalizeEntry;
            painel.dataset.inspectorNovaInspecaoEntry = matriz.novaInspecaoEntry;
            painel.dataset.inspectorAbrirChatEntry = matriz.abrirChatEntry;
            painel.dataset.inspectorOperationalShortcuts = matriz.operationalShortcuts;
        }

        if (el.btnSidebarOpenInspecaoModal) {
            const visivel = matriz.sidebarNewInspection === "visible";
            el.btnSidebarOpenInspecaoModal.hidden = !visivel;
            el.btnSidebarOpenInspecaoModal.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnWorkspaceOpenInspecaoModal) {
            const visivel = matriz.workspaceHeaderNewInspection === "visible";
            el.btnWorkspaceOpenInspecaoModal.hidden = !visivel;
            el.btnWorkspaceOpenInspecaoModal.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnAssistantLandingOpenInspecaoModal) {
            const visivel = matriz.landingNewInspection === "visible";
            el.btnAssistantLandingOpenInspecaoModal.hidden = !visivel;
            el.btnAssistantLandingOpenInspecaoModal.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnFinalizarInspecao) {
            const visivel = matriz.headerFinalize === "visible";
            el.btnFinalizarInspecao.hidden = !visivel;
            el.btnFinalizarInspecao.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnRailFinalizarInspecao) {
            const visivel = matriz.railFinalize === "visible";
            el.btnRailFinalizarInspecao.hidden = !visivel;
            el.btnRailFinalizarInspecao.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnMesaWidgetToggle) {
            const visivel = matriz.mesaEntry === "rail";
            el.btnMesaWidgetToggle.hidden = !visivel;
            el.btnMesaWidgetToggle.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnToggleHumano) {
            const visivel = matriz.mesaEntry === "composer";
            el.btnToggleHumano.hidden = !visivel;
            el.btnToggleHumano.setAttribute("aria-hidden", String(!visivel));
        }

        return matriz;
    }

    function sincronizarWidgetsGlobaisWorkspace(screen, dependencies = {}) {
        const {
            document: docRef = global.document,
            estado = {},
            el = {},
            resolveInspectorScreen,
            resolveMesaWidgetDisponibilidade,
            resolveWorkspaceView,
            definirRootAtivo,
            sincronizarMesaStageWorkspace,
            fecharMesaWidget,
            sincronizarClasseBodyMesaWidget,
        } = dependencies;
        const screenAtual = screen || estado.inspectorScreen || resolveInspectorScreen?.();
        const mesaWidgetPermitido = !!resolveMesaWidgetDisponibilidade?.(screenAtual);
        const view = resolveWorkspaceView?.(screenAtual);
        const mesaIncorporada = view === "inspection_mesa";

        if (docRef?.body) {
            docRef.body.dataset.mesaWidgetVisible = mesaWidgetPermitido ? "true" : "false";
        }

        if (el.painelChat) {
            el.painelChat.dataset.mesaWidgetVisible = mesaWidgetPermitido ? "true" : "false";
        }

        if (el.mesaWidgetScreenRoot) {
            el.mesaWidgetScreenRoot.dataset.widgetAllowed = mesaWidgetPermitido ? "true" : "false";
            definirRootAtivo?.(el.mesaWidgetScreenRoot, mesaWidgetPermitido && !mesaIncorporada);
        }

        if (el.painelMesaWidget) {
            el.painelMesaWidget.dataset.widgetAllowed = mesaWidgetPermitido ? "true" : "false";
            const ariaHidden = !mesaWidgetPermitido || el.painelMesaWidget.hidden;
            el.painelMesaWidget.setAttribute("aria-hidden", String(ariaHidden));
        }

        sincronizarMesaStageWorkspace?.(view, mesaWidgetPermitido);

        if (!mesaWidgetPermitido) {
            if (estado.mesaWidgetAberto || !el.painelMesaWidget?.hidden) {
                fecharMesaWidget?.();
            } else if (el.btnMesaWidgetToggle) {
                el.btnMesaWidgetToggle.setAttribute("aria-expanded", "false");
            }
        }

        sincronizarClasseBodyMesaWidget?.();
        return mesaWidgetPermitido;
    }

    function sincronizarWorkspaceViews(screen, dependencies = {}) {
        const {
            document: docRef = global.document,
            estado = {},
            el = {},
            resolveInspectorScreen,
            resolveWorkspaceView,
            conversaWorkspaceModoChatAtivo,
            obterSnapshotEstadoInspectorAtual,
            definirRootAtivo,
            atualizarEmptyStateHonestoConversa,
        } = dependencies;
        const screenAtual = screen || estado.inspectorScreen || resolveInspectorScreen?.();
        const view = resolveWorkspaceView?.(screenAtual);
        const chromeTecnicoVisivel =
            view !== "assistant_landing" &&
            !conversaWorkspaceModoChatAtivo?.(screenAtual, obterSnapshotEstadoInspectorAtual?.());

        definirRootAtivo?.(el.workspaceAssistantViewRoot, view === "assistant_landing");
        definirRootAtivo?.(el.workspaceHistoryViewRoot, view === "inspection_history");
        definirRootAtivo?.(el.workspaceRecordViewRoot, view === "inspection_record");
        definirRootAtivo?.(el.workspaceConversationViewRoot, view === "inspection_conversation");
        definirRootAtivo?.(el.workspaceMesaViewRoot, view === "inspection_mesa");

        if (!el.threadNav) {
            el.threadNav = docRef?.querySelector?.(".thread-nav");
        }

        if (el.threadNav) {
            el.threadNav.hidden = !chromeTecnicoVisivel;
            el.threadNav.setAttribute("aria-hidden", String(!chromeTecnicoVisivel));
        }

        if (el.workspaceHistoryViewRoot) {
            el.workspaceHistoryViewRoot.dataset.historyFocus = view === "inspection_history" ? "reading" : "idle";
        }

        if (el.workspaceHistoryRoot) {
            el.workspaceHistoryRoot.dataset.historyFocus = view === "inspection_history" ? "reading" : "idle";
        }

        if (el.workspaceAnexosPanel) {
            const anexosVisiveis = view === "inspection_record";
            el.workspaceAnexosPanel.hidden = !anexosVisiveis;
            el.workspaceAnexosPanel.setAttribute("aria-hidden", String(!anexosVisiveis));
        }

        atualizarEmptyStateHonestoConversa?.();
        return view;
    }

    function sincronizarInspectorScreen(dependencies = {}) {
        const {
            windowRef = global,
            document: docRef = global.document,
            state = {},
            sincronizarEstadoInspector,
            resolveInspectorBaseScreen,
            definirRootAtivo,
            sincronizarWorkspaceViews,
            sincronizarWorkspaceRail,
            sincronizarWidgetsGlobaisWorkspace,
            sincronizarVisibilidadeAcoesChatLivre,
            aplicarMatrizVisibilidadeInspector,
        } = dependencies;
        if (state.sincronizandoInspectorScreen) {
            state.sincronizacaoInspectorScreenPendente = true;
            return state.estado?.inspectorScreen || resolveInspectorBaseScreen?.();
        }

        state.sincronizandoInspectorScreen = true;

        try {
            const snapshot = sincronizarEstadoInspector?.({}, {
                persistirStorage: false,
                syncScreen: false,
            }) || {};
            const screen = snapshot.inspectorScreen;
            const baseScreen = snapshot.inspectorBaseScreen;
            const workspaceAtivo = baseScreen !== "portal_dashboard";
            const overlayOwner = snapshot.overlayOwner;

            definirRootAtivo?.(state.el?.portalScreenRoot, baseScreen === "portal_dashboard");
            definirRootAtivo?.(state.el?.workspaceScreenRoot, workspaceAtivo);
            sincronizarWorkspaceViews?.(screen);
            const railVisible = !!sincronizarWorkspaceRail?.(screen);
            const mesaWidgetVisible = !!sincronizarWidgetsGlobaisWorkspace?.(screen);
            const chatLivreDisponivel = !!sincronizarVisibilidadeAcoesChatLivre?.(snapshot);
            const matrizVisibilidade = aplicarMatrizVisibilidadeInspector?.(screen, snapshot) || {};

            docRef?.dispatchEvent?.(new CustomEvent("tariel:screen-synced", {
                detail: {
                    screen,
                    baseScreen,
                    overlayOwner,
                    workspaceAtivo,
                    homeActionVisible: !!snapshot.homeActionVisible,
                    chatLivreDisponivel,
                    compactLayout: matrizVisibilidade.compacto,
                    quickDock: matrizVisibilidade.quickDock,
                    contextRail: matrizVisibilidade.contextRail,
                    mesaEntry: matrizVisibilidade.mesaEntry,
                    finalizeEntry: matrizVisibilidade.headerFinalize === "visible" ? "header" : (
                        matrizVisibilidade.railFinalize === "visible" ? "rail" : "hidden"
                    ),
                    novaInspecaoEntry: matrizVisibilidade.novaInspecaoEntry,
                    abrirChatEntry: matrizVisibilidade.abrirChatEntry,
                    railVisible,
                    mesaWidgetVisible,
                },
                bubbles: true,
            }));

            return screen;
        } finally {
            state.sincronizandoInspectorScreen = false;

            if (state.sincronizacaoInspectorScreenPendente) {
                state.sincronizacaoInspectorScreenPendente = false;
                windowRef.requestAnimationFrame(() => {
                    sincronizarInspectorScreen?.();
                });
            }
        }
    }

    global.TarielInspectorWorkspaceScreen = {
        aplicarMatrizVisibilidadeInspector,
        sincronizarWidgetsGlobaisWorkspace,
        sincronizarWorkspaceViews,
        sincronizarInspectorScreen,
    };
})(window);
