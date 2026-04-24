(function () {
    "use strict";

    if (window.TarielClienteDocumentosPage) return;

    window.TarielClienteDocumentosPage = function createTarielClienteDocumentosPage(config = {}) {
        const state = config.state || {};
        const surfaceModule = config.surfaceModule || {};

        const abrirSecaoDocumentos = typeof surfaceModule.abrirSecaoDocumentos === "function"
            ? surfaceModule.abrirSecaoDocumentos
            : () => "overview";
        const renderDocumentosLista = typeof surfaceModule.renderDocumentosLista === "function"
            ? surfaceModule.renderDocumentosLista
            : () => null;
        const renderDocumentosResumo = typeof surfaceModule.renderDocumentosResumo === "function"
            ? surfaceModule.renderDocumentosResumo
            : () => null;
        const resolverSecaoDocumentosPorTarget = typeof surfaceModule.resolverSecaoDocumentosPorTarget === "function"
            ? surfaceModule.resolverSecaoDocumentosPorTarget
            : () => null;

        function bindDocumentosActions() {
            return null;
        }

        state.ui = state.ui || {};
        if (!state.ui.documentosSection) {
            state.ui.documentosSection = "overview";
        }

        return {
            abrirSecaoDocumentos,
            bindDocumentosActions,
            renderDocumentosLista,
            renderDocumentosResumo,
            resolverSecaoDocumentosPorTarget,
        };
    };
})();
