(function () {
  "use strict";

  if (window.TarielClientePortalServicosSurface) return;

  window.TarielClientePortalServicosSurface =
    function createTarielClientePortalServicosSurface(config = {}) {
      const state = config.state || {};
      const documentRef = config.documentRef || document;
      const $ =
        typeof config.getById === "function"
          ? config.getById
          : (id) => documentRef.getElementById(id);
      const helpers = config.helpers || {};

      const escapeAttr =
        typeof helpers.escapeAttr === "function"
          ? helpers.escapeAttr
          : (valor) => String(valor ?? "");
      const escapeHtml =
        typeof helpers.escapeHtml === "function"
          ? helpers.escapeHtml
          : (valor) => String(valor ?? "");
      const formatarInteiro =
        typeof helpers.formatarInteiro === "function"
          ? helpers.formatarInteiro
          : (valor) => String(Number(valor || 0));
      const sincronizarUrlDaSecao =
        typeof helpers.sincronizarUrlDaSecao === "function"
          ? helpers.sincronizarUrlDaSecao
          : () => null;
      const texto =
        typeof helpers.texto === "function"
          ? helpers.texto
          : (valor) => (valor == null ? "" : String(valor));
      const obterHintVazio = () =>
        state.bootstrap?.guided_onboarding?.surface_empty_hints?.servicos ||
        null;

      const SECTION_ORDER = Object.freeze(["overview"]);
      const TARGET_TO_SECTION = Object.freeze({
        "servicos-overview": "overview",
        "servicos-resumo-geral": "overview",
        "servicos-contratados-grid": "overview",
      });

      function normalizarSecaoServicos(valor) {
        const secao = texto(valor).trim().toLowerCase();
        return SECTION_ORDER.includes(secao) ? secao : "overview";
      }

      function resolverSecaoServicosPorTarget(targetId) {
        const alvo = texto(targetId).trim().replace(/^#/, "");
        if (!alvo) return null;
        if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
        return SECTION_ORDER.includes(alvo) ? alvo : null;
      }

      function obterBotoesSecaoServicos() {
        return Array.from(
          documentRef.querySelectorAll("[data-servicos-section-tab]"),
        );
      }

      function abrirSecaoServicos(
        secao,
        { focusTab = false, syncUrl = true } = {},
      ) {
        const secaoAtiva = normalizarSecaoServicos(
          secao || state.ui?.servicosSection,
        );
        state.ui.servicosSection = secaoAtiva;
        state.ui.sections = state.ui.sections || {};
        state.ui.sections.servicos = secaoAtiva;

        const tabAtiva =
          obterBotoesSecaoServicos().find(
            (button) => button.dataset.servicosSectionTab === secaoAtiva,
          ) || null;
        obterBotoesSecaoServicos().forEach((button) => {
          const ativa = button.dataset.servicosSectionTab === secaoAtiva;
          button.classList.toggle("is-active", ativa);
          button.setAttribute("aria-selected", ativa ? "true" : "false");
          button.setAttribute("aria-current", ativa ? "page" : "false");
          button.setAttribute("tabindex", ativa ? "0" : "-1");
        });
        documentRef
          .querySelectorAll("[data-servicos-panel]")
          .forEach((panel) => {
            panel.hidden = panel.dataset.servicosPanel !== secaoAtiva;
          });
        if (focusTab && tabAtiva) {
          tabAtiva.focus();
        }
        if (syncUrl && state.ui?.tab === "servicos") {
          sincronizarUrlDaSecao("servicos", secaoAtiva);
        }
        return secaoAtiva;
      }

      function renderServicosResumo() {
        const summary = state.bootstrap?.servicos?.summary || {};
        const items = state.bootstrap?.servicos?.items || [];
        const totalServices = Number(
          summary.total_services || items.length || 0,
        );
        const critical = Number(summary.critical_services || 0);
        const attention = Number(summary.attention_services || 0);
        const healthy = Number(summary.healthy_services || 0);
        const units = Number(summary.total_units_covered || 0);
        const alerta = $("servicos-alerta-principal");

        $("servicos-total").textContent = formatarInteiro(totalServices);
        $("servicos-criticos-total").textContent = formatarInteiro(critical);
        $("servicos-atencao-total").textContent = formatarInteiro(attention);
        $("servicos-saudaveis-total").textContent = formatarInteiro(healthy);
        $("servicos-unidades-total").textContent = formatarInteiro(units);
        $("servicos-section-count-overview").textContent =
          `${formatarInteiro(totalServices)} serviços do tenant`;

        if (!alerta) return;
        if (!items.length) {
          const hint = obterHintVazio();
          alerta.innerHTML = `
                    <strong>${escapeHtml(hint?.title || "Nenhum serviço identificado.")}</strong>
                    <p>${escapeHtml(hint?.body || "Os serviços contratados aparecerão aqui conforme os laudos do tenant forem consolidados.")}</p>
                `;
          return;
        }
        const prioridade =
          items.find((item) => item.status === "critical") ||
          items.find((item) => item.status === "attention") ||
          items[0];
        alerta.innerHTML = `
                <strong>${escapeHtml(prioridade.label || "Serviço contratado")}</strong>
                <p>${escapeHtml(
                  prioridade.next_due_at
                    ? `Próxima entrega prevista para ${prioridade.next_due_at}.`
                    : prioridade.status_label ||
                        "Acompanhe a carteira de serviços da empresa.",
                )}</p>
            `;
      }

      function renderServicosLista() {
        const container = $("servicos-contratados-grid");
        if (!container) return;
        const items = Array.isArray(state.bootstrap?.servicos?.items)
          ? state.bootstrap.servicos.items
          : [];
        if (!items.length) {
          const hint = obterHintVazio();
          container.innerHTML = `
                    <div class="empty-state">
                        <strong>${escapeHtml(hint?.title || "Sem serviços até agora.")}</strong>
                        <p>${escapeHtml(hint?.body || "Quando os laudos da empresa forem classificados, a carteira aparecerá aqui.")}</p>
                    </div>
                `;
          return;
        }

        container.innerHTML = items
          .map(
            (item) => `
                <article class="service-card" data-service-key="${escapeAttr(item.service_key || "")}">
                    <div class="service-card__head">
                        <div>
                            <span class="pill" data-kind="priority" data-status="${escapeAttr(item.status || "monitoring")}">
                                ${escapeHtml(item.status_label || "Em acompanhamento")}
                            </span>
                            <h4>${escapeHtml(item.label || "Serviço")}</h4>
                        </div>
                        <span class="service-card__status">${escapeHtml(item.family_key || "geral")}</span>
                    </div>
                    <div class="service-card__rows">
                        <div class="service-card__row">
                            <span>Unidades cobertas</span>
                            <strong>${escapeHtml(String(item.units_covered || 0))}</strong>
                        </div>
                        <div class="service-card__row">
                            <span>Ativos cobertos</span>
                            <strong>${escapeHtml(String(item.assets_covered || 0))}</strong>
                        </div>
                        <div class="service-card__row">
                            <span>Pendências do caso</span>
                            <strong>${escapeHtml(String(item.open_findings || 0))}</strong>
                        </div>
                        <div class="service-card__row">
                            <span>Documentos</span>
                            <strong>${escapeHtml(String(item.documents_ready || 0))}/${escapeHtml(String(item.documents_total || 0))}</strong>
                        </div>
                        <div class="service-card__row">
                            <span>Próxima entrega</span>
                            <strong>${escapeHtml(item.next_due_at || "Não informada")}</strong>
                        </div>
                    </div>
                </article>
            `,
          )
          .join("");
      }

      return {
        abrirSecaoServicos,
        renderServicosLista,
        renderServicosResumo,
        resolverSecaoServicosPorTarget,
      };
    };
})();
