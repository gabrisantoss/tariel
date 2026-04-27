(function () {
    "use strict";

    if (window.TarielClientePortalDocumentosSurface) return;

    window.TarielClientePortalDocumentosSurface = function createTarielClientePortalDocumentosSurface(config = {}) {
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
        const obterHintVazio = () => state.bootstrap?.guided_onboarding?.surface_empty_hints?.documentos || null;

        const ISSUE_STATE_LABELS = Object.freeze({
            issued: "Emitido",
            superseded: "Substituído",
            revoked: "Revogado",
        });

        function documentUi(item) {
            return item && typeof item.document_ui === "object" && item.document_ui ? item.document_ui : {};
        }

        function normalizarIssueStateLabel(issue) {
            const raw = texto(issue?.issue_state).trim().toLowerCase();
            const label = texto(issue?.issue_state_label).trim();
            return ISSUE_STATE_LABELS[raw] || label || "Registrada";
        }

        function statusDocumento(item) {
            const ui = documentUi(item);
            if (item?.reissue_recommended) return ui.reissue_label || "Reemissão recomendada";
            return texto(ui.status_label || item?.issue_status_label || item?.status_visual_label || item?.status_card).trim() || "Sem status";
        }

        function tituloTipoDocumento(item) {
            const ui = documentUi(item);
            return texto(ui.document_kind_label || item?.document_type_label).trim() || "Documento técnico";
        }

        function detalheTipoDocumento(item) {
            const ui = documentUi(item);
            return texto(ui.document_kind_detail || item?.document_visual_state_detail || item?.latest_timeline_summary || item?.verification_summary).trim()
                || "Sem trilha documental adicional.";
        }

        function tomStatusDocumento(item) {
            const ui = documentUi(item);
            const statusKey = texto(ui.status_key).trim();
            if (statusKey) return statusKey;
            if (item?.reissue_recommended) return "reissue";
            if (item?.already_issued) return "issued";
            if (item?.ready_for_issue) return "pending";
            return "collecting";
        }

        function renderHashRows(rows) {
            const validRows = rows.filter((row) => texto(row.value).trim());
            if (!validRows.length) return "";
            return `
                <div class="document-card__hash-list">
                    ${validRows.map((row) => `
                        <div class="document-card__hash-row">
                            <span>${escapeHtml(row.label)}</span>
                            <code>${escapeHtml(texto(row.value).trim())}</code>
                            <button
                                class="document-card__copy"
                                type="button"
                                data-document-copy="${escapeAttr(row.label)}"
                                data-copy-value="${escapeAttr(texto(row.value).trim())}"
                            >Copiar</button>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        function bindDocumentCopyActions() {
            if (documentRef.__tarielDocumentosCopyActionsBound) return;
            documentRef.__tarielDocumentosCopyActionsBound = true;
            documentRef.addEventListener("click", async (event) => {
                const button = event.target?.closest?.("[data-document-copy]");
                if (!button) return;
                const value = texto(button.dataset.copyValue).trim();
                if (!value || !navigator.clipboard?.writeText) return;
                const original = button.textContent;
                try {
                    await navigator.clipboard.writeText(value);
                    button.textContent = "Copiado";
                    window.setTimeout(() => {
                        button.textContent = original || "Copiar";
                    }, 1600);
                } catch (_error) {
                    button.textContent = "Não copiado";
                    window.setTimeout(() => {
                        button.textContent = original || "Copiar";
                    }, 1600);
                }
            });
        }

        const SECTION_ORDER = Object.freeze(["overview"]);
        const TARGET_TO_SECTION = Object.freeze({
            "documentos-overview": "overview",
            "documentos-lista": "overview",
            "documentos-resumo-geral": "overview",
        });

        function normalizarSecaoDocumentos(valor) {
            const secao = texto(valor).trim().toLowerCase();
            return SECTION_ORDER.includes(secao) ? secao : "overview";
        }

        function resolverSecaoDocumentosPorTarget(targetId) {
            const alvo = texto(targetId).trim().replace(/^#/, "");
            if (!alvo) return null;
            if (TARGET_TO_SECTION[alvo]) return TARGET_TO_SECTION[alvo];
            return SECTION_ORDER.includes(alvo) ? alvo : null;
        }

        function obterBotoesSecaoDocumentos() {
            return Array.from(documentRef.querySelectorAll("[data-documentos-section-tab]"));
        }

        function abrirSecaoDocumentos(secao, { focusTab = false, syncUrl = true } = {}) {
            const secaoAtiva = normalizarSecaoDocumentos(secao || state.ui?.documentosSection);
            state.ui.documentosSection = secaoAtiva;
            state.ui.sections = state.ui.sections || {};
            state.ui.sections.documentos = secaoAtiva;

            const tabAtiva = obterBotoesSecaoDocumentos().find((button) => button.dataset.documentosSectionTab === secaoAtiva) || null;
            obterBotoesSecaoDocumentos().forEach((button) => {
                const ativa = button.dataset.documentosSectionTab === secaoAtiva;
                button.classList.toggle("is-active", ativa);
                button.setAttribute("aria-selected", ativa ? "true" : "false");
                button.setAttribute("aria-current", ativa ? "page" : "false");
                button.setAttribute("tabindex", ativa ? "0" : "-1");
            });
            documentRef.querySelectorAll("[data-documentos-panel]").forEach((panel) => {
                panel.hidden = panel.dataset.documentosPanel !== secaoAtiva;
            });
            if (focusTab && tabAtiva) {
                tabAtiva.focus();
            }
            if (syncUrl && state.ui?.tab === "documentos") {
                sincronizarUrlDaSecao("documentos", secaoAtiva);
            }
            return secaoAtiva;
        }

        function renderDocumentosResumo() {
            const summary = state.bootstrap?.documentos?.summary || {};
            const items = state.bootstrap?.documentos?.items || [];
            const totalDocuments = Number(summary.total_documents || items.length || 0);
            const issuedDocuments = Number(summary.issued_documents || 0);
            const verificaveis = Number(summary.with_public_verification || 0);
            const reemissao = Number(summary.reissue_recommended || 0);
            const alerta = $("documentos-alerta-principal");

            $("documentos-total").textContent = formatarInteiro(totalDocuments);
            $("documentos-emitidos").textContent = formatarInteiro(issuedDocuments);
            $("documentos-verificaveis").textContent = formatarInteiro(verificaveis);
            $("documentos-reemissao").textContent = formatarInteiro(reemissao);
            $("documentos-state-official").textContent = formatarInteiro(Number(summary.document_state_counts?.official || 0));
            $("documentos-state-in-review").textContent = formatarInteiro(Number(summary.document_state_counts?.in_review || 0));
            $("documentos-state-draft").textContent = formatarInteiro(Number(summary.document_state_counts?.draft || 0));
            $("documentos-state-historical").textContent = formatarInteiro(Number(summary.document_state_counts?.historical || 0));
            $("documentos-state-internal").textContent = formatarInteiro(Number(summary.document_state_counts?.internal || 0));
            $("documentos-com-art-total").textContent = formatarInteiro(Number(summary.documents_with_art || 0));
            $("documentos-com-pie-total").textContent = formatarInteiro(Number(summary.documents_with_pie || 0));
            $("documentos-com-prontuario-total").textContent = formatarInteiro(Number(summary.documents_with_prontuario || 0));
            $("documentos-nr35-aprovados").textContent = formatarInteiro(Number(summary.nr35_approved || 0));
            $("documentos-nr35-reprovados").textContent = formatarInteiro(Number(summary.nr35_reproved || 0));
            $("documentos-nr35-pendentes").textContent = formatarInteiro(Number(summary.nr35_pending || 0));
            $("documentos-section-count-overview").textContent = `${formatarInteiro(totalDocuments)} documentos no tenant`;

            if (!alerta) return;
            if (!items.length) {
                const hint = obterHintVazio();
                alerta.innerHTML = `
                    <strong>${escapeHtml(hint?.title || "Nenhum documento carregado.")}</strong>
                    <p>${escapeHtml(hint?.body || "Os laudos aprovados e seus vínculos documentais aparecerão aqui.")}</p>
                `;
                return;
            }
            const prioridade = items.find((item) => item.reissue_recommended)
                || items.find((item) => item.ready_for_issue && !item.already_issued)
                || items[0];
            alerta.innerHTML = `
                <strong>${escapeHtml(prioridade.titulo || "Documento técnico")}</strong>
                <p>${escapeHtml(
                    prioridade.latest_timeline_summary
                        || prioridade.issue_status_label
                        || prioridade.verification_summary
                        || "Acompanhe a situação documental do tenant."
                )}</p>
            `;
        }

        function renderSummaryCard() {
            const container = $("documentos-summary-card");
            if (!container) return;
            const items = Array.isArray(state.bootstrap?.documentos?.items) ? state.bootstrap.documentos.items : [];
            if (!items.length) {
                container.innerHTML = `
                    <strong>Sem documento de referência.</strong>
                    <p>Quando houver emissão, revisão forte ou rascunho técnico relevante, o resumo aparece aqui.</p>
                `;
                return;
            }
            const item = items.find((entry) => entry.document_visual_state === "official")
                || items.find((entry) => entry.reissue_recommended)
                || items.find((entry) => entry.ready_for_issue)
                || items[0];
            const summary = item.document_summary_card || {};
            const ui = documentUi(item);
            const timeline = Array.isArray(item.document_timeline) ? item.document_timeline.filter((step) => step.done) : [];
            container.innerHTML = `
                <div class="document-summary-card">
                    <div class="document-summary-card__head">
                        <div>
                            <span class="pill" data-kind="priority" data-status="${escapeAttr(tomStatusDocumento(item))}">${escapeHtml(statusDocumento(item))}</span>
                            <h4>${escapeHtml(item.titulo || "Documento técnico")}</h4>
                        </div>
                        <span class="document-card__status">${escapeHtml(summary.current_version || item.issue_number || tituloTipoDocumento(item))}</span>
                    </div>
                    <div class="document-card__meta">
                        <span>${escapeHtml(tituloTipoDocumento(item))}</span>
                        <span>Status do caso: ${escapeHtml(summary.case_status || item.status_visual_label || "Sem status")}</span>
                        <span>Responsável técnico: ${escapeHtml(summary.issued_by || item.signatory_name || "Não vinculado")}</span>
                    </div>
                    <div class="document-card__summary">
                        <p>${escapeHtml(detalheTipoDocumento(item))}</p>
                    </div>
                    ${summary.hash ? `
                        <details class="document-card__audit">
                            <summary>${escapeHtml(ui.audit_label || "Auditoria")}</summary>
                            ${renderHashRows([{ label: "Hash público", value: summary.hash }])}
                        </details>
                    ` : ""}
                    <div class="document-card__timeline">
                        ${(timeline.length ? timeline : (item.document_timeline || []).slice(0, 3)).map((step) => `
                            <span class="hero-chip" data-tone="${escapeAttr(step.done ? "aprovado" : "aguardando")}">${escapeHtml(step.label || "Evento")}</span>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        function renderSignalList(containerId, items, emptyTitle, emptyCopy) {
            const container = $(containerId);
            if (!container) return;
            const docs = Array.isArray(items) ? items : [];
            if (!docs.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <strong>${escapeHtml(emptyTitle)}</strong>
                        <p>${escapeHtml(emptyCopy)}</p>
                    </div>
                `;
                return;
            }
            container.innerHTML = docs.map((item) => `
                <article class="document-signal-card">
                    <strong>${escapeHtml(item.titulo || "Documento técnico")}</strong>
                    <span>${escapeHtml(item.document_type_label || "Documento")}</span>
                    <span>${escapeHtml(item.issue_status_label || item.status_visual_label || "Sem status")}</span>
                </article>
            `).join("");
        }

        function renderDocumentosLista() {
            const container = $("documentos-lista");
            if (!container) return;

            const items = Array.isArray(state.bootstrap?.documentos?.items) ? state.bootstrap.documentos.items : [];
            const summary = state.bootstrap?.documentos?.summary || {};
            renderSignalList(
                "documentos-com-art-lista",
                summary.with_art_items,
                "Nenhuma ART detectada.",
                "Quando um laudo citar ART, ele aparecerá neste recorte.",
            );
            renderSignalList(
                "documentos-com-pie-lista",
                summary.with_pie_items,
                "Nenhum PIE detectado.",
                "Os prontuários elétricos consolidados aparecerão neste recorte.",
            );
            renderSignalList(
                "documentos-com-prontuario-lista",
                summary.with_prontuario_items,
                "Nenhum prontuário detectado.",
                "Quando a documentação mencionar prontuário, ela aparecerá aqui.",
            );
            renderSummaryCard();
            if (!items.length) {
                const hint = obterHintVazio();
                container.innerHTML = `
                    <div class="empty-state">
                        <strong>${escapeHtml(hint?.title || "Sem documentos até agora.")}</strong>
                        <p>${escapeHtml(hint?.body || "Quando um laudo existir, a trilha documental aparecerá nesta superfície.")}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map((item) => {
                const ui = documentUi(item);
                const status = statusDocumento(item);
                const verificationLine = item.verification_url
                    ? `<a class="document-card__link" href="${escapeAttr(item.verification_url)}" target="_blank" rel="noreferrer">Verificar hash público</a>`
                    : `<span class="document-card__muted">Verificação pública pendente</span>`;
                const issueLine = item.issue_number
                    ? `${escapeHtml(ui.official_issue_label || "Emissão oficial")} ${escapeHtml(item.issue_number)}`
                    : item.pdf_present
                        ? `${escapeHtml(ui.operational_pdf_label || "PDF operacional")} · não oficial`
                        : escapeHtml(item.issue_action_label || "Sem emissão oficial");
                const signatoryLine = item.signatory_name
                    ? `Responsável técnico: ${escapeHtml(item.signatory_name)}`
                    : "Signatário ainda não vinculado";
                const signalLabels = Array.isArray(item.document_signals?.present_labels)
                    ? item.document_signals.present_labels
                    : [];
                const signalChips = signalLabels.length
                    ? `
                        <div class="document-card__signals" aria-label="Evidências selecionadas">
                            ${signalLabels.map((label) => `<span class="hero-chip">${escapeHtml(label)}</span>`).join("")}
                        </div>
                    `
                    : "";
                const packageSections = Array.isArray(item.document_package_sections?.items)
                    ? item.document_package_sections.items.filter((section) => Number(section.count || 0) > 0)
                    : [];
                const packageSectionHtml = packageSections.length
                    ? `
                        <section class="document-card__section document-card__section--resources">
                            <div class="document-card__section-title">${escapeHtml(ui.package_resources_label || "Recursos do pacote")}</div>
                            <div class="document-card__package">
                            ${packageSections.map((section) => `
                                <span class="hero-chip">${escapeHtml(section.label || "Seção")} · ${escapeHtml(String(section.count || 0))}</span>
                            `).join("")}
                            </div>
                        </section>
                    `
                    : "";
                const timeline = Array.isArray(item.document_timeline) ? item.document_timeline.filter((step) => step.done) : [];
                const timelineHtml = timeline.length
                    ? `
                        <div class="document-card__timeline" aria-label="Linha do tempo do documento">
                            ${timeline.map((step) => `<span class="hero-chip">${escapeHtml(step.label || "Evento")}</span>`).join("")}
                        </div>
                    `
                    : "";
                const nr35 = item.nr35_summary || null;
                const nr35Meta = nr35
                    ? `
                        <div class="document-card__nr35">
                            <span><strong>Status WF:</strong> ${escapeHtml(nr35.conclusion_status || "Sem parecer")}</span>
                            <span><strong>Operação:</strong> ${escapeHtml(nr35.operational_status || "Sem status operacional")}</span>
                            <span><strong>Tipo:</strong> ${escapeHtml(nr35.line_type || "Sem tipo")}</span>
                            <span><strong>Próxima inspeção:</strong> ${escapeHtml(nr35.proxima_inspecao || "Não informada")}</span>
                            <span><strong>Componentes:</strong> C ${escapeHtml(String(nr35.component_counts?.C || 0))} · NC ${escapeHtml(String(nr35.component_counts?.NC || 0))} · NA ${escapeHtml(String(nr35.component_counts?.NA || 0))}</span>
                            <span><strong>Fotos:</strong> ${escapeHtml(String(nr35.photo_count || 0))}</span>
                        </div>
                    `
                    : "";
                const official = item.emissao_oficial || {};
                const officialLinks = official.download_package_url || official.download_pdf_url
                    ? `
                        <div class="document-card__actions">
                            ${official.download_package_url ? `<a class="document-card__link document-card__link--primary" href="${escapeAttr(official.download_package_url)}" target="_blank" rel="noreferrer">Baixar pacote oficial</a>` : ""}
                            ${official.download_pdf_url ? `<a class="document-card__link" href="${escapeAttr(official.download_pdf_url)}" target="_blank" rel="noreferrer">Baixar PDF oficial</a>` : ""}
                        </div>
                    `
                    : "";
                const issueHistory = Array.isArray(item.historico_emissoes) ? item.historico_emissoes : [];
                const issueHistoryHtml = issueHistory.length
                    ? `
                        <section class="document-card__section document-card__section--history">
                            <div class="document-card__section-title">${escapeHtml(ui.history_label || "Histórico de emissões")}</div>
                            <div class="document-card__history">
                                ${issueHistory.slice(0, 4).map((issue) => `
                                    <span class="hero-chip">${escapeHtml(issue.issue_number || "Emissão")} · ${escapeHtml(normalizarIssueStateLabel(issue))}</span>
                                `).join("")}
                            </div>
                        </section>
                    `
                    : "";
                const auditRows = [
                    { label: "Hash público", value: item.codigo_hash || item.hash_short },
                    { label: "Hash do pacote", value: official.package_sha256 },
                    { label: "Hash do PDF oficial", value: official.primary_pdf_sha256 },
                ];
                const auditHtml = official.package_sha256 || official.primary_pdf_sha256 || item.codigo_hash
                    ? `
                        <details class="document-card__audit">
                            <summary>${escapeHtml(ui.audit_label || "Auditoria")}</summary>
                            ${renderHashRows(auditRows)}
                            ${verificationLine}
                        </details>
                    `
                    : "";
                const hasOfficialRecord = Boolean(item.already_issued || official.issue_number || item.issue_number);
                const officialMeta = hasOfficialRecord
                    ? `
                        <section class="document-card__section document-card__section--official" data-kind="official-delivery">
                            <div class="document-card__section-title">${escapeHtml(ui.official_issue_label || "Emissão oficial")}</div>
                            <p>${escapeHtml(ui.document_kind_detail || "Documento emitido pelo motor oficial com pacote, hash e auditoria.")}</p>
                            <div class="document-card__package">
                                <span class="hero-chip">${escapeHtml(ui.issued_document_label || "Documento emitido")}</span>
                                <span class="hero-chip">${escapeHtml(ui.official_package_label || "Pacote oficial")}</span>
                                ${issueHistory.length ? `<span class="hero-chip">${escapeHtml(String(issueHistory.length))} emissão${issueHistory.length === 1 ? "" : "es"} no histórico</span>` : ""}
                                ${official.schema_version ? `<span class="hero-chip">Schema ${escapeHtml(String(official.schema_version))}</span>` : ""}
                                ${official.template_version ? `<span class="hero-chip">Template ${escapeHtml(String(official.template_version))}</span>` : ""}
                            </div>
                            ${officialLinks}
                            ${auditHtml}
                        </section>
                    `
                    : item.pdf_present
                        ? `
                            <section class="document-card__section document-card__section--operational">
                                <div class="document-card__section-title">${escapeHtml(ui.operational_pdf_label || "PDF operacional")}</div>
                                <p>Arquivo de trabalho do caso. Não é emissão oficial e não substitui pacote oficial.</p>
                                ${item.pdf_file_name ? `<span class="document-card__muted">${escapeHtml(item.pdf_file_name)}</span>` : ""}
                            </section>
                        `
                        : "";
                const reissueHtml = item.reissue_recommended
                    ? `
                        <section class="document-card__section document-card__section--warning">
                            <div class="document-card__section-title">${escapeHtml(ui.reissue_label || "Reemissão recomendada")}</div>
                            <p>O documento atual diverge da emissão ativa. Gere nova aprovação/snapshot antes de emitir novamente.</p>
                        </section>
                    `
                    : "";
                return `
                    <article class="document-card" data-document-id="${escapeAttr(item.document_id || "")}">
                        <div class="document-card__head">
                            <div>
                                <span class="pill" data-kind="priority" data-status="${escapeAttr(tomStatusDocumento(item))}">
                                    ${escapeHtml(status)}
                                </span>
                                <h4>${escapeHtml(item.titulo || "Documento técnico")}</h4>
                            </div>
                            <span class="document-card__status">${escapeHtml(tituloTipoDocumento(item))}</span>
                        </div>
                        <div class="document-card__meta">
                            <span>${escapeHtml(item.tipo_template_label || item.tipo_template || "Sem template")}</span>
                            <span>${escapeHtml(item.family_label || item.family_key || "Família não vinculada")}</span>
                            ${item.hash_short ? `<span>Hash público ${escapeHtml(item.hash_short)}</span>` : ""}
                        </div>
                        <div class="document-card__summary">
                            <p>${escapeHtml(detalheTipoDocumento(item))}</p>
                        </div>
                        ${reissueHtml}
                        ${timelineHtml}
                        ${nr35Meta}
                        ${officialMeta}
                        ${issueHistoryHtml}
                        ${signalChips}
                        ${packageSectionHtml}
                        <div class="document-card__footer">
                            <span>${issueLine}</span>
                            <span>${signatoryLine}</span>
                        </div>
                    </article>
                `;
            }).join("");
        }

        bindDocumentCopyActions();

        return {
            abrirSecaoDocumentos,
            renderDocumentosLista,
            renderDocumentosResumo,
            resolverSecaoDocumentosPorTarget,
        };
    };
})();
