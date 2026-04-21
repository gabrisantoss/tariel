(function () {
    "use strict";

    function obterSnapshotCompatCoreInspector({
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
    }) {
        const legado = window.TarielChatPainel?.state || {};

        return {
            laudoAtualId: normalizarLaudoAtualId(legado.laudoAtualId),
            estadoRelatorio: normalizarEstadoRelatorio(
                legado.estadoRelatorio ?? "sem_relatorio"
            ),
        };
    }

    function obterSnapshotCompatApiInspector({
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
    }) {
        const snapshot = window.TarielAPI?.obterSnapshotEstadoCompat?.();

        return {
            laudoAtualId: normalizarLaudoAtualId(
                snapshot?.laudoAtualId ?? null
            ),
            estadoRelatorio: normalizarEstadoRelatorio(
                snapshot?.estadoRelatorio ?? "sem_relatorio"
            ),
        };
    }

    function obterSnapshotDatasetInspector({
        body = document.body,
        painelChat = null,
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
        normalizarModoInspecaoUI,
        normalizarWorkspaceStage,
        normalizarThreadTab,
        normalizarBooleanoEstado,
        normalizarOverlayOwner,
    }) {
        return {
            laudoAtualId: normalizarLaudoAtualId(
                painelChat?.dataset?.laudoAtualId ??
                body?.dataset?.laudoAtualId ??
                null
            ),
            estadoRelatorio: normalizarEstadoRelatorio(
                painelChat?.dataset?.estadoRelatorio ??
                body?.dataset?.estadoRelatorio ??
                "sem_relatorio"
            ),
            modoInspecaoUI: normalizarModoInspecaoUI(
                painelChat?.dataset?.inspecaoUi ??
                body?.dataset?.inspecaoUi ??
                "workspace"
            ),
            workspaceStage: normalizarWorkspaceStage(
                painelChat?.dataset?.workspaceStage ??
                body?.dataset?.workspaceStage ??
                "assistant"
            ),
            threadTab: normalizarThreadTab(
                body?.dataset?.threadTab ??
                painelChat?.dataset?.threadTab ??
                "conversa"
            ),
            forceHomeLanding: normalizarBooleanoEstado(body?.dataset?.forceHomeLanding, false),
            overlayOwner: normalizarOverlayOwner(
                body?.dataset?.inspectorOverlayOwner ??
                body?.dataset?.overlayOwner ??
                painelChat?.dataset?.inspectorOverlayOwner ??
                ""
            ),
            assistantLandingFirstSendPending: normalizarBooleanoEstado(
                painelChat?.dataset?.assistantLandingFirstSendPending ??
                body?.dataset?.assistantLandingFirstSendPending,
                false
            ),
            freeChatConversationActive: normalizarBooleanoEstado(
                painelChat?.dataset?.freeChatConversationActive ??
                body?.dataset?.freeChatConversationActive,
                false
            ),
        };
    }

    function obterSnapshotSSRInspector({
        painelChat = null,
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
        normalizarModoInspecaoUI,
        normalizarWorkspaceStage,
    }) {
        return {
            laudoAtualId: normalizarLaudoAtualId(
                window.TARIEL?.laudoAtivoId ??
                painelChat?.dataset?.laudoAtualId ??
                null
            ),
            estadoRelatorio: normalizarEstadoRelatorio(
                window.TARIEL?.estadoRelatorio ??
                painelChat?.dataset?.estadoRelatorio ??
                "sem_relatorio"
            ),
            modoInspecaoUI: normalizarModoInspecaoUI(
                painelChat?.dataset?.inspecaoUi ?? "workspace"
            ),
            workspaceStage: normalizarWorkspaceStage(
                painelChat?.dataset?.workspaceStage ?? "assistant"
            ),
            inspectorScreen: String(painelChat?.dataset?.inspectorScreen || "").trim().toLowerCase(),
        };
    }

    function obterSnapshotStorageInspector({
        normalizarLaudoAtualId,
        obterLaudoIdDaURLInspector,
        obterThreadTabDaURLInspector,
        lerFlagForcaHomeStorage,
        lerRetomadaHomePendenteStorage,
        paginaSolicitaHomeLandingViaURL,
    }) {
        return {
            laudoAtualId: normalizarLaudoAtualId(
                window.TarielChatPainel?.obterLaudoPersistido?.()
            ),
            urlLaudoAtualId: obterLaudoIdDaURLInspector(),
            urlThreadTab: obterThreadTabDaURLInspector(),
            forceHomeLanding: lerFlagForcaHomeStorage() || paginaSolicitaHomeLandingViaURL(),
            retomadaHomePendente: lerRetomadaHomePendenteStorage(),
        };
    }

    function obterSnapshotMemoriaInspector({
        snapshotEstadoInspector = null,
        estadoAtual = {},
        normalizarLaudoAtualId,
        normalizarEstadoRelatorio,
        normalizarModoInspecaoUI,
        normalizarWorkspaceStage,
        normalizarThreadTab,
        normalizarBooleanoEstado,
        normalizarOverlayOwner,
        retomadaHomePendenteEhValida,
        normalizarRetomadaHomePendenteSeguro,
    }) {
        const snapshot =
            snapshotEstadoInspector && typeof snapshotEstadoInspector === "object"
                ? snapshotEstadoInspector
                : null;
        if (!snapshot) return null;

        return {
            laudoAtualId: normalizarLaudoAtualId(snapshot.laudoAtualId),
            estadoRelatorio: normalizarEstadoRelatorio(snapshot.estadoRelatorio ?? "sem_relatorio"),
            modoInspecaoUI: normalizarModoInspecaoUI(snapshot.modoInspecaoUI ?? estadoAtual.modoInspecaoUI),
            workspaceStage: normalizarWorkspaceStage(snapshot.workspaceStage ?? estadoAtual.workspaceStage),
            threadTab: normalizarThreadTab(snapshot.threadTab ?? estadoAtual.threadTab),
            forceHomeLanding: normalizarBooleanoEstado(snapshot.forceHomeLanding, false),
            overlayOwner: normalizarOverlayOwner(snapshot.overlayOwner),
            assistantLandingFirstSendPending: normalizarBooleanoEstado(
                snapshot.assistantLandingFirstSendPending,
                false
            ),
            freeChatConversationActive: normalizarBooleanoEstado(
                snapshot.freeChatConversationActive,
                false
            ),
            retomadaHomePendente: retomadaHomePendenteEhValida(snapshot.retomadaHomePendente)
                ? normalizarRetomadaHomePendenteSeguro(snapshot.retomadaHomePendente)
                : null,
        };
    }

    function obterSnapshotBootstrapInspector({
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
    }) {
        const ssr = obterSnapshotSSRInspector();
        const dataset = obterSnapshotDatasetInspector();
        const storage = obterSnapshotStorageInspector();

        return {
            laudoAtualId: normalizarLaudoAtualId(
                ssr.laudoAtualId ??
                dataset.laudoAtualId ??
                storage.urlLaudoAtualId ??
                storage.laudoAtualId ??
                null
            ),
            estadoRelatorio: normalizarEstadoRelatorio(
                ssr.estadoRelatorio ??
                dataset.estadoRelatorio ??
                "sem_relatorio"
            ),
            modoInspecaoUI: normalizarModoInspecaoUI(
                ssr.modoInspecaoUI ??
                dataset.modoInspecaoUI ??
                "workspace"
            ),
            workspaceStage: normalizarWorkspaceStage(
                ssr.workspaceStage ??
                dataset.workspaceStage ??
                "assistant"
            ),
            threadTab: normalizarThreadTab(
                storage.urlThreadTab ??
                dataset.threadTab ??
                "conversa"
            ),
            forceHomeLanding: !!(dataset.forceHomeLanding || storage.forceHomeLanding),
            overlayOwner: dataset.overlayOwner,
            assistantLandingFirstSendPending: !!dataset.assistantLandingFirstSendPending,
            freeChatConversationActive: !!dataset.freeChatConversationActive,
            retomadaHomePendente: retomadaHomePendenteEhValida(storage.retomadaHomePendente)
                ? normalizarRetomadaHomePendenteSeguro(storage.retomadaHomePendente)
                : null,
        };
    }

    function escolherCampoEstadoInspector(candidatos = [], { fallback = null, aceitarNulo = false } = {}) {
        for (const candidato of candidatos) {
            if (!candidato || !Object.prototype.hasOwnProperty.call(candidato, "value")) {
                continue;
            }

            const valor = candidato.value;
            if (valor === undefined) continue;
            if (valor === null && !aceitarNulo) continue;

            return {
                value: valor,
                source: String(candidato.source || "desconhecido"),
            };
        }

        return {
            value: fallback,
            source: "fallback",
        };
    }

    function resolverInspectorBaseScreenPorSnapshot(snapshot = {}) {
        if (snapshot.modoInspecaoUI === "home") {
            return "portal_dashboard";
        }

        if (snapshot.workspaceStage === "assistant") {
            return "assistant_landing";
        }

        return "inspection_workspace";
    }

    window.TarielInspectorStateSnapshots = Object.assign(
        window.TarielInspectorStateSnapshots || {},
        {
            escolherCampoEstadoInspector,
            obterSnapshotBootstrapInspector,
            obterSnapshotCompatApiInspector,
            obterSnapshotCompatCoreInspector,
            obterSnapshotDatasetInspector,
            obterSnapshotMemoriaInspector,
            obterSnapshotSSRInspector,
            obterSnapshotStorageInspector,
            resolverInspectorBaseScreenPorSnapshot,
        }
    );
})();
