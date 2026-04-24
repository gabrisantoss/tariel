(function attachTarielInspectorWorkspaceRuntimeState(global) {
    "use strict";

    function obterResumoPerfInspector(snapshot = null, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const body = dependencies.document?.body || global.document?.body;
        return {
            screen: String(
                payload.inspectorScreen ||
                body?.dataset?.inspectorScreen ||
                ""
            ).trim(),
            baseScreen: String(
                payload.inspectorBaseScreen ||
                body?.dataset?.inspectorBaseScreen ||
                ""
            ).trim(),
            modoInspecaoUI: String(
                payload.modoInspecaoUI ||
                body?.dataset?.inspecaoUi ||
                ""
            ).trim(),
            workspaceStage: String(
                payload.workspaceStage ||
                body?.dataset?.workspaceStage ||
                ""
            ).trim(),
            threadTab: String(
                payload.threadTab ||
                body?.dataset?.threadTab ||
                ""
            ).trim(),
            laudoAtualId: Number(
                payload.laudoAtualId ||
                body?.dataset?.laudoAtualId ||
                0
            ) || null,
        };
    }

    function reportarProntidaoInspector(snapshot = null, dependencies = {}) {
        const { PERF = null, el = {}, obterResumoPerfInspector: buildPerfSummary } = dependencies;
        if (!PERF?.enabled) return;

        const resumo = buildPerfSummary?.(snapshot) || {};
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

    function paginaSolicitaHomeLandingViaURL(dependencies = {}) {
        const locationRef = dependencies.locationRef || global.location;
        try {
            const url = new URL(locationRef.href);
            return url.searchParams.get("home") === "1" && !url.searchParams.get("laudo");
        } catch (_) {
            return false;
        }
    }

    function obterLaudoIdDaURLInspector(dependencies = {}) {
        const locationRef = dependencies.locationRef || global.location;
        try {
            const valor = new URL(locationRef.href).searchParams.get("laudo");
            return dependencies.normalizarLaudoAtualId?.(valor);
        } catch (_) {
            return null;
        }
    }

    function obterThreadTabDaURLInspector(dependencies = {}) {
        const locationRef = dependencies.locationRef || global.location;
        try {
            const valor = new URL(locationRef.href).searchParams.get("aba");
            return valor ? dependencies.normalizarThreadTab?.(valor) : undefined;
        } catch (_) {
            return undefined;
        }
    }

    function obterSnapshotCompatCoreInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotCompatCoreInspector?.({
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
        }) || {};
    }

    function obterSnapshotCompatApiInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotCompatApiInspector?.({
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
        }) || {};
    }

    function obterSnapshotDatasetInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotDatasetInspector?.({
            body: dependencies.document?.body || global.document?.body,
            painelChat: dependencies.el?.painelChat,
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
            normalizarThreadTab: dependencies.normalizarThreadTab,
            normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
            normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
        }) || {};
    }

    function obterSnapshotSSRInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotSSRInspector?.({
            painelChat: dependencies.el?.painelChat,
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
        }) || {};
    }

    function obterSnapshotStorageInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotStorageInspector?.({
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            obterLaudoIdDaURLInspector: () => dependencies.obterLaudoIdDaURLInspector?.(),
            obterThreadTabDaURLInspector: () => dependencies.obterThreadTabDaURLInspector?.(),
            lerFlagForcaHomeStorage: dependencies.lerFlagForcaHomeStorage,
            lerRetomadaHomePendenteStorage: dependencies.lerRetomadaHomePendenteStorage,
            paginaSolicitaHomeLandingViaURL: () => dependencies.paginaSolicitaHomeLandingViaURL?.(),
        }) || {};
    }

    function obterSnapshotMemoriaInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotMemoriaInspector?.({
            snapshotEstadoInspector: dependencies.estado?.snapshotEstadoInspector,
            estadoAtual: dependencies.estado,
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
            normalizarThreadTab: dependencies.normalizarThreadTab,
            normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
            normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
            retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
            normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
        }) || {};
    }

    function obterSnapshotBootstrapInspector(dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.obterSnapshotBootstrapInspector?.({
            obterSnapshotSSRInspector: () => dependencies.obterSnapshotSSRInspector?.(),
            obterSnapshotDatasetInspector: () => dependencies.obterSnapshotDatasetInspector?.(),
            obterSnapshotStorageInspector: () => dependencies.obterSnapshotStorageInspector?.(),
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
            normalizarThreadTab: dependencies.normalizarThreadTab,
            retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
            normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
        }) || {};
    }

    function escolherCampoEstadoInspector(candidatos = [], options = {}, dependencies = {}) {
        return dependencies.InspectorStateSnapshots?.escolherCampoEstadoInspector?.(
            candidatos,
            options,
        ) || { value: options?.fallback ?? null, source: "fallback" };
    }

    function registrarDivergenciaEstadoInspector(campo, mapaFontes = {}, valorEscolhido, dependencies = {}) {
        const {
            divergenciasEstadoInspector = new Map(),
            EM_PRODUCAO = true,
            debugRuntime,
            logOnceRuntime,
        } = dependencies;
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
                debugRuntime?.(`[INSPECTOR_STATE] Divergência transitória detectada em ${campo}.`, {
                    escolhido: valorEscolhido,
                    fontes: mapaFontes,
                });
                return true;
            }

            anterior.count += 1;

            if (!anterior.warned && (anterior.count >= 3 || (agora - anterior.firstAt) >= 1200)) {
                anterior.warned = true;
                logOnceRuntime?.(
                    `inspector-state:${chaveAviso}`,
                    "warn",
                    `[INSPECTOR_STATE] Divergência persistente em ${campo}.`,
                    {
                        escolhido: valorEscolhido,
                        fontes: mapaFontes,
                        ocorrencias: anterior.count,
                        persistenciaMs: agora - anterior.firstAt,
                    }
                );
            }
        }

        return divergente;
    }

    function resolverEstadoAutoritativoInspector(overrides = {}, dependencies = {}) {
        return dependencies.InspectorStateAuthority?.resolverEstadoAutoritativoInspector?.({
            overrides,
            obterSnapshotMemoriaInspector: () => dependencies.obterSnapshotMemoriaInspector?.(),
            obterSnapshotCompatCoreInspector: () => dependencies.obterSnapshotCompatCoreInspector?.(),
            obterSnapshotCompatApiInspector: () => dependencies.obterSnapshotCompatApiInspector?.(),
            obterSnapshotDatasetInspector: () => dependencies.obterSnapshotDatasetInspector?.(),
            obterSnapshotSSRInspector: () => dependencies.obterSnapshotSSRInspector?.(),
            obterSnapshotStorageInspector: () => dependencies.obterSnapshotStorageInspector?.(),
            obterSnapshotBootstrapInspector: () => dependencies.obterSnapshotBootstrapInspector?.(),
            escolherCampoEstadoInspector: (candidatos, options) =>
                dependencies.escolherCampoEstadoInspector?.(candidatos, options),
            normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
            normalizarThreadTab: dependencies.normalizarThreadTab,
            normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
            normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
            normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
            retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
            estadoRelatorioPossuiContexto: dependencies.estadoRelatorioPossuiContexto,
            resolverInspectorBaseScreenPorSnapshot: dependencies.resolverInspectorBaseScreenPorSnapshot,
            registrarDivergenciaEstadoInspector: (campo, mapaFontes, valorEscolhido) =>
                dependencies.registrarDivergenciaEstadoInspector?.(campo, mapaFontes, valorEscolhido),
            paginaSolicitaHomeLandingViaURL: () => dependencies.paginaSolicitaHomeLandingViaURL?.(),
            modalNovaInspecaoEstaAberta: dependencies.modalNovaInspecaoEstaAberta,
        }) || {};
    }

    function espelharEstadoInspectorCompat(snapshot = {}, dependencies = {}) {
        return dependencies.InspectorStateRuntimeSync?.espelharEstadoInspectorCompat?.(snapshot);
    }

    function espelharEstadoInspectorNoDataset(snapshot = {}, dependencies = {}) {
        return dependencies.InspectorStateRuntimeSync?.espelharEstadoInspectorNoDataset?.({
            snapshot,
            body: dependencies.document?.body || global.document?.body,
            painelChat: dependencies.el?.painelChat,
            overlayHost: dependencies.el?.overlayHost,
            sincronizarConversationVariantNoDom: dependencies.sincronizarConversationVariantNoDom,
        });
    }

    function espelharEstadoInspectorNoStorage(snapshot = {}, opts = {}, dependencies = {}) {
        return dependencies.InspectorStateRuntimeSync?.espelharEstadoInspectorNoStorage?.({
            snapshot,
            opts,
            contextoVisualPorLaudo: dependencies.estado?.contextoVisualPorLaudo,
            persistirContextoVisualLaudosStorage: dependencies.persistirContextoVisualLaudosStorage,
            chaveForceHomeLanding: dependencies.CHAVE_FORCE_HOME_LANDING,
            chaveRetomadaHomePendente: dependencies.CHAVE_RETOMADA_HOME_PENDENTE,
        });
    }

    function emitirEstadoInspectorSincronizado(snapshot = {}, dependencies = {}) {
        return dependencies.InspectorStateRuntimeSync?.emitirEstadoInspectorSincronizado?.({
            snapshot,
            emitirEventoTariel: dependencies.emitirEventoTariel,
        });
    }

    function aplicarSnapshotEstadoInspector(snapshot = {}, opts = {}, dependencies = {}) {
        const stateRef = dependencies.stateRef || {};
        return dependencies.InspectorStateRuntimeSync?.aplicarSnapshotEstadoInspector?.({
            snapshot,
            opts,
            estado: dependencies.estado,
            setInspectorStateGlobal: dependencies.setInspectorStateGlobal,
            espelharEstadoInspectorNoDataset: (payload) =>
                dependencies.espelharEstadoInspectorNoDataset?.(payload),
            espelharEstadoInspectorCompat: (payload) =>
                dependencies.espelharEstadoInspectorCompat?.(payload),
            espelharEstadoInspectorNoStorage: (payload, payloadOpts) =>
                dependencies.espelharEstadoInspectorNoStorage?.(payload, payloadOpts),
            sincronizandoInspectorScreen: !!stateRef.sincronizandoInspectorScreen,
            syncInspectorScreenRaf: Number(stateRef.syncInspectorScreenRaf || 0) || 0,
            cancelAnimationFrameFn: dependencies.windowRef?.cancelAnimationFrame?.bind(dependencies.windowRef)
                || global.cancelAnimationFrame.bind(global),
            requestAnimationFrameFn: dependencies.windowRef?.requestAnimationFrame?.bind(dependencies.windowRef)
                || global.requestAnimationFrame.bind(global),
            sincronizarInspectorScreen: dependencies.sincronizarInspectorScreen,
            emitirEstadoInspectorSincronizado: (payload) =>
                dependencies.emitirEstadoInspectorSincronizado?.(payload),
            atualizarSyncInspectorScreenRaf: (valor) => {
                if (typeof stateRef.setSyncInspectorScreenRaf === "function") {
                    stateRef.setSyncInspectorScreenRaf(valor);
                }
            },
        }) || snapshot;
    }

    function sincronizarEstadoInspector(overrides = {}, opts = {}, dependencies = {}) {
        const snapshot = dependencies.resolverEstadoAutoritativoInspector?.(overrides) || {};
        return dependencies.aplicarSnapshotEstadoInspector?.(snapshot, opts) || snapshot;
    }

    function obterSnapshotEstadoInspectorAtual(dependencies = {}) {
        return dependencies.InspectorStateRuntimeSync?.obterSnapshotEstadoInspectorAtual?.({
            snapshotEstadoInspector: dependencies.estado?.snapshotEstadoInspector,
            resolverEstadoAutoritativoInspector: () => dependencies.resolverEstadoAutoritativoInspector?.(),
        }) || {};
    }

    function criarBindingsEstadoInspector(dependencies = {}) {
        const resolveLocationRef = () =>
            dependencies.obterLocationRuntime?.()
            || dependencies.locationRef
            || global.location;

        function paginaSolicitaHomeLandingViaURLBinding() {
            return !!paginaSolicitaHomeLandingViaURL({
                locationRef: resolveLocationRef(),
            });
        }

        function obterLaudoIdDaURLInspectorBinding() {
            return obterLaudoIdDaURLInspector({
                locationRef: resolveLocationRef(),
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
            }) || null;
        }

        function obterThreadTabDaURLInspectorBinding() {
            return obterThreadTabDaURLInspector({
                locationRef: resolveLocationRef(),
                normalizarThreadTab: dependencies.normalizarThreadTab,
            });
        }

        function obterSnapshotCompatCoreInspectorBinding() {
            return obterSnapshotCompatCoreInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            }) || {};
        }

        function obterSnapshotCompatApiInspectorBinding() {
            return obterSnapshotCompatApiInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
            }) || {};
        }

        function obterSnapshotDatasetInspectorBinding() {
            return obterSnapshotDatasetInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                document: dependencies.documentRef || dependencies.document,
                el: dependencies.el,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
                normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
                normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
                normalizarThreadTab: dependencies.normalizarThreadTab,
                normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
                normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
            }) || {};
        }

        function obterSnapshotSSRInspectorBinding() {
            return obterSnapshotSSRInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                el: dependencies.el,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
                normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
                normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
            }) || {};
        }

        function obterSnapshotStorageInspectorBinding() {
            return obterSnapshotStorageInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                obterLaudoIdDaURLInspector: obterLaudoIdDaURLInspectorBinding,
                obterThreadTabDaURLInspector: obterThreadTabDaURLInspectorBinding,
                lerFlagForcaHomeStorage: dependencies.lerFlagForcaHomeStorage,
                lerRetomadaHomePendenteStorage: dependencies.lerRetomadaHomePendenteStorage,
                paginaSolicitaHomeLandingViaURL: paginaSolicitaHomeLandingViaURLBinding,
            }) || {};
        }

        function obterSnapshotMemoriaInspectorBinding() {
            return obterSnapshotMemoriaInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                estado: dependencies.estado,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
                normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
                normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
                normalizarThreadTab: dependencies.normalizarThreadTab,
                normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
                normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
                retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
                normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
            }) || {};
        }

        function obterSnapshotBootstrapInspectorBinding() {
            return obterSnapshotBootstrapInspector({
                InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                obterSnapshotSSRInspector: obterSnapshotSSRInspectorBinding,
                obterSnapshotDatasetInspector: obterSnapshotDatasetInspectorBinding,
                obterSnapshotStorageInspector: obterSnapshotStorageInspectorBinding,
                normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
                normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
                normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
                normalizarThreadTab: dependencies.normalizarThreadTab,
                retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
                normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
            }) || {};
        }

        function escolherCampoEstadoInspectorBinding(
            candidatos = [],
            { fallback = null, aceitarNulo = false } = {},
        ) {
            return escolherCampoEstadoInspector(
                candidatos,
                { fallback, aceitarNulo },
                {
                    InspectorStateSnapshots: dependencies.InspectorStateSnapshots,
                },
            ) || { value: fallback, source: "fallback" };
        }

        function registrarDivergenciaEstadoInspectorBinding(campo, mapaFontes = {}, valorEscolhido) {
            return registrarDivergenciaEstadoInspector(
                campo,
                mapaFontes,
                valorEscolhido,
                {
                    divergenciasEstadoInspector: dependencies.divergenciasEstadoInspector,
                    EM_PRODUCAO: dependencies.EM_PRODUCAO,
                    debugRuntime: dependencies.debugRuntime,
                    logOnceRuntime: dependencies.logOnceRuntime,
                },
            ) || false;
        }

        function resolverInspectorBaseScreenPorSnapshotBinding(snapshot = {}) {
            return dependencies.InspectorStateSnapshots?.resolverInspectorBaseScreenPorSnapshot?.(snapshot)
                || "assistant_landing";
        }

        function resolverEstadoAutoritativoInspectorBinding(overrides = {}) {
            return resolverEstadoAutoritativoInspector(
                overrides,
                {
                    InspectorStateAuthority: dependencies.InspectorStateAuthority,
                    obterSnapshotMemoriaInspector: obterSnapshotMemoriaInspectorBinding,
                    obterSnapshotCompatCoreInspector: obterSnapshotCompatCoreInspectorBinding,
                    obterSnapshotCompatApiInspector: obterSnapshotCompatApiInspectorBinding,
                    obterSnapshotDatasetInspector: obterSnapshotDatasetInspectorBinding,
                    obterSnapshotSSRInspector: obterSnapshotSSRInspectorBinding,
                    obterSnapshotStorageInspector: obterSnapshotStorageInspectorBinding,
                    obterSnapshotBootstrapInspector: obterSnapshotBootstrapInspectorBinding,
                    escolherCampoEstadoInspector: escolherCampoEstadoInspectorBinding,
                    normalizarLaudoAtualId: dependencies.normalizarLaudoAtualId,
                    normalizarEstadoRelatorio: dependencies.normalizarEstadoRelatorio,
                    normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
                    normalizarWorkspaceStage: dependencies.normalizarWorkspaceStage,
                    normalizarThreadTab: dependencies.normalizarThreadTab,
                    normalizarOverlayOwner: dependencies.normalizarOverlayOwner,
                    normalizarBooleanoEstado: dependencies.normalizarBooleanoEstado,
                    normalizarRetomadaHomePendenteSeguro: dependencies.normalizarRetomadaHomePendenteSeguro,
                    retomadaHomePendenteEhValida: dependencies.retomadaHomePendenteEhValida,
                    estadoRelatorioPossuiContexto: dependencies.estadoRelatorioPossuiContexto,
                    resolverInspectorBaseScreenPorSnapshot: resolverInspectorBaseScreenPorSnapshotBinding,
                    registrarDivergenciaEstadoInspector: registrarDivergenciaEstadoInspectorBinding,
                    paginaSolicitaHomeLandingViaURL: paginaSolicitaHomeLandingViaURLBinding,
                    modalNovaInspecaoEstaAberta: dependencies.modalNovaInspecaoEstaAberta,
                },
            ) || {};
        }

        function espelharEstadoInspectorCompatBinding(snapshot = {}) {
            return espelharEstadoInspectorCompat(snapshot, {
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
            });
        }

        function espelharEstadoInspectorNoDatasetBinding(snapshot = {}) {
            return espelharEstadoInspectorNoDataset(snapshot, {
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
                document: dependencies.documentRef || dependencies.document,
                el: dependencies.el,
                sincronizarConversationVariantNoDom: dependencies.sincronizarConversationVariantNoDom,
            });
        }

        function espelharEstadoInspectorNoStorageBinding(snapshot = {}, opts = {}) {
            return espelharEstadoInspectorNoStorage(snapshot, opts, {
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
                estado: dependencies.estado,
                persistirContextoVisualLaudosStorage: dependencies.persistirContextoVisualLaudosStorage,
                CHAVE_FORCE_HOME_LANDING: dependencies.CHAVE_FORCE_HOME_LANDING,
                CHAVE_RETOMADA_HOME_PENDENTE: dependencies.CHAVE_RETOMADA_HOME_PENDENTE,
            });
        }

        function emitirEstadoInspectorSincronizadoBinding(snapshot = {}) {
            return emitirEstadoInspectorSincronizado(snapshot, {
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
                emitirEventoTariel: dependencies.emitirEventoTariel,
            });
        }

        function aplicarSnapshotEstadoInspectorBinding(snapshot = {}, opts = {}) {
            return aplicarSnapshotEstadoInspector(snapshot, opts, {
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
                windowRef: dependencies.windowRef || global,
                estado: dependencies.estado,
                setInspectorStateGlobal: dependencies.setInspectorStateGlobal,
                espelharEstadoInspectorNoDataset: espelharEstadoInspectorNoDatasetBinding,
                espelharEstadoInspectorCompat: espelharEstadoInspectorCompatBinding,
                espelharEstadoInspectorNoStorage: espelharEstadoInspectorNoStorageBinding,
                sincronizarInspectorScreen: dependencies.sincronizarInspectorScreen,
                emitirEstadoInspectorSincronizado: emitirEstadoInspectorSincronizadoBinding,
                stateRef: dependencies.stateRef,
            }) || snapshot;
        }

        function sincronizarEstadoInspectorBinding(overrides = {}, opts = {}) {
            return sincronizarEstadoInspector(overrides, opts, {
                resolverEstadoAutoritativoInspector: resolverEstadoAutoritativoInspectorBinding,
                aplicarSnapshotEstadoInspector: aplicarSnapshotEstadoInspectorBinding,
            }) || {};
        }

        function obterSnapshotEstadoInspectorAtualBinding() {
            return obterSnapshotEstadoInspectorAtual({
                InspectorStateRuntimeSync: dependencies.InspectorStateRuntimeSync,
                estado: dependencies.estado,
                resolverEstadoAutoritativoInspector: resolverEstadoAutoritativoInspectorBinding,
            }) || {};
        }

        function definirRetomadaHomePendenteBinding(payload = null) {
            const snapshot = sincronizarEstadoInspectorBinding({
                retomadaHomePendente: payload
                    ? dependencies.normalizarRetomadaHomePendenteSeguro?.(payload) || null
                    : null,
            });

            return snapshot.retomadaHomePendente;
        }

        function obterRetomadaHomePendenteBinding() {
            const snapshot = resolverEstadoAutoritativoInspectorBinding();
            return snapshot.retomadaHomePendente;
        }

        atualizarGlobalInspectorState(
            {
                resolverEstadoAutoritativoInspector: resolverEstadoAutoritativoInspectorBinding,
                sincronizarEstadoInspector: sincronizarEstadoInspectorBinding,
                obterSnapshotEstadoInspectorAtual: obterSnapshotEstadoInspectorAtualBinding,
                atualizarThreadWorkspace: dependencies.atualizarThreadWorkspace,
            },
            {
                estado: dependencies.estado,
            },
        );

        return {
            definirRetomadaHomePendente: definirRetomadaHomePendenteBinding,
            espelharEstadoInspectorNoDataset: espelharEstadoInspectorNoDatasetBinding,
            espelharEstadoInspectorNoStorage: espelharEstadoInspectorNoStorageBinding,
            obterLaudoIdDaURLInspector: obterLaudoIdDaURLInspectorBinding,
            obterRetomadaHomePendente: obterRetomadaHomePendenteBinding,
            obterSnapshotEstadoInspectorAtual: obterSnapshotEstadoInspectorAtualBinding,
            obterThreadTabDaURLInspector: obterThreadTabDaURLInspectorBinding,
            paginaSolicitaHomeLandingViaURL: paginaSolicitaHomeLandingViaURLBinding,
            resolverEstadoAutoritativoInspector: resolverEstadoAutoritativoInspectorBinding,
            resolverInspectorBaseScreenPorSnapshot: resolverInspectorBaseScreenPorSnapshotBinding,
            sincronizarEstadoInspector: sincronizarEstadoInspectorBinding,
        };
    }

    function atualizarGlobalInspectorState(bindings = {}, dependencies = {}) {
        const target = global.TarielInspectorState = Object.assign(
            global.TarielInspectorState || {},
            {
                resolverEstadoAutoritativoInspector: bindings.resolverEstadoAutoritativoInspector,
                sincronizarEstadoInspector: bindings.sincronizarEstadoInspector,
                obterSnapshotEstadoInspectorAtual: bindings.obterSnapshotEstadoInspectorAtual,
                atualizarThreadWorkspace: bindings.atualizarThreadWorkspace,
                state: dependencies.estado?.snapshotEstadoInspector
                    ? { ...dependencies.estado.snapshotEstadoInspector }
                    : null,
            }
        );
        return target;
    }

    global.TarielInspectorWorkspaceRuntimeState = {
        atualizarGlobalInspectorState,
        aplicarSnapshotEstadoInspector,
        criarBindingsEstadoInspector,
        escolherCampoEstadoInspector,
        emitirEstadoInspectorSincronizado,
        espelharEstadoInspectorCompat,
        espelharEstadoInspectorNoDataset,
        espelharEstadoInspectorNoStorage,
        obterLaudoIdDaURLInspector,
        obterResumoPerfInspector,
        obterSnapshotBootstrapInspector,
        obterSnapshotCompatApiInspector,
        obterSnapshotCompatCoreInspector,
        obterSnapshotDatasetInspector,
        obterSnapshotEstadoInspectorAtual,
        obterSnapshotMemoriaInspector,
        obterSnapshotSSRInspector,
        obterSnapshotStorageInspector,
        obterThreadTabDaURLInspector,
        paginaSolicitaHomeLandingViaURL,
        registrarDivergenciaEstadoInspector,
        reportarProntidaoInspector,
        resolverEstadoAutoritativoInspector,
        sincronizarEstadoInspector,
    };
})(window);
