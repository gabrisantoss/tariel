(function attachTarielInspectorWorkspacePerf(global) {
    "use strict";

    function instrument(bindings = {}) {
        const PERF = bindings.PERF || null;
        if (!PERF?.enabled) {
            return bindings;
        }

        const wrapped = { ...bindings };
        const obterResumoPerfInspector = bindings.obterResumoPerfInspector || (() => ({}));
        const reportarProntidaoInspector = bindings.reportarProntidaoInspector || (() => {});
        const documentRef = bindings.documentRef || global.document;
        const windowRef = bindings.windowRef || global;

        const resolverInspectorBaseScreenPorSnapshotOriginal = bindings.resolverInspectorBaseScreenPorSnapshot;
        if (typeof resolverInspectorBaseScreenPorSnapshotOriginal === "function") {
            wrapped.resolverInspectorBaseScreenPorSnapshot = function resolverInspectorBaseScreenPorSnapshotComPerf(...args) {
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
        }

        const resolverEstadoAutoritativoInspectorOriginal = bindings.resolverEstadoAutoritativoInspector;
        if (typeof resolverEstadoAutoritativoInspectorOriginal === "function") {
            wrapped.resolverEstadoAutoritativoInspector = function resolverEstadoAutoritativoInspectorComPerf(...args) {
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
        }

        const espelharEstadoInspectorNoDatasetOriginal = bindings.espelharEstadoInspectorNoDataset;
        if (typeof espelharEstadoInspectorNoDatasetOriginal === "function") {
            wrapped.espelharEstadoInspectorNoDataset = function espelharEstadoInspectorNoDatasetComPerf(...args) {
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
        }

        const espelharEstadoInspectorNoStorageOriginal = bindings.espelharEstadoInspectorNoStorage;
        if (typeof espelharEstadoInspectorNoStorageOriginal === "function") {
            wrapped.espelharEstadoInspectorNoStorage = function espelharEstadoInspectorNoStorageComPerf(...args) {
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
        }

        const sincronizarEstadoInspectorOriginal = bindings.sincronizarEstadoInspector;
        if (typeof sincronizarEstadoInspectorOriginal === "function") {
            wrapped.sincronizarEstadoInspector = function sincronizarEstadoInspectorComPerf(...args) {
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
        }

        if (windowRef.TarielInspectorState) {
            windowRef.TarielInspectorState.resolverEstadoAutoritativoInspector = wrapped.resolverEstadoAutoritativoInspector;
            windowRef.TarielInspectorState.sincronizarEstadoInspector = wrapped.sincronizarEstadoInspector;
            windowRef.TarielInspectorState.atualizarThreadWorkspace = bindings.atualizarThreadWorkspace;
        }

        const exibirConversaFocadaNovoChatOriginal = bindings.exibirConversaFocadaNovoChat;
        if (typeof exibirConversaFocadaNovoChatOriginal === "function") {
            wrapped.exibirConversaFocadaNovoChat = function exibirConversaFocadaNovoChatComPerf(...args) {
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
        }

        const promoverPrimeiraMensagemNovoChatSeProntaOriginal = bindings.promoverPrimeiraMensagemNovoChatSePronta;
        if (typeof promoverPrimeiraMensagemNovoChatSeProntaOriginal === "function") {
            wrapped.promoverPrimeiraMensagemNovoChatSePronta = function promoverPrimeiraMensagemNovoChatSeProntaComPerf(...args) {
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
        }

        const atualizarPainelWorkspaceDerivadoOriginal = bindings.atualizarPainelWorkspaceDerivado;
        if (typeof atualizarPainelWorkspaceDerivadoOriginal === "function") {
            wrapped.atualizarPainelWorkspaceDerivado = function atualizarPainelWorkspaceDerivadoComPerf(...args) {
                return PERF.measureSync(
                    "inspetor.atualizarPainelWorkspaceDerivado",
                    () => atualizarPainelWorkspaceDerivadoOriginal.apply(this, args),
                    {
                        category: "render",
                        detail: obterResumoPerfInspector(),
                    }
                );
            };
        }

        const atualizarThreadWorkspaceOriginal = bindings.atualizarThreadWorkspace;
        if (typeof atualizarThreadWorkspaceOriginal === "function") {
            wrapped.atualizarThreadWorkspace = function atualizarThreadWorkspaceComPerf(...args) {
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
        }

        const aplicarMatrizVisibilidadeInspectorOriginal = bindings.aplicarMatrizVisibilidadeInspector;
        if (typeof aplicarMatrizVisibilidadeInspectorOriginal === "function") {
            wrapped.aplicarMatrizVisibilidadeInspector = function aplicarMatrizVisibilidadeInspectorComPerf(...args) {
                return PERF.measureSync(
                    "inspetor.aplicarMatrizVisibilidadeInspector",
                    () => aplicarMatrizVisibilidadeInspectorOriginal.apply(this, args),
                    {
                        category: "state",
                        detail: obterResumoPerfInspector(args[1]),
                    }
                );
            };
        }

        const resolveInspectorScreenOriginal = bindings.resolveInspectorScreen;
        if (typeof resolveInspectorScreenOriginal === "function") {
            wrapped.resolveInspectorScreen = function resolveInspectorScreenComPerf(...args) {
                return PERF.measureSync(
                    "inspetor.resolveInspectorScreen",
                    () => resolveInspectorScreenOriginal.apply(this, args),
                    {
                        category: "state",
                        detail: obterResumoPerfInspector(),
                    }
                );
            };
        }

        const sincronizarWorkspaceRailOriginal = bindings.sincronizarWorkspaceRail;
        if (typeof sincronizarWorkspaceRailOriginal === "function") {
            wrapped.sincronizarWorkspaceRail = function sincronizarWorkspaceRailComPerf(...args) {
                return PERF.measureSync(
                    "inspetor.sincronizarWorkspaceRail",
                    () => sincronizarWorkspaceRailOriginal.apply(this, args),
                    {
                        category: "state",
                        detail: obterResumoPerfInspector(),
                    }
                );
            };
        }

        const sincronizarWidgetsGlobaisWorkspaceOriginal = bindings.sincronizarWidgetsGlobaisWorkspace;
        if (typeof sincronizarWidgetsGlobaisWorkspaceOriginal === "function") {
            wrapped.sincronizarWidgetsGlobaisWorkspace = function sincronizarWidgetsGlobaisWorkspaceComPerf(...args) {
                return PERF.measureSync(
                    "inspetor.sincronizarWidgetsGlobaisWorkspace",
                    () => sincronizarWidgetsGlobaisWorkspaceOriginal.apply(this, args),
                    {
                        category: "state",
                        detail: obterResumoPerfInspector(),
                    }
                );
            };
        }

        const sincronizarInspectorScreenOriginal = bindings.sincronizarInspectorScreen;
        if (typeof sincronizarInspectorScreenOriginal === "function") {
            wrapped.sincronizarInspectorScreen = function sincronizarInspectorScreenComPerf(...args) {
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
        }

        const abrirChatLivreInspectorOriginal = bindings.abrirChatLivreInspector;
        if (typeof abrirChatLivreInspectorOriginal === "function") {
            wrapped.abrirChatLivreInspector = function abrirChatLivreInspectorComPerf(...args) {
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
        }

        const abrirNovaInspecaoComScreenSyncOriginal = bindings.abrirNovaInspecaoComScreenSync;
        if (typeof abrirNovaInspecaoComScreenSyncOriginal === "function") {
            wrapped.abrirNovaInspecaoComScreenSync = function abrirNovaInspecaoComScreenSyncComPerf(...args) {
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

        const bootOriginal = bindings.boot;
        if (typeof bootOriginal === "function") {
            wrapped.boot = async function bootComPerf(...args) {
                PERF.begin("transition.boot_inspetor", {
                    readyState: documentRef?.readyState,
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
                            readyState: documentRef?.readyState,
                        },
                    }
                );
            };
        }

        return wrapped;
    }

    global.TarielInspectorWorkspacePerf = {
        instrument,
    };
})(window);
