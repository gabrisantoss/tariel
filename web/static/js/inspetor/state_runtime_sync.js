(function () {
    "use strict";

    function espelharEstadoInspectorCompat(snapshot = {}) {
        const payloadCompat = {
            laudoAtualId: snapshot.laudoAtualId,
            estadoRelatorio: snapshot.estadoRelatorio,
        };

        if (typeof window.TarielChatPainel?.sincronizarEstadoPainel === "function") {
            window.TarielChatPainel.sincronizarEstadoPainel(payloadCompat);
        } else if (window.TarielChatPainel?.state) {
            window.TarielChatPainel.state.laudoAtualId = snapshot.laudoAtualId;
            window.TarielChatPainel.state.estadoRelatorio = snapshot.estadoRelatorio;
        }

        if (typeof window.TarielAPI?.sincronizarEstadoCompat === "function") {
            window.TarielAPI.sincronizarEstadoCompat(payloadCompat);
        }
    }

    function espelharEstadoInspectorNoDataset({
        snapshot = {},
        body = document.body,
        painelChat = null,
        overlayHost = null,
        sincronizarConversationVariantNoDom = () => {},
    }) {
        const divergente = Object.values(snapshot.divergencias || {}).some(Boolean);

        body.dataset.laudoAtualId = snapshot.laudoAtualId ? String(snapshot.laudoAtualId) : "";
        body.dataset.estadoRelatorio = String(snapshot.estadoRelatorio || "sem_relatorio");
        body.dataset.inspecaoUi = String(snapshot.modoInspecaoUI || "workspace");
        body.dataset.workspaceStage = String(snapshot.workspaceStage || "assistant");
        body.dataset.threadTab = String(snapshot.threadTab || "conversa");
        body.dataset.forceHomeLanding = snapshot.forceHomeLanding ? "true" : "false";
        body.dataset.inspectorScreen = String(snapshot.inspectorScreen || "");
        body.dataset.inspectorBaseScreen = String(snapshot.inspectorBaseScreen || "");
        body.dataset.inspectorOverlayOwner = String(snapshot.overlayOwner || "");
        body.dataset.homeActionVisible = snapshot.homeActionVisible ? "true" : "false";
        body.dataset.assistantLandingFirstSendPending = snapshot.assistantLandingFirstSendPending ? "true" : "false";
        body.dataset.freeChatConversationActive = snapshot.freeChatConversationActive ? "true" : "false";
        body.dataset.inspectorStateDivergence = divergente ? "true" : "false";

        if (painelChat) {
            painelChat.dataset.laudoAtualId = snapshot.laudoAtualId ? String(snapshot.laudoAtualId) : "";
            painelChat.dataset.estadoRelatorio = String(snapshot.estadoRelatorio || "sem_relatorio");
            painelChat.dataset.inspecaoUi = String(snapshot.modoInspecaoUI || "workspace");
            painelChat.dataset.workspaceStage = String(snapshot.workspaceStage || "assistant");
            painelChat.dataset.threadTab = String(snapshot.threadTab || "conversa");
            painelChat.dataset.forceHomeLanding = snapshot.forceHomeLanding ? "true" : "false";
            painelChat.dataset.inspectorScreen = String(snapshot.inspectorScreen || "");
            painelChat.dataset.inspectorBaseScreen = String(snapshot.inspectorBaseScreen || "");
            painelChat.dataset.inspectorOverlayOwner = String(snapshot.overlayOwner || "");
            painelChat.dataset.homeActionVisible = snapshot.homeActionVisible ? "true" : "false";
            painelChat.dataset.assistantLandingFirstSendPending = snapshot.assistantLandingFirstSendPending ? "true" : "false";
            painelChat.dataset.freeChatConversationActive = snapshot.freeChatConversationActive ? "true" : "false";
            painelChat.dataset.inspectorStateDivergence = divergente ? "true" : "false";
        }

        if (overlayHost) {
            overlayHost.dataset.inspectorScreen = String(snapshot.inspectorScreen || "");
            overlayHost.dataset.inspectorBaseScreen = String(snapshot.inspectorBaseScreen || "");
            overlayHost.dataset.overlayOwner = String(snapshot.overlayOwner || "");
            overlayHost.dataset.freeChatConversationActive = snapshot.freeChatConversationActive ? "true" : "false";
        }

        sincronizarConversationVariantNoDom(snapshot);
    }

    function espelharEstadoInspectorNoStorage({
        snapshot = {},
        opts = {},
        contextoVisualPorLaudo = {},
        persistirContextoVisualLaudosStorage = () => {},
        chaveForceHomeLanding = "",
        chaveRetomadaHomePendente = "",
    }) {
        const persistirStorage = opts.persistirStorage !== false;
        if (!persistirStorage) return;

        persistirContextoVisualLaudosStorage(contextoVisualPorLaudo);

        try {
            if (snapshot.forceHomeLanding) {
                sessionStorage.setItem(chaveForceHomeLanding, "1");
            } else {
                sessionStorage.removeItem(chaveForceHomeLanding);
            }
        } catch (_) {
            // armazenamento opcional
        }

        try {
            if (snapshot.retomadaHomePendente) {
                sessionStorage.setItem(
                    chaveRetomadaHomePendente,
                    JSON.stringify(snapshot.retomadaHomePendente)
                );
            } else {
                sessionStorage.removeItem(chaveRetomadaHomePendente);
            }
        } catch (_) {
            // armazenamento opcional
        }

        try {
            if (snapshot.laudoAtualId && !snapshot.forceHomeLanding) {
                window.TarielChatPainel?.persistirLaudoAtual?.(snapshot.laudoAtualId);
            } else {
                window.TarielChatPainel?.persistirLaudoAtual?.("");
            }
        } catch (_) {
            // armazenamento opcional
        }
    }

    function emitirEstadoInspectorSincronizado({
        snapshot = {},
        emitirEventoTariel = () => {},
    }) {
        emitirEventoTariel("tariel:inspector-state-sincronizado", {
            snapshot: { ...snapshot },
            laudoAtualId: snapshot.laudoAtualId ?? null,
            estadoRelatorio: snapshot.estadoRelatorio || "sem_relatorio",
            workspaceStage: snapshot.workspaceStage || "assistant",
            threadTab: snapshot.threadTab || "conversa",
            inspectorScreen: snapshot.inspectorScreen || "",
        });
    }

    function aplicarSnapshotEstadoInspector({
        snapshot = {},
        opts = {},
        estado = {},
        setInspectorStateGlobal = () => {},
        espelharEstadoInspectorNoDataset = () => {},
        espelharEstadoInspectorCompat = () => {},
        espelharEstadoInspectorNoStorage = () => {},
        sincronizandoInspectorScreen = false,
        syncInspectorScreenRaf = 0,
        cancelAnimationFrameFn = window.cancelAnimationFrame.bind(window),
        requestAnimationFrameFn = window.requestAnimationFrame.bind(window),
        sincronizarInspectorScreen = () => {},
        emitirEstadoInspectorSincronizado = () => {},
        atualizarSyncInspectorScreenRaf = () => {},
    }) {
        estado.laudoAtualId = snapshot.laudoAtualId;
        estado.estadoRelatorio = snapshot.estadoRelatorio;
        estado.modoInspecaoUI = snapshot.modoInspecaoUI;
        estado.workspaceStage = snapshot.workspaceStage;
        estado.threadTab = snapshot.threadTab;
        estado.forceHomeLanding = !!snapshot.forceHomeLanding;
        estado.overlayOwner = snapshot.overlayOwner;
        estado.assistantLandingFirstSendPending = !!snapshot.assistantLandingFirstSendPending;
        estado.freeChatConversationActive = !!snapshot.freeChatConversationActive;
        estado.inspectorBaseScreen = snapshot.inspectorBaseScreen;
        estado.inspectorScreen = snapshot.inspectorScreen;
        estado.homeActionVisible = !!snapshot.homeActionVisible;
        estado.retomadaHomePendente = snapshot.retomadaHomePendente;
        estado.snapshotEstadoInspector = { ...snapshot };
        estado.snapshotEstadoInspectorOrigem = { ...(snapshot.sources || {}) };
        estado.divergenciasEstadoInspector = { ...(snapshot.divergencias || {}) };
        setInspectorStateGlobal({ ...snapshot });

        espelharEstadoInspectorNoDataset(snapshot);

        if (opts.espelharCompat !== false) {
            espelharEstadoInspectorCompat(snapshot);
        }

        espelharEstadoInspectorNoStorage(snapshot, opts);

        if (opts.syncScreen !== false && !sincronizandoInspectorScreen) {
            if (syncInspectorScreenRaf) {
                cancelAnimationFrameFn(syncInspectorScreenRaf);
            }

            const novoRaf = requestAnimationFrameFn(() => {
                atualizarSyncInspectorScreenRaf(0);
                sincronizarInspectorScreen();
            });
            atualizarSyncInspectorScreenRaf(novoRaf);
        }

        if (opts.emitirEvento !== false) {
            emitirEstadoInspectorSincronizado(snapshot);
        }

        return snapshot;
    }

    function obterSnapshotEstadoInspectorAtual({
        snapshotEstadoInspector = null,
        resolverEstadoAutoritativoInspector = () => ({}),
    }) {
        if (snapshotEstadoInspector) {
            return { ...snapshotEstadoInspector };
        }

        return resolverEstadoAutoritativoInspector();
    }

    window.TarielInspectorStateRuntimeSync = Object.assign(
        window.TarielInspectorStateRuntimeSync || {},
        {
            aplicarSnapshotEstadoInspector,
            emitirEstadoInspectorSincronizado,
            espelharEstadoInspectorCompat,
            espelharEstadoInspectorNoDataset,
            espelharEstadoInspectorNoStorage,
            obterSnapshotEstadoInspectorAtual,
        }
    );
})();
