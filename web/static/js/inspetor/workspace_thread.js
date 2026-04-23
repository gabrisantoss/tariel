(function attachTarielInspectorWorkspaceThread(global) {
    "use strict";

    function landingNovoChatAtivo(snapshot = {}, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const baseScreen = payload.inspectorBaseScreen
            || dependencies.resolverInspectorBaseScreenPorSnapshot?.(payload);

        return dependencies.normalizarModoInspecaoUI?.(payload.modoInspecaoUI) === "workspace"
            && baseScreen === "assistant_landing";
    }

    function obterBaseRealConversaNovoChat(snapshot = {}, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const totalMensagensReais = dependencies.coletarLinhasWorkspace?.().length || 0;
        const temContextoReal =
            !!dependencies.normalizarLaudoAtualId?.(payload?.laudoAtualId) ||
            dependencies.estadoRelatorioPossuiContexto?.(payload?.estadoRelatorio);

        return {
            totalMensagensReais,
            temContextoReal,
            pronta: totalMensagensReais > 0 || temContextoReal,
        };
    }

    function conversaNovoChatFocadaAtiva(snapshot = {}, dependencies = {}) {
        if (!dependencies.normalizarBooleanoEstado?.(snapshot?.freeChatConversationActive, false)) {
            return false;
        }

        return !obterBaseRealConversaNovoChat(snapshot, dependencies).pronta;
    }

    function obterTotalMensagensReaisWorkspace(snapshot = {}, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const totalHistorico = Math.max(
            0,
            Number(
                payload.historyRealCount ??
                dependencies.estado?.historyRealCount ??
                dependencies.documentRef?.body?.dataset?.historyRealCount ??
                0
            ) || 0
        );

        return Math.max(totalHistorico, dependencies.coletarLinhasWorkspace?.().length || 0);
    }

    function conversaWorkspaceModoChatAtivo(screen, snapshot = {}, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const screenAtual = screen
            || payload.inspectorScreen
            || payload.inspectorBaseScreen
            || dependencies.resolveInspectorScreen?.();
        const workspaceView = dependencies.resolveWorkspaceView?.(screenAtual);
        const conversaLivreAtiva = dependencies.normalizarBooleanoEstado?.(
            payload.freeChatConversationActive,
            false
        );
        const laudoAtivoId = dependencies.normalizarLaudoAtualId?.(
            payload.laudoAtualId ??
            dependencies.estado?.laudoAtualId ??
            dependencies.obterLaudoAtivoIdSeguro?.()
        );
        const estadoRelatorio = dependencies.normalizarEstadoRelatorio?.(
            payload.estadoRelatorio ??
            dependencies.estado?.estadoRelatorio ??
            dependencies.obterEstadoRelatorioAtualSeguro?.()
        );

        if (conversaLivreAtiva) {
            return dependencies.normalizarModoInspecaoUI?.(payload.modoInspecaoUI) === "workspace"
                && workspaceView === "inspection_conversation";
        }

        if (laudoAtivoId || dependencies.estadoRelatorioPossuiContexto?.(estadoRelatorio)) {
            return false;
        }

        return dependencies.normalizarModoInspecaoUI?.(payload.modoInspecaoUI) === "workspace"
            && workspaceView === "inspection_conversation"
            && (
                conversaLivreAtiva
                || obterTotalMensagensReaisWorkspace(payload, dependencies) > 0
            );
    }

    function fluxoNovoChatFocadoAtivoOuPendente(snapshot = {}, dependencies = {}) {
        return conversaNovoChatFocadaAtiva(snapshot, dependencies)
            || !!dependencies.normalizarBooleanoEstado?.(snapshot?.assistantLandingFirstSendPending, false);
    }

    function conversaNovoChatFocadaVisivel(screen, snapshot = {}, dependencies = {}) {
        if (!conversaNovoChatFocadaAtiva(snapshot, dependencies)) {
            return false;
        }

        return dependencies.resolveWorkspaceView?.(screen) === "inspection_conversation";
    }

    function resolverConversationVariant(snapshot = {}, dependencies = {}) {
        const payload = snapshot && typeof snapshot === "object" ? snapshot : {};
        const screen = payload.inspectorScreen
            || payload.inspectorBaseScreen
            || dependencies.resolverInspectorBaseScreenPorSnapshot?.(payload);
        return conversaWorkspaceModoChatAtivo(screen, payload, dependencies)
            ? "focused"
            : "technical";
    }

    function aplicarConversationVariantElemento(elemento, variant = "technical") {
        if (!elemento) return;
        elemento.dataset.conversationVariant = String(variant || "technical");
    }

    function sincronizarURLConversaFocada(variant = "technical", snapshot = {}, dependencies = {}) {
        const windowRef = dependencies.windowRef || global;
        if (variant !== "focused") {
            return;
        }

        try {
            const url = new URL(windowRef.location.href);
            const laudoAtivo = dependencies.normalizarLaudoAtualId?.(
                snapshot?.laudoAtualId ??
                dependencies.obterLaudoAtivoIdSeguro?.() ??
                dependencies.estado?.laudoAtualId
            );
            const laudoAtualNaURL = url.searchParams.get("laudo") || "";
            const abaAtualNaURL = dependencies.normalizarThreadTab?.(url.searchParams.get("aba") || "");

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

            windowRef.history.replaceState({
                ...(windowRef.history.state && typeof windowRef.history.state === "object" ? windowRef.history.state : {}),
                laudoId: laudoAtivo,
                threadTab: "conversa",
            }, "", url.toString());
        } catch (_) {
            // silêncio intencional
        }
    }

    function sincronizarConversationVariantNoDom(snapshot = {}, dependencies = {}) {
        const variant = resolverConversationVariant(snapshot, dependencies);

        aplicarConversationVariantElemento(dependencies.documentRef?.body, variant);
        aplicarConversationVariantElemento(dependencies.el?.painelChat, variant);
        aplicarConversationVariantElemento(dependencies.el?.workspaceScreenRoot, variant);
        aplicarConversationVariantElemento(dependencies.el?.workspaceHeader, variant);
        aplicarConversationVariantElemento(dependencies.el?.workspaceConversationViewRoot, variant);
        aplicarConversationVariantElemento(dependencies.el?.chatThreadToolbar, variant);
        aplicarConversationVariantElemento(dependencies.el?.rodapeEntrada, variant);
        aplicarConversationVariantElemento(
            dependencies.el?.areaMensagens || dependencies.documentRef?.getElementById?.("area-mensagens"),
            variant
        );
        sincronizarURLConversaFocada(variant, snapshot, dependencies);

        return variant;
    }

    function limparFluxoNovoChatFocado(dependencies = {}) {
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (!snapshot?.assistantLandingFirstSendPending && !snapshot?.freeChatConversationActive) {
            return false;
        }

        dependencies.sincronizarEstadoInspector?.({
            assistantLandingFirstSendPending: false,
            freeChatConversationActive: false,
        }, {
            persistirStorage: false,
        });

        return true;
    }

    function exibirConversaFocadaNovoChat(options = {}, dependencies = {}) {
        const estado = dependencies.estado || {};
        const tipoNormalizado = dependencies.normalizarTipoTemplate?.(
            options.tipoTemplate || estado.tipoTemplateAtivo
        );
        const totalMensagensReais = dependencies.coletarLinhasWorkspace?.().length || 0;

        dependencies.sincronizarResumoHistoricoWorkspace?.({ totalMensagensReais });
        dependencies.sincronizarEstadoInspector?.({
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

        dependencies.atualizarNomeTemplateAtivo?.(tipoNormalizado);
        dependencies.atualizarControlesWorkspaceStage?.();
        dependencies.atualizarContextoWorkspaceAtivo?.();
        dependencies.atualizarThreadWorkspace?.("conversa");
        dependencies.renderizarSugestoesComposer?.();
        dependencies.atualizarStatusChatWorkspace?.(
            estado.chatStatusIA?.status,
            estado.chatStatusIA?.texto
        );

        if (options.focarComposer) {
            dependencies.focarComposerInspector?.();
        }

        return true;
    }

    function promoverPrimeiraMensagemNovoChatSePronta(options = {}, dependencies = {}) {
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (!fluxoNovoChatFocadoAtivoOuPendente(snapshot, dependencies)) {
            return false;
        }

        const base = obterBaseRealConversaNovoChat(snapshot, dependencies);
        if (!options.forcar && !snapshot?.freeChatConversationActive && !base.pronta) {
            return false;
        }

        return exibirConversaFocadaNovoChat(
            { focarComposer: options.focarComposer === true },
            dependencies
        );
    }

    function atualizarThreadWorkspace(tab = "conversa", options = {}, dependencies = {}) {
        const {
            normalizarThreadTab,
            sincronizarEstadoInspector,
            windowRef = global,
            estado = {},
            el = {},
            obterSnapshotEstadoInspectorAtual,
            obterLaudoAtivoIdSeguro,
            renderizarAnexosWorkspace,
            filtrarTimelineWorkspace,
            renderizarResumoNavegacaoWorkspace,
            sincronizarInspectorScreen,
            atualizarControlesWorkspaceStage,
        } = dependencies;
        const { persistirURL = false, replaceURL = false } = options && typeof options === "object"
            ? options
            : {};
        let tabNormalizada = normalizarThreadTab?.(tab) || "conversa";
        const snapshotAtual = obterSnapshotEstadoInspectorAtual?.() || {};
        const conversaLivreFocada = !!dependencies.normalizarBooleanoEstado?.(
            snapshotAtual?.freeChatConversationActive,
            false
        );

        if (conversaLivreFocada && tabNormalizada === "mesa") {
            tabNormalizada = "conversa";
        }

        sincronizarEstadoInspector?.({
            threadTab: tabNormalizada,
            ...(tabNormalizada !== "conversa"
                ? {
                    assistantLandingFirstSendPending: false,
                    freeChatConversationActive: false,
                }
                : {}),
        }, { persistirStorage: false });

        if (typeof windowRef.TarielChatPainel?.selecionarThreadTab === "function") {
            windowRef.TarielChatPainel.selecionarThreadTab(tabNormalizada, { emit: false });
        }
        if (persistirURL && typeof windowRef.TarielChatPainel?.definirThreadTabNaURL === "function") {
            windowRef.TarielChatPainel.definirThreadTabNaURL(tabNormalizada, {
                replace: replaceURL,
                laudoId: obterLaudoAtivoIdSeguro?.() || estado.laudoAtualId || null,
            });
        }
        if (el.workspaceAnexosPanel) {
            el.workspaceAnexosPanel.setAttribute(
                "aria-hidden",
                String(tabNormalizada !== "anexos")
            );
        }

        if (tabNormalizada === "anexos") {
            renderizarAnexosWorkspace?.();
        } else if (tabNormalizada === "historico") {
            filtrarTimelineWorkspace?.();
        }

        renderizarResumoNavegacaoWorkspace?.();
        sincronizarInspectorScreen?.();
        windowRef.requestAnimationFrame?.(() => {
            atualizarControlesWorkspaceStage?.();
        });
    }

    global.TarielInspectorWorkspaceThread = {
        aplicarConversationVariantElemento,
        conversaNovoChatFocadaAtiva,
        conversaNovoChatFocadaVisivel,
        conversaWorkspaceModoChatAtivo,
        exibirConversaFocadaNovoChat,
        fluxoNovoChatFocadoAtivoOuPendente,
        landingNovoChatAtivo,
        limparFluxoNovoChatFocado,
        obterBaseRealConversaNovoChat,
        obterTotalMensagensReaisWorkspace,
        promoverPrimeiraMensagemNovoChatSePronta,
        resolverConversationVariant,
        sincronizarConversationVariantNoDom,
        sincronizarURLConversaFocada,
        atualizarThreadWorkspace,
    };
})(window);
