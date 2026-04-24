(function () {
    "use strict";

    if (window.TarielClienteAtivosPage) return;

    window.TarielClienteAtivosPage = function createTarielClienteAtivosPage(config = {}) {
        const state = config.state || {};
        const surfaceModule = config.surfaceModule || {};

        const abrirSecaoAtivos = typeof surfaceModule.abrirSecaoAtivos === "function"
            ? surfaceModule.abrirSecaoAtivos
            : () => "overview";
        const renderAtivosLista = typeof surfaceModule.renderAtivosLista === "function"
            ? surfaceModule.renderAtivosLista
            : () => null;
        const renderAtivosResumo = typeof surfaceModule.renderAtivosResumo === "function"
            ? surfaceModule.renderAtivosResumo
            : () => null;
        const resolverSecaoAtivosPorTarget = typeof surfaceModule.resolverSecaoAtivosPorTarget === "function"
            ? surfaceModule.resolverSecaoAtivosPorTarget
            : () => null;

        function bindAtivosActions() {
            return null;
        }

        state.ui = state.ui || {};
        if (!state.ui.ativosSection) {
            state.ui.ativosSection = "overview";
        }

        return {
            abrirSecaoAtivos,
            bindAtivosActions,
            renderAtivosLista,
            renderAtivosResumo,
            resolverSecaoAtivosPorTarget,
        };
    };
})();
