(function () {
  "use strict";

  if (window.TarielClientePortalAdminSurface) return;

  window.TarielClientePortalAdminSurface =
    function createTarielClientePortalAdminSurface(config = {}) {
      const state = config.state || {};
      const documentRef = config.documentRef || document;
      const windowRef = config.windowRef || window;
      const $ =
        typeof config.getById === "function"
          ? config.getById
          : (id) => documentRef.getElementById(id);
      const helpers = config.helpers || {};
      const filters = config.filters || {};
      const labels = config.labels || {};

      const escapeAttr =
        typeof helpers.escapeAttr === "function"
          ? helpers.escapeAttr
          : (valor) => String(valor ?? "");
      const escapeHtml =
        typeof helpers.escapeHtml === "function"
          ? helpers.escapeHtml
          : (valor) => String(valor ?? "");
      const formatarCapacidadeRestante =
        typeof helpers.formatarCapacidadeRestante === "function"
          ? helpers.formatarCapacidadeRestante
          : () => "";
      const formatarInteiro =
        typeof helpers.formatarInteiro === "function"
          ? helpers.formatarInteiro
          : (valor) => String(Number(valor || 0));
      const formatarLimitePlano =
        typeof helpers.formatarLimitePlano === "function"
          ? helpers.formatarLimitePlano
          : () => "";
      const formatarPercentual =
        typeof helpers.formatarPercentual === "function"
          ? helpers.formatarPercentual
          : () => "";
      const formatarVariacao =
        typeof helpers.formatarVariacao === "function"
          ? helpers.formatarVariacao
          : () => "";
      const obterNomePapel =
        typeof helpers.obterNomePapel === "function"
          ? helpers.obterNomePapel
          : (valor) => String(valor ?? "");
      const obterPlanoCatalogo =
        typeof helpers.obterPlanoCatalogo === "function"
          ? helpers.obterPlanoCatalogo
          : () => null;
      const ordenarPorPrioridade =
        typeof helpers.ordenarPorPrioridade === "function"
          ? helpers.ordenarPorPrioridade
          : (lista) => [...(lista || [])];
      const parseDataIso =
        typeof helpers.parseDataIso === "function"
          ? helpers.parseDataIso
          : () => 0;
      const prioridadeEmpresa =
        typeof helpers.prioridadeEmpresa === "function"
          ? helpers.prioridadeEmpresa
          : () => ({ tone: "aprovado", badge: "", acao: "" });
      const prioridadeUsuario =
        typeof helpers.prioridadeUsuario === "function"
          ? helpers.prioridadeUsuario
          : () => ({ tone: "aprovado", badge: "", acao: "", score: 0 });
      const slugPapel =
        typeof helpers.slugPapel === "function"
          ? helpers.slugPapel
          : () => "inspetor";
      const texto =
        typeof helpers.texto === "function"
          ? helpers.texto
          : (valor) => (valor == null ? "" : String(valor));
      const tomCapacidadeEmpresa =
        typeof helpers.tomCapacidadeEmpresa === "function"
          ? helpers.tomCapacidadeEmpresa
          : () => "aprovado";
      const sincronizarUrlDaSecao =
        typeof helpers.sincronizarUrlDaSecao === "function"
          ? helpers.sincronizarUrlDaSecao
          : () => null;

      const filtrarUsuarios =
        typeof filters.filtrarUsuarios === "function"
          ? filters.filtrarUsuarios
          : () => [];
      const rotuloSituacaoUsuarios =
        typeof labels.rotuloSituacaoUsuarios === "function"
          ? labels.rotuloSituacaoUsuarios
          : () => "";
      const adminOverviewSurface =
        typeof windowRef.TarielClientePortalAdminOverviewSurface === "function"
          ? windowRef.TarielClientePortalAdminOverviewSurface({
              state,
              documentRef,
              getById: $,
              helpers: {
                escapeAttr,
                escapeHtml,
                formatarInteiro,
              },
              obterTenantAdminPayload,
              prioridadeEmpresa,
            })
          : null;

      const STAGE_IDS = Object.freeze({
        overview: "admin-overview",
        capacity: "admin-capacity",
        team: "admin-team",
        support: "admin-support",
      });
      const STAGE_ORDER = Object.freeze([
        "overview",
        "capacity",
        "team",
        "support",
      ]);
      const SECTION_META = Object.freeze({
        overview: Object.freeze({
          title: "Resumo",
          meta: "Panorama, saude e proximo foco da empresa.",
        }),
        capacity: Object.freeze({
          title: "Plano e capacidade",
          meta: "Limites, folga e historico comercial da empresa.",
        }),
        team: Object.freeze({
          title: "Equipe",
          meta: "Criacao, ativacao e manutencao dos acessos da empresa.",
        }),
        support: Object.freeze({
          title: "Suporte",
          meta: "Diagnostico, protocolo e trilha recente da empresa.",
        }),
      });
      const AUDIT_FILTERS = Object.freeze([
        Object.freeze({
          key: "all",
          label: "Tudo",
          description: "Historico completo da empresa",
        }),
        Object.freeze({
          key: "admin",
          label: "Painel",
          description: "Plano, equipe e acesso",
        }),
        Object.freeze({
          key: "support",
          label: "Suporte",
          description: "Protocolos e diagnostico",
        }),
        Object.freeze({
          key: "chat",
          label: "Chat",
          description: "Movimentos operacionais do chat",
        }),
        Object.freeze({
          key: "mesa",
          label: "Mesa",
          description: "Pendencias e respostas da mesa",
        }),
        Object.freeze({
          key: "team",
          label: "Equipe",
          description: "Criacao e manutencao de usuarios",
        }),
      ]);
      const TARGET_TO_SECTION = Object.freeze({
        "admin-overview": "overview",
        "admin-resumo-geral": "overview",
        "admin-executive-brief": "overview",
        "empresa-cards": "overview",
        "admin-guided-onboarding": "overview",
        "admin-guided-onboarding-summary": "overview",
        "admin-guided-onboarding-lista": "overview",
        "admin-saude-resumo": "overview",
        "admin-saude-historico": "overview",
        "admin-commercial-package": "overview",
        "admin-commercial-package-summary": "overview",
        "admin-commercial-package-lista": "overview",
        "admin-package-resource-grid": "overview",
        "admin-observability-executive": "overview",
        "admin-observability-summary": "overview",
        "admin-observability-timeline": "overview",
        "admin-pending-center": "overview",
        "admin-pending-center-lista": "overview",
        "admin-capacity": "capacity",
        "admin-capacity-brief": "capacity",
        "admin-planos": "capacity",
        "admin-planos-box": "capacity",
        "empresa-resumo-detalhado": "capacity",
        "empresa-alerta-capacidade": "capacity",
        "plano-impacto-preview": "capacity",
        "admin-planos-historico": "capacity",
        "form-plano": "capacity",
        "empresa-plano": "capacity",
        "btn-plano-registrar": "capacity",
        "admin-team": "team",
        "admin-team-brief": "team",
        "admin-equipe": "team",
        "admin-equipe-criacao": "team",
        "admin-equipe-onboarding": "team",
        "form-usuario": "team",
        "usuario-capacidade-nota": "team",
        "btn-usuario-criar": "team",
        "admin-onboarding-resumo": "team",
        "admin-onboarding-lista": "team",
        "admin-equipe-lista": "team",
        "usuarios-busca": "team",
        "usuarios-filtro-papel": "team",
        "usuarios-resumo": "team",
        "lista-usuarios": "team",
        "usuarios-vazio": "team",
        "admin-support": "support",
        "admin-support-brief": "support",
        "admin-governanca": "support",
        "admin-suporte": "support",
        "admin-support-policy": "support",
        "admin-support-protocol": "support",
        "admin-diagnostico-resumo": "support",
        "btn-exportar-diagnostico": "support",
        "btn-whatsapp-suporte": "support",
        "form-suporte-cliente": "support",
        "admin-auditoria": "support",
        "admin-auditoria-filtros": "support",
        "admin-auditoria-busca": "support",
        "admin-audit-overview": "support",
        "admin-auditoria-lista": "support",
      });
      const queuedStages = new Map();

      function normalizarSecaoAdmin(valor) {
        const secao = texto(valor).trim().toLowerCase();
        if (secao === "planos") return "capacity";
        if (secao === "equipe") return "team";
        if (secao === "governanca") return "support";
        return STAGE_ORDER.includes(secao) ? secao : "overview";
      }

      function resolverSecaoAdminPorTarget(targetId) {
        const alvo = texto(targetId).trim().replace(/^#/, "");
        if (!alvo) return null;
        if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
        return STAGE_ORDER.includes(alvo) ? alvo : null;
      }

      function obterBotoesSecaoAdmin() {
        return Array.from(
          documentRef.querySelectorAll("[data-admin-section-tab]"),
        );
      }

      function obterPaineisSecaoAdmin() {
        return Array.from(documentRef.querySelectorAll("[data-admin-panel]"));
      }

      function obterTenantAdminPayload() {
        return state.bootstrap?.tenant_admin_projection?.payload || null;
      }

      function formatarRotuloLista(lista, { fallback = "nao definido" } = {}) {
        const itens = Array.isArray(lista)
          ? lista.map((item) => texto(item).trim()).filter(Boolean)
          : [];
        if (!itens.length) return fallback;
        if (itens.length === 1) return itens[0];
        if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
        return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
      }

      function obterGovernancaOperacionalTenant() {
        const tenantAdmin = obterTenantAdminPayload();
        const policy = tenantAdmin?.visibility_policy || {};
        const usuariosOperacionais = Array.isArray(state.bootstrap?.usuarios)
          ? state.bootstrap.usuarios
          : [];
        const enabled =
          Boolean(policy?.shared_mobile_operator_enabled) &&
          texto(policy?.commercial_operating_model).trim() ===
            "mobile_single_operator";
        const limitValue = Number(policy?.contract_operational_user_limit);
        const operationalUserLimit =
          Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null;
        const slotsInUseValue = Number(
          policy?.operational_identity_slots_in_use,
        );
        const operationalUsersInUse =
          Number.isFinite(slotsInUseValue) && slotsInUseValue >= 0
            ? slotsInUseValue
            : usuariosOperacionais.length;
        const operationalUsersRemaining =
          operationalUserLimit == null
            ? null
            : Math.max(operationalUserLimit - operationalUsersInUse, 0);
        const operationalUsersExcess =
          operationalUserLimit == null
            ? 0
            : Math.max(operationalUsersInUse - operationalUserLimit, 0);
        const surfaceSet = Array.isArray(
          policy?.shared_mobile_operator_surface_set,
        )
          ? policy.shared_mobile_operator_surface_set
              .map((item) => texto(item).trim())
              .filter(Boolean)
          : [];
        const surfaceLabels = surfaceSet.map((item) => {
          if (item === "mobile") return "App mobile";
          if (item === "inspetor_web") return "Portal de campo";
          if (item === "mesa_web") return "Portal de revisao";
          return item.replaceAll("_", " ");
        });
        const assignablePortalSet = Array.isArray(
          policy?.tenant_assignable_portal_set,
        )
          ? policy.tenant_assignable_portal_set
              .map((item) => texto(item).trim())
              .filter(Boolean)
          : ["inspetor", "revisor"];
        return {
          enabled,
          operatingModel:
            texto(policy?.commercial_operating_model).trim() || "standard",
          operatingModelLabel: enabled
            ? "Mobile principal com operador único"
            : "Operação padrão",
          operationalUserLimit,
          operationalUsersInUse,
          operationalUsersRemaining,
          operationalUsersExcess,
          operationalUsersAtLimit:
            operationalUserLimit != null &&
            operationalUsersInUse >= operationalUserLimit,
          sharedMobileOperatorWebInspectorEnabled: Boolean(
            policy?.shared_mobile_operator_web_inspector_enabled,
          ),
          sharedMobileOperatorWebReviewEnabled: Boolean(
            policy?.shared_mobile_operator_web_review_enabled,
          ),
          operationalUserCrossPortalEnabled: Boolean(
            policy?.operational_user_cross_portal_enabled,
          ),
          operationalUserAdminPortalEnabled: Boolean(
            policy?.operational_user_admin_portal_enabled,
          ),
          assignablePortalSet,
          surfaceSet,
          surfaceLabels,
          surfacesSummary: formatarRotuloLista(surfaceLabels, {
            fallback: "App mobile",
          }),
          identityNote: enabled
            ? "A conta principal pode concentrar o portal da empresa, o campo, a revisao e o mobile conforme as liberacoes contratadas."
            : "Cada pessoa segue a combinacao de acessos liberada para esta empresa.",
        };
      }

      function resumirMomentoCanonicoTenantAdmin() {
        const tenantAdmin = obterTenantAdminPayload() || {};
        const caseCounts = tenantAdmin?.case_counts || {};
        const reviewCounts = tenantAdmin?.review_counts || {};
        const documentCounts = tenantAdmin?.document_counts || {};
        const observedCaseIds = Array.isArray(tenantAdmin?.observed_case_ids)
          ? tenantAdmin.observed_case_ids
          : [];
        const totalCases = Number(caseCounts?.total_cases || 0);
        const openCases = Number(caseCounts?.open_cases || 0);
        const pendingReview = Number(reviewCounts?.pending_review || 0);
        const inReview = Number(reviewCounts?.in_review || 0);
        const sentBack = Number(reviewCounts?.sent_back_for_adjustment || 0);
        const issuedDocuments = Number(documentCounts?.issued_documents || 0);

        const base = {
          key: "tenant_monitoring",
          label: "Monitorar tenant",
          detail:
            "A operacao segue distribuida sem um gargalo canonico dominante neste momento.",
          tone: "aguardando",
          ownerLabel: "Leitura distribuida",
          observedCount: observedCaseIds.length,
          chips: [
            `${formatarInteiro(openCases)} abertos`,
            `${formatarInteiro(pendingReview + inReview)} em mesa`,
            `${formatarInteiro(issuedDocuments)} emitidos`,
          ],
        };

        if (sentBack > 0) {
          return {
            ...base,
            key: "tenant_sent_back",
            label: "Casos devolvidos ao campo",
            detail: `${formatarInteiro(sentBack)} caso(s) voltaram para ajuste e pedem retomada do time operacional.`,
            tone: "ajustes",
            ownerLabel: "Responsavel predominante: campo",
          };
        }

        if (inReview > 0) {
          return {
            ...base,
            key: "tenant_in_review",
            label: "Mesa em andamento",
            detail: `${formatarInteiro(inReview)} caso(s) estao com validacao humana em curso na mesa.`,
            tone: "aberto",
            ownerLabel: "Responsavel predominante: mesa",
          };
        }

        if (pendingReview > 0) {
          return {
            ...base,
            key: "tenant_pending_review",
            label: "Decisao pendente",
            detail: `${formatarInteiro(pendingReview)} caso(s) aguardam decisao objetiva da mesa.`,
            tone: "aguardando",
            ownerLabel: "Responsavel predominante: mesa",
          };
        }

        if (openCases > 0) {
          return {
            ...base,
            key: "tenant_field_open",
            label: "Campo em andamento",
            detail: `${formatarInteiro(openCases)} caso(s) seguem em coleta ou consolidacao antes da revisao humana.`,
            tone: "aberto",
            ownerLabel: "Responsavel predominante: campo",
          };
        }

        if (issuedDocuments > 0) {
          return {
            ...base,
            key: "tenant_issued",
            label: "Emissao concluida",
            detail: `${formatarInteiro(issuedDocuments)} documento(s) ja fecharam o ciclo canonico recente do tenant.`,
            tone: "aprovado",
            ownerLabel: "Responsavel predominante: conclusao",
          };
        }

        if (totalCases <= 0) {
          return {
            ...base,
            key: "tenant_empty",
            label: "Sem casos observados",
            detail:
              "Ainda nao ha casos suficientes na projecao para destacar um momento canonico do tenant.",
            tone: "aguardando",
            ownerLabel: "Responsavel predominante: indisponivel",
            chips: ["0 abertos", "0 em mesa", "0 emitidos"],
          };
        }

        return base;
      }

      function marcarEstadoStage(stage, status) {
        const node = $(STAGE_IDS[stage]);
        if (!node) return;
        node.dataset.stageState = status;
      }

      function limparStageAgendado(stage) {
        const registro = queuedStages.get(stage);
        if (!registro) return;
        if (Number.isFinite(registro.timeoutId)) {
          windowRef.clearTimeout(registro.timeoutId);
        }
        if (typeof registro.cancelIdle === "function") {
          registro.cancelIdle();
        }
        queuedStages.delete(stage);
      }

      function definirTextoNoElemento(id, valor) {
        const node = $(id);
        if (!node) return;
        node.textContent = texto(valor);
      }

      function preencherHtmlNoElemento(id, html) {
        const node = $(id);
        if (!node) return;
        node.innerHTML = html;
      }

      function limparElemento(target) {
        if (!target) return false;
        if (typeof target.replaceChildren === "function") {
          target.replaceChildren();
        } else {
          target.textContent = "";
        }
        return true;
      }

      function criarMetricCardAdminNode({ accent, label, value, meta }) {
        const card = documentRef.createElement("article");
        card.className = "metric-card";
        if (accent) {
          card.dataset.accent = texto(accent).trim();
        }
        const labelNode = documentRef.createElement("small");
        labelNode.textContent = texto(label);
        card.appendChild(labelNode);
        const valueNode = documentRef.createElement("strong");
        valueNode.textContent = texto(value);
        card.appendChild(valueNode);
        const metaNode = documentRef.createElement("span");
        metaNode.className = "metric-meta";
        metaNode.textContent = texto(meta);
        card.appendChild(metaNode);
        return card;
      }

      function criarContextBlockAdminNode(label, value) {
        const block = documentRef.createElement("div");
        block.className = "context-block";
        const labelNode = documentRef.createElement("small");
        labelNode.textContent = texto(label);
        block.appendChild(labelNode);
        const valueNode = documentRef.createElement("strong");
        valueNode.textContent = texto(value);
        block.appendChild(valueNode);
        return block;
      }

      function criarFormHintAdminNode({ tone, title, detail }) {
        const hint = documentRef.createElement("div");
        hint.className = "form-hint";
        hint.dataset.tone = texto(tone).trim();
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        hint.appendChild(titleNode);
        const detailNode = documentRef.createElement("span");
        detailNode.textContent = texto(detail);
        hint.appendChild(detailNode);
        return hint;
      }

      function criarCapacityAlertAdminNode({
        tone,
        label,
        messages = [],
        sideItems = [],
      }) {
        const alert = documentRef.createElement("div");
        alert.className = "context-guidance capacity-alert";
        alert.dataset.tone = texto(tone).trim();

        const copy = documentRef.createElement("div");
        copy.className = "context-guidance-copy";
        const eyebrowNode = documentRef.createElement("small");
        eyebrowNode.textContent = "Capacidade e proximo passo comercial";
        copy.appendChild(eyebrowNode);
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(label);
        copy.appendChild(titleNode);
        messages.forEach((message) => {
          const paragraph = documentRef.createElement("p");
          paragraph.textContent = texto(message);
          copy.appendChild(paragraph);
        });
        alert.appendChild(copy);

        const side = documentRef.createElement("div");
        side.className = "capacity-alert-side";
        sideItems.forEach((item) => {
          const chip = documentRef.createElement("span");
          chip.className = item.className || "hero-chip";
          if (item.kind) chip.dataset.kind = texto(item.kind);
          if (item.status) chip.dataset.status = texto(item.status);
          chip.textContent = texto(item.label);
          side.appendChild(chip);
        });
        alert.appendChild(side);
        return alert;
      }

      function criarPillAdminNode({ kind, status, label, className = "pill" }) {
        const pill = documentRef.createElement("span");
        pill.className = className;
        if (kind) pill.dataset.kind = texto(kind);
        if (status) pill.dataset.status = texto(status);
        pill.textContent = texto(label);
        return pill;
      }

      function criarHeroChipAdminNode(label) {
        const chip = documentRef.createElement("span");
        chip.className = "hero-chip";
        chip.textContent = texto(label);
        return chip;
      }

      function criarFeatureChipAdminNode({ enabled = true, label }) {
        const chip = documentRef.createElement("span");
        chip.className = "feature-chip";
        chip.dataset.enabled = enabled ? "true" : "false";
        chip.textContent = texto(label);
        return chip;
      }

      function criarSupportPolicyCardAdminNode({ label, value, detail }) {
        const article = documentRef.createElement("article");
        article.className = "support-policy-card";
        const labelNode = documentRef.createElement("small");
        labelNode.textContent = texto(label);
        article.appendChild(labelNode);
        const valueNode = documentRef.createElement("strong");
        valueNode.textContent = texto(value);
        article.appendChild(valueNode);
        const detailNode = documentRef.createElement("span");
        detailNode.textContent = texto(detail);
        article.appendChild(detailNode);
        return article;
      }

      function criarSupportProtocolCopyAdminNode({ protocol, detail }) {
        const copy = documentRef.createElement("div");
        copy.className = "support-protocol__copy";
        const eyebrow = documentRef.createElement("span");
        eyebrow.className = "support-protocol__eyebrow";
        eyebrow.textContent = "Protocolo e janela de suporte";
        copy.appendChild(eyebrow);
        const title = documentRef.createElement("strong");
        title.textContent = texto(protocol);
        copy.appendChild(title);
        const paragraph = documentRef.createElement("p");
        paragraph.textContent = texto(detail);
        copy.appendChild(paragraph);
        return copy;
      }

      function criarSupportProtocolStatusAdminNode(items) {
        const status = documentRef.createElement("div");
        status.className = "support-protocol__status";
        (Array.isArray(items) ? items : []).forEach((item) => {
          status.appendChild(criarPillAdminNode(item));
        });
        return status;
      }

      function criarContextGuidanceAdminNode({
        tone,
        eyebrow,
        title,
        detail,
        sideNode,
      }) {
        const guidance = documentRef.createElement("div");
        guidance.className = "context-guidance";
        guidance.dataset.tone = texto(tone).trim();

        const copy = documentRef.createElement("div");
        copy.className = "context-guidance-copy";
        const eyebrowNode = documentRef.createElement("small");
        eyebrowNode.textContent = texto(eyebrow);
        copy.appendChild(eyebrowNode);
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        copy.appendChild(titleNode);
        const detailNode = documentRef.createElement("p");
        detailNode.textContent = texto(detail);
        copy.appendChild(detailNode);
        guidance.appendChild(copy);

        if (sideNode) {
          guidance.appendChild(sideNode);
        }
        return guidance;
      }

      function criarHealthBarsAdminNode(serie, tone) {
        const lista = Array.isArray(serie) ? serie : [];
        const maior = Math.max(
          ...lista.map((item) => Number(item?.total || 0)),
          1,
        );
        const bars = documentRef.createElement("div");
        bars.className = "health-bars";
        bars.dataset.tone = texto(tone || "aberto").trim();

        lista.forEach((item) => {
          const total = Number(item?.total || 0);
          const altura = Math.max(10, Math.round((total / maior) * 100));
          const bar = documentRef.createElement("div");
          bar.className = "health-bar";
          bar.title = `${texto(item?.label)}: ${total}`;

          const fill = documentRef.createElement("div");
          fill.className = `health-bar-fill${item?.atual ? " is-current" : ""}`;
          fill.style.height = `${altura}%`;
          bar.appendChild(fill);

          const valueNode = documentRef.createElement("span");
          valueNode.className = "health-bar-value";
          valueNode.textContent = formatarInteiro(total);
          bar.appendChild(valueNode);

          const labelNode = documentRef.createElement("span");
          labelNode.className = "health-bar-label";
          labelNode.textContent = texto(item?.label);
          bar.appendChild(labelNode);
          bars.appendChild(bar);
        });

        return bars;
      }

      function criarHealthCardAdminNode({
        tone,
        eyebrow,
        title,
        detail,
        pillLabel,
        serie,
      }) {
        const article = documentRef.createElement("article");
        article.className = "health-card";
        article.appendChild(
          criarContextGuidanceAdminNode({
            tone,
            eyebrow,
            title,
            detail,
            sideNode: criarPillAdminNode({
              kind: "priority",
              status: tone,
              label: pillLabel,
            }),
          }),
        );
        article.appendChild(criarHealthBarsAdminNode(serie, tone));
        return article;
      }

      function criarAdminActionButtonNode({
        label,
        primary = false,
        ghost = false,
        act,
        kind,
        canal,
        target,
        origem,
        dataset = {},
      }) {
        const button = documentRef.createElement("button");
        button.className = primary
          ? "btn primary"
          : ghost
            ? "btn ghost"
            : "btn";
        button.type = "button";
        if (act) button.dataset.act = texto(act);
        if (kind) button.dataset.kind = texto(kind);
        if (canal) button.dataset.canal = texto(canal);
        if (target) button.dataset.target = texto(target);
        if (origem) button.dataset.origem = texto(origem);
        Object.entries(dataset || {}).forEach(([key, value]) => {
          if (value == null) return;
          button.dataset[key] = texto(value);
        });
        button.textContent = texto(label);
        return button;
      }

      function criarEmptyStateAdminNode(title, detail) {
        const empty = documentRef.createElement("div");
        empty.className = "empty-state";
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        empty.appendChild(titleNode);
        const detailNode = documentRef.createElement("p");
        detailNode.textContent = texto(detail);
        empty.appendChild(detailNode);
        return empty;
      }

      function criarToolbarMetaAdminNode(
        children = [],
        className = "toolbar-meta",
      ) {
        const toolbar = documentRef.createElement("div");
        toolbar.className = className;
        children.forEach((child) => {
          if (child) toolbar.appendChild(child);
        });
        return toolbar;
      }

      function criarOnboardingEquipeQuickActionsAdminNode() {
        return criarToolbarMetaAdminNode([
          criarAdminActionButtonNode({
            label: "Ver primeiros acessos",
            act: "filtrar-usuarios-status",
            dataset: { situacao: "temporarios" },
          }),
          criarAdminActionButtonNode({
            label: "Ver sem login",
            act: "filtrar-usuarios-status",
            dataset: { situacao: "sem_login" },
          }),
          criarAdminActionButtonNode({
            label: "Ver bloqueados",
            act: "filtrar-usuarios-status",
            dataset: { situacao: "bloqueados" },
          }),
          criarAdminActionButtonNode({
            label: "Limpar filtro rapido",
            ghost: true,
            act: "limpar-filtro-usuarios",
          }),
        ]);
      }

      function criarAuditFilterAdminNode(item, active) {
        const button = documentRef.createElement("button");
        button.className = `audit-filter${active ? " is-active" : ""}`;
        button.type = "button";
        button.dataset.auditFilter = texto(item?.key);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.title = texto(item?.description);

        const label = documentRef.createElement("span");
        label.textContent = texto(item?.label);
        button.appendChild(label);
        const description = documentRef.createElement("small");
        description.textContent = texto(item?.description);
        button.appendChild(description);
        return button;
      }

      function criarActivityItemAdminNode({
        title,
        meta,
        tone,
        pillLabel,
        detail,
        chips = [],
      }) {
        const article = documentRef.createElement("article");
        article.className = "activity-item";

        const head = documentRef.createElement("div");
        head.className = "activity-head";
        const copy = documentRef.createElement("div");
        copy.className = "activity-copy";
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        copy.appendChild(titleNode);
        const metaNode = documentRef.createElement("span");
        metaNode.className = "activity-meta";
        metaNode.textContent = texto(meta);
        copy.appendChild(metaNode);
        head.appendChild(copy);
        head.appendChild(
          criarPillAdminNode({
            kind: "priority",
            status: tone,
            label: pillLabel,
          }),
        );
        article.appendChild(head);

        if (texto(detail).trim()) {
          const detailNode = documentRef.createElement("p");
          detailNode.className = "activity-detail";
          detailNode.textContent = texto(detail);
          article.appendChild(detailNode);
        }

        article.appendChild(
          criarToolbarMetaAdminNode(
            chips
              .filter((chip) => texto(chip).trim())
              .map((chip) => criarHeroChipAdminNode(chip)),
          ),
        );
        return article;
      }

      function criarStageBriefCardAdminNode({
        tone,
        eyebrow,
        title,
        detail,
        metrics = [],
        actions = [],
      }) {
        const article = documentRef.createElement("article");
        article.className = "stage-brief-card";
        article.dataset.tone = texto(tone).trim();

        const copy = documentRef.createElement("div");
        copy.className = "stage-brief-card__copy";
        const eyebrowNode = documentRef.createElement("span");
        eyebrowNode.className = "stage-brief-card__eyebrow";
        eyebrowNode.textContent = texto(eyebrow);
        copy.appendChild(eyebrowNode);
        const titleNode = documentRef.createElement("strong");
        titleNode.textContent = texto(title);
        copy.appendChild(titleNode);
        const detailNode = documentRef.createElement("p");
        detailNode.textContent = texto(detail);
        copy.appendChild(detailNode);
        article.appendChild(copy);

        const metricsNode = documentRef.createElement("div");
        metricsNode.className = "stage-brief-card__metrics";
        metrics.forEach((metric) => {
          metricsNode.appendChild(
            criarContextBlockAdminNode(metric.label, metric.value),
          );
        });
        article.appendChild(metricsNode);

        const actionsNode = documentRef.createElement("div");
        actionsNode.className = "stage-brief-card__actions";
        actions.forEach((action) => {
          actionsNode.appendChild(criarAdminActionButtonNode(action));
        });
        article.appendChild(actionsNode);
        return article;
      }

      function renderAdminSelectOptions(select, options, selectedValue) {
        if (!select) return;
        limparElemento(select);
        (Array.isArray(options) ? options : []).forEach((item) => {
          const value = texto(item).trim();
          if (!value) return;
          const option = documentRef.createElement("option");
          option.value = value;
          option.textContent = value;
          option.selected = value === texto(selectedValue).trim();
          select.appendChild(option);
        });
      }

      function htmlContextBlock(label, value) {
        return `
                <div class="context-block">
                    <small>${escapeHtml(label)}</small>
                    <strong>${escapeHtml(value)}</strong>
                </div>
            `;
      }

      function normalizarFiltroAuditoriaAdmin(valor) {
        const filtro = texto(valor).trim().toLowerCase();
        if (!filtro || filtro === "all" || filtro === "todos") return "all";
        return AUDIT_FILTERS.some((item) => item.key === filtro)
          ? filtro
          : "all";
      }

      function obterAuditoriaAdmin() {
        return Array.isArray(state.bootstrap?.auditoria?.itens)
          ? state.bootstrap.auditoria.itens
          : [];
      }

      function obterSpotlightSecaoAdmin(secaoAtiva) {
        const empresa = state.bootstrap?.empresa || {};
        const tenantAdmin = obterTenantAdminPayload();
        const auditoriaResumo = state.bootstrap?.auditoria?.resumo || {};
        const categorias = auditoriaResumo.categories || {};
        const totalUsuarios = Number(
          tenantAdmin?.user_summary?.total_users ||
            empresa.usuarios_em_uso ||
            empresa.total_usuarios ||
            0,
        );
        const revisoesAtivas =
          Number(tenantAdmin?.review_counts?.pending_review || 0) +
          Number(tenantAdmin?.review_counts?.in_review || 0);
        const itens = {
          overview: {
            title: "Pulso executivo da empresa",
            meta: "Visao resumida de folga, operacao e proximo foco administrativo antes de entrar nas camadas mais detalhadas.",
            chips: [
              `${formatarInteiro(Number(tenantAdmin?.case_counts?.open_cases || 0))} casos abertos`,
              `${formatarInteiro(totalUsuarios)} perfis monitorados`,
              `${formatarInteiro(revisoesAtivas)} revisoes em curso`,
            ],
          },
          capacity: {
            title: "Capacidade comercial com leitura rapida",
            meta: "Limites, folga, historico e sugestao comercial aparecem juntos, sem misturar essa decisao com a rotina operacional.",
            chips: [
              empresa.laudos_restantes == null
                ? "Laudos sem teto"
                : `${formatarInteiro(empresa.laudos_restantes)} laudos livres`,
              empresa.usuarios_restantes == null
                ? "Usuarios sem teto"
                : `${formatarInteiro(empresa.usuarios_restantes)} vagas livres`,
              texto(empresa.plano_sugerido).trim()
                ? `Plano sugerido ${texto(empresa.plano_sugerido).trim()}`
                : "Sem upgrade sugerido",
            ],
          },
          team: {
            title: "Equipe com ativacao e manutencao no mesmo mapa",
            meta: "Criacao, primeiros acessos e bloqueios ficam legiveis sem transformar a tela em uma parede de cadastros.",
            chips: [
              `${formatarInteiro(totalUsuarios)} acessos da empresa`,
              `${formatarInteiro((state.bootstrap?.usuarios || []).filter((item) => item?.senha_temporaria_ativa).length)} primeiros acessos`,
              `${formatarInteiro((state.bootstrap?.usuarios || []).filter((item) => !item?.ativo).length)} bloqueados`,
            ],
          },
          support: {
            title: "Suporte governado e historico consultavel",
            meta: "Diagnostico, politica de suporte e auditoria fina ficam no mesmo contexto para acelerar leitura e exportacao.",
            chips: [
              `${formatarInteiro(Number(categorias.support || 0))} eventos de suporte`,
              `${formatarInteiro(Number(categorias.chat || 0) + Number(categorias.mesa || 0))} eventos operacionais`,
              `${formatarInteiro(obterAuditoriaAdmin().length)} itens no historico`,
            ],
          },
        };
        return itens[secaoAtiva] || itens.overview;
      }

      function obterResumoAuditoriaFiltrada(itens) {
        const categories = {
          support: 0,
          access: 0,
          commercial: 0,
          team: 0,
          chat: 0,
          mesa: 0,
        };
        const scopes = {
          admin: 0,
          chat: 0,
          mesa: 0,
        };
        itens.forEach((item) => {
          const categoria =
            texto(item?.categoria).trim().toLowerCase() || "support";
          const scope = texto(item?.scope).trim().toLowerCase() || "admin";
          if (Object.prototype.hasOwnProperty.call(categories, categoria)) {
            categories[categoria] += 1;
          }
          if (Object.prototype.hasOwnProperty.call(scopes, scope)) {
            scopes[scope] += 1;
          }
        });
        return { categories, scopes, total: itens.length };
      }

      function agruparAuditoriaPorDia(itens) {
        const grupos = new Map();
        itens.forEach((item) => {
          const iso = texto(item?.criado_em).trim();
          const label = iso
            ? iso.slice(0, 10)
            : texto(item?.criado_em_label).trim().slice(0, 10);
          const chave = label || "sem-data";
          if (!grupos.has(chave)) {
            grupos.set(chave, []);
          }
          grupos.get(chave).push(item);
        });
        return Array.from(grupos.entries()).map(([dateKey, rows]) => ({
          dateKey,
          rows,
        }));
      }

      function obterAuditoriaFiltrada() {
        const filtro = normalizarFiltroAuditoriaAdmin(
          state.ui?.adminAuditFilter,
        );
        const busca = texto(state.ui?.adminAuditSearch).trim().toLowerCase();
        let itens = obterAuditoriaAdmin();

        if (filtro !== "all") {
          itens = itens.filter((item) => {
            const categoria = texto(item?.categoria).trim().toLowerCase();
            const scope = texto(item?.scope).trim().toLowerCase();
            if (filtro === "support") return categoria === "support";
            if (filtro === "team") return categoria === "team";
            return scope === filtro;
          });
        }
        if (!busca) return itens;
        return itens.filter((item) => {
          const payload =
            item?.payload && typeof item.payload === "object"
              ? Object.values(item.payload).join(" ")
              : "";
          const corpus = [
            item?.resumo,
            item?.detalhe,
            item?.acao,
            item?.ator_nome,
            item?.categoria_label,
            item?.scope_label,
            payload,
          ]
            .join(" ")
            .toLowerCase();
          return corpus.includes(busca);
        });
      }

      function atualizarResumoSecaoAdmin() {
        const secaoAtiva = normalizarSecaoAdmin(
          state.ui?.adminSection || state.ui?.sections?.admin || "overview",
        );
        const definicao = SECTION_META[secaoAtiva] || SECTION_META.overview;
        const nav = documentRef.querySelector('[data-surface-nav="admin"]');
        const empresa = state.bootstrap?.empresa || {};
        const tenantAdmin = obterTenantAdminPayload();
        const auditoria = Array.isArray(state.bootstrap?.auditoria?.itens)
          ? state.bootstrap.auditoria.itens
          : [];
        const totalUsuarios = Number(
          tenantAdmin?.user_summary?.total_users ||
            empresa.usuarios_em_uso ||
            empresa.total_usuarios ||
            0,
        );
        const laudosNoMes = Number(empresa.laudos_mes_atual || 0);
        const laudosRestantes =
          empresa.laudos_restantes == null
            ? "Contrato sem teto mensal"
            : `${formatarInteiro(Math.max(Number(empresa.laudos_restantes || 0), 0))} laudos restantes`;
        const contagens = {
          overview: `${formatarInteiro(laudosNoMes)} laudos no mes`,
          capacity: laudosRestantes,
          team: `${formatarInteiro(totalUsuarios)} perfis operacionais`,
          support: `${formatarInteiro(auditoria.length)} eventos recentes`,
        };

        if (nav) {
          nav.dataset.surfaceActiveSection = secaoAtiva;
        }
        definirTextoNoElemento("admin-section-summary-title", definicao.title);
        definirTextoNoElemento("admin-section-summary-meta", definicao.meta);
        const spotlight = obterSpotlightSecaoAdmin(secaoAtiva);
        definirTextoNoElemento("admin-stage-spotlight-title", spotlight.title);
        definirTextoNoElemento("admin-stage-spotlight-meta", spotlight.meta);
        preencherHtmlNoElemento(
          "admin-stage-spotlight-kpis",
          (spotlight.chips || [])
            .filter(Boolean)
            .map((chip) => `<span class="hero-chip">${escapeHtml(chip)}</span>`)
            .join(""),
        );
        definirTextoNoElemento(
          "admin-section-count-overview",
          contagens.overview,
        );
        definirTextoNoElemento(
          "admin-section-count-capacity",
          contagens.capacity,
        );
        definirTextoNoElemento("admin-section-count-team", contagens.team);
        definirTextoNoElemento(
          "admin-section-count-support",
          contagens.support,
        );
      }

      function abrirSecaoAdmin(
        secao,
        { focusTab = false, ensureRendered = true, syncUrl = true } = {},
      ) {
        const secaoAtiva = normalizarSecaoAdmin(
          secao || state.ui?.adminSection,
        );
        state.ui.adminSection = secaoAtiva;
        state.ui.sections = state.ui.sections || {};
        state.ui.sections.admin = secaoAtiva;

        const tabAtiva =
          obterBotoesSecaoAdmin().find(
            (button) => button.dataset.adminSectionTab === secaoAtiva,
          ) || null;
        obterBotoesSecaoAdmin().forEach((button) => {
          const ativa = button.dataset.adminSectionTab === secaoAtiva;
          button.classList.toggle("is-active", ativa);
          button.setAttribute("aria-selected", ativa ? "true" : "false");
          button.setAttribute("aria-current", ativa ? "page" : "false");
          button.setAttribute("tabindex", ativa ? "0" : "-1");
        });
        obterPaineisSecaoAdmin().forEach((panel) => {
          panel.hidden = panel.dataset.adminPanel !== secaoAtiva;
        });
        atualizarResumoSecaoAdmin();

        if (
          ensureRendered &&
          $(STAGE_IDS[secaoAtiva])?.dataset?.stageState !== "ready"
        ) {
          renderAdminStage(secaoAtiva, { force: true });
        }
        if (focusTab && tabAtiva) {
          tabAtiva.focus();
        }
        if (syncUrl && state.ui?.tab === "admin") {
          sincronizarUrlDaSecao("admin", secaoAtiva);
        }
        return secaoAtiva;
      }

      function renderEmpresaCards() {
        const empresa = state.bootstrap?.empresa;
        if (!empresa) return;
        const tenantAdmin = obterTenantAdminPayload();
        const governance = obterGovernancaOperacionalTenant();
        const prioridade = prioridadeEmpresa(
          empresa,
          state.bootstrap?.usuarios || [],
        );
        const capacidadeTone = tomCapacidadeEmpresa(empresa);
        const usoValor =
          empresa.uso_percentual == null
            ? "Sem teto comercial neste contrato"
            : `${formatarInteiro(empresa.laudos_mes_atual || 0)} laudos no mes`;
        const resumoUsuarios = formatarCapacidadeRestante(
          empresa.usuarios_restantes,
          empresa.usuarios_excedente,
          "vaga",
          "vagas",
        );
        const resumoLaudos = formatarCapacidadeRestante(
          empresa.laudos_restantes,
          empresa.laudos_excedente,
          "laudo",
          "laudos",
        );
        const progresso =
          empresa.uso_percentual == null
            ? 18
            : Math.max(6, Math.min(100, Number(empresa.uso_percentual || 0)));
        const riscoLabel = texto(
          empresa.capacidade_badge || "Capacidade estavel",
        );
        const riscoMensagem = texto(
          empresa.capacidade_acao ||
            "A empresa ainda tem folga operacional dentro do plano.",
        );
        const planoSugerido = texto(empresa.plano_sugerido).trim();
        const alertaCapacidade = $("empresa-alerta-capacidade");
        const notaCapacidadeUsuario = $("usuario-capacidade-nota");
        const botaoCriarUsuario = $("btn-usuario-criar");
        const formUsuario = $("form-usuario");
        const pacoteOperacionalResumo = governance.enabled
          ? `${governance.operatingModelLabel}. ${formatarInteiro(governance.operationalUsersInUse)} de ${formatarInteiro(governance.operationalUserLimit)} conta operacional ocupada.`
          : "Perfis operacionais seguem a regra padrão contratada para esta empresa.";

        const empresaCards = $("empresa-cards");
        if (empresaCards) {
          limparElemento(empresaCards);
          [
            {
              accent: empresa.status_bloqueio ? "attention" : "done",
              label: "Plano em operacao",
              value: empresa.plano_ativo,
              meta: empresa.status_bloqueio
                ? "Empresa bloqueada"
                : "Empresa liberada para operar",
            },
            {
              accent:
                empresa.usuarios_restantes === 0 && empresa.usuarios_max != null
                  ? "attention"
                  : "live",
              label: "Equipe em uso",
              value: formatarInteiro(
                tenantAdmin?.user_summary?.total_users ||
                  empresa.usuarios_em_uso ||
                  empresa.total_usuarios,
              ),
              meta: `${resumoUsuarios}. ${formatarInteiro(empresa.admins_cliente)} administradores da empresa, ${formatarInteiro(empresa.inspetores)} pessoas de campo e ${formatarInteiro(empresa.revisores)} pessoas de revisao.`,
            },
            {
              accent:
                empresa.laudos_restantes === 0 &&
                empresa.laudos_mes_limite != null
                  ? "attention"
                  : "aberto",
              label: "Laudos deste mes",
              value: formatarInteiro(empresa.laudos_mes_atual || 0),
              meta: `${resumoLaudos}. ${empresa.laudos_mes_limite == null ? "Contrato sem limite mensal fixo." : `Limite de ${formatarInteiro(empresa.laudos_mes_limite)} laudos.`}`,
            },
            {
              accent: capacidadeTone,
              label: "Folga comercial",
              value: formatarPercentual(empresa.uso_percentual),
              meta: `${usoValor}. ${riscoLabel}`,
            },
          ].forEach((metric) => {
            empresaCards.appendChild(criarMetricCardAdminNode(metric));
          });
        }

        const resumoDetalhado = $("empresa-resumo-detalhado");
        if (resumoDetalhado) {
          limparElemento(resumoDetalhado);
          const stack = documentRef.createElement("div");
          stack.className = "stack";

          const statusStrip = documentRef.createElement("div");
          statusStrip.className = "status-strip";
          statusStrip.appendChild(
            criarPillAdminNode({
              kind: "laudo",
              status: empresa.status_bloqueio ? "ajustes" : "aberto",
              label: empresa.status_bloqueio
                ? "Conta bloqueada"
                : "Operacao liberada",
            }),
          );
          statusStrip.appendChild(
            criarPillAdminNode({
              kind: "role",
              label: `CNPJ ${empresa.cnpj || "nao informado"}`,
            }),
          );
          stack.appendChild(statusStrip);

          const usageStrip = documentRef.createElement("div");
          usageStrip.className = "usage-strip";
          const contextHead = documentRef.createElement("div");
          contextHead.className = "context-head";
          const consumoCopy = documentRef.createElement("div");
          const consumoLabel = documentRef.createElement("small");
          consumoLabel.textContent = "Consumo mensal monitorado";
          consumoCopy.appendChild(consumoLabel);
          const consumoValor = documentRef.createElement("strong");
          consumoValor.textContent = `${formatarInteiro(empresa.laudos_mes_atual || 0)} laudos criados neste mes`;
          consumoCopy.appendChild(consumoValor);
          contextHead.appendChild(consumoCopy);
          contextHead.appendChild(
            criarPillAdminNode({
              kind: "laudo",
              status: capacidadeTone,
              label: formatarPercentual(empresa.uso_percentual),
            }),
          );
          usageStrip.appendChild(contextHead);

          const progressTrack = documentRef.createElement("div");
          progressTrack.className = "progress-track";
          const progressBar = documentRef.createElement("div");
          progressBar.className = "progress-bar";
          progressBar.dataset.progress = String(progresso);
          progressBar.style.width = `${progresso}%`;
          progressTrack.appendChild(progressBar);
          usageStrip.appendChild(progressTrack);

          const toolbarMeta = documentRef.createElement("div");
          toolbarMeta.className = "toolbar-meta";
          [
            `Limite mensal: ${empresa.laudos_mes_limite == null ? "sem teto" : formatarInteiro(empresa.laudos_mes_limite)}`,
            `Laudos restantes: ${empresa.laudos_restantes == null ? "sem teto" : formatarInteiro(empresa.laudos_restantes)}`,
            `Limite de usuarios: ${empresa.usuarios_max == null ? "sem teto" : formatarInteiro(empresa.usuarios_max)}`,
            `Vagas restantes: ${empresa.usuarios_restantes == null ? "sem teto" : formatarInteiro(empresa.usuarios_restantes)}`,
          ].forEach((label) => {
            toolbarMeta.appendChild(criarHeroChipAdminNode(label));
          });
          usageStrip.appendChild(toolbarMeta);
          stack.appendChild(usageStrip);

          const contextGrid = documentRef.createElement("div");
          contextGrid.className = "context-grid";
          [
            {
              label: "Equipe ocupando o plano",
              value: formatarInteiro(
                tenantAdmin?.user_summary?.total_users ||
                  empresa.usuarios_em_uso ||
                  empresa.total_usuarios,
              ),
            },
            { label: "Margem de usuarios", value: resumoUsuarios },
            {
              label: "Laudos na janela atual",
              value: formatarInteiro(empresa.laudos_mes_atual || 0),
            },
            { label: "Margem do mes", value: resumoLaudos },
          ].forEach((item) => {
            contextGrid.appendChild(
              criarContextBlockAdminNode(item.label, item.value),
            );
          });
          stack.appendChild(contextGrid);

          const chipList = documentRef.createElement("div");
          chipList.className = "chip-list";
          [
            {
              enabled: Boolean(empresa.upload_doc),
              label: `Envio de documentos ${empresa.upload_doc ? "ativo" : "indisponivel"}`,
            },
            {
              enabled: Boolean(empresa.deep_research),
              label: `Analise aprofundada ${empresa.deep_research ? "ativa" : "indisponivel"}`,
            },
            {
              label: `Responsavel ${empresa.nome_responsavel || "nao informado"}`,
            },
            { label: `Base ${empresa.cidade_estado || "nao informada"}` },
            {
              label: `Processamento acumulado ${formatarInteiro(empresa.mensagens_processadas || 0)}`,
            },
            {
              enabled: Boolean(governance.enabled),
              label: `Modelo operacional ${governance.operatingModelLabel}`,
            },
            {
              enabled: Boolean(governance.enabled),
              label: governance.enabled
                ? `Continuidades: ${governance.surfacesSummary}`
                : "Equipe distribuida por perfis da empresa",
            },
          ].forEach((chip) => {
            chipList.appendChild(criarFeatureChipAdminNode(chip));
          });
          stack.appendChild(chipList);

          stack.appendChild(
            criarContextGuidanceAdminNode({
              tone: prioridade.tone,
              eyebrow: "Proximo foco da administracao",
              title: prioridade.badge,
              detail: prioridade.acao,
              sideNode: criarPillAdminNode({
                kind: "priority",
                status: prioridade.tone,
                label: prioridade.badge,
              }),
            }),
          );

          resumoDetalhado.appendChild(stack);
        }

        const plano = $("empresa-plano");
        if (plano) {
          renderAdminSelectOptions(
            plano,
            empresa.planos_disponiveis || [],
            empresa.plano_ativo,
          );
        }

        if (alertaCapacidade) {
          const recomendacaoUpgrade = planoSugerido
            ? `Migrar para ${planoSugerido} tende a aliviar primeiro ${empresa.capacidade_gargalo === "usuarios" ? "a equipe" : "a fila mensal de laudos"}.`
            : "O plano atual ja e o topo da escada comercial configurada.";
          limparElemento(alertaCapacidade);
          alertaCapacidade.appendChild(
            criarCapacityAlertAdminNode({
              tone: capacidadeTone,
              label: riscoLabel,
              messages: [
                riscoMensagem,
                planoSugerido
                  ? `${empresa.plano_sugerido_motivo || recomendacaoUpgrade}`
                  : recomendacaoUpgrade,
              ],
              sideItems: [
                {
                  className: "pill",
                  kind: "priority",
                  status: capacidadeTone,
                  label: riscoLabel,
                },
                {
                  className: "hero-chip",
                  label: planoSugerido
                    ? `Plano sugerido: ${planoSugerido}`
                    : "Sem solicitacao imediata",
                },
              ],
            }),
          );
        }

        if (notaCapacidadeUsuario) {
          const limiteUsuariosAtingido =
            empresa.usuarios_max != null &&
            Number(empresa.usuarios_restantes || 0) <= 0;
          const limitePacoteAtingido =
            governance.enabled && governance.operationalUsersAtLimit;
          const bloqueioCriacao = Boolean(
            limiteUsuariosAtingido || limitePacoteAtingido,
          );
          const notaTitulo = limitePacoteAtingido
            ? "Operador unico ja ocupado"
            : limiteUsuariosAtingido
              ? "Equipe no teto do plano"
              : governance.enabled
                ? "Pacote com conta principal unificada"
                : "Capacidade para novos usuarios";
          const notaDetalhe = limitePacoteAtingido
            ? `${governance.operatingModelLabel}: ${formatarInteiro(governance.operationalUsersInUse)} de ${formatarInteiro(governance.operationalUserLimit)} conta operacional em uso. A administracao da empresa nao entra nessa conta.`
            : limiteUsuariosAtingido
              ? `${resumoUsuarios}. ${planoSugerido ? `Registre interesse em ${planoSugerido} antes de ampliar a equipe.` : "Revise o contrato antes de ampliar a equipe."}`
              : governance.enabled
                ? `Este pacote permite ${formatarInteiro(governance.operationalUserLimit)} conta operacional e continuidade em ${governance.surfacesSummary}. ${governance.identityNote}`
                : `${resumoUsuarios}. ${planoSugerido && (empresa.capacidade_status === "atencao" || empresa.capacidade_status === "monitorar") ? `Se a fila crescer, o melhor encaixe passa a ser ${planoSugerido}.` : "Ainda existe folga para ampliar a equipe com seguranca."}`;
          limparElemento(notaCapacidadeUsuario);
          notaCapacidadeUsuario.appendChild(
            criarFormHintAdminNode({
              tone: bloqueioCriacao
                ? "ajustes"
                : governance.enabled
                  ? "aguardando"
                  : capacidadeTone,
              title: notaTitulo,
              detail: notaDetalhe,
            }),
          );
          if (botaoCriarUsuario) {
            botaoCriarUsuario.disabled = bloqueioCriacao;
          }
          if (formUsuario) {
            formUsuario.dataset.operationalPackageMode =
              governance.operatingModel;
            formUsuario.dataset.operationalPackageAtLimit = bloqueioCriacao
              ? "true"
              : "false";
            formUsuario.dataset.operationalPackageSummary =
              pacoteOperacionalResumo;
          }
        }
      }

      function renderAdminResumo() {
        const container = $("admin-resumo-geral");
        const empresa = state.bootstrap?.empresa;
        const usuarios = state.bootstrap?.usuarios || [];
        if (!container || !empresa) return;
        const tenantAdmin = obterTenantAdminPayload();

        const bloqueados = usuarios.filter((item) => !item.ativo).length;
        const temporarios = usuarios.filter(
          (item) => item.senha_temporaria_ativa,
        ).length;
        const semLogin = usuarios.filter(
          (item) => !parseDataIso(item.ultimo_login),
        ).length;
        const prioridade = prioridadeEmpresa(empresa, usuarios);
        const capacidadeTone = tomCapacidadeEmpresa(empresa);
        const resumoUsuarios = formatarCapacidadeRestante(
          empresa.usuarios_restantes,
          empresa.usuarios_excedente,
          "vaga",
          "vagas",
        );
        const resumoLaudos = formatarCapacidadeRestante(
          empresa.laudos_restantes,
          empresa.laudos_excedente,
          "laudo",
          "laudos",
        );
        const planoSugerido = texto(empresa.plano_sugerido).trim();
        const totalCasos = Number(
          tenantAdmin?.case_counts?.total_cases ||
            state.bootstrap?.chat?.laudos?.length ||
            0,
        );
        const casosAbertos = Number(tenantAdmin?.case_counts?.open_cases || 0);
        const revisoesAtivas =
          Number(tenantAdmin?.review_counts?.pending_review || 0) +
          Number(tenantAdmin?.review_counts?.in_review || 0);

        limparElemento(container);
        [
          {
            accent: "attention",
            label: "Acesso pedindo revisao",
            value: formatarInteiro(bloqueados),
            meta: "Usuarios bloqueados que podem travar operacao, escalonamento ou atendimento.",
          },
          {
            accent: "waiting",
            label: "Primeiros acessos",
            value: formatarInteiro(temporarios),
            meta: `${formatarInteiro(semLogin)} contas ainda nao registraram login no portal.`,
          },
          {
            accent:
              empresa.usuarios_restantes === 0 && empresa.usuarios_max != null
                ? "attention"
                : "live",
            label: "Margem de equipe",
            value:
              empresa.usuarios_restantes == null
                ? "Livre"
                : formatarInteiro(empresa.usuarios_restantes),
            meta: `${resumoUsuarios} dentro do plano ${empresa.plano_ativo}.`,
          },
          {
            accent: capacidadeTone,
            label: "Janela de laudos",
            value:
              empresa.laudos_restantes == null
                ? "Livre"
                : formatarInteiro(empresa.laudos_restantes),
            meta: `${resumoLaudos}. ${formatarInteiro(totalCasos)} casos monitorados, ${formatarInteiro(casosAbertos)} ainda abertos.`,
          },
          {
            accent: prioridade.tone,
            label: "Foco da administracao",
            value: prioridade.badge,
            meta: `${prioridade.acao} ${formatarInteiro(revisoesAtivas)} casos seguem em fila de revisao.${planoSugerido ? ` Proximo plano sugerido: ${planoSugerido}.` : ""}`,
          },
        ].forEach((metric) => {
          container.appendChild(criarMetricCardAdminNode(metric));
        });
      }

      function renderOverviewBrief() {
        adminOverviewSurface?.renderOverviewBrief?.();
      }

      function renderGuidedOnboardingOverview() {
        adminOverviewSurface?.renderGuidedOnboardingOverview?.();
      }

      function renderCommercialPackageOverview() {
        adminOverviewSurface?.renderCommercialPackageOverview?.();
      }

      function renderOperationalObservabilityOverview() {
        adminOverviewSurface?.renderOperationalObservabilityOverview?.();
      }

      function renderPendingCenterOverview() {
        adminOverviewSurface?.renderPendingCenterOverview?.();
      }

      function renderCapacityBrief() {
        const container = $("admin-capacity-brief");
        const empresa = state.bootstrap?.empresa;
        if (!container || !empresa) return;
        const planoSugerido = texto(empresa.plano_sugerido).trim();
        const capacidadeTone = tomCapacidadeEmpresa(empresa);

        limparElemento(container);
        container.appendChild(
          criarStageBriefCardAdminNode({
            tone: capacidadeTone,
            eyebrow: "Leitura comercial",
            title:
              texto(empresa.capacidade_badge).trim() || "Capacidade monitorada",
            detail:
              texto(empresa.capacidade_acao).trim() ||
              "Use o resumo abaixo para entender impacto, folga e proximo passo comercial sem reabrir a tela em blocos concorrentes.",
            metrics: [
              {
                label: "Laudos restantes",
                value:
                  empresa.laudos_restantes == null
                    ? "Livre"
                    : formatarInteiro(empresa.laudos_restantes),
              },
              {
                label: "Usuarios restantes",
                value:
                  empresa.usuarios_restantes == null
                    ? "Livre"
                    : formatarInteiro(empresa.usuarios_restantes),
              },
              {
                label: "Plano sugerido",
                value: planoSugerido || "Sem upgrade",
              },
            ],
            actions: [
              planoSugerido
                ? {
                    label: `Registrar interesse em ${planoSugerido}`,
                    primary: true,
                    act: "preparar-upgrade",
                    origem: "admin",
                  }
                : {
                    label: "Ver historico comercial",
                    act: "abrir-prioridade",
                    kind: "admin-section",
                    canal: "admin",
                    target: "admin-planos-historico",
                    origem: "admin",
                  },
            ],
          }),
        );
      }

      function renderTeamBrief() {
        const container = $("admin-team-brief");
        const usuarios = state.bootstrap?.usuarios || [];
        if (!container) return;
        const governance = obterGovernancaOperacionalTenant();
        const total = usuarios.length;
        const semLogin = usuarios.filter(
          (item) => !parseDataIso(item?.ultimo_login),
        ).length;
        const temporarios = usuarios.filter(
          (item) => item?.senha_temporaria_ativa,
        ).length;
        const bloqueados = usuarios.filter((item) => !item?.ativo).length;
        const tone =
          governance.enabled && governance.operationalUsersAtLimit
            ? "aguardando"
            : bloqueados > 0
              ? "ajustes"
              : temporarios > 0
                ? "aguardando"
                : "aprovado";
        const resumoOperacional = governance.enabled
          ? `${formatarInteiro(governance.operationalUsersInUse)} de ${formatarInteiro(governance.operationalUserLimit)} conta operacional ocupada. Continuidade prevista em ${governance.surfacesSummary}.`
          : "A equipe segue distribuida com a ativacao concluida para os perfis ativos.";

        const tituloEquipe = governance.enabled
          ? "Pacote contratual com operador unico"
          : bloqueados > 0
            ? "Existem acessos travando a rotina"
            : semLogin > 0
              ? "A ativacao ainda pede conclusao"
              : "Equipe principal estabilizada";
        const detalheEquipe = governance.enabled
          ? `${resumoOperacional} ${governance.identityNote}`
          : bloqueados > 0
            ? `${formatarInteiro(bloqueados)} cadastros bloqueados podem segurar atendimento ou revisao.`
            : semLogin > 0
              ? `${formatarInteiro(semLogin)} usuarios ainda nao acessaram o portal depois da criacao.`
              : "A equipe segue distribuida com a ativacao concluida para os perfis ativos.";

        limparElemento(container);
        container.appendChild(
          criarStageBriefCardAdminNode({
            tone,
            eyebrow: "Operacao da equipe",
            title: tituloEquipe,
            detail: detalheEquipe,
            metrics: [
              {
                label: "Total operacional",
                value: formatarInteiro(total),
              },
              {
                label: "Primeiros acessos",
                value: formatarInteiro(temporarios),
              },
              {
                label: "Bloqueados",
                value: formatarInteiro(bloqueados),
              },
              {
                label: governance.enabled
                  ? "Superficies liberadas"
                  : "Modelo atual",
                value: governance.enabled
                  ? governance.surfacesSummary
                  : "Perfis distribuidos",
              },
            ],
            actions: [
              {
                label: "Abrir ativacao",
                act: "abrir-prioridade",
                kind: "admin-section",
                canal: "admin",
                target: "admin-onboarding-lista",
                origem: "admin",
              },
              {
                label: "Revisar equipe completa",
                ghost: true,
                act: "abrir-prioridade",
                kind: "admin-section",
                canal: "admin",
                target: "lista-usuarios",
                origem: "admin",
              },
            ],
          }),
        );
      }

      function renderSupportBrief() {
        const container = $("admin-support-brief");
        if (!container) return;
        const tenantAdmin = obterTenantAdminPayload();
        const visibilityPolicy = tenantAdmin?.visibility_policy || {};
        const auditoria = obterAuditoriaFiltrada();
        const suporteRecente = auditoria.find(
          (item) => texto(item?.categoria).trim().toLowerCase() === "support",
        );
        const tone =
          texto(visibilityPolicy.exceptional_support_access).trim() ===
          "disabled"
            ? "ajustes"
            : "aberto";

        limparElemento(container);
        container.appendChild(
          criarStageBriefCardAdminNode({
            tone,
            eyebrow: "Suporte governado",
            title:
              texto(visibilityPolicy.exceptional_support_access).trim() ===
              "disabled"
                ? "Suporte excepcional desabilitado"
                : "Suporte excepcional sob aprovacao e registro",
            detail:
              suporteRecente?.resumo ||
              "O portal mostra politica de acesso, diagnostico exportavel e o historico recente sem abrir evidencia tecnica bruta por padrao.",
            metrics: [
              {
                label: "Itens no historico",
                value: formatarInteiro(obterAuditoriaAdmin().length),
              },
              {
                label: "Suporte recente",
                value: suporteRecente?.payload?.protocolo || "Sem protocolo",
              },
              {
                label: "Escopo maximo",
                value:
                  texto(
                    visibilityPolicy.exceptional_support_scope_level,
                  ).replaceAll("_", " ") || "administrative",
              },
            ],
            actions: [
              {
                label: "Abrir historico",
                act: "abrir-prioridade",
                kind: "admin-section",
                canal: "admin",
                target: "admin-auditoria-lista",
                origem: "admin",
              },
              {
                label: "Registrar suporte",
                ghost: true,
                act: "abrir-prioridade",
                kind: "admin-section",
                canal: "admin",
                target: "form-suporte-cliente",
                origem: "admin",
              },
            ],
          }),
        );
      }

      function renderSaudeEmpresa() {
        const empresa = state.bootstrap?.empresa;
        const resumo = $("admin-saude-resumo");
        const historico = $("admin-saude-historico");
        const saude = empresa?.saude_operacional;
        if (!empresa || !resumo || !historico || !saude) return;

        limparElemento(resumo);
        [
          {
            accent: saude.tone || "aprovado",
            label: "Status da operacao",
            value: saude.status || "Sem leitura",
            meta: saude.texto || "Sem observacoes adicionais.",
          },
          {
            accent: saude.tendencia_tone || "aberto",
            label: "Tendencia mensal",
            value: saude.tendencia_rotulo || "Estavel",
            meta: `${formatarVariacao(saude.variacao_mensal_percentual || 0)} em relacao ao mes anterior.`,
          },
          {
            accent: "live",
            label: "Equipe ativa em 14 dias",
            value: formatarInteiro(saude.usuarios_login_recente || 0),
            meta: `${formatarInteiro(saude.usuarios_sem_login_recente || 0)} ainda nao apareceram na janela recente.`,
          },
          {
            accent: "waiting",
            label: "Movimentos comerciais",
            value: formatarInteiro(saude.eventos_comerciais_60d || 0),
            meta: `${formatarInteiro(saude.primeiros_acessos_pendentes || 0)} primeiros acessos ainda pedem conclusao.`,
          },
        ].forEach((metric) => {
          resumo.appendChild(criarMetricCardAdminNode(metric));
        });

        limparElemento(historico);
        historico.appendChild(
          criarHealthCardAdminNode({
            tone: saude.tendencia_tone || "aberto",
            eyebrow: "Ultimos 6 meses",
            title: saude.tendencia_rotulo || "Ritmo estavel",
            detail: `Mes atual: ${formatarInteiro(saude.laudos_mes_atual || 0)} laudos. Mes anterior: ${formatarInteiro(saude.laudos_mes_anterior || 0)}.`,
            pillLabel: formatarVariacao(saude.variacao_mensal_percentual || 0),
            serie: saude.historico_mensal || [],
          }),
        );
        historico.appendChild(
          criarHealthCardAdminNode({
            tone: saude.tone || "aprovado",
            eyebrow: "Pulso dos ultimos 14 dias",
            title: saude.status || "Sem leitura",
            detail: `${formatarInteiro(saude.usuarios_login_recente || 0)} pessoas usaram o portal recentemente, com ${formatarInteiro(saude.mix_equipe?.inspetores || 0)} pessoas de campo e ${formatarInteiro(saude.mix_equipe?.revisores || 0)} pessoas de revisao no mix.`,
            pillLabel: `${formatarInteiro(saude.eventos_comerciais_60d || 0)} eventos`,
            serie: saude.historico_diario || [],
          }),
        );
      }

      function renderSuporteDiagnostico() {
        const container = $("admin-diagnostico-resumo");
        const policyContainer = $("admin-support-policy");
        const protocolContainer = $("admin-support-protocol");
        const portal = state.bootstrap?.portal;
        const empresa = state.bootstrap?.empresa;
        if (!container || !portal || !empresa) return;
        const tenantAdmin = obterTenantAdminPayload();
        const visibilityPolicy = tenantAdmin?.visibility_policy || null;
        const governance = obterGovernancaOperacionalTenant();
        const auditoria = obterAuditoriaAdmin();
        const suporteRecente = auditoria.find(
          (item) => texto(item?.categoria).trim().toLowerCase() === "support",
        );

        const whatsapp = texto(portal.suporte_whatsapp).trim();
        const ambiente = texto(portal.ambiente).trim() || "producao";
        const diagnosticoUrl =
          texto(portal.diagnostico_url).trim() || "/cliente/api/diagnostico";
        const totalAuditoria = auditoria.length;
        const auditoriaResumo = state.bootstrap?.auditoria?.resumo || {};
        const categorias = auditoriaResumo.categories || {};
        const momentoCanonico = resumirMomentoCanonicoTenantAdmin();
        const supportModeLabels = {
          disabled: "desabilitado",
          approval_required: "com aprovacao previa",
          incident_controlled: "em incidente controlado",
        };
        const supportScopeLabels = {
          metadata_only: "metadados administrativos",
          administrative: "suporte administrativo",
          tenant_diagnostic: "diagnostico da empresa",
        };
        const technicalAccessLabels = {
          surface_scoped_operational: "superficies operacionais auditadas",
        };
        const auditScopeLabels = {
          tenant_operational_timeline: "historico operacional da empresa",
        };

        const totalEquipeComercial =
          Number(categorias.access || 0) +
          Number(categorias.commercial || 0) +
          Number(categorias.team || 0);
        const totalSuporteOperacao =
          Number(categorias.support || 0) +
          Number(categorias.chat || 0) +
          Number(categorias.mesa || 0);

        limparElemento(container);
        [
          `Ambiente: ${ambiente}`,
          `Diagnostico: ${diagnosticoUrl}`,
          `Auditoria visivel: ${formatarInteiro(totalAuditoria)} itens`,
          `Suporte: ${whatsapp || "nao configurado"}`,
          `Visibilidade tecnica: ${technicalAccessLabels[visibilityPolicy?.technical_access_mode] || "nao definida"}`,
          `Evidencia bruta: ${visibilityPolicy?.raw_evidence_access === "not_granted_by_projection" ? "fora da projecao gerencial" : "nao definida"}`,
          `Escopo de auditoria: ${auditScopeLabels[visibilityPolicy?.audit_scope] || "nao definido"}`,
          `Politica de suporte: ${supportModeLabels[visibilityPolicy?.exceptional_support_access] || "nao definida"}`,
          `Modelo operacional: ${governance.operatingModelLabel}`,
          `Continuidade prevista: ${governance.surfacesSummary}`,
          `Momento canonico: ${momentoCanonico.label}`,
          momentoCanonico.ownerLabel,
          `Casos observados: ${formatarInteiro(momentoCanonico.observedCount)}`,
          `Escopo maximo de suporte: ${supportScopeLabels[visibilityPolicy?.exceptional_support_scope_level] || "nao definido"}`,
          `Eventos de equipe/comercial: ${formatarInteiro(totalEquipeComercial)}`,
          `Eventos de suporte/chat/mesa: ${formatarInteiro(totalSuporteOperacao)}`,
        ].forEach((item) => {
          const span = documentRef.createElement("span");
          span.textContent = texto(item);
          container.appendChild(span);
        });

        if (policyContainer) {
          limparElemento(policyContainer);
          [
            {
              label: "Momento canonico do tenant",
              value: momentoCanonico.label,
              detail: momentoCanonico.detail,
            },
            {
              label: "Visibilidade tecnica",
              value:
                technicalAccessLabels[
                  visibilityPolicy?.technical_access_mode
                ] || "nao definida",
              detail: `Evidencia bruta ${visibilityPolicy?.raw_evidence_access === "not_granted_by_projection" ? "fica fora da projecao gerencial" : "nao definida"}.`,
            },
            {
              label: "Suporte excepcional",
              value:
                supportModeLabels[
                  visibilityPolicy?.exceptional_support_access
                ] || "nao definida",
              detail: `Escopo maximo ${supportScopeLabels[visibilityPolicy?.exceptional_support_scope_level] || "nao definido"}.`,
            },
            {
              label: "Escopo de auditoria",
              value:
                auditScopeLabels[visibilityPolicy?.audit_scope] ||
                "nao definido",
              detail: `${formatarInteiro(totalAuditoria)} itens recentes disponiveis para leitura da empresa.`,
            },
            {
              label: "Pacote operacional",
              value: governance.operatingModelLabel,
              detail: governance.enabled
                ? `${formatarInteiro(governance.operationalUsersInUse)} de ${formatarInteiro(governance.operationalUserLimit)} conta operacional ocupada. Continuidade em ${governance.surfacesSummary}.`
                : "Sem limite contratual de operador unico nesta empresa.",
            },
          ].forEach((item) => {
            policyContainer.appendChild(criarSupportPolicyCardAdminNode(item));
          });
        }

        if (protocolContainer) {
          limparElemento(protocolContainer);
          protocolContainer.appendChild(
            criarSupportProtocolCopyAdminNode({
              protocol:
                suporteRecente?.payload?.protocolo ||
                "Nenhum protocolo recente",
              detail:
                suporteRecente?.detalhe ||
                "Quando houver novo relato, o numero de protocolo e o historico do caso ficam visiveis aqui sem expor evidencia tecnica bruta.",
            }),
          );
          protocolContainer.appendChild(
            criarSupportProtocolStatusAdminNode([
              {
                kind: "priority",
                status: momentoCanonico.tone,
                label: momentoCanonico.label,
              },
              {
                kind: "priority",
                status:
                  visibilityPolicy?.exceptional_support_access === "disabled"
                    ? "ajustes"
                    : "aberto",
                label: visibilityPolicy?.exceptional_support_step_up_required
                  ? "step-up exigido"
                  : "step-up opcional",
              },
              {
                className: "hero-chip",
                label: visibilityPolicy?.exceptional_support_approval_required
                  ? "aprovacao obrigatoria"
                  : "aprovacao contextual",
              },
              {
                className: "hero-chip",
                label: `janela maxima ${formatarInteiro(visibilityPolicy?.exceptional_support_max_duration_minutes || 0)} min`,
              },
            ]),
          );
        }

        const botaoWhatsapp = $("btn-whatsapp-suporte");
        if (botaoWhatsapp) {
          botaoWhatsapp.disabled = !whatsapp;
        }
      }

      function renderOnboardingEquipe() {
        const resumo = $("admin-onboarding-resumo");
        const lista = $("admin-onboarding-lista");
        const usuarios = state.bootstrap?.usuarios || [];
        if (!resumo || !lista) return;

        const temporarios = ordenarPorPrioridade(
          usuarios.filter((item) => item?.senha_temporaria_ativa),
          prioridadeUsuario,
        );
        const semLogin = ordenarPorPrioridade(
          usuarios.filter((item) => !parseDataIso(item?.ultimo_login)),
          prioridadeUsuario,
        );
        const bloqueados = ordenarPorPrioridade(
          usuarios.filter((item) => !item?.ativo),
          prioridadeUsuario,
        );
        const revisoresSemLogin = semLogin.filter(
          (item) => slugPapel(item) === "revisor",
        );

        limparElemento(resumo);
        [
          {
            accent: "waiting",
            label: "Primeiros acessos",
            value: formatarInteiro(temporarios.length),
            meta: "Usuarios com senha temporaria ainda pendente de ativacao.",
          },
          {
            accent: "aberto",
            label: "Sem login",
            value: formatarInteiro(semLogin.length),
            meta: "Cadastros criados que ainda nao entraram nenhuma vez.",
          },
          {
            accent: "attention",
            label: "Bloqueados",
            value: formatarInteiro(bloqueados.length),
            meta: "Acessos travados que podem segurar a operacao da empresa.",
          },
          {
            accent: "live",
            label: "Mesa sem login",
            value: formatarInteiro(revisoresSemLogin.length),
            meta: "Pessoas da revisao que ainda nao ativaram o acesso.",
          },
        ].forEach((metric) => {
          resumo.appendChild(criarMetricCardAdminNode(metric));
        });

        const pendenciasMap = new Map();
        [...temporarios, ...bloqueados, ...semLogin].forEach((item) => {
          if (item?.id != null) pendenciasMap.set(Number(item.id), item);
        });
        const pendencias = ordenarPorPrioridade(
          [...pendenciasMap.values()],
          prioridadeUsuario,
        ).slice(0, 4);
        limparElemento(lista);
        const quickActions = criarOnboardingEquipeQuickActionsAdminNode();

        if (!pendencias.length) {
          lista.appendChild(
            criarEmptyStateAdminNode(
              "Equipe principal ativada",
              "Nao ha ativacao pendente agora. Novos primeiros acessos e bloqueios vao aparecer aqui.",
            ),
          );
          lista.appendChild(quickActions);
          return;
        }

        lista.appendChild(quickActions);
        pendencias.forEach((usuario) => {
          const prioridade = prioridadeUsuario(usuario);
          const papel = slugPapel(usuario);
          const detalhe = !usuario.ativo
            ? `${usuario.nome || "Usuario"} esta bloqueado e pode estar segurando a rotina da empresa.`
            : usuario.senha_temporaria_ativa
              ? `${usuario.nome || "Usuario"} ainda precisa concluir o primeiro acesso.`
              : `${usuario.nome || "Usuario"} foi criado, mas ainda nao entrou nenhuma vez.`;

          const article = documentRef.createElement("article");
          article.className = "activity-item";

          const head = documentRef.createElement("div");
          head.className = "activity-head";
          const copy = documentRef.createElement("div");
          copy.className = "activity-copy";
          const title = documentRef.createElement("strong");
          title.textContent = texto(usuario.nome || "Usuario");
          copy.appendChild(title);
          const meta = documentRef.createElement("span");
          meta.className = "activity-meta";
          meta.textContent = `${texto(usuario.email || "Sem e-mail")} • ${obterNomePapel(papel)}`;
          copy.appendChild(meta);
          head.appendChild(copy);
          head.appendChild(
            criarPillAdminNode({
              kind: "priority",
              status: prioridade.tone,
              label: prioridade.badge,
            }),
          );
          article.appendChild(head);

          const detail = documentRef.createElement("p");
          detail.className = "activity-detail";
          detail.textContent = detalhe;
          article.appendChild(detail);

          const userId = String(usuario.id || "");
          article.appendChild(
            criarToolbarMetaAdminNode([
              criarAdminActionButtonNode({
                label: !usuario.ativo
                  ? "Desbloquear agora"
                  : "Gerar nova senha",
                act: !usuario.ativo ? "toggle-user" : "reset-user",
                dataset: { user: userId },
              }),
              criarAdminActionButtonNode({
                label: "Abrir cadastro",
                act: "abrir-prioridade",
                kind: "admin-user",
                canal: "admin",
                target: "lista-usuarios",
                dataset: {
                  user: userId,
                  busca: usuario.email || usuario.nome || "",
                  papel,
                },
              }),
            ]),
          );
          lista.appendChild(article);
        });
      }

      function renderAdminAuditoria() {
        const container = $("admin-auditoria-lista");
        const filtersContainer = $("admin-auditoria-filtros");
        const overviewContainer = $("admin-audit-overview");
        const searchInput = $("admin-auditoria-busca");
        if (!container) return;

        const todosItens = obterAuditoriaAdmin();
        const filtroAtual = normalizarFiltroAuditoriaAdmin(
          state.ui?.adminAuditFilter,
        );
        const buscaAtual = texto(state.ui?.adminAuditSearch).trim();
        const itens = obterAuditoriaFiltrada();
        const resumo = obterResumoAuditoriaFiltrada(itens);

        if (searchInput && searchInput.value !== buscaAtual) {
          searchInput.value = buscaAtual;
        }

        if (overviewContainer) {
          limparElemento(overviewContainer);
          [
            {
              accent: "live",
              label: "Itens visiveis",
              value: formatarInteiro(resumo.total),
              meta: buscaAtual
                ? "Resultado apos busca e filtro atual."
                : "Historico atual conforme a secao selecionada.",
            },
            {
              accent: "aberto",
              label: "Foco administrativo",
              value: formatarInteiro(
                Number(resumo.categories.team || 0) +
                  Number(resumo.categories.access || 0) +
                  Number(resumo.categories.commercial || 0),
              ),
              meta: "Equipe, acesso e comercial dentro do recorte atual.",
            },
            {
              accent: "waiting",
              label: "Suporte e operacao",
              value: formatarInteiro(
                Number(resumo.categories.support || 0) +
                  Number(resumo.categories.chat || 0) +
                  Number(resumo.categories.mesa || 0),
              ),
              meta: "Protocolos, chat e mesa sob o mesmo trilho cronologico.",
            },
            {
              accent: "aprovado",
              label: "Escopo dominante",
              value:
                resumo.scopes.chat > resumo.scopes.admin &&
                resumo.scopes.chat >= resumo.scopes.mesa
                  ? "Chat"
                  : resumo.scopes.mesa > resumo.scopes.admin
                    ? "Mesa"
                    : "Painel",
              meta: `${formatarInteiro(todosItens.length)} itens totais na empresa antes do recorte.`,
            },
          ].forEach((metric) => {
            overviewContainer.appendChild(criarMetricCardAdminNode(metric));
          });
        }

        if (filtersContainer) {
          limparElemento(filtersContainer);
          AUDIT_FILTERS.forEach((item) => {
            filtersContainer.appendChild(
              criarAuditFilterAdminNode(item, item.key === filtroAtual),
            );
          });
        }

        limparElemento(container);
        if (!todosItens.length) {
          container.appendChild(
            criarEmptyStateAdminNode(
              "Nenhuma atividade registrada ainda",
              "As alteracoes de plano, equipe e acesso passam a aparecer aqui conforme o portal for sendo usado.",
            ),
          );
          return;
        }

        if (!itens.length) {
          container.appendChild(
            criarEmptyStateAdminNode(
              "Nenhum evento encontrado nesse recorte",
              buscaAtual
                ? `A busca "${buscaAtual}" nao encontrou eventos dentro do filtro atual.`
                : "Troque o filtro para recuperar outro trecho do historico operacional.",
            ),
          );
          return;
        }

        agruparAuditoriaPorDia(itens).forEach((grupo) => {
          const section = documentRef.createElement("section");
          section.className = "activity-group";
          const header = documentRef.createElement("header");
          header.className = "activity-group__header";
          const eyebrow = documentRef.createElement("span");
          eyebrow.className = "activity-group__eyebrow";
          eyebrow.textContent =
            grupo.dateKey === "sem-data"
              ? "Sem data"
              : grupo.dateKey.split("-").reverse().join("/");
          header.appendChild(eyebrow);
          const total = documentRef.createElement("strong");
          total.textContent = `${formatarInteiro(grupo.rows.length)} eventos`;
          header.appendChild(total);
          section.appendChild(header);

          const itemsNode = documentRef.createElement("div");
          itemsNode.className = "activity-group__items";
          grupo.rows.forEach((item) => {
            itemsNode.appendChild(
              criarActivityItemAdminNode({
                title: item.resumo || "Ação registrada",
                meta: `${item.categoria_label || "Geral"} • ${item.scope_label || "Painel"} • Por ${item.ator_nome || "Sistema"} • ${item.criado_em_label || "Agora"}`,
                tone:
                  item.categoria === "support"
                    ? "aguardando"
                    : item.scope === "chat" || item.scope === "mesa"
                      ? "aberto"
                      : "aprovado",
                pillLabel: texto(item.acao || "evento").replaceAll("_", " "),
                detail: item.detalhe || "",
                chips: [
                  item.payload?.protocolo
                    ? `Protocolo ${item.payload.protocolo}`
                    : "",
                  item.alvo_nome ? `Alvo ${item.alvo_nome}` : "",
                  item.payload?.contexto || "",
                ],
              }),
            );
          });
          section.appendChild(itemsNode);
          container.appendChild(section);
        });
      }

      function renderHistoricoPlanos() {
        const container = $("admin-planos-historico");
        if (!container) return;

        const itens = (state.bootstrap?.auditoria?.itens || []).filter(
          (item) => {
            const acao = texto(item?.acao);
            return (
              acao === "plano_interesse_registrado" || acao === "plano_alterado"
            );
          },
        );
        limparElemento(container);
        if (!itens.length) {
          container.appendChild(
            criarEmptyStateAdminNode(
              "Nenhuma solicitacao comercial registrada ainda",
              "Quando o portal registrar interesse em um novo plano, o impacto esperado fica listado aqui para consulta rapida.",
            ),
          );
          return;
        }

        itens.forEach((item) => {
          const payload = item.payload || {};
          const antes = texto(payload.plano_anterior || "").trim();
          const depois = texto(
            payload.plano_sugerido || payload.plano_novo || "",
          ).trim();
          const impacto = texto(
            payload.impacto_resumido || item.detalhe || "",
          ).trim();
          const acao = texto(item.acao);
          const rotuloMovimento =
            acao === "plano_interesse_registrado"
              ? "solicitacao"
              : texto(payload.movimento || "plano");

          const article = documentRef.createElement("article");
          article.className = "activity-item";
          const head = documentRef.createElement("div");
          head.className = "activity-head";
          const copy = documentRef.createElement("div");
          copy.className = "activity-copy";
          const title = documentRef.createElement("strong");
          title.textContent = texto(item.resumo || "Solicitacao comercial");
          copy.appendChild(title);
          const meta = documentRef.createElement("span");
          meta.className = "activity-meta";
          meta.textContent = `Por ${texto(item.ator_nome || "Sistema")} • ${texto(item.criado_em_label || "Agora")}`;
          copy.appendChild(meta);
          head.appendChild(copy);
          head.appendChild(
            criarPillAdminNode({
              kind: "priority",
              status: "aberto",
              label: rotuloMovimento,
            }),
          );
          article.appendChild(head);

          const detail = documentRef.createElement("p");
          detail.className = "activity-detail";
          detail.textContent = impacto || "Impacto nao informado.";
          article.appendChild(detail);
          article.appendChild(
            criarToolbarMetaAdminNode([
              criarHeroChipAdminNode(
                antes ? `Antes: ${antes}` : "Antes nao informado",
              ),
              criarHeroChipAdminNode(
                depois ? `Depois: ${depois}` : "Depois nao informado",
              ),
            ]),
          );
          container.appendChild(article);
        });
      }

      function renderPreviewPlano() {
        const container = $("plano-impacto-preview");
        const empresa = state.bootstrap?.empresa;
        const seletor = $("empresa-plano");
        const botao = $("btn-plano-registrar");
        if (!container || !empresa || !seletor) return;

        const planoSelecionado =
          obterPlanoCatalogo(seletor.value) ||
          obterPlanoCatalogo(empresa.plano_ativo);
        if (!planoSelecionado) {
          limparElemento(container);
          if (botao) botao.disabled = false;
          return;
        }

        const ehAtual =
          texto(planoSelecionado.plano) === texto(empresa.plano_ativo);
        const movimento = texto(
          planoSelecionado.movimento || (ehAtual ? "manter" : "upgrade"),
        );
        const tone = ehAtual
          ? "aprovado"
          : movimento === "downgrade"
            ? "aguardando"
            : "aberto";
        limparElemento(container);
        const guidance = criarContextGuidanceAdminNode({
          tone,
          eyebrow: ehAtual
            ? "Plano atual em vigor"
            : "Impacto esperado da solicitacao",
          title: planoSelecionado.plano,
          detail: ehAtual
            ? `Este plano sustenta hoje ${state.bootstrap?.empresa?.capacidade_badge ? state.bootstrap.empresa.capacidade_badge.toLowerCase() : "a operacao atual"}.`
            : planoSelecionado.resumo_impacto ||
              "Sem alteracao material detectada.",
          sideNode: criarPillAdminNode({
            kind: "priority",
            status: tone,
            label: ehAtual ? "Plano atual" : movimento,
          }),
        });
        if (!ehAtual) {
          const copy = guidance.querySelector(".context-guidance-copy");
          if (copy) {
            const paragraph = documentRef.createElement("p");
            paragraph.textContent =
              "A solicitacao fica registrada para a empresa, mas a mudanca comercial final e concluida pela Tariel.";
            copy.appendChild(paragraph);
          }
        }
        container.appendChild(guidance);
        container.appendChild(
          criarToolbarMetaAdminNode(
            [
              criarHeroChipAdminNode(
                `Usuarios: ${formatarLimitePlano(planoSelecionado.usuarios_max, "vaga", "vagas")}`,
              ),
              criarHeroChipAdminNode(
                `Laudos/mes: ${formatarLimitePlano(planoSelecionado.laudos_mes, "laudo", "laudos")}`,
              ),
              criarHeroChipAdminNode(
                planoSelecionado.upload_doc
                  ? "Envio de documentos liberado"
                  : "Envio de documentos indisponivel",
              ),
              criarHeroChipAdminNode(
                planoSelecionado.deep_research
                  ? "Analise aprofundada liberada"
                  : "Analise aprofundada indisponivel",
              ),
            ],
            "toolbar-meta toolbar-meta--section",
          ),
        );

        if (!ehAtual) {
          container.appendChild(
            criarToolbarMetaAdminNode(
              [
                criarAdminActionButtonNode({
                  label: "Registrar interesse neste plano",
                  act: "registrar-interesse-plano",
                  origem: "admin",
                  dataset: { plano: planoSelecionado.plano },
                }),
              ],
              "toolbar-meta toolbar-meta--section",
            ),
          );
        }

        if (botao) {
          botao.disabled = ehAtual;
        }
      }

      function labelPortalUsuario(portal) {
        const valor = texto(portal).trim().toLowerCase();
        if (valor === "cliente") return "Portal da empresa";
        if (valor === "inspetor") return "Campo web + mobile";
        if (valor === "revisor") return "Revisao";
        return valor || "Portal";
      }

      function obterPortalGrantLabels(usuario) {
        const labels =
          Array.isArray(usuario?.allowed_portal_labels) &&
          usuario.allowed_portal_labels.length
            ? usuario.allowed_portal_labels
            : Array.isArray(usuario?.allowed_portals)
              ? usuario.allowed_portals.map(labelPortalUsuario)
              : [];
        return labels;
      }

      function criarUserFieldAdminNode({
        label,
        field,
        userId,
        value,
        type = "text",
        placeholder,
      }) {
        const wrapper = documentRef.createElement("label");
        wrapper.appendChild(documentRef.createTextNode(texto(label)));
        const input = documentRef.createElement("input");
        input.dataset.field = texto(field);
        input.dataset.user = texto(userId);
        input.type = texto(type);
        input.value = texto(value);
        if (placeholder) input.placeholder = texto(placeholder);
        wrapper.appendChild(input);
        return wrapper;
      }

      function criarPortalGrantEditorAdminNode(usuario, governance) {
        const baseRole = slugPapel(usuario);
        const currentPortals = new Set(
          Array.isArray(usuario?.allowed_portals)
            ? usuario.allowed_portals
            : [],
        );
        const canGrantCross = Boolean(
          governance.operationalUserCrossPortalEnabled,
        );
        const canGrantCliente = Boolean(
          governance.operationalUserAdminPortalEnabled,
        );
        const controls = [
          {
            portal: "inspetor",
            label: "Campo web + mobile",
            checked: currentPortals.has("inspetor") || baseRole === "inspetor",
            disabled: true,
          },
          {
            portal: "revisor",
            label: "Revisao",
            checked: currentPortals.has("revisor") || baseRole === "revisor",
            disabled: baseRole === "revisor" ? true : !canGrantCross,
          },
          {
            portal: "cliente",
            label: "Portal da empresa",
            checked: currentPortals.has("cliente"),
            disabled: !canGrantCliente,
          },
        ];
        const stack = documentRef.createElement("div");
        stack.className = "stack";
        const label = documentRef.createElement("small");
        label.textContent = "Superficies liberadas";
        stack.appendChild(label);
        const grid = documentRef.createElement("div");
        grid.className = "user-grid";
        controls.forEach((item) => {
          const wrapper = documentRef.createElement("label");
          const input = documentRef.createElement("input");
          input.type = "checkbox";
          input.dataset.user = texto(usuario.id);
          input.dataset.field = "allowed_portals";
          input.dataset.portal = texto(item.portal);
          input.checked = Boolean(item.checked);
          input.disabled = Boolean(item.disabled);
          wrapper.appendChild(input);
          wrapper.appendChild(
            documentRef.createTextNode(` ${texto(item.label)}`),
          );
          grid.appendChild(wrapper);
        });
        stack.appendChild(grid);
        return stack;
      }

      function criarUsuarioRowAdminNode(usuario, governance) {
        const papelSlug = slugPapel(usuario);
        const papel = obterNomePapel(papelSlug);
        const prioridade = prioridadeUsuario(usuario);
        const userId = String(usuario.id || "");
        const tr = documentRef.createElement("tr");
        tr.dataset.userRow = userId;
        if (Number(state.ui.usuarioEmDestaque || 0) === Number(usuario.id)) {
          tr.className = "user-row-highlight";
        }

        const mainCell = documentRef.createElement("td");
        const userMain = documentRef.createElement("div");
        userMain.className = "user-main";
        const primary = documentRef.createElement("div");
        primary.className = "user-primary";
        const name = documentRef.createElement("span");
        name.className = "user-name";
        name.textContent = texto(usuario.nome || "Usuario");
        primary.appendChild(name);
        primary.appendChild(criarPillAdminNode({ kind: "role", label: papel }));
        primary.appendChild(
          criarPillAdminNode({
            kind: "status",
            status: usuario.ativo ? "ativo" : "bloqueado",
            label: usuario.ativo ? "Ativo" : "Bloqueado",
          }),
        );
        if (usuario.senha_temporaria_ativa) {
          primary.appendChild(
            criarPillAdminNode({
              kind: "status",
              status: "temporaria",
              label: "Senha temporaria",
            }),
          );
        }
        primary.appendChild(
          criarPillAdminNode({
            kind: "priority",
            status: prioridade.tone,
            label: prioridade.badge,
          }),
        );
        userMain.appendChild(primary);

        const email = documentRef.createElement("div");
        email.className = "user-email";
        email.textContent = texto(usuario.email);
        userMain.appendChild(email);
        const chips = [
          criarHeroChipAdminNode(
            usuario.telefone ? usuario.telefone : "Sem telefone",
          ),
        ];
        if (papelSlug === "revisor") {
          chips.push(
            criarHeroChipAdminNode(
              usuario.crea ? `CREA ${usuario.crea}` : "Sem CREA",
            ),
          );
        }
        obterPortalGrantLabels(usuario).forEach((label) => {
          chips.push(criarHeroChipAdminNode(label));
        });
        userMain.appendChild(criarToolbarMetaAdminNode(chips));

        const details = documentRef.createElement("details");
        details.className = "user-editor";
        const summary = documentRef.createElement("summary");
        summary.className = "user-editor-toggle";
        summary.textContent = "Editar dados deste usuario";
        details.appendChild(summary);
        const grid = documentRef.createElement("div");
        grid.className = "user-grid";
        grid.appendChild(
          criarUserFieldAdminNode({
            label: "Nome",
            field: "nome",
            userId,
            value: usuario.nome || "",
          }),
        );
        grid.appendChild(
          criarUserFieldAdminNode({
            label: "E-mail",
            field: "email",
            userId,
            value: usuario.email || "",
            type: "email",
          }),
        );
        grid.appendChild(
          criarUserFieldAdminNode({
            label: "Telefone",
            field: "telefone",
            userId,
            value: usuario.telefone || "",
            placeholder: "Telefone",
          }),
        );
        if (papelSlug === "revisor") {
          grid.appendChild(
            criarUserFieldAdminNode({
              label: "CREA",
              field: "crea",
              userId,
              value: usuario.crea || "",
              placeholder: "CREA",
            }),
          );
        }
        details.appendChild(grid);
        details.appendChild(
          criarPortalGrantEditorAdminNode(usuario, governance),
        );
        userMain.appendChild(details);
        mainCell.appendChild(userMain);
        tr.appendChild(mainCell);

        const statusCell = documentRef.createElement("td");
        const stack = documentRef.createElement("div");
        stack.className = "stack";
        stack.appendChild(
          criarContextBlockAdminNode("Papel operacional", papel),
        );
        stack.appendChild(
          criarContextBlockAdminNode(
            "Ultimo login",
            usuario.ultimo_login_label || "Nunca",
          ),
        );
        stack.appendChild(
          criarContextGuidanceAdminNode({
            tone: prioridade.tone,
            eyebrow: "Foco deste cadastro",
            title: prioridade.badge,
            detail: prioridade.acao,
          }),
        );
        statusCell.appendChild(stack);
        tr.appendChild(statusCell);

        const actionsCell = documentRef.createElement("td");
        const actions = documentRef.createElement("div");
        actions.className = "user-actions";
        [
          { label: "Salvar cadastro", act: "save-user" },
          {
            label: usuario.ativo ? "Bloquear acesso" : "Desbloquear acesso",
            act: "toggle-user",
          },
          { label: "Gerar senha temporaria", act: "reset-user", ghost: true },
          { label: "Excluir cadastro", act: "delete-user", ghost: true },
        ].forEach((action) => {
          actions.appendChild(
            criarAdminActionButtonNode({
              label: action.label,
              act: action.act,
              ghost: action.ghost,
              dataset: { user: userId },
            }),
          );
        });
        actionsCell.appendChild(actions);
        tr.appendChild(actionsCell);
        return tr;
      }

      function renderUsuarios() {
        const usuarios = ordenarPorPrioridade(
          filtrarUsuarios(),
          prioridadeUsuario,
        );
        const tbody = $("lista-usuarios");
        const vazio = $("usuarios-vazio");
        const resumo = $("usuarios-resumo");
        if (!tbody || !vazio || !resumo) return;

        const governance = obterGovernancaOperacionalTenant();
        const totalTemporarios = (state.bootstrap?.usuarios || []).filter(
          (item) => item.senha_temporaria_ativa,
        ).length;
        const totalBloqueados = (state.bootstrap?.usuarios || []).filter(
          (item) => !item.ativo,
        ).length;
        const totalSemLogin = (state.bootstrap?.usuarios || []).filter(
          (item) => !parseDataIso(item.ultimo_login),
        ).length;
        const rotuloFiltroRapido =
          rotuloSituacaoUsuarios(state.ui.usuariosSituacao) || "";
        limparElemento(resumo);
        [
          `${formatarInteiro(usuarios.length)} visiveis agora`,
          `${formatarInteiro(totalTemporarios)} com senha temporaria`,
          `${formatarInteiro(totalBloqueados)} bloqueados`,
          `${formatarInteiro(totalSemLogin)} sem login`,
          `${formatarInteiro((state.bootstrap?.usuarios || []).filter((item) => item.ativo).length)} ativos`,
          governance.enabled
            ? `Pacote: ${formatarInteiro(governance.operationalUsersInUse)}/${formatarInteiro(governance.operationalUserLimit)} operador`
            : "",
          rotuloFiltroRapido ? `Filtro rapido: ${rotuloFiltroRapido}` : "",
        ]
          .filter((label) => texto(label).trim())
          .forEach((label) => {
            resumo.appendChild(criarHeroChipAdminNode(label));
          });
        limparElemento(tbody);

        if (!usuarios.length) {
          vazio.hidden = false;
          return;
        }

        vazio.hidden = true;
        usuarios.forEach((usuario) => {
          tbody.appendChild(criarUsuarioRowAdminNode(usuario, governance));
        });
      }

      function renderAdminStage(stage, { force = false } = {}) {
        const targetStage = normalizarSecaoAdmin(stage);
        limparStageAgendado(targetStage);
        marcarEstadoStage(targetStage, "rendering");

        if (targetStage === "overview") {
          renderOverviewBrief();
          renderAdminResumo();
          renderEmpresaCards();
          renderCommercialPackageOverview();
          renderOperationalObservabilityOverview();
          renderPendingCenterOverview();
          renderGuidedOnboardingOverview();
          renderSaudeEmpresa();
        } else if (targetStage === "capacity") {
          renderCapacityBrief();
          renderPreviewPlano();
          renderHistoricoPlanos();
        } else if (targetStage === "team") {
          renderTeamBrief();
          renderOnboardingEquipe();
          renderUsuarios();
        } else {
          renderSupportBrief();
          renderAdminAuditoria();
          renderSuporteDiagnostico();
        }

        if (force) {
          marcarEstadoStage(targetStage, "ready");
          return;
        }
        marcarEstadoStage(targetStage, "ready");
      }

      function agendarStage(stage, delay) {
        if (!STAGE_ORDER.includes(stage)) return;
        limparStageAgendado(stage);
        marcarEstadoStage(stage, "queued");

        const timeoutId = windowRef.setTimeout(() => {
          if (typeof windowRef.requestIdleCallback === "function") {
            const idleId = windowRef.requestIdleCallback(
              () => {
                renderAdminStage(stage, { force: true });
              },
              { timeout: 240 },
            );
            queuedStages.set(stage, {
              cancelIdle: () => windowRef.cancelIdleCallback(idleId),
            });
            return;
          }
          renderAdminStage(stage, { force: true });
        }, delay);

        queuedStages.set(stage, { timeoutId });
      }

      function renderAdmin() {
        const secaoAtiva = abrirSecaoAdmin(
          state.ui?.adminSection || "overview",
          { ensureRendered: false },
        );
        renderAdminStage(secaoAtiva, { force: true });
        atualizarResumoSecaoAdmin();
        STAGE_ORDER.filter((stage) => stage !== secaoAtiva).forEach(
          (stage, index) => {
            agendarStage(stage, 36 + index * 44);
          },
        );
      }

      return {
        abrirSecaoAdmin,
        obterGovernancaOperacionalTenant,
        renderAdmin,
        renderAdminAuditoria,
        renderAdminResumo,
        renderEmpresaCards,
        renderHistoricoPlanos,
        renderOnboardingEquipe,
        renderPreviewPlano,
        renderSaudeEmpresa,
        renderSuporteDiagnostico,
        renderUsuarios,
        resolverSecaoAdminPorTarget,
      };
    };
})();
