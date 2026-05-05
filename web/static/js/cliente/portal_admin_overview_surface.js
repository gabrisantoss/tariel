(function () {
    "use strict";

    if (window.TarielClientePortalAdminOverviewSurface) return;

    window.TarielClientePortalAdminOverviewSurface = function createTarielClientePortalAdminOverviewSurface(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};

        const formatarInteiro = typeof helpers.formatarInteiro === "function" ? helpers.formatarInteiro : (valor) => String(Number(valor || 0));
        const texto = typeof helpers.texto === "function" ? helpers.texto : (valor) => (valor == null ? "" : String(valor));

        const obterTenantAdminPayload = typeof config.obterTenantAdminPayload === "function"
            ? config.obterTenantAdminPayload
            : () => null;
        const prioridadeEmpresa = typeof config.prioridadeEmpresa === "function"
            ? config.prioridadeEmpresa
            : () => ({ tone: "aprovado", badge: "", acao: "" });

        function limparElemento(target) {
            if (!target) return false;
            if (typeof target.replaceChildren === "function") {
                target.replaceChildren();
            } else {
                target.textContent = "";
            }
            return true;
        }

        function criarMetricCardOverviewNode({ accent, label, value, meta }) {
            const article = documentRef.createElement("article");
            article.className = "metric-card";
            article.dataset.accent = texto(accent);
            const small = documentRef.createElement("small");
            small.textContent = texto(label);
            article.appendChild(small);
            const strong = documentRef.createElement("strong");
            strong.textContent = texto(value);
            article.appendChild(strong);
            const span = documentRef.createElement("span");
            span.className = "metric-meta";
            span.textContent = texto(meta);
            article.appendChild(span);
            return article;
        }

        function criarContextBlockOverviewNode(label, value) {
            const block = documentRef.createElement("div");
            block.className = "context-block";
            const small = documentRef.createElement("small");
            small.textContent = texto(label);
            block.appendChild(small);
            const strong = documentRef.createElement("strong");
            strong.textContent = texto(value);
            block.appendChild(strong);
            return block;
        }

        function criarPillOverviewNode({ kind = "priority", status, label }) {
            const pill = documentRef.createElement("span");
            pill.className = "pill";
            pill.dataset.kind = texto(kind);
            if (status) pill.dataset.status = texto(status);
            pill.textContent = texto(label);
            return pill;
        }

        function criarHeroChipOverviewNode(label) {
            const chip = documentRef.createElement("span");
            chip.className = "hero-chip";
            chip.textContent = texto(label);
            return chip;
        }

        function criarToolbarOverviewNode(children = []) {
            const toolbar = documentRef.createElement("div");
            toolbar.className = "toolbar-meta";
            children.forEach((child) => {
                if (child) toolbar.appendChild(child);
            });
            return toolbar;
        }

        function criarActionButtonOverviewNode({ label, ghost = false, act, kind, canal, target, origem }) {
            const button = documentRef.createElement("button");
            button.className = ghost ? "btn ghost" : "btn";
            button.type = "button";
            if (act) button.dataset.act = texto(act);
            if (kind) button.dataset.kind = texto(kind);
            if (canal) button.dataset.canal = texto(canal);
            if (target) button.dataset.target = texto(target);
            if (origem) button.dataset.origem = texto(origem);
            button.textContent = texto(label);
            return button;
        }

        function criarEmptyStateOverviewNode(title, detail) {
            const empty = documentRef.createElement("div");
            empty.className = "empty-state";
            const strong = documentRef.createElement("strong");
            strong.textContent = texto(title);
            empty.appendChild(strong);
            const paragraph = documentRef.createElement("p");
            paragraph.textContent = texto(detail);
            empty.appendChild(paragraph);
            return empty;
        }

        function criarActivityItemOverviewNode({ title, meta, tone, pillLabel, detail, chips = [], action }) {
            const article = documentRef.createElement("article");
            article.className = "activity-item";
            const head = documentRef.createElement("div");
            head.className = "activity-head";
            const copy = documentRef.createElement("div");
            copy.className = "activity-copy";
            const strong = documentRef.createElement("strong");
            strong.textContent = texto(title);
            copy.appendChild(strong);
            const metaNode = documentRef.createElement("span");
            metaNode.className = "activity-meta";
            metaNode.textContent = texto(meta);
            copy.appendChild(metaNode);
            head.appendChild(copy);
            head.appendChild(criarPillOverviewNode({ status: tone, label: pillLabel }));
            article.appendChild(head);
            if (texto(detail).trim()) {
                const paragraph = documentRef.createElement("p");
                paragraph.className = "activity-detail";
                paragraph.textContent = texto(detail);
                article.appendChild(paragraph);
            }
            const toolbarChildren = chips
                .filter((chip) => texto(chip).trim())
                .map((chip) => criarHeroChipOverviewNode(chip));
            if (action) {
                toolbarChildren.push(criarActionButtonOverviewNode(action));
            }
            if (toolbarChildren.length) {
                article.appendChild(criarToolbarOverviewNode(toolbarChildren));
            }
            return article;
        }

        function criarStageBriefOverviewNode({ tone, eyebrow, title, detail, metrics, actions }) {
            const article = documentRef.createElement("article");
            article.className = "stage-brief-card";
            article.dataset.tone = texto(tone || "aprovado");

            const copy = documentRef.createElement("div");
            copy.className = "stage-brief-card__copy";
            const eyebrowNode = documentRef.createElement("span");
            eyebrowNode.className = "stage-brief-card__eyebrow";
            eyebrowNode.textContent = texto(eyebrow);
            copy.appendChild(eyebrowNode);
            const strong = documentRef.createElement("strong");
            strong.textContent = texto(title);
            copy.appendChild(strong);
            const paragraph = documentRef.createElement("p");
            paragraph.textContent = texto(detail);
            copy.appendChild(paragraph);
            article.appendChild(copy);

            const metricsNode = documentRef.createElement("div");
            metricsNode.className = "stage-brief-card__metrics";
            metrics.forEach((metric) => {
                metricsNode.appendChild(criarContextBlockOverviewNode(metric.label, metric.value));
            });
            article.appendChild(metricsNode);

            const actionsNode = documentRef.createElement("div");
            actionsNode.className = "stage-brief-card__actions";
            actions.forEach((action) => {
                actionsNode.appendChild(criarActionButtonOverviewNode(action));
            });
            article.appendChild(actionsNode);
            return article;
        }

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

            limparElemento(container);
            container.appendChild(criarStageBriefOverviewNode({
                tone: prioridade.tone || "aprovado",
                eyebrow: "Próximo foco",
                title: prioridade.badge || "Conta sob controle",
                detail: prioridade.acao || "A operação da conta segue visível em uma régua única de capacidade, equipe e suporte.",
                metrics: [
                    { label: "Casos monitorados", value: formatarInteiro(totalCasos) },
                    { label: "Casos abertos", value: formatarInteiro(casosAbertos) },
                    { label: "Revisões em curso", value: formatarInteiro(revisoesAtivas) },
                ],
                actions: [
                    {
                        label: "Ver indicadores",
                        act: "abrir-prioridade",
                        kind: "admin-section",
                        canal: "admin",
                        target: "admin-resumo-geral",
                        origem: "admin",
                    },
                    {
                        label: "Abrir capacidade",
                        ghost: true,
                        act: "abrir-prioridade",
                        kind: "admin-section",
                        canal: "admin",
                        target: "admin-capacity-brief",
                        origem: "admin",
                    },
                ],
            }));
        }

        function renderGuidedOnboardingOverview() {
            const resumo = $("admin-guided-onboarding-summary");
            const lista = $("admin-guided-onboarding-lista");
            const onboarding = state.bootstrap?.guided_onboarding || {};
            const steps = Array.isArray(onboarding.steps) ? onboarding.steps : [];
            const progress = onboarding.progress || {};
            const nextStep = onboarding.next_step || null;
            if (!resumo || !lista) return;

            limparElemento(resumo);
            [
                {
                    accent: "live",
                    label: "Etapas concluídas",
                    value: `${formatarInteiro(Number(progress.completed || 0))}/${formatarInteiro(Number(progress.total || steps.length || 0))}`,
                    meta: "Onboarding operacional da conta até a primeira rotina real.",
                },
                {
                    accent: nextStep ? "waiting" : "done",
                    label: "Próximo passo",
                    value: nextStep?.title || "Conta pronta para operar",
                    meta: nextStep?.detail || "Equipe, casos e leitura executiva já estão minimamente estruturados.",
                },
                {
                    accent: "aberto",
                    label: "Equipe e casos",
                    value: formatarInteiro((state.bootstrap?.usuarios || []).length),
                    meta: `${formatarInteiro((state.bootstrap?.chat?.laudos || []).length)} casos carregados neste bootstrap.`,
                },
            ].forEach((metric) => {
                resumo.appendChild(criarMetricCardOverviewNode(metric));
            });

            limparElemento(lista);
            if (!steps.length) {
                lista.appendChild(criarEmptyStateOverviewNode(
                    "Nenhuma etapa disponível",
                    "Quando o bootstrap operacional estiver completo, o onboarding guiado aparece aqui."
                ));
                return;
            }

            steps.forEach((item) => {
                lista.appendChild(criarActivityItemOverviewNode({
                    title: item.title || "Etapa operacional",
                    meta: `${item.done ? "Concluída" : "Pendente"} • ${item.key || "etapa"}`,
                    tone: item.done ? "aprovado" : "aguardando",
                    pillLabel: item.done ? "Concluído" : "Pendente",
                    detail: item.detail || "Sem detalhe registrado.",
                    action: {
                        label: item.action_label || "Abrir etapa",
                        ghost: Boolean(item.done),
                        act: "abrir-prioridade",
                        kind: item.action_kind || "admin-section",
                        canal: "admin",
                        target: item.action_target || "panel-admin",
                        origem: "admin",
                    },
                }));
            });
        }

        function renderCommercialPackageOverview() {
            const resumo = $("admin-commercial-package-summary");
            const lista = $("admin-commercial-package-lista");
            const recursosNode = $("admin-package-resource-grid");
            const pacote = state.bootstrap?.tenant_commercial_overview || {};
            if (!resumo || !lista) return;

            const surfaces = Array.isArray(pacote.available_surfaces) ? pacote.available_surfaces : [];
            const pending = Array.isArray(pacote.pending_configuration) ? pacote.pending_configuration : [];
            const recursos = Array.isArray(pacote.resources) ? pacote.resources : [];

            limparElemento(resumo);
            [
                {
                    accent: "live",
                    label: "Pacote ativo",
                    value: pacote.package_label || "Pacote contratado",
                    meta: pacote.package_description || "Modelo comercial ativo para esta conta.",
                },
                {
                    accent: pacote.mesa_contracted ? "done" : "waiting",
                    label: "Revisão Técnica contratada",
                    value: pacote.mesa_contracted ? "Sim" : "Não",
                    meta: pacote.official_issue_included ? "Emissão oficial incluída no pacote." : "Emissão oficial ainda não incluída.",
                },
                {
                    accent: "aberto",
                    label: "Operadores",
                    value: formatarInteiro(Number(pacote.operators_in_use || 0)),
                    meta: pacote.operators_limit == null
                        ? "Sem limite contratual rígido."
                        : `${formatarInteiro(Number(pacote.operators_in_use || 0))} de ${formatarInteiro(Number(pacote.operators_limit || 0))} operadores no plano.`,
                },
            ].forEach((metric) => {
                resumo.appendChild(criarMetricCardOverviewNode(metric));
            });

            limparElemento(lista);
            lista.appendChild(criarActivityItemOverviewNode({
                title: pacote.operating_model_label || "Modelo operacional",
                meta: "Modelo de operação e portais liberados",
                tone: "aprovado",
                pillLabel: `${surfaces.length} portais`,
                detail: (pacote.active_summary || []).join(" • ") || "Resumo comercial da conta.",
                chips: surfaces.map((item) => item.label || item.key || "Portal"),
            }));
            lista.appendChild(criarActivityItemOverviewNode({
                title: "O que ainda pede configuração",
                meta: "Checklist comercial e operacional da conta",
                tone: pending.length ? "aguardando" : "aprovado",
                pillLabel: pending.length ? "Pendente" : "Ativo",
                detail: pending.length ? pending.join(" • ") : "Bloqueios de pacote aparecem abaixo como limite contratual, não como erro operacional.",
                chips: pacote.assignable_portal_labels || [],
            }));

            if (!recursosNode) return;
            limparElemento(recursosNode);
            if (!recursos.length) {
                recursosNode.appendChild(criarEmptyStateOverviewNode(
                    "Recursos não mapeados",
                    "Quando o bootstrap comercial publicar capabilities neutras, elas aparecem aqui."
                ));
                return;
            }

            recursos.forEach((item) => {
                const action = item.action
                    ? {
                        label: item.action.label || "Abrir",
                        ghost: false,
                        act: "abrir-prioridade",
                        kind: item.action.kind,
                        canal: "admin",
                        target: item.action.target,
                        origem: "admin",
                    }
                    : null;
                const chips = Array.isArray(item.chips) ? item.chips : [];
                recursosNode.appendChild(criarActivityItemOverviewNode({
                    title: item.label || item.key || "Recurso",
                    meta: item.meta || (item.available ? "Incluído no pacote" : "Não incluído no pacote"),
                    tone: item.tone || (item.available ? "aprovado" : "aguardando"),
                    pillLabel: item.status_label || (item.available ? "Disponível" : "Não incluído"),
                    detail: item.detail || "",
                    chips: item.depends_on_family ? [...chips, "Depende da família/template"] : chips,
                    action,
                }));
            });
        }

        function renderProfessionalHabilitationOverview() {
            const statusNode = $("cliente-management-habilitacao-status");
            const approvedNode = $("cliente-management-habilitacao-aprovados");
            const reviewNode = $("cliente-management-habilitacao-analise");
            const blockedNode = $("cliente-management-habilitacao-bloqueios");
            const detailNode = $("cliente-management-habilitacao-detail");
            if (!statusNode || !approvedNode || !reviewNode || !blockedNode || !detailNode) return;

            const habilitacao = state.bootstrap?.professional_habilitation || {};
            const counts = habilitacao.counts || {};
            const totalBloqueios =
                Number(counts.rejected || 0) +
                Number(counts.suspended || 0) +
                Number(counts.expired || 0) +
                Number(counts.inactive || 0);
            statusNode.textContent = habilitacao.status_label || "Não enviado";
            approvedNode.textContent = formatarInteiro(Number(counts.eligible || counts.approved || 0));
            reviewNode.textContent = formatarInteiro(Number(counts.in_review || 0) + Number(counts.pending || 0));
            blockedNode.textContent = formatarInteiro(totalBloqueios);
            detailNode.textContent = habilitacao.detail || "A Tariel valida responsáveis técnicos antes de liberar emissão oficial.";
        }

        function renderOperationalObservabilityOverview() {
            const resumo = $("admin-observability-summary");
            const timeline = $("admin-observability-timeline");
            const observability = state.bootstrap?.operational_observability || {};
            const metrics = observability.executive_metrics || {};
            const steps = Array.isArray(observability.operational_timeline) ? observability.operational_timeline : [];
            if (!resumo || !timeline) return;

            limparElemento(resumo);
            [
                {
                    accent: "aberto",
                    label: "Abertos",
                    value: formatarInteiro(Number(metrics.open_cases || 0)),
                    meta: "Casos técnicos ainda correndo na conta.",
                },
                {
                    accent: "waiting",
                    label: "Aguardando mesa",
                    value: formatarInteiro(Number(metrics.awaiting_mesa || 0)),
                    meta: `${formatarInteiro(Number(metrics.sent_back || 0))} devolvidos para ajuste.`,
                },
                {
                    accent: "done",
                    label: "Emitidos",
                    value: formatarInteiro(Number(metrics.issued || 0)),
                    meta: `${formatarInteiro(Number(metrics.approved || 0))} aprovados e ${formatarInteiro(Number(metrics.due_next_30 || 0))} vencendo nos próximos 30 dias.`,
                },
                {
                    accent: "attention",
                    label: "Motivo do bloqueio",
                    value: observability.blocking_reason || "Sem bloqueio dominante",
                    meta: "Use esse sinal para explicar rápido o gargalo atual da conta.",
                },
            ].forEach((metric) => {
                resumo.appendChild(criarMetricCardOverviewNode(metric));
            });

            limparElemento(timeline);
            if (!steps.length) {
                timeline.appendChild(criarEmptyStateOverviewNode(
                    "Sem linha do tempo consolidada",
                    "Os eventos canônicos da conta aparecem aqui conforme os casos forem avançando."
                ));
                return;
            }

            steps.forEach((item) => {
                timeline.appendChild(criarActivityItemOverviewNode({
                    title: item.label || "Evento",
                    meta: "Timeline operacional canônica",
                    tone: Number(item.count || 0) > 0 ? "aprovado" : "aguardando",
                    pillLabel: formatarInteiro(Number(item.count || 0)),
                }));
            });
        }

        function renderPendingCenterOverview() {
            const lista = $("admin-pending-center-lista");
            const observability = state.bootstrap?.operational_observability || {};
            const items = Array.isArray(observability.pending_center) ? observability.pending_center : [];
            if (!lista) return;
            limparElemento(lista);
            if (!items.length) {
                lista.appendChild(criarEmptyStateOverviewNode(
                    "Nenhuma pendência central aberta",
                    "Mesa, emissão e vencimentos aparecem aqui quando houver algo dominante na conta."
                ));
                return;
            }
            items.forEach((item) => {
                lista.appendChild(criarActivityItemOverviewNode({
                    title: item.title || "Pendência",
                    meta: item.kind || "operação",
                    tone: "aguardando",
                    pillLabel: formatarInteiro(Number(item.count || 0)),
                    detail: item.detail || "Sem detalhe registrado.",
                }));
            });
        }

        return {
            renderCommercialPackageOverview,
            renderGuidedOnboardingOverview,
            renderOperationalObservabilityOverview,
            renderOverviewBrief,
            renderProfessionalHabilitationOverview,
            renderPendingCenterOverview,
        };
    };
})();
