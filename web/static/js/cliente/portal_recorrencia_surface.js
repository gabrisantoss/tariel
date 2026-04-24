(function () {
    "use strict";

    if (window.TarielClientePortalRecorrenciaSurface) return;

    window.TarielClientePortalRecorrenciaSurface = function createTarielClientePortalRecorrenciaSurface(config = {}) {
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
        const obterHintVazio = () => state.bootstrap?.guided_onboarding?.surface_empty_hints?.recorrencia || null;

        const SECTION_ORDER = Object.freeze(["overview"]);
        const TARGET_TO_SECTION = Object.freeze({
            "recorrencia-overview": "overview",
            "recorrencia-resumo-geral": "overview",
            "agenda-recorrencia-lista": "overview",
        });

        function normalizarSecaoRecorrencia(valor) {
            const secao = texto(valor).trim().toLowerCase();
            return SECTION_ORDER.includes(secao) ? secao : "overview";
        }

        function resolverSecaoRecorrenciaPorTarget(targetId) {
            const alvo = texto(targetId).trim().replace(/^#/, "");
            if (!alvo) return null;
            if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
            return SECTION_ORDER.includes(alvo) ? alvo : null;
        }

        function obterBotoesSecaoRecorrencia() {
            return Array.from(documentRef.querySelectorAll("[data-recorrencia-section-tab]"));
        }

        function abrirSecaoRecorrencia(secao, { focusTab = false, syncUrl = true } = {}) {
            const secaoAtiva = normalizarSecaoRecorrencia(secao || state.ui?.recorrenciaSection);
            state.ui.recorrenciaSection = secaoAtiva;
            state.ui.sections = state.ui.sections || {};
            state.ui.sections.recorrencia = secaoAtiva;

            const tabAtiva = obterBotoesSecaoRecorrencia().find((button) => button.dataset.recorrenciaSectionTab === secaoAtiva) || null;
            obterBotoesSecaoRecorrencia().forEach((button) => {
                const ativa = button.dataset.recorrenciaSectionTab === secaoAtiva;
                button.classList.toggle("is-active", ativa);
                button.setAttribute("aria-selected", ativa ? "true" : "false");
                button.setAttribute("aria-current", ativa ? "page" : "false");
                button.setAttribute("tabindex", ativa ? "0" : "-1");
            });
            documentRef.querySelectorAll("[data-recorrencia-panel]").forEach((panel) => {
                panel.hidden = panel.dataset.recorrenciaPanel !== secaoAtiva;
            });
            if (focusTab && tabAtiva) {
                tabAtiva.focus();
            }
            if (syncUrl && state.ui?.tab === "recorrencia") {
                sincronizarUrlDaSecao("recorrencia", secaoAtiva);
            }
            return secaoAtiva;
        }

        function renderRecorrenciaResumo() {
            const summary = state.bootstrap?.recorrencia?.summary || {};
            const items = state.bootstrap?.recorrencia?.items || [];
            $("recorrencia-total").textContent = formatarInteiro(Number(summary.total_events || items.length || 0));
            $("recorrencia-proximos-30").textContent = formatarInteiro(Number(summary.next_30_days || 0));
            $("recorrencia-atrasados").textContent = formatarInteiro(Number(summary.overdue || 0));
            $("recorrencia-planejados").textContent = formatarInteiro(Number(summary.scheduled || 0));
            $("recorrencia-section-count-overview").textContent = `${formatarInteiro(Number(summary.total_events || items.length || 0))} eventos no tenant`;

            const alerta = $("recorrencia-alerta-principal");
            if (!alerta) return;
            if (!items.length) {
                const hint = obterHintVazio();
                alerta.innerHTML = `
                    <strong>${escapeHtml(hint?.title || "Nenhum vencimento mapeado.")}</strong>
                    <p>${escapeHtml(hint?.body || "Os prazos aparecerão aqui conforme os ativos do tenant forem consolidando próximas inspeções.")}</p>
                `;
                return;
            }
            const prioridade = items.find((item) => item.status === "overdue")
                || items.find((item) => item.status === "next_30_days")
                || items[0];
            alerta.innerHTML = `
                <strong>${escapeHtml(prioridade.asset_label || "Evento recorrente")}</strong>
                <p>${escapeHtml(
                    prioridade.status === "overdue"
                        ? `Ação imediata: prazo vencido em ${prioridade.due_at}.`
                        : `Próxima inspeção prevista para ${prioridade.due_at}.`
                )}</p>
            `;
        }

        function renderRecorrenciaLista() {
            const container = $("agenda-recorrencia-lista");
            if (!container) return;
            const items = Array.isArray(state.bootstrap?.recorrencia?.items) ? state.bootstrap.recorrencia.items : [];
            if (!items.length) {
                const hint = obterHintVazio();
                container.innerHTML = `
                    <div class="empty-state">
                        <strong>${escapeHtml(hint?.title || "Sem eventos até agora.")}</strong>
                        <p>${escapeHtml(hint?.body || "Quando os ativos tiverem vencimentos planejados, a agenda aparecerá aqui.")}</p>
                    </div>
                `;
                return;
            }
            container.innerHTML = items.map((item) => `
                <article class="recorrencia-card" data-event-id="${escapeAttr(item.event_id || "")}">
                    <div class="recorrencia-card__head">
                        <div>
                            <span class="pill" data-kind="priority" data-status="${escapeAttr(item.status || "scheduled")}">${escapeHtml(item.status_label || "Planejado")}</span>
                            <h4>${escapeHtml(item.asset_label || "Ativo")}</h4>
                        </div>
                        <span class="recorrencia-card__status">${escapeHtml(item.due_at || "Sem data")}</span>
                    </div>
                    <div class="recorrencia-card__meta">
                        <span><strong>Unidade:</strong> ${escapeHtml(item.unit_label || "Não informada")}</span>
                        <span><strong>Plano preventivo:</strong> ${escapeHtml(item.plan_label || "Plano preventivo")}</span>
                        <span><strong>Ação:</strong> ${escapeHtml(item.action_label || "Programar")}</span>
                        <span><strong>Serviços:</strong> ${escapeHtml((item.service_keys || []).join(", ").toUpperCase() || "N/D")}</span>
                    </div>
                </article>
            `).join("");
        }

        return {
            abrirSecaoRecorrencia,
            renderRecorrenciaLista,
            renderRecorrenciaResumo,
            resolverSecaoRecorrenciaPorTarget,
        };
    };
})();
