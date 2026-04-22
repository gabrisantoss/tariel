(function attachTarielInspectorWorkspacePageBoot(global) {
    "use strict";

    function bindEventosModal(dependencies = {}) {
        dependencies.ctx?.actions?.bindEventosNovaInspecao?.();
        dependencies.ctx?.actions?.bindUiBindings?.();
    }

    function bindEventosPagina(dependencies = {}) {
        dependencies.ctx?.actions?.bindUiBindings?.();
    }

    function bindEventosSistema(dependencies = {}) {
        const {
            ctx,
            documentRef = global.document,
            windowRef = global,
            promoverPortalParaChatNoModoFoco,
            fecharSSE,
            limparTimerReconexaoSSE,
            limparTimerFecharMesaWidget,
            limparTimerBanner,
            cancelarCarregamentoPendenciasMesa,
            cancelarCarregamentoMensagensMesaWidget,
            atualizarConexaoMesaWidget,
            sincronizarSSEPorContexto,
            contextoTecnicoPrecisaRefresh,
            carregarPendenciasMesa,
        } = dependencies;
        ctx?.actions?.bindSystemEvents?.();

        const onModoFocoAlterado = (event) => {
            if (event?.detail?.ativo !== true) {
                return;
            }
            promoverPortalParaChatNoModoFoco?.(
                dependencies.origemModoFocoPayload || { origem: "focus_mode_toggle" }
            );
        };

        documentRef.addEventListener("tariel:focus-mode-changed", onModoFocoAlterado);

        windowRef.addEventListener("pagehide", () => {
            fecharSSE?.();
            limparTimerReconexaoSSE?.();
            limparTimerFecharMesaWidget?.();
            limparTimerBanner?.();
            cancelarCarregamentoPendenciasMesa?.();
            cancelarCarregamentoMensagensMesaWidget?.();
            atualizarConexaoMesaWidget?.("offline");
            ctx?.actions?.limparObserversInspector?.();
        });

        documentRef.addEventListener("visibilitychange", () => {
            if (documentRef.visibilityState === "hidden") {
                fecharSSE?.();
                limparTimerReconexaoSSE?.();
                return;
            }

            if (!dependencies.estado?.fonteSSE) {
                limparTimerReconexaoSSE?.();
                sincronizarSSEPorContexto?.();
            }

            if (contextoTecnicoPrecisaRefresh?.()) {
                carregarPendenciasMesa?.({ silencioso: true })?.catch?.(() => {});
            }
        });
    }

    async function boot(dependencies = {}) {
        await dependencies.ctx?.actions?.bootInspector?.();
    }

    global.TarielInspectorWorkspacePageBoot = {
        bindEventosModal,
        bindEventosPagina,
        bindEventosSistema,
        boot,
    };
})(window);
