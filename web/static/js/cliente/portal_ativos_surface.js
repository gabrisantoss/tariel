(function () {
    "use strict";

    if (window.TarielClientePortalAtivosSurface) return;

    window.TarielClientePortalAtivosSurface = function createTarielClientePortalAtivosSurface(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const escapeAttr = typeof helpers.escapeAttr === "function" ? helpers.escapeAttr : (valor) => String(valor ?? "");
        const escapeHtml = typeof helpers.escapeHtml === "function" ? helpers.escapeHtml : (valor) => String(valor ?? "");
        const formatarInteiro = typeof helpers.formatarInteiro === "function" ? helpers.formatarInteiro : (valor) => String(Number(valor || 0));
        const sincronizarUrlDaSecao = typeof helpers.sincronizarUrlDaSecao === "function" ? helpers.sincronizarUrlDaSecao : () => null;
        const texto = typeof helpers.texto === "function" ? helpers.texto : (valor) => (valor == null ? "" : String(valor));
        const obterHintVazio = () => state.bootstrap?.guided_onboarding?.surface_empty_hints?.ativos || null;

        const SECTION_ORDER = Object.freeze(["overview"]);
        const TARGET_TO_SECTION = Object.freeze({
            "ativos-overview": "overview",
            "ativos-resumo-geral": "overview",
            "ativos-industriais-lista": "overview",
        });

        function normalizarSecaoAtivos(valor) {
            const secao = texto(valor).trim().toLowerCase();
            return SECTION_ORDER.includes(secao) ? secao : "overview";
        }

        function resolverSecaoAtivosPorTarget(targetId) {
            const alvo = texto(targetId).trim().replace(/^#/, "");
            if (!alvo) return null;
            if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
            return SECTION_ORDER.includes(alvo) ? alvo : null;
        }

        function obterBotoesSecaoAtivos() {
            return Array.from(documentRef.querySelectorAll("[data-ativos-section-tab]"));
        }

        function abrirSecaoAtivos(secao, { focusTab = false, syncUrl = true } = {}) {
            const secaoAtiva = normalizarSecaoAtivos(secao || state.ui?.ativosSection);
            state.ui.ativosSection = secaoAtiva;
            state.ui.sections = state.ui.sections || {};
            state.ui.sections.ativos = secaoAtiva;

            const tabAtiva = obterBotoesSecaoAtivos().find((button) => button.dataset.ativosSectionTab === secaoAtiva) || null;
            obterBotoesSecaoAtivos().forEach((button) => {
                const ativa = button.dataset.ativosSectionTab === secaoAtiva;
                button.classList.toggle("is-active", ativa);
                button.setAttribute("aria-selected", ativa ? "true" : "false");
                button.setAttribute("aria-current", ativa ? "page" : "false");
                button.setAttribute("tabindex", ativa ? "0" : "-1");
            });
            documentRef.querySelectorAll("[data-ativos-panel]").forEach((panel) => {
                panel.hidden = panel.dataset.ativosPanel !== secaoAtiva;
            });
            if (focusTab && tabAtiva) {
                tabAtiva.focus();
            }
            if (syncUrl && state.ui?.tab === "ativos") {
                sincronizarUrlDaSecao("ativos", secaoAtiva);
            }
            return secaoAtiva;
        }

        function renderAtivosResumo() {
            const summary = state.bootstrap?.ativos?.summary || {};
            const items = state.bootstrap?.ativos?.items || [];
            const totalAssets = Number(summary.total_assets || items.length || 0);
            const totalUnits = Number(summary.total_units || 0);
            const criticalAssets = Number(summary.critical_assets || 0);
            const attentionAssets = Number(summary.attention_assets || 0);
            const healthyAssets = Number(summary.healthy_assets || 0);
            const alerta = $("ativos-alerta-principal");

            $("ativos-total").textContent = formatarInteiro(totalAssets);
            $("ativos-unidades-total").textContent = formatarInteiro(totalUnits);
            $("ativos-criticos-total").textContent = formatarInteiro(criticalAssets);
            $("ativos-atencao-total").textContent = formatarInteiro(attentionAssets);
            $("ativos-saudaveis-total").textContent = formatarInteiro(healthyAssets);
            $("ativos-section-count-overview").textContent = `${formatarInteiro(totalAssets)} ativos no tenant`;

            if (!alerta) return;
            if (!items.length) {
                const hint = obterHintVazio();
                alerta.innerHTML = `
                    <strong>${escapeHtml(hint?.title || "Nenhum ativo mapeado.")}</strong>
                    <p>${escapeHtml(hint?.body || "Quando houver laudos vinculados a equipamento ou linha, eles aparecerão aqui.")}</p>
                `;
                return;
            }
            const prioridade = items.find((item) => item.health_status === "critical")
                || items.find((item) => item.health_status === "attention")
                || items[0];
            alerta.innerHTML = `
                <strong>${escapeHtml(prioridade.asset_label || "Ativo industrial")}</strong>
                <p>${escapeHtml(
                    prioridade.next_due_at
                        ? `Próxima inspeção prevista para ${prioridade.next_due_at}.`
                        : prioridade.status_visual_label || "Acompanhe a carteira de ativos da empresa."
                )}</p>
            `;
        }

        function renderAtivosLista() {
            const container = $("ativos-industriais-lista");
            if (!container) return;

            const items = Array.isArray(state.bootstrap?.ativos?.items) ? state.bootstrap.ativos.items : [];
            if (!items.length) {
                const hint = obterHintVazio();
                container.innerHTML = `
                    <div class="empty-state">
                        <strong>${escapeHtml(hint?.title || "Sem ativos até agora.")}</strong>
                        <p>${escapeHtml(hint?.body || "Os ativos serão derivados dos laudos emitidos para a empresa.")}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map((item) => {
                const nr35 = item.nr35_summary || null;
                const serviceLabels = Array.isArray(item.service_keys)
                    ? item.service_keys.map((key) => String(key || "").toUpperCase())
                    : [];
                const serviceChips = serviceLabels.length
                    ? `
                        <div class="asset-card__signals">
                            ${serviceLabels.map((label) => `<span class="hero-chip">${escapeHtml(label)}</span>`).join("")}
                        </div>
                    `
                    : "";
                const nr35Meta = nr35
                    ? `
                        <div class="asset-card__nr35">
                            <span><strong>Status WF:</strong> ${escapeHtml(nr35.conclusion_status || "Sem parecer")}</span>
                            <span><strong>Tipo da linha:</strong> ${escapeHtml(nr35.line_type || "Não informado")}</span>
                            <span><strong>Componentes:</strong> C ${escapeHtml(String(nr35.component_counts?.C || 0))} · NC ${escapeHtml(String(nr35.component_counts?.NC || 0))} · NA ${escapeHtml(String(nr35.component_counts?.NA || 0))}</span>
                        </div>
                    `
                    : "";
                return `
                    <article class="asset-card" data-asset-id="${escapeAttr(item.asset_id || "")}">
                        <div class="asset-card__head">
                            <div>
                                <span class="pill" data-kind="priority" data-status="${escapeAttr(item.health_status || "monitoring")}">
                                    ${escapeHtml(item.health_label || "Ativo")}
                                </span>
                                <h4>${escapeHtml(item.asset_label || "Ativo industrial")}</h4>
                            </div>
                            <span class="asset-card__status">${escapeHtml(item.status_visual_label || "Sem status visual")}</span>
                        </div>
                        <div class="asset-card__meta">
                            <span><strong>Unidade / planta:</strong> ${escapeHtml(item.unit_label || "Não informada")}</span>
                            <span><strong>Local funcional:</strong> ${escapeHtml(item.location_label || "Não informado")}</span>
                            <span><strong>Equipamento / ativo:</strong> ${escapeHtml(item.asset_type || "Não informado")}</span>
                            <span><strong>Próxima inspeção:</strong> ${escapeHtml(item.next_due_at || "Não informada")}</span>
                        </div>
                        ${nr35Meta}
                        ${serviceChips}
                    </article>
                `;
            }).join("");
        }

        return {
            abrirSecaoAtivos,
            renderAtivosLista,
            renderAtivosResumo,
            resolverSecaoAtivosPorTarget,
        };
    };
})();
