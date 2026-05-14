(function () {
    "use strict";

    function resolverEstadoAutoritativoInspector({
        overrides = {},
        obterSnapshotMemoriaInspector = () => null,
        obterSnapshotCompatCoreInspector = () => ({}),
        obterSnapshotCompatApiInspector = () => ({}),
        obterSnapshotDatasetInspector = () => ({}),
        obterSnapshotSSRInspector = () => ({}),
        obterSnapshotStorageInspector = () => ({}),
        obterSnapshotBootstrapInspector = () => ({}),
        escolherCampoEstadoInspector = () => ({ value: null, source: "fallback" }),
        normalizarLaudoAtualId = (valor) => valor,
        normalizarEstadoRelatorio = (valor) => valor,
        normalizarModoInspecaoUI = (valor) => valor,
        normalizarWorkspaceStage = (valor) => valor,
        normalizarThreadTab = (valor) => valor,
        normalizarOverlayOwner = (valor) => valor,
        normalizarBooleanoEstado = (valor) => !!valor,
        normalizarRetomadaHomePendenteSeguro = (valor) => valor,
        retomadaHomePendenteEhValida = () => false,
        estadoRelatorioPossuiContexto = () => false,
        resolverInspectorBaseScreenPorSnapshot = () => "assistant_landing",
        registrarDivergenciaEstadoInspector = () => false,
        paginaSolicitaHomeLandingViaURL = () => false,
        modalNovaInspecaoEstaAberta = () => false,
    }) {
        const payload = overrides && typeof overrides === "object" ? overrides : {};
        const memoria = obterSnapshotMemoriaInspector();
        const core = obterSnapshotCompatCoreInspector();
        const api = obterSnapshotCompatApiInspector();
        const dataset = obterSnapshotDatasetInspector();
        const ssr = obterSnapshotSSRInspector();
        const storage = obterSnapshotStorageInspector();
        const bootstrap = memoria || obterSnapshotBootstrapInspector();
        const autoridadeDisponivel = !!memoria;

        const urlLaudoAtualId = normalizarLaudoAtualId(storage.urlLaudoAtualId);
        let forceHomeLandingInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "forceHomeLanding")
                    ? normalizarBooleanoEstado(payload.forceHomeLanding, false)
                    : undefined,
            },
            { source: "memory", value: memoria?.forceHomeLanding },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.forceHomeLanding },
            { source: "storage", value: autoridadeDisponivel ? undefined : storage.forceHomeLanding },
            { source: "bootstrap", value: bootstrap.forceHomeLanding },
        ], { fallback: false });

        if (
            !Object.prototype.hasOwnProperty.call(payload, "forceHomeLanding")
            && urlLaudoAtualId
            && !paginaSolicitaHomeLandingViaURL()
        ) {
            forceHomeLandingInfo = {
                value: false,
                source: "url-laudo",
            };
        }

        const ignorarRetomadaPersistidaLaudo = !!forceHomeLandingInfo.value
            && !Object.prototype.hasOwnProperty.call(payload, "laudoAtualId");

        const laudoInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "laudoAtualId")
                    ? normalizarLaudoAtualId(payload.laudoAtualId)
                    : undefined,
            },
            { source: "memory", value: memoria?.laudoAtualId },
            { source: "ssr", value: autoridadeDisponivel ? undefined : ssr.laudoAtualId },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.laudoAtualId },
            {
                source: "url",
                value: (autoridadeDisponivel || ignorarRetomadaPersistidaLaudo)
                    ? undefined
                    : storage.urlLaudoAtualId,
            },
            {
                source: "storage",
                value: (autoridadeDisponivel || ignorarRetomadaPersistidaLaudo)
                    ? undefined
                    : storage.laudoAtualId,
            },
            {
                source: "bootstrap",
                value: ignorarRetomadaPersistidaLaudo
                    ? undefined
                    : bootstrap.laudoAtualId,
            },
        ], { fallback: null, aceitarNulo: true });

        const estadoRelatorioInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "estadoRelatorio")
                    ? normalizarEstadoRelatorio(payload.estadoRelatorio)
                    : undefined,
            },
            { source: "memory", value: memoria?.estadoRelatorio },
            { source: "ssr", value: autoridadeDisponivel ? undefined : ssr.estadoRelatorio },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.estadoRelatorio },
            { source: "bootstrap", value: bootstrap.estadoRelatorio },
        ], { fallback: "sem_relatorio" });

        let modoInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "modoInspecaoUI")
                    ? normalizarModoInspecaoUI(payload.modoInspecaoUI)
                    : undefined,
            },
            { source: "memory", value: memoria?.modoInspecaoUI },
            { source: "ssr", value: autoridadeDisponivel ? undefined : ssr.modoInspecaoUI },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.modoInspecaoUI },
            { source: "bootstrap", value: bootstrap.modoInspecaoUI },
        ], { fallback: "workspace" });

        if (!Object.prototype.hasOwnProperty.call(payload, "modoInspecaoUI") && forceHomeLandingInfo.value) {
            modoInfo = { value: "home", source: "forceHomeLanding" };
        }

        if (
            !Object.prototype.hasOwnProperty.call(payload, "modoInspecaoUI")
            && urlLaudoAtualId
            && !forceHomeLandingInfo.value
        ) {
            modoInfo = { value: "workspace", source: "url-laudo" };
        }

        const freeChatConversationActiveInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "freeChatConversationActive")
                    ? normalizarBooleanoEstado(payload.freeChatConversationActive, false)
                    : undefined,
            },
            { source: "memory", value: memoria?.freeChatConversationActive },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.freeChatConversationActive },
            { source: "bootstrap", value: bootstrap.freeChatConversationActive },
        ], { fallback: false });

        const workspaceStageDerivado = (
            estadoRelatorioPossuiContexto(estadoRelatorioInfo.value)
            || !!laudoInfo.value
            || !!freeChatConversationActiveInfo.value
        )
            ? "inspection"
            : "assistant";

        let workspaceStageInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "workspaceStage")
                    ? normalizarWorkspaceStage(payload.workspaceStage)
                    : undefined,
            },
            { source: "memory", value: memoria?.workspaceStage },
            { source: "ssr", value: autoridadeDisponivel ? undefined : ssr.workspaceStage },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.workspaceStage },
            { source: "bootstrap", value: bootstrap.workspaceStage },
            { source: "derived", value: workspaceStageDerivado },
        ], { fallback: "assistant" });

        if (
            !Object.prototype.hasOwnProperty.call(payload, "workspaceStage") &&
            modoInfo.value !== "home" &&
            workspaceStageInfo.value !== "inspection" &&
            workspaceStageDerivado === "inspection"
        ) {
            workspaceStageInfo = {
                value: "inspection",
                source: "derived-context",
            };
        }

        if (
            !Object.prototype.hasOwnProperty.call(payload, "workspaceStage") &&
            modoInfo.value === "home"
        ) {
            workspaceStageInfo = { value: "assistant", source: "home-mode" };
        }

        const threadTabInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "threadTab")
                    ? normalizarThreadTab(payload.threadTab)
                    : undefined,
            },
            { source: "memory", value: memoria?.threadTab },
            { source: "url", value: storage.urlThreadTab },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.threadTab },
            { source: "bootstrap", value: bootstrap.threadTab },
        ], { fallback: "conversa" });

        if (
            !Object.prototype.hasOwnProperty.call(payload, "threadTab") &&
            workspaceStageInfo.value !== "inspection"
        ) {
            threadTabInfo.value = "conversa";
            threadTabInfo.source = "assistant-stage";
        }

        const overlayOwnerInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "overlayOwner")
                    ? normalizarOverlayOwner(payload.overlayOwner)
                    : undefined,
            },
            {
                source: "modal",
                value: modalNovaInspecaoEstaAberta() ? "new_inspection" : undefined,
            },
            { source: "memory", value: memoria?.overlayOwner },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.overlayOwner },
            { source: "bootstrap", value: bootstrap.overlayOwner },
        ], { fallback: "", aceitarNulo: true });

        const assistantLandingFirstSendPendingInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "assistantLandingFirstSendPending")
                    ? normalizarBooleanoEstado(payload.assistantLandingFirstSendPending, false)
                    : undefined,
            },
            { source: "memory", value: memoria?.assistantLandingFirstSendPending },
            { source: "dataset", value: autoridadeDisponivel ? undefined : dataset.assistantLandingFirstSendPending },
            { source: "bootstrap", value: bootstrap.assistantLandingFirstSendPending },
        ], { fallback: false });

        const retomadaInfo = escolherCampoEstadoInspector([
            {
                source: "override",
                value: Object.prototype.hasOwnProperty.call(payload, "retomadaHomePendente")
                    ? normalizarRetomadaHomePendenteSeguro(payload.retomadaHomePendente)
                    : undefined,
            },
            {
                source: "memory",
                value: retomadaHomePendenteEhValida(memoria?.retomadaHomePendente)
                    ? memoria.retomadaHomePendente
                    : undefined,
            },
            {
                source: "storage",
                value: autoridadeDisponivel
                    ? undefined
                    : (
                        retomadaHomePendenteEhValida(storage.retomadaHomePendente)
                            ? storage.retomadaHomePendente
                            : undefined
                    ),
            },
            {
                source: "bootstrap",
                value: retomadaHomePendenteEhValida(bootstrap.retomadaHomePendente)
                    ? bootstrap.retomadaHomePendente
                    : undefined,
            },
        ], { fallback: null, aceitarNulo: true });

        const snapshotBase = {
            laudoAtualId: laudoInfo.value,
            estadoRelatorio: estadoRelatorioInfo.value,
            modoInspecaoUI: modoInfo.value,
            workspaceStage: workspaceStageInfo.value,
            threadTab: threadTabInfo.value,
            forceHomeLanding: !!forceHomeLandingInfo.value,
            overlayOwner: overlayOwnerInfo.value,
            assistantLandingFirstSendPending: !!assistantLandingFirstSendPendingInfo.value,
            freeChatConversationActive: !!freeChatConversationActiveInfo.value,
            retomadaHomePendente: retomadaInfo.value,
        };

        const inspectorBaseScreen = resolverInspectorBaseScreenPorSnapshot(snapshotBase);
        const inspectorScreen = snapshotBase.overlayOwner === "new_inspection"
            ? "new_inspection"
            : inspectorBaseScreen;
        const homeActionVisible = snapshotBase.overlayOwner !== "new_inspection" && (
            inspectorBaseScreen === "assistant_landing" ||
            String(inspectorBaseScreen || "").startsWith("inspection_")
        );

        const divergenciaLaudo = autoridadeDisponivel
            ? {
                api: api.laudoAtualId,
                core: core.laudoAtualId,
                dataset: dataset.laudoAtualId,
            }
            : {
                api: api.laudoAtualId,
                core: core.laudoAtualId,
                dataset: dataset.laudoAtualId,
                ssr: ssr.laudoAtualId,
                url: storage.urlLaudoAtualId,
                storage: storage.laudoAtualId,
            };
        const divergenciaEstado = autoridadeDisponivel
            ? {
                api: api.estadoRelatorio,
                core: core.estadoRelatorio,
                dataset: dataset.estadoRelatorio,
            }
            : {
                api: api.estadoRelatorio,
                core: core.estadoRelatorio,
                dataset: dataset.estadoRelatorio,
                ssr: ssr.estadoRelatorio,
            };

        const divergencias = {
            laudoAtualId: registrarDivergenciaEstadoInspector(
                "laudoAtualId",
                divergenciaLaudo,
                laudoInfo.value
            ),
            estadoRelatorio: registrarDivergenciaEstadoInspector(
                "estadoRelatorio",
                divergenciaEstado,
                estadoRelatorioInfo.value
            ),
        };

        return {
            ...snapshotBase,
            inspectorBaseScreen,
            inspectorScreen,
            homeActionVisible,
            sources: {
                laudoAtualId: laudoInfo.source,
                estadoRelatorio: estadoRelatorioInfo.source,
                modoInspecaoUI: modoInfo.source,
                workspaceStage: workspaceStageInfo.source,
                threadTab: threadTabInfo.source,
                forceHomeLanding: forceHomeLandingInfo.source,
                overlayOwner: overlayOwnerInfo.source,
                assistantLandingFirstSendPending: assistantLandingFirstSendPendingInfo.source,
                freeChatConversationActive: freeChatConversationActiveInfo.source,
                retomadaHomePendente: retomadaInfo.source,
                inspectorBaseScreen: "derived",
                inspectorScreen: "derived",
                homeActionVisible: "derived",
            },
            divergencias,
        };
    }

    window.TarielInspectorStateAuthority = Object.assign(
        window.TarielInspectorStateAuthority || {},
        {
            resolverEstadoAutoritativoInspector,
        }
    );
})();
