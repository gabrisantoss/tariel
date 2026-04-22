(function attachTarielInspectorWorkspaceRail(global) {
    "use strict";

    function resolveWorkspaceRailVisibility(screen, dependencies = {}) {
        const {
            estado = {},
            resolveInspectorScreen,
            resolveWorkspaceView,
            workspaceViewSuportaRail,
            obterSnapshotEstadoInspectorAtual,
            conversaWorkspaceModoChatAtivo,
        } = dependencies;
        const screenAtual = screen || estado.inspectorScreen || resolveInspectorScreen?.();
        if (screenAtual === "new_inspection") {
            return false;
        }

        const snapshot = obterSnapshotEstadoInspectorAtual?.();
        if (conversaWorkspaceModoChatAtivo?.(screenAtual, snapshot)) {
            return false;
        }

        const view = resolveWorkspaceView?.(screenAtual);
        return !!(workspaceViewSuportaRail?.(view) && estado.workspaceRailExpanded);
    }

    function atualizarBotaoWorkspaceRail(options = {}, dependencies = {}) {
        const {
            el = {},
            layoutInspectorCompacto,
            resolveWorkspaceView,
            resolveWorkspaceRailVisibility: resolveRailVisibility,
            workspaceViewSuportaRail,
        } = dependencies;
        if (!el.btnWorkspaceToggleRail) return;

        const chromeTecnicoOperacional = !!options.chromeTecnicoOperacional;
        const layoutCompacto = options.layoutCompacto ?? layoutInspectorCompacto?.();
        const view = options.view ?? resolveWorkspaceView?.();
        const railVisivel = options.railVisivel ?? resolveRailVisibility?.();
        const railDisponivel = chromeTecnicoOperacional && !layoutCompacto && workspaceViewSuportaRail?.(view);
        const icone = el.btnWorkspaceToggleRail.querySelector(".material-symbols-rounded");
        const rotulo = el.btnWorkspaceToggleRail.querySelector("span:last-child");

        el.btnWorkspaceToggleRail.hidden = !railDisponivel;
        el.btnWorkspaceToggleRail.setAttribute("aria-expanded", railVisivel ? "true" : "false");

        if (icone) {
            icone.textContent = railVisivel ? "right_panel_close" : "right_panel_open";
        }
        if (rotulo) {
            rotulo.textContent = railVisivel ? "Fechar painel" : "Painel";
        }
    }

    function resolverEstadoPadraoAcordeoesRail(view = "inspection_conversation") {
        if (view === "inspection_history") {
            return {
                history: true,
                progress: false,
                context: false,
                pendencias: false,
                mesa: false,
                pinned: false,
            };
        }

        if (view === "inspection_record") {
            return {
                progress: false,
                context: false,
                pendencias: false,
                mesa: false,
                pinned: false,
            };
        }

        if (view === "inspection_mesa") {
            return {
                progress: false,
                context: false,
                pendencias: false,
                mesa: true,
                pinned: false,
            };
        }

        return {
            history: false,
            progress: false,
            context: false,
            pendencias: false,
            mesa: false,
            pinned: false,
        };
    }

    function aplicarEstadoAcordeaoRailWorkspace(botao, aberto, options = {}, dependencies = {}) {
        if (!botao) return;

        const { estado = {}, document: docRef = global.document, CSS: cssRef = global.CSS } = dependencies;
        const persist = options.persist !== false;
        const chave = String(botao.dataset.railToggle || "").trim();
        if (!chave) return;

        const seletor = `[data-rail-body="${cssRef?.escape ? cssRef.escape(chave) : chave}"]`;
        const corpo = docRef?.querySelector?.(seletor);
        const card = botao.closest(".technical-record-card");
        const expandido = aberto ? "true" : "false";

        botao.setAttribute("aria-expanded", expandido);
        botao.dataset.expanded = expandido;

        if (card) {
            card.dataset.collapsed = aberto ? "false" : "true";
        }
        if (corpo) {
            corpo.hidden = !aberto;
            corpo.dataset.expanded = expandido;
        }
        if (persist) {
            estado.workspaceRailAccordionState = {
                ...(estado.workspaceRailAccordionState && typeof estado.workspaceRailAccordionState === "object"
                    ? estado.workspaceRailAccordionState
                    : {}),
                [chave]: !!aberto,
            };
        }
    }

    function sincronizarAcordeoesRailWorkspace(view, dependencies = {}) {
        const {
            estado = {},
            el = {},
            resolveWorkspaceView,
            resolverEstadoPadraoAcordeoesRail: resolveAccordionDefaults,
            aplicarEstadoAcordeaoRailWorkspace: applyAccordionState,
        } = dependencies;
        const viewAtual = view || resolveWorkspaceView?.();
        const estadoPadrao = resolveAccordionDefaults?.(viewAtual) || {};
        const mudouView = estado.workspaceRailViewKey !== viewAtual;
        const estadoAtual = (
            estado.workspaceRailAccordionState &&
            typeof estado.workspaceRailAccordionState === "object"
        ) ? estado.workspaceRailAccordionState : Object.create(null);
        const botoes = Array.isArray(el.workspaceRailToggleButtons) ? el.workspaceRailToggleButtons : [];

        if (mudouView) {
            estado.workspaceRailAccordionState = { ...estadoPadrao };
            estado.workspaceRailViewKey = viewAtual;
        } else {
            estado.workspaceRailAccordionState = {
                ...estadoPadrao,
                ...estadoAtual,
            };
        }

        botoes.forEach((botao) => {
            const chave = String(botao?.dataset?.railToggle || "").trim();
            if (!chave) return;

            const aberto = !!estado.workspaceRailAccordionState?.[chave];
            applyAccordionState?.(botao, aberto, { persist: false });
        });
    }

    function sincronizarWorkspaceRail(screen, dependencies = {}) {
        const {
            el = {},
            document: docRef = global.document,
            estado = {},
            resolveInspectorScreen,
            resolveWorkspaceView,
            resolveWorkspaceRailVisibility: resolveRailVisibility,
            sincronizarAcordeoesRailWorkspace: syncAccordionState,
        } = dependencies;
        const screenAtual = screen || estado.inspectorScreen || resolveInspectorScreen?.();
        const view = resolveWorkspaceView?.(screenAtual);
        const railVisivel = !!resolveRailVisibility?.(screenAtual);
        const layout = railVisivel ? "thread-with-rail" : "thread-only";

        if (docRef?.body) {
            docRef.body.dataset.workspaceView = view;
            docRef.body.dataset.workspaceRailVisible = railVisivel ? "true" : "false";
        }

        if (el.painelChat) {
            el.painelChat.dataset.workspaceView = view;
            el.painelChat.dataset.workspaceRailVisible = railVisivel ? "true" : "false";
        }

        if (el.workspaceScreenRoot) {
            el.workspaceScreenRoot.dataset.workspaceView = view;
            el.workspaceScreenRoot.dataset.workspaceLayout = layout;
            el.workspaceScreenRoot.dataset.workspaceRailVisible = railVisivel ? "true" : "false";
        }

        if (el.chatDashboardRail) {
            el.chatDashboardRail.hidden = !railVisivel;
            el.chatDashboardRail.dataset.workspaceRailVisible = railVisivel ? "true" : "false";
            el.chatDashboardRail.setAttribute("aria-hidden", String(!railVisivel));
        }

        syncAccordionState?.(view);
        return railVisivel;
    }

    global.TarielInspectorWorkspaceRail = {
        resolveWorkspaceRailVisibility,
        atualizarBotaoWorkspaceRail,
        resolverEstadoPadraoAcordeoesRail,
        aplicarEstadoAcordeaoRailWorkspace,
        sincronizarAcordeoesRailWorkspace,
        sincronizarWorkspaceRail,
    };
})(window);
