(function () {
    "use strict";

    if (window.TarielClientePortalAtivos) return;

    window.TarielClientePortalAtivos = function createTarielClientePortalAtivos(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const createSurface = window.TarielClientePortalAtivosSurface;
        const createPage = window.TarielClienteAtivosPage;

        if (typeof createSurface !== "function") {
            throw new Error("TarielClientePortalAtivosSurface indisponivel.");
        }
        if (typeof createPage !== "function") {
            throw new Error("TarielClienteAtivosPage indisponivel.");
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
