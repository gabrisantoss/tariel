(function () {
    "use strict";

    if (window.TarielClientePortalServicos) return;

    window.TarielClientePortalServicos = function createTarielClientePortalServicos(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const createSurface = window.TarielClientePortalServicosSurface;
        const createPage = window.TarielClienteServicosPage;

        if (typeof createSurface !== "function") {
            throw new Error("TarielClientePortalServicosSurface indisponivel.");
        }
        if (typeof createPage !== "function") {
            throw new Error("TarielClienteServicosPage indisponivel.");
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
