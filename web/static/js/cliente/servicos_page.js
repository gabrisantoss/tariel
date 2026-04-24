(function () {
    "use strict";

    if (window.TarielClienteServicosPage) return;

    window.TarielClienteServicosPage = function createTarielClienteServicosPage(config = {}) {
        const state = config.state || {};
        const surfaceModule = config.surfaceModule || {};

        const abrirSecaoServicos = typeof surfaceModule.abrirSecaoServicos === "function"
            ? surfaceModule.abrirSecaoServicos
            : () => "overview";
        const renderServicosLista = typeof surfaceModule.renderServicosLista === "function"
            ? surfaceModule.renderServicosLista
            : () => null;
        const renderServicosResumo = typeof surfaceModule.renderServicosResumo === "function"
            ? surfaceModule.renderServicosResumo
            : () => null;
        const resolverSecaoServicosPorTarget = typeof surfaceModule.resolverSecaoServicosPorTarget === "function"
            ? surfaceModule.resolverSecaoServicosPorTarget
            : () => null;

        function bindServicosActions() {
            return null;
        }

        state.ui = state.ui || {};
        if (!state.ui.servicosSection) {
            state.ui.servicosSection = "overview";
        }

        return {
            abrirSecaoServicos,
            bindServicosActions,
            renderServicosLista,
            renderServicosResumo,
            resolverSecaoServicosPorTarget,
        };
    };
})();
