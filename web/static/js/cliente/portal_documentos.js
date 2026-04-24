(function () {
    "use strict";

    if (window.TarielClientePortalDocumentos) return;

    window.TarielClientePortalDocumentos = function createTarielClientePortalDocumentos(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const createSurface = window.TarielClientePortalDocumentosSurface;
        const createPage = window.TarielClienteDocumentosPage;

        if (typeof createSurface !== "function") {
            throw new Error("TarielClientePortalDocumentosSurface indisponivel.");
        }
        if (typeof createPage !== "function") {
            throw new Error("TarielClienteDocumentosPage indisponivel.");
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
