(function attachTarielInspectorWorkspaceContextFlow(global) {
    "use strict";

    function limparURLNovoChat(windowRef = global) {
        try {
            const url = new URL(windowRef.location.href);
            url.searchParams.delete("laudo");
            url.searchParams.delete("aba");
            url.searchParams.delete("home");
            windowRef.history.replaceState(
                {
                    ...(windowRef.history.state && typeof windowRef.history.state === "object"
                        ? windowRef.history.state
                        : {}),
                    laudoId: null,
                    threadTab: null,
                },
                "",
                url.toString()
            );
        } catch (_) {
            // silêncio intencional
        }
    }

    function definirRootAtivoLocal(root, ativo) {
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

    function limparModoNrVisualDom() {
        const documentRef = global.document;
        const painel = documentRef?.getElementById?.("painel-chat");
        [documentRef?.body, painel].forEach((alvo) => {
            if (!alvo?.dataset) return;
            delete alvo.dataset.nrVisualMode;
            delete alvo.dataset.nrVisualTitle;
            delete alvo.dataset.nrVisualBadge;
        });

        const titulo = documentRef?.getElementById?.("workspace-titulo-laudo");
        if (titulo) {
            titulo.textContent = "Tariel";
            titulo.dataset.nrTitleActive = "false";
        }

        const tituloModo = documentRef?.getElementById?.("workspace-nr-mode-title");
        if (tituloModo) {
            tituloModo.textContent = "";
            tituloModo.hidden = true;
            tituloModo.setAttribute("aria-hidden", "true");
        }

        const campo = documentRef?.getElementById?.("campo-mensagem");
        if (campo) {
            campo.placeholder = "Peça ao Tariel";
        }
    }

    function limparTimelineChatLivreDom() {
        const documentRef = global.document;
        const areaMensagens = documentRef?.getElementById?.("area-mensagens");
        if (!areaMensagens) return;
        areaMensagens
            .querySelectorAll(".linha-mensagem:not(#indicador-digitando), .controle-historico-antigo, .skeleton-carregamento")
            .forEach((node) => node.remove());
    }

    function forcarLandingAssistenteDom() {
        const documentRef = global.document;
        const shell = documentRef?.querySelector?.('[data-inspector-region="workspace-shell"]');
        const painel = documentRef?.getElementById?.("painel-chat");
        const roots = {
            assistant: documentRef?.querySelector?.('[data-workspace-view-root="assistant_landing"]'),
            history: documentRef?.querySelector?.('[data-workspace-view-root="inspection_history"]'),
            record: documentRef?.querySelector?.('[data-workspace-view-root="inspection_record"]'),
            conversation: documentRef?.querySelector?.('[data-workspace-view-root="inspection_conversation"]'),
            mesa: documentRef?.querySelector?.('[data-workspace-view-root="inspection_mesa"]'),
            corrections: documentRef?.querySelector?.('[data-workspace-view-root="inspection_corrections"]'),
            finalization: documentRef?.querySelector?.('[data-workspace-view-root="inspection_finalization"]'),
        };
        const assistantLanding = documentRef?.getElementById?.("workspace-assistant-landing");

        if (shell?.dataset) {
            shell.dataset.workspaceView = "assistant_landing";
            shell.dataset.active = "true";
            shell.removeAttribute("hidden");
            shell.setAttribute("aria-hidden", "false");
            try {
                shell.inert = false;
            } catch (_) {
                shell.removeAttribute("inert");
            }
        }

        if (painel?.dataset) {
            painel.dataset.laudoAtualId = "";
            painel.dataset.estadoRelatorio = "sem_relatorio";
            painel.dataset.workspaceStage = "assistant";
            painel.dataset.freeChatConversationActive = "false";
        }

        definirRootAtivoLocal(roots.assistant, true);
        ["history", "record", "conversation", "mesa", "corrections", "finalization"].forEach((key) => {
            definirRootAtivoLocal(roots[key], false);
        });
        if (assistantLanding) {
            assistantLanding.removeAttribute("hidden");
            assistantLanding.setAttribute("aria-hidden", "false");
        }

        const rodape = documentRef?.querySelector?.(".rodape-entrada");
        if (rodape) {
            rodape.removeAttribute("hidden");
            rodape.setAttribute("aria-hidden", "false");
        }

        const threadNav = documentRef?.querySelector?.(".thread-nav");
        if (threadNav) {
            threadNav.hidden = true;
            threadNav.setAttribute("aria-hidden", "true");
        }
    }

    function detailPossuiContextoVisual(detail = {}) {
        const payload = detail && typeof detail === "object" ? detail : {};
        const card = payload?.laudo_card || payload?.laudoCard || payload?.card || {};

        return Boolean(
            payload?.workspaceTitle ||
            payload?.homeTitle ||
            payload?.title ||
            payload?.workspaceSubtitle ||
            payload?.homeSubtitle ||
            payload?.subtitle ||
            payload?.workspaceStatus ||
            payload?.homeStatus ||
            payload?.statusBadge ||
            payload?.case_lifecycle_status ||
            card?.display_title ||
            card?.titulo ||
            card?.display_subtitle ||
            card?.subtitle ||
            card?.status_badge ||
            card?.status_card_label ||
            card?.case_lifecycle_status
        );
    }

    function enriquecerCardLaudoComContextoVisual(card = {}, contextoVisual = null, dependencies = {}) {
        const contexto = dependencies.normalizarContextoVisualSeguro?.(contextoVisual);
        const payload = card && typeof card === "object" ? { ...card } : {};
        if (!contexto) return payload;

        const titulo = String(contexto.title || payload.display_title || payload.titulo || "").trim();
        const subtitulo = String(contexto.subtitle || payload.display_subtitle || payload.subtitle || "").trim();
        const badge = String(
            contexto.statusBadge ||
            payload.status_badge ||
            dependencies.obterBadgeLifecycleCase?.(payload.case_lifecycle_status) ||
            payload.status_card_label ||
            ""
        ).trim();

        if (titulo) {
            payload.titulo = titulo;
            payload.display_title = titulo;
        }
        if (subtitulo) {
            payload.display_subtitle = subtitulo;
            payload.subtitle = subtitulo;
            if (!String(payload.preview || "").trim()) {
                payload.preview = subtitulo;
            }
        }
        if (badge) {
            payload.status_badge = badge.toUpperCase();
        }

        return payload;
    }

    function enriquecerPayloadLaudoComContextoVisual(payload = {}, contextoVisual = null, dependencies = {}) {
        const contexto = dependencies.normalizarContextoVisualSeguro?.(contextoVisual);
        const base = payload && typeof payload === "object" ? { ...payload } : {};
        if (!contexto) return base;

        if (base.laudo_card && typeof base.laudo_card === "object") {
            base.laudo_card = dependencies.enriquecerCardLaudoComContextoVisual?.(
                base.laudo_card,
                contexto
            );
        }

        if (!base.workspaceTitle) {
            base.workspaceTitle = contexto.title;
        }
        if (!base.workspaceSubtitle) {
            base.workspaceSubtitle = contexto.subtitle;
        }
        if (!base.workspaceStatus) {
            base.workspaceStatus = contexto.statusBadge;
        }

        return base;
    }

    function resolverContextoVisualWorkspace(detail = {}, dependencies = {}) {
        const laudoId = Number(
            detail?.laudo_id ??
            detail?.laudoId ??
            detail?.laudo_card?.id ??
            0
        ) || null;

        if (dependencies.detailPossuiContextoVisual?.(detail)) {
            return dependencies.extrairContextoVisualWorkspace?.(detail);
        }

        const contextoRegistrado = dependencies.obterContextoVisualLaudoRegistrado?.(laudoId);
        if (contextoRegistrado) {
            return contextoRegistrado;
        }

        const retomadaPendente = dependencies.obterRetomadaHomePendente?.();
        return (
            dependencies.normalizarContextoVisualSeguro?.(retomadaPendente?.contextoVisual) ||
            dependencies.normalizarContextoVisualSeguro?.(dependencies.estado?.workspaceVisualContext) ||
            dependencies.criarContextoVisualPadrao?.()
        );
    }

    function definirModoInspecaoUI(modo = "home", dependencies = {}) {
        const proximoModo = dependencies.normalizarModoInspecaoUI?.(modo);
        dependencies.sincronizarEstadoInspector?.({ modoInspecaoUI: proximoModo }, { persistirStorage: false });
        dependencies.atualizarControlesWorkspaceStage?.();

        if (proximoModo !== "workspace") {
            if (dependencies.estado?.mesaWidgetAberto || !dependencies.el?.painelMesaWidget?.hidden) {
                dependencies.fecharMesaWidget?.();
            } else if (dependencies.el?.btnMesaWidgetToggle) {
                dependencies.el.btnMesaWidgetToggle.setAttribute("aria-expanded", "false");
            }
            dependencies.limparReferenciaMesaWidget?.();
            dependencies.limparAnexoMesaWidget?.();
        }

        dependencies.atualizarContextoWorkspaceAtivo?.();
    }

    function exibirInterfaceInspecaoAtiva(tipo, dependencies = {}) {
        dependencies.limparFluxoNovoChatFocado?.();
        dependencies.definirWorkspaceStage?.("inspection");
        dependencies.atualizarNomeTemplateAtivo?.(tipo);
        dependencies.carregarContextoFixadoWorkspace?.();
        dependencies.definirModoInspecaoUI?.("workspace");
        dependencies.renderizarResumoOperacionalMesa?.();
        dependencies.renderizarSugestoesComposer?.();
        dependencies.atualizarStatusChatWorkspace?.(
            dependencies.estado?.chatStatusIA?.status,
            dependencies.estado?.chatStatusIA?.texto
        );
    }

    function exibirLandingAssistenteIA(options = {}, dependencies = {}) {
        const limparTimeline = !!options.limparTimeline;
        const limparContextoChatLivre = options.limparContextoChatLivre === true;
        dependencies.definirRetomadaHomePendente?.(null);
        dependencies.limparFluxoNovoChatFocado?.();
        dependencies.atualizarEstadoModoEntrada?.({}, { reset: true });
        if (limparContextoChatLivre && dependencies.estado) {
            dependencies.estado.freeChatTemplateContext = null;
        }
        dependencies.estado.contextoFixado = [];
        dependencies.estado.chatStatusIA = {
            status: "pronto",
            texto: "Tariel pronto",
        };
        dependencies.sincronizarEstadoInspector?.({
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
        }, {
            persistirStorage: false,
            syncScreen: false,
        });

        if (limparTimeline) {
            if (typeof global.TarielAPI?.limparHistoricoChat === "function") {
                global.TarielAPI.limparHistoricoChat({ emitirEstadoRelatorio: false });
            } else {
                global.TarielAPI?.limparAreaMensagens?.();
            }
            limparTimelineChatLivreDom();
        }

        dependencies.resetarFiltrosHistoricoWorkspace?.();
        dependencies.definirWorkspaceStage?.("assistant");
        if (limparContextoChatLivre) {
            limparModoNrVisualDom();
        }
        dependencies.aplicarContextoVisualWorkspace?.(dependencies.obterContextoVisualAssistente?.());
        dependencies.definirModoInspecaoUI?.("workspace");
        dependencies.atualizarThreadWorkspace?.("conversa");
        dependencies.limparPainelPendencias?.();
        dependencies.fecharSlashCommandPalette?.();
        dependencies.renderizarResumoOperacionalMesa?.();
        dependencies.renderizarSugestoesComposer?.();
        dependencies.atualizarStatusChatWorkspace?.("pronto", "Tariel pronto");
        forcarLandingAssistenteDom();
    }

    function abrirChatLivreInspector(options = {}, dependencies = {}) {
        const origemNormalizada = String(options.origem || "chat_free_entry").trim() || "chat_free_entry";
        const forcarLanding = options.forcarLanding === true;
        const snapshotAtual = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (!forcarLanding && dependencies.redirecionarEntradaParaReemissaoWorkspace?.({ origem: origemNormalizada })) {
            return false;
        }
        const veioDoPortal = dependencies.origemChatLivreEhPortal?.(origemNormalizada);
        if (!forcarLanding && !veioDoPortal && !dependencies.entradaChatLivreDisponivel?.(snapshotAtual)) {
            dependencies.sincronizarVisibilidadeAcoesChatLivre?.(snapshotAtual);
            dependencies.mostrarToast?.(
                "O chat livre só fica disponível quando não existe laudo ativo.",
                "info",
                2200
            );
            return false;
        }

        dependencies.fecharModalGateQualidade?.();

        if (dependencies.modalNovaInspecaoEstaAberta?.()) {
            dependencies.fecharNovaInspecaoComScreenSync?.({ forcar: true, restaurarFoco: false });
        }

        dependencies.limparForcaTelaInicial?.();
        dependencies.sincronizarEstadoInspector?.({
            laudoAtualId: null,
            estadoRelatorio: "sem_relatorio",
            forceHomeLanding: false,
            modoInspecaoUI: "workspace",
            workspaceStage: "assistant",
            threadTab: "conversa",
            inspectorScreen: "assistant_landing",
            inspectorBaseScreen: "assistant_landing",
            overlayOwner: "",
            assistantLandingFirstSendPending: false,
            freeChatConversationActive: false,
        }, {
            persistirStorage: false,
        });
        dependencies.exibirLandingAssistenteIA?.({
            limparTimeline: true,
            limparContextoChatLivre: true,
        });
        limparURLNovoChat(global);
        const screenFinal = forcarLanding
            ? "assistant_landing"
            : dependencies.sincronizarInspectorScreen?.();
        forcarLandingAssistenteDom();
        dependencies.focarComposerInspector?.();
        dependencies.emitirEventoTariel?.("tariel:assistant-chat-opened", {
            origem: origemNormalizada,
            screen: screenFinal,
        });

        return forcarLanding || screenFinal === "assistant_landing";
    }

    function promoverPortalParaChatNoModoFoco(options = {}, dependencies = {}) {
        const snapshotAtual = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (!dependencies.modoFocoPodePromoverPortalParaChat?.(snapshotAtual)) {
            return false;
        }

        return dependencies.abrirChatLivreInspector?.({ origem: options.origem || "focus_mode_toggle" });
    }

    function restaurarTelaSemRelatorio(options = {}, dependencies = {}) {
        if (dependencies.homeForcadoAtivo?.()) {
            dependencies.resetarInterfaceInspecao?.();
            return;
        }

        dependencies.exibirLandingAssistenteIA?.({ limparTimeline: !!options.limparTimeline });
    }

    function resetarInterfaceInspecao(dependencies = {}) {
        dependencies.definirRetomadaHomePendente?.(null);
        dependencies.limparFluxoNovoChatFocado?.();
        dependencies.atualizarEstadoModoEntrada?.({}, { reset: true });
        dependencies.estado.contextoFixado = [];
        dependencies.estado.chatStatusIA = {
            status: "pronto",
            texto: "Tariel pronto",
        };
        dependencies.resetarFiltrosHistoricoWorkspace?.();
        dependencies.definirWorkspaceStage?.("assistant");
        dependencies.definirModoInspecaoUI?.("home");
        dependencies.atualizarThreadWorkspace?.("conversa");
        dependencies.atualizarHistoricoHomeExpandido?.(false);
        dependencies.renderizarResumoOperacionalMesa?.();
        dependencies.limparPainelPendencias?.();
        dependencies.fecharSlashCommandPalette?.();
        dependencies.atualizarStatusChatWorkspace?.("pronto", "Tariel pronto");
    }

    global.TarielInspectorWorkspaceContextFlow = {
        detailPossuiContextoVisual,
        enriquecerCardLaudoComContextoVisual,
        enriquecerPayloadLaudoComContextoVisual,
        resolverContextoVisualWorkspace,
        definirModoInspecaoUI,
        exibirInterfaceInspecaoAtiva,
        exibirLandingAssistenteIA,
        abrirChatLivreInspector,
        promoverPortalParaChatNoModoFoco,
        restaurarTelaSemRelatorio,
        resetarInterfaceInspecao,
    };
})(window);
