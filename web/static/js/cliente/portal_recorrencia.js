(function () {
    "use strict";

    if (window.TarielClientePortalRecorrencia) return;

    window.TarielClientePortalRecorrencia = function createTarielClientePortalRecorrencia(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const createSurface = window.TarielClientePortalRecorrenciaSurface;
        const createPage = window.TarielClienteRecorrenciaPage;

        if (typeof createSurface !== "function") {
            throw new Error("TarielClientePortalRecorrenciaSurface indisponivel.");
        }
        if (typeof createPage !== "function") {
            throw new Error("TarielClienteRecorrenciaPage indisponivel.");
        }

        const surfaceModule = createSurface({
            ...config,
            documentRef,
            getById: $,
            helpers,
            state,
        });

        return createPage({
            ...config,
            documentRef,
            getById: $,
            helpers,
            state,
            surfaceModule,
        });
    };
})();
