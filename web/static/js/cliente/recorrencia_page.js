(function () {
    "use strict";

    if (window.TarielClienteRecorrenciaPage) return;

    window.TarielClienteRecorrenciaPage = function createTarielClienteRecorrenciaPage(config = {}) {
        const state = config.state || {};
        const surfaceModule = config.surfaceModule || {};

        const abrirSecaoRecorrencia = typeof surfaceModule.abrirSecaoRecorrencia === "function"
            ? surfaceModule.abrirSecaoRecorrencia
            : () => "overview";
        const renderRecorrenciaLista = typeof surfaceModule.renderRecorrenciaLista === "function"
            ? surfaceModule.renderRecorrenciaLista
            : () => null;
        const renderRecorrenciaResumo = typeof surfaceModule.renderRecorrenciaResumo === "function"
            ? surfaceModule.renderRecorrenciaResumo
            : () => null;
        const resolverSecaoRecorrenciaPorTarget = typeof surfaceModule.resolverSecaoRecorrenciaPorTarget === "function"
            ? surfaceModule.resolverSecaoRecorrenciaPorTarget
            : () => null;

        function bindRecorrenciaActions() {
            return null;
        }

        state.ui = state.ui || {};
        if (!state.ui.recorrenciaSection) {
            state.ui.recorrenciaSection = "overview";
        }

        return {
            abrirSecaoRecorrencia,
            bindRecorrenciaActions,
            renderRecorrenciaLista,
            renderRecorrenciaResumo,
            resolverSecaoRecorrenciaPorTarget,
        };
    };
})();
