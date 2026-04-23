(function attachTarielInspectorWorkspaceRuntimeScreen(global) {
    "use strict";

    function mesaAvaliadoraDisponivelParaUsuario() {
        return global.TARIEL?.hasUserCapability?.("inspector_send_to_mesa", true) ?? true;
    }

    function resolverMatrizVisibilidadeInspector(screen, snapshot = {}, dependencies = {}) {
        const screenBase = screen === "new_inspection"
            ? (snapshot.inspectorBaseScreen || dependencies.resolveInspectorBaseScreen?.())
            : (snapshot.inspectorBaseScreen || screen);
        const overlayAtivo = screen === "new_inspection" || snapshot.overlayOwner === "new_inspection";
        const compacto = !!dependencies.layoutInspectorCompacto?.();
        const portalAtivo = screenBase === "portal_dashboard";
        const assistantAtivo = screenBase === "assistant_landing";
        const inspectionAtivo = [
            "inspection_workspace",
            "inspection_conversation",
            "inspection_history",
            "inspection_record",
            "inspection_mesa",
            "inspection_corrections",
        ].includes(screenBase);
        const workspaceView = dependencies.resolveWorkspaceView?.(screen);
        const laudoAtivoId = dependencies.normalizarLaudoAtualId?.(
            snapshot?.laudoAtualId
            ?? dependencies.estado?.laudoAtualId
            ?? dependencies.obterLaudoAtivoIdSeguro?.()
        );
        const conversaLivreFocada =
            workspaceView === "inspection_conversation" &&
            dependencies.conversaWorkspaceModoChatAtivo?.(screen, snapshot);
        const chatLivreDisponivel = dependencies.entradaChatLivreDisponivel?.(snapshot);
        const mesaDisponivel = mesaAvaliadoraDisponivelParaUsuario();
        const quickDock = !overlayAtivo && compacto && (
            assistantAtivo ||
            (inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada)
        )
            ? "visible"
            : "hidden";
        const contextRail = inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada && !overlayAtivo && !compacto
            ? "visible"
            : "hidden";
        const mesaEntry = mesaDisponivel && inspectionAtivo && workspaceView !== "inspection_mesa" && !conversaLivreFocada && !overlayAtivo
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
            mesaWidget: mesaDisponivel && inspectionAtivo && !conversaLivreFocada && !overlayAtivo ? "contextual" : "hidden",
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

    function modalNovaInspecaoEstaAberta(dependencies = {}) {
        const modal = dependencies.el?.modal;
        return Boolean(modal && !modal.hidden && modal.classList.contains("ativo"));
    }

    function resolveInspectorBaseScreen(dependencies = {}) {
        return dependencies.resolverInspectorBaseScreenPorSnapshot?.(
            dependencies.obterSnapshotEstadoInspectorAtual?.()
        );
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

    function resolveInspectorScreen(dependencies = {}) {
        return dependencies.obterSnapshotEstadoInspectorAtual?.().inspectorScreen
            || dependencies.resolveInspectorBaseScreen?.();
    }

    function resolveWorkspaceView(screen, dependencies = {}) {
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.() || {};
        const screenBase = screen === "new_inspection"
            ? snapshot.inspectorBaseScreen || dependencies.resolveInspectorBaseScreen?.()
            : screen;

        if (screenBase === "assistant_landing") {
            return "assistant_landing";
        }

        if ([
            "inspection_conversation",
            "inspection_history",
            "inspection_record",
            "inspection_mesa",
            "inspection_corrections",
        ].includes(screenBase)) {
            return screenBase;
        }

        if (screenBase !== "inspection_workspace") {
            return "inspection_conversation";
        }

        const threadTabAtual = dependencies.normalizarThreadTab?.(snapshot.threadTab);
        if (threadTabAtual === "anexos") return "inspection_record";
        if (threadTabAtual === "correcoes") return "inspection_corrections";
        if (threadTabAtual === "mesa") {
            return mesaAvaliadoraDisponivelParaUsuario() ? "inspection_mesa" : "inspection_corrections";
        }
        if (threadTabAtual === "historico") return "inspection_conversation";
        return "inspection_conversation";
    }

    function workspaceViewSuportaRail(view) {
        if (view === "assistant_landing") {
            return true;
        }
        return view === "inspection_history"
            || view === "inspection_record"
            || view === "inspection_conversation";
    }

    function contextoTecnicoPrecisaRefresh(snapshot = {}, dependencies = {}) {
        const screenBase = snapshot?.inspectorBaseScreen || dependencies.resolveInspectorBaseScreen?.();
        return screenBase === "inspection_workspace";
    }

    function contextoPrecisaSSE(snapshot = {}, dependencies = {}) {
        const screenBase = snapshot?.inspectorBaseScreen || dependencies.resolveInspectorBaseScreen?.();
        const laudoId = dependencies.normalizarLaudoAtualId?.(
            snapshot?.laudoAtualId
            ?? dependencies.estado?.laudoAtualId
            ?? dependencies.obterLaudoAtivoIdSeguro?.()
        );
        if (!laudoId) {
            return false;
        }
        return screenBase === "inspection_workspace";
    }

    function sincronizarSSEPorContexto(opcoes = {}, dependencies = {}) {
        if (!dependencies.contextoPrecisaSSE?.()) {
            dependencies.fecharSSE?.();
            dependencies.limparTimerReconexaoSSE?.();
            dependencies.PERF?.count?.("inspetor.sse.suprimido_orquestrador", 1, {
                category: "request_churn",
                detail: {
                    laudoId: dependencies.obterLaudoAtivoIdSeguro?.(),
                    screen: dependencies.resolveInspectorBaseScreen?.(),
                },
            });
            return false;
        }

        dependencies.inicializarNotificacoesSSE?.(opcoes);
        return true;
    }

    function entradaChatLivreDisponivel(snapshot = {}, dependencies = {}) {
        return !dependencies.normalizarLaudoAtualId?.(snapshot?.laudoAtualId)
            && !dependencies.estadoRelatorioPossuiContexto?.(snapshot?.estadoRelatorio);
    }

    function origemChatLivreEhPortal(origem = "") {
        return String(origem || "").trim() === "portal-open-chat";
    }

    function resolverDisponibilidadeBotaoChatLivre(botao, snapshot = {}, dependencies = {}) {
        if (!botao) return false;

        if (origemChatLivreEhPortal(botao.dataset?.inspectorEntry)) {
            return true;
        }

        return entradaChatLivreDisponivel(snapshot, dependencies);
    }

    function modoFocoPodePromoverPortalParaChat(snapshot = {}, dependencies = {}) {
        const documentRef = dependencies.document || global.document;
        if (!documentRef?.body?.classList?.contains("modo-foco")) {
            return false;
        }

        const screenBase = String(
            snapshot?.inspectorBaseScreen || dependencies.resolveInspectorBaseScreen?.()
        ).trim();
        if (screenBase !== "portal_dashboard") {
            return false;
        }

        if (String(snapshot?.overlayOwner || "").trim()) {
            return false;
        }

        const laudoId = dependencies.normalizarLaudoAtualId?.(
            snapshot?.laudoAtualId
            ?? dependencies.estado?.laudoAtualId
            ?? dependencies.obterLaudoAtivoIdSeguro?.()
        );
        const estadoRelatorio = dependencies.normalizarEstadoRelatorio?.(
            snapshot?.estadoRelatorio
            ?? dependencies.estado?.estadoRelatorio
            ?? dependencies.obterEstadoRelatorioAtualSeguro?.()
        );
        const workspaceStage = dependencies.normalizarWorkspaceStage?.(
            snapshot?.workspaceStage
            ?? dependencies.estado?.workspaceStage
        );

        return !laudoId
            && !dependencies.estadoRelatorioPossuiContexto?.(estadoRelatorio)
            && workspaceStage === "assistant";
    }

    function sincronizarVisibilidadeAcoesChatLivre(snapshot = {}, dependencies = {}) {
        const botoes = Array.isArray(dependencies.el?.botoesAbrirChatLivre)
            ? dependencies.el.botoesAbrirChatLivre
            : [];
        let algumDisponivel = false;

        botoes.forEach((botao) => {
            if (!botao) return;
            const disponivel = resolverDisponibilidadeBotaoChatLivre(botao, snapshot, dependencies);
            botao.hidden = !disponivel;
            botao.disabled = !disponivel;
            botao.setAttribute("aria-hidden", String(!disponivel));
            algumDisponivel = algumDisponivel || disponivel;
        });

        return algumDisponivel;
    }

    global.TarielInspectorWorkspaceRuntimeScreen = {
        contextoPrecisaSSE,
        contextoTecnicoPrecisaRefresh,
        definirRootAtivo,
        entradaChatLivreDisponivel,
        modalNovaInspecaoEstaAberta,
        modoFocoPodePromoverPortalParaChat,
        origemChatLivreEhPortal,
        resolveInspectorBaseScreen,
        resolveInspectorScreen,
        resolveWorkspaceView,
        resolverDisponibilidadeBotaoChatLivre,
        resolverMatrizVisibilidadeInspector,
        sincronizarVisibilidadeAcoesChatLivre,
        sincronizarSSEPorContexto,
        workspaceViewSuportaRail,
    };
})(window);
