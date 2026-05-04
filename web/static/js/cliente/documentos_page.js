(function () {
    "use strict";

    if (window.TarielClienteDocumentosPage) return;

    window.TarielClienteDocumentosPage = function createTarielClienteDocumentosPage(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const surfaceModule = config.surfaceModule || {};
        const helpers = config.helpers || {};
        const texto = typeof helpers.texto === "function"
            ? helpers.texto
            : (valor) => (valor == null ? "" : String(valor));

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

        function normalizarOpcao(valor, permitidos, fallback) {
            const candidato = texto(valor).trim().toLowerCase();
            return permitidos.includes(candidato) ? candidato : fallback;
        }

        function aplicarFiltrosDocumentos() {
            renderDocumentosResumo();
            renderDocumentosLista();
        }

        function sincronizarControlesDocumentos() {
            const ui = state.ui || {};
            const busca = $("documentos-busca");
            const filtroStatus = $("documentos-filtro-status");
            const filtroEvidencia = $("documentos-filtro-evidencia");
            const ordenacao = $("documentos-ordenacao");
            if (busca) busca.value = ui.documentosBusca || "";
            if (filtroStatus) filtroStatus.value = ui.documentosFiltroStatus || "todos";
            if (filtroEvidencia) filtroEvidencia.value = ui.documentosFiltroEvidencia || "todos";
            if (ordenacao) ordenacao.value = ui.documentosOrdenacao || "atencao";
        }

        function bindDocumentosActions() {
            if (documentRef.__tarielDocumentosFiltersBound) return null;
            documentRef.__tarielDocumentosFiltersBound = true;
            sincronizarControlesDocumentos();

            $("documentos-busca")?.addEventListener("input", (event) => {
                state.ui.documentosBusca = texto(event.target.value).slice(0, 120);
                aplicarFiltrosDocumentos();
            });
            $("documentos-filtro-status")?.addEventListener("change", (event) => {
                state.ui.documentosFiltroStatus = normalizarOpcao(
                    event.target.value,
                    ["todos", "atencao", "oficial", "operacional", "revisao"],
                    "todos",
                );
                aplicarFiltrosDocumentos();
            });
            $("documentos-filtro-evidencia")?.addEventListener("change", (event) => {
                state.ui.documentosFiltroEvidencia = normalizarOpcao(
                    event.target.value,
                    ["todos", "art", "pie", "prontuario", "nr35", "hash"],
                    "todos",
                );
                aplicarFiltrosDocumentos();
            });
            $("documentos-ordenacao")?.addEventListener("change", (event) => {
                state.ui.documentosOrdenacao = normalizarOpcao(
                    event.target.value,
                    ["atencao", "recentes", "titulo", "familia"],
                    "atencao",
                );
                aplicarFiltrosDocumentos();
            });
            $("btn-documentos-limpar-filtros")?.addEventListener("click", () => {
                state.ui.documentosBusca = "";
                state.ui.documentosFiltroStatus = "todos";
                state.ui.documentosFiltroEvidencia = "todos";
                state.ui.documentosOrdenacao = "atencao";
                sincronizarControlesDocumentos();
                aplicarFiltrosDocumentos();
            });
            return null;
        }

        state.ui = state.ui || {};
        if (!state.ui.documentosSection) {
            state.ui.documentosSection = "overview";
        }
        state.ui.documentosBusca = texto(state.ui.documentosBusca).slice(0, 120);
        state.ui.documentosFiltroStatus = normalizarOpcao(
            state.ui.documentosFiltroStatus,
            ["todos", "atencao", "oficial", "operacional", "revisao"],
            "todos",
        );
        state.ui.documentosFiltroEvidencia = normalizarOpcao(
            state.ui.documentosFiltroEvidencia,
            ["todos", "art", "pie", "prontuario", "nr35", "hash"],
            "todos",
        );
        state.ui.documentosOrdenacao = normalizarOpcao(
            state.ui.documentosOrdenacao,
            ["atencao", "recentes", "titulo", "familia"],
            "atencao",
        );

        return {
            abrirSecaoDocumentos,
            bindDocumentosActions,
            renderDocumentosLista,
            renderDocumentosResumo,
            resolverSecaoDocumentosPorTarget,
        };
    };
})();
