(function () {
    "use strict";

    function sincronizarSidebarLaudosTabs(preferida, dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const sidebar = document.getElementById("barra-historico");
        const secaoPinados = dependencies.obterSecaoSidebarLaudos?.("fixados");
        const secaoRecentes = dependencies.obterSecaoSidebarLaudos?.("recentes");
        const resumo = dependencies.resolverSidebarLaudosTab?.(preferida) || {
            ativa: "recentes",
            pinados: 0,
            recentes: 0,
        };
        const ativa = resumo.ativa;
        const usaAbas = Array.isArray(el.sidebarLaudosTabButtons) && el.sidebarLaudosTabButtons.length > 0;
        const totalItens = el.sidebarHistoricoLista
            ? el.sidebarHistoricoLista.querySelectorAll(".item-historico[data-laudo-id]").length
            : 0;

        estado.sidebarLaudosTab = ativa;
        if (sidebar && !usaAbas) {
            sidebar.dataset.sidebarLaudosView = "all";
        } else if (sidebar) {
            sidebar.dataset.sidebarLaudosView = ativa;
        }

        if (!usaAbas) {
            const totalVisiveis = resumo.pinados + resumo.recentes;

            if (secaoPinados) {
                secaoPinados.hidden = resumo.pinados === 0;
            }

            if (secaoRecentes) {
                secaoRecentes.hidden = resumo.recentes === 0;
            }

            return {
                ...resumo,
                totalItens,
                visiveisNaAbaAtiva: totalVisiveis,
            };
        }

        el.sidebarLaudosTabButtons.forEach((botao) => {
            const tab = String(botao.dataset.sidebarLaudosTabTrigger || "").trim().toLowerCase();
            const ativo = tab === ativa;
            const habilitado = tab === "fixados" ? resumo.pinados > 0 : resumo.recentes > 0;
            botao.classList.toggle("is-active", ativo);
            botao.setAttribute("aria-selected", ativo ? "true" : "false");
            botao.disabled = !habilitado;
            botao.setAttribute("aria-disabled", habilitado ? "false" : "true");
        });

        if (secaoPinados) {
            secaoPinados.hidden = resumo.pinados === 0 || ativa !== "fixados";
        }

        if (secaoRecentes) {
            secaoRecentes.hidden = resumo.recentes === 0 || ativa !== "recentes";
        }

        return {
            ...resumo,
            totalItens,
            visiveisNaAbaAtiva: ativa === "fixados" ? resumo.pinados : resumo.recentes,
        };
    }

    function filtrarSidebarHistorico(termo = "", dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const termoNormalizado = String(termo || "").trim().toLowerCase();
        estado.termoBuscaSidebar = termoNormalizado;
        const itens = el.sidebarHistoricoLista
            ? Array.from(el.sidebarHistoricoLista.querySelectorAll(".inspetor-sidebar-report, .item-historico"))
            : [];

        let visiveis = 0;
        itens.forEach((item) => {
            const texto = String(item.textContent || "").trim().toLowerCase();
            const match = !termoNormalizado || texto.includes(termoNormalizado);
            item.hidden = !match;
            if (match) {
                visiveis += 1;
            }
        });

        const resumoTabs = sincronizarSidebarLaudosTabs(estado.sidebarLaudosTab, dependencies);

        if (el.sidebarBuscaVazio) {
            const semItens = resumoTabs.totalItens === 0;
            const semResultados = termoNormalizado && resumoTabs.visiveisNaAbaAtiva === 0 && visiveis === 0;
            el.sidebarBuscaVazio.hidden = !(semItens || semResultados);
        }
    }

    function atualizarHistoricoHomeExpandido(expandir = false, dependencies = {}) {
        const el = dependencies.el || {};
        const extras = Array.isArray(el.historicoHomeExtras) ? el.historicoHomeExtras : [];
        const expandido = !!expandir && extras.length > 0;

        extras.forEach((bloco) => {
            if (!bloco) return;
            if (expandido) {
                bloco.removeAttribute("hidden");
            } else {
                bloco.setAttribute("hidden", "");
            }
        });

        if (el.btnHomeToggleHistoricoCompleto) {
            el.btnHomeToggleHistoricoCompleto.setAttribute("aria-expanded", expandido ? "true" : "false");
            el.btnHomeToggleHistoricoCompleto.textContent = expandido
                ? "Mostrar menos"
                : "Ver todos";
        }
    }

    function rolarParaHistoricoHome(options = {}, dependencies = {}) {
        const el = dependencies.el || {};
        const expandir = !!options?.expandir;
        if (expandir) {
            atualizarHistoricoHomeExpandido(true, dependencies);
        }

        if (!el.secaoHomeRecentes) return;

        try {
            el.secaoHomeRecentes.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        } catch (_) {
            el.secaoHomeRecentes.scrollIntoView();
        }
    }

    window.TarielInspectorSidebarHistory = Object.assign(
        window.TarielInspectorSidebarHistory || {},
        {
            atualizarHistoricoHomeExpandido,
            filtrarSidebarHistorico,
            rolarParaHistoricoHome,
            sincronizarSidebarLaudosTabs,
        }
    );
})();
