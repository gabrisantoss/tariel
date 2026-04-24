(function () {
    "use strict";

    if (window.TarielClientePortalAdminOverviewSurface) return;

    window.TarielClientePortalAdminOverviewSurface = function createTarielClientePortalAdminOverviewSurface(config = {}) {
        const state = config.state || {};
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => document.getElementById(id);
        const helpers = config.helpers || {};

        const escapeAttr = typeof helpers.escapeAttr === "function" ? helpers.escapeAttr : (valor) => String(valor ?? "");
        const escapeHtml = typeof helpers.escapeHtml === "function" ? helpers.escapeHtml : (valor) => String(valor ?? "");
        const formatarInteiro = typeof helpers.formatarInteiro === "function" ? helpers.formatarInteiro : (valor) => String(Number(valor || 0));

        const obterTenantAdminPayload = typeof config.obterTenantAdminPayload === "function"
            ? config.obterTenantAdminPayload
            : () => null;
        const prioridadeEmpresa = typeof config.prioridadeEmpresa === "function"
            ? config.prioridadeEmpresa
            : () => ({ tone: "aprovado", badge: "", acao: "" });

        function renderOverviewBrief() {
            const container = $("admin-executive-brief");
            const empresa = state.bootstrap?.empresa;
            if (!container || !empresa) return;
            const tenantAdmin = obterTenantAdminPayload();
            const prioridade = prioridadeEmpresa(empresa, state.bootstrap?.usuarios || []);
            const totalCasos = Number(tenantAdmin?.case_counts?.total_cases || 0);
            const casosAbertos = Number(tenantAdmin?.case_counts?.open_cases || 0);
            const revisoesAtivas = Number(tenantAdmin?.review_counts?.pending_review || 0)
                + Number(tenantAdmin?.review_counts?.in_review || 0);

            container.innerHTML = `
                <article class="stage-brief-card" data-tone="${escapeAttr(prioridade.tone || "aprovado")}">
                    <div class="stage-brief-card__copy">
                        <span class="stage-brief-card__eyebrow">Resumo executivo</span>
                        <strong>${escapeHtml(prioridade.badge || "Empresa sob controle")}</strong>
                        <p>${escapeHtml(prioridade.acao || "A operacao da empresa segue visivel em uma regua unica de capacidade, equipe e suporte.")}</p>
                    </div>
                    <div class="stage-brief-card__metrics">
                        <div class="context-block">
                            <small>Casos monitorados</small>
                            <strong>${escapeHtml(formatarInteiro(totalCasos))}</strong>
                        </div>
                        <div class="context-block">
                            <small>Casos abertos</small>
                            <strong>${escapeHtml(formatarInteiro(casosAbertos))}</strong>
                        </div>
                        <div class="context-block">
                            <small>Revisoes em curso</small>
                            <strong>${escapeHtml(formatarInteiro(revisoesAtivas))}</strong>
                        </div>
                    </div>
                    <div class="stage-brief-card__actions">
                        <button class="btn" type="button" data-act="abrir-prioridade" data-kind="admin-section" data-canal="admin" data-target="admin-saude-resumo" data-origem="admin">Ver pulso da operacao</button>
                        <button class="btn ghost" type="button" data-act="abrir-prioridade" data-kind="admin-section" data-canal="admin" data-target="admin-capacity-brief" data-origem="admin">Abrir capacidade</button>
                    </div>
                </article>
            `;
        }

        function renderGuidedOnboardingOverview() {
            const resumo = $("admin-guided-onboarding-summary");
            const lista = $("admin-guided-onboarding-lista");
            const onboarding = state.bootstrap?.guided_onboarding || {};
            const steps = Array.isArray(onboarding.steps) ? onboarding.steps : [];
            const progress = onboarding.progress || {};
            const nextStep = onboarding.next_step || null;
            if (!resumo || !lista) return;

            resumo.innerHTML = `
                <article class="metric-card" data-accent="live">
                    <small>Etapas concluídas</small>
                    <strong>${formatarInteiro(Number(progress.completed || 0))}/${formatarInteiro(Number(progress.total || steps.length || 0))}</strong>
                    <span class="metric-meta">Onboarding operacional do tenant até a primeira rotina real.</span>
                </article>
                <article class="metric-card" data-accent="${nextStep ? "waiting" : "done"}">
                    <small>Próximo passo</small>
                    <strong>${escapeHtml(nextStep?.title || "Tenant pronto para operar")}</strong>
                    <span class="metric-meta">${escapeHtml(nextStep?.detail || "Equipe, casos e leitura executiva já estão minimamente estruturados.")}</span>
                </article>
                <article class="metric-card" data-accent="aberto">
                    <small>Equipe e casos</small>
                    <strong>${formatarInteiro((state.bootstrap?.usuarios || []).length)}</strong>
                    <span class="metric-meta">${formatarInteiro((state.bootstrap?.chat?.laudos || []).length)} casos carregados neste bootstrap.</span>
                </article>
            `;

            if (!steps.length) {
                lista.innerHTML = `
                    <div class="empty-state">
                        <strong>Nenhuma etapa disponível</strong>
                        <p>Quando o bootstrap operacional estiver completo, o onboarding guiado aparece aqui.</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = steps.map((item) => `
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>${escapeHtml(item.title || "Etapa operacional")}</strong>
                            <span class="activity-meta">${escapeHtml(item.done ? "Concluída" : "Pendente")} • ${escapeHtml(item.key || "etapa")}</span>
                        </div>
                        <span class="pill" data-kind="priority" data-status="${escapeAttr(item.done ? "aprovado" : "aguardando")}">${escapeHtml(item.done ? "Concluído" : "Pendente")}</span>
                    </div>
                    <p class="activity-detail">${escapeHtml(item.detail || "Sem detalhe registrado.")}</p>
                    <div class="toolbar-meta">
                        <button
                            class="btn${item.done ? " ghost" : ""}"
                            type="button"
                            data-act="abrir-prioridade"
                            data-kind="${escapeAttr(item.action_kind || "admin-section")}"
                            data-canal="admin"
                            data-target="${escapeAttr(item.action_target || "panel-admin")}"
                            data-origem="admin"
                        >${escapeHtml(item.action_label || "Abrir etapa")}</button>
                    </div>
                </article>
            `).join("");
        }

        function renderCommercialPackageOverview() {
            const resumo = $("admin-commercial-package-summary");
            const lista = $("admin-commercial-package-lista");
            const pacote = state.bootstrap?.tenant_commercial_overview || {};
            if (!resumo || !lista) return;

            const surfaces = Array.isArray(pacote.available_surfaces) ? pacote.available_surfaces : [];
            const pending = Array.isArray(pacote.pending_configuration) ? pacote.pending_configuration : [];

            resumo.innerHTML = `
                <article class="metric-card" data-accent="live">
                    <small>Pacote ativo</small>
                    <strong>${escapeHtml(pacote.package_label || "Pacote contratado")}</strong>
                    <span class="metric-meta">${escapeHtml(pacote.package_description || "Modelo comercial ativo para este tenant.")}</span>
                </article>
                <article class="metric-card" data-accent="${pacote.mesa_contracted ? "done" : "waiting"}">
                    <small>Mesa contratada</small>
                    <strong>${escapeHtml(pacote.mesa_contracted ? "Sim" : "Não")}</strong>
                    <span class="metric-meta">${escapeHtml(pacote.official_issue_included ? "Emissão oficial incluída no pacote." : "Emissão oficial ainda não incluída.")}</span>
                </article>
                <article class="metric-card" data-accent="aberto">
                    <small>Operadores</small>
                    <strong>${escapeHtml(formatarInteiro(Number(pacote.operators_in_use || 0)))}</strong>
                    <span class="metric-meta">${pacote.operators_limit == null ? "Sem limite contratual rígido." : `${escapeHtml(formatarInteiro(Number(pacote.operators_in_use || 0)))} de ${escapeHtml(formatarInteiro(Number(pacote.operators_limit || 0)))} operadores no plano.`}</span>
                </article>
            `;

            lista.innerHTML = `
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>${escapeHtml(pacote.operating_model_label || "Modelo operacional")}</strong>
                            <span class="activity-meta">Modelo de operação e portais liberados</span>
                        </div>
                        <span class="pill" data-kind="priority" data-status="aprovado">${escapeHtml(`${surfaces.length} portais`)}</span>
                    </div>
                    <p class="activity-detail">${escapeHtml((pacote.active_summary || []).join(" • ") || "Resumo comercial do tenant.")}</p>
                    <div class="toolbar-meta">
                        ${surfaces.map((item) => `<span class="hero-chip">${escapeHtml(item.label || item.key || "Portal")}</span>`).join("")}
                    </div>
                </article>
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>O que ainda pede configuração</strong>
                            <span class="activity-meta">Checklist comercial e operacional do tenant</span>
                        </div>
                        <span class="pill" data-kind="priority" data-status="${pending.length ? "aguardando" : "aprovado"}">${escapeHtml(pending.length ? "Pendente" : "Ativo")}</span>
                    </div>
                    <p class="activity-detail">${escapeHtml(pending.length ? pending.join(" • ") : "Pacote, portais e emissão já estão refletidos na operação atual.")}</p>
                    <div class="toolbar-meta">
                        ${(pacote.assignable_portal_labels || []).map((item) => `<span class="hero-chip">${escapeHtml(item)}</span>`).join("")}
                    </div>
                </article>
            `;
        }

        function renderOperationalObservabilityOverview() {
            const resumo = $("admin-observability-summary");
            const timeline = $("admin-observability-timeline");
            const observability = state.bootstrap?.operational_observability || {};
            const metrics = observability.executive_metrics || {};
            const steps = Array.isArray(observability.operational_timeline) ? observability.operational_timeline : [];
            if (!resumo || !timeline) return;

            resumo.innerHTML = `
                <article class="metric-card" data-accent="aberto">
                    <small>Abertos</small>
                    <strong>${formatarInteiro(Number(metrics.open_cases || 0))}</strong>
                    <span class="metric-meta">Casos técnicos ainda correndo no tenant.</span>
                </article>
                <article class="metric-card" data-accent="waiting">
                    <small>Aguardando mesa</small>
                    <strong>${formatarInteiro(Number(metrics.awaiting_mesa || 0))}</strong>
                    <span class="metric-meta">${formatarInteiro(Number(metrics.sent_back || 0))} devolvidos para ajuste.</span>
                </article>
                <article class="metric-card" data-accent="done">
                    <small>Emitidos</small>
                    <strong>${formatarInteiro(Number(metrics.issued || 0))}</strong>
                    <span class="metric-meta">${formatarInteiro(Number(metrics.approved || 0))} aprovados e ${formatarInteiro(Number(metrics.due_next_30 || 0))} vencendo nos próximos 30 dias.</span>
                </article>
                <article class="metric-card" data-accent="attention">
                    <small>Motivo do bloqueio</small>
                    <strong>${escapeHtml(observability.blocking_reason || "Sem bloqueio dominante")}</strong>
                    <span class="metric-meta">Use esse sinal para explicar rápido o gargalo atual do tenant.</span>
                </article>
            `;

            if (!steps.length) {
                timeline.innerHTML = `
                    <div class="empty-state">
                        <strong>Sem linha do tempo consolidada</strong>
                        <p>Os eventos canônicos do tenant aparecem aqui conforme os casos forem avançando.</p>
                    </div>
                `;
                return;
            }

            timeline.innerHTML = steps.map((item) => `
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>${escapeHtml(item.label || "Evento")}</strong>
                            <span class="activity-meta">Timeline operacional canônica</span>
                        </div>
                        <span class="pill" data-kind="priority" data-status="${Number(item.count || 0) > 0 ? "aprovado" : "aguardando"}">${escapeHtml(formatarInteiro(Number(item.count || 0)))}</span>
                    </div>
                </article>
            `).join("");
        }

        function renderPendingCenterOverview() {
            const lista = $("admin-pending-center-lista");
            const observability = state.bootstrap?.operational_observability || {};
            const items = Array.isArray(observability.pending_center) ? observability.pending_center : [];
            if (!lista) return;
            if (!items.length) {
                lista.innerHTML = `
                    <div class="empty-state">
                        <strong>Nenhuma pendência central aberta</strong>
                        <p>Mesa, emissão e vencimentos aparecem aqui quando houver algo dominante no tenant.</p>
                    </div>
                `;
                return;
            }
            lista.innerHTML = items.map((item) => `
                <article class="activity-item">
                    <div class="activity-head">
                        <div class="activity-copy">
                            <strong>${escapeHtml(item.title || "Pendência")}</strong>
                            <span class="activity-meta">${escapeHtml(item.kind || "operacao")}</span>
                        </div>
                        <span class="pill" data-kind="priority" data-status="aguardando">${escapeHtml(formatarInteiro(Number(item.count || 0)))}</span>
                    </div>
                    <p class="activity-detail">${escapeHtml(item.detail || "Sem detalhe registrado.")}</p>
                </article>
            `).join("");
        }

        return {
            renderCommercialPackageOverview,
            renderGuidedOnboardingOverview,
            renderOperationalObservabilityOverview,
            renderOverviewBrief,
            renderPendingCenterOverview,
        };
    };
})();
