// ==========================================
// TARIEL.IA — REVISOR_PAINEL_OPERACAO.JS
// Papel: renderização operacional da mesa no painel do revisor.
// ==========================================

(function () {
    "use strict";

    const NS = window.TarielRevisorPainel;
    if (!NS || NS.__operacaoWired__) return;
    NS.__operacaoWired__ = true;

    const {
        els,
        state,
        escapeHtml,
        formatarDataHora,
        normalizarAnexoMensagem,
        renderizarAnexosMensagem,
        resumoMensagem,
        normalizarCollaborationSummary,
        atualizarIndicadoresListaLaudo,
        sincronizarPlaceholderContextoMesa,
        medirSync,
        snapshotDOM,
        renderizarPainelDocumentoTecnicoInline
    } = NS;

    const obterItemKindMesa = (item) => {
        const valor = String(item?.item_kind || "").trim().toLowerCase();
        if (valor === "pendency" || valor === "whisper" || valor === "message") {
            return valor;
        }
        const tipoLegacy = String(item?.tipo || "").trim().toLowerCase();
        if (tipoLegacy === "humano_eng") return "pendency";
        if (tipoLegacy === "humano_insp") return "whisper";
        return "message";
    };

    const obterPendencyStateMesa = (item) => {
        const valor = String(item?.pendency_state || "").trim().toLowerCase();
        if (valor === "open" || valor === "resolved" || valor === "not_applicable") {
            return valor;
        }
        if (obterItemKindMesa(item) !== "pendency") {
            return "not_applicable";
        }
        return String(item?.resolvida_em || "").trim() ? "resolved" : "open";
    };

    const resolverTipoOperacaoMesa = (item, tipo) => {
        if (tipo === "whisper") return "whisper";
        if (tipo === "resolvida") return "resolvida";
        if (tipo === "aberta") return "aberta";
        const itemKind = obterItemKindMesa(item);
        if (itemKind === "whisper") return "whisper";
        return obterPendencyStateMesa(item) === "resolved" ? "resolvida" : "aberta";
    };

    const renderizarItemOperacaoMesa = (item, { tipo = "aberta", permitirResponder = false } = {}) => {
        const tipoResolvido = resolverTipoOperacaoMesa(item, tipo);
        const mensagemId = Number(item?.id || 0);
        const referenciaId = Number(item?.referencia_mensagem_id || 0);
        const dataBase = tipoResolvido === "resolvida" ? item?.resolvida_em : item?.criado_em;
        const dataLabel = formatarDataHora(dataBase || item?.criado_em);
        const anexos = Array.isArray(item?.anexos) ? item.anexos.map(normalizarAnexoMensagem).filter(Boolean) : [];
        const texto = resumoMensagem(item?.texto || (anexos.length ? "Anexo enviado" : ""));
        const resolvedorNome = String(item?.resolvida_por_nome || "").trim();
        const titulo = tipoResolvido === "whisper"
            ? `Chamado #${mensagemId || "-"}`
            : `Mensagem #${mensagemId || "-"}`;
        const chipTexto = tipoResolvido === "resolvida"
            ? "Resolvida"
            : tipoResolvido === "whisper"
                ? "Chamado"
                : "Aberta";
        const subtitulo = tipoResolvido === "resolvida"
            ? `Resolvida em ${escapeHtml(dataLabel)}`
            : `Criada em ${escapeHtml(dataLabel)}`;
        const contextoBotao = referenciaId > 0
            ? `
                <button type="button" class="btn-mesa-acao" data-mesa-action="timeline-ref" data-ref-id="${referenciaId}">
                    <span class="material-symbols-rounded" aria-hidden="true">format_quote</span>
                    <span>Ver contexto</span>
                </button>
            `
            : "";
        const responderBotao = permitirResponder && mensagemId > 0
            ? `
                <button type="button" class="btn-mesa-acao" data-mesa-action="responder-item" data-msg-id="${mensagemId}">
                    <span class="material-symbols-rounded" aria-hidden="true">reply</span>
                    <span>Responder</span>
                </button>
            `
            : "";
        const botaoPendencia = mensagemId > 0 && tipoResolvido !== "whisper"
            ? `
                <button
                    type="button"
                    class="btn-mesa-acao"
                    data-mesa-action="alternar-pendencia"
                    data-msg-id="${mensagemId}"
                    data-proxima-lida="${tipoResolvido === "aberta" ? "true" : "false"}"
                >
                    <span class="material-symbols-rounded" aria-hidden="true">${tipoResolvido === "aberta" ? "task_alt" : "restart_alt"}</span>
                    <span>${tipoResolvido === "aberta" ? "Marcar resolvida" : "Reabrir"}</span>
                </button>
            `
            : "";

        return `
            <li class="mesa-operacao-item ${escapeHtml(tipoResolvido)}">
                <div class="mesa-operacao-item-topo">
                    <strong>${escapeHtml(titulo)}</strong>
                    <span class="mesa-operacao-chip ${escapeHtml(tipoResolvido)}">${escapeHtml(chipTexto)}</span>
                </div>
                <p>${escapeHtml(texto)}</p>
                ${renderizarAnexosMensagem(anexos)}
                <div class="mesa-operacao-meta">
                    <span>${subtitulo}</span>
                    ${referenciaId > 0 ? `<span>Ref. #${escapeHtml(String(referenciaId))}</span>` : "<span>Sem referência explícita</span>"}
                    ${tipoResolvido === "resolvida" && resolvedorNome ? `<span>Resolvida por ${escapeHtml(resolvedorNome)}</span>` : ""}
                </div>
                <div class="mesa-operacao-acoes">
                    <button type="button" class="btn-mesa-acao" data-mesa-action="timeline-msg" data-msg-id="${mensagemId}">
                        <span class="material-symbols-rounded" aria-hidden="true">forum</span>
                        <span>Ir para histórico</span>
                    </button>
                    ${contextoBotao}
                    ${botaoPendencia}
                    ${responderBotao}
                </div>
            </li>
        `;
    };

    const renderizarColunaOperacaoMesa = ({
        titulo,
        itens = [],
        tipo = "aberta",
        mensagemVazia,
        permitirResponder = false
    }) => {
        const lista = Array.isArray(itens) ? itens : [];
        const corpo = lista.length
            ? `
                <ul class="mesa-operacao-lista">
                    ${lista.slice(0, 5).map((item) => renderizarItemOperacaoMesa(item, { tipo, permitirResponder })).join("")}
                </ul>
            `
            : `<p class="mesa-operacao-vazio">${escapeHtml(mensagemVazia || "Sem registros no momento.")}</p>`;

        return `
            <section class="mesa-operacao-coluna">
                <header>
                    <h4>${escapeHtml(titulo)}</h4>
                    <span class="mesa-operacao-contagem">${escapeHtml(String(lista.length))}</span>
                </header>
                ${corpo}
            </section>
        `;
    };

    const obterResumoStatusOperacaoMesa = (collaboration) => {
        const abertas = Number(collaboration?.openPendencyCount || 0) || 0;
        const resolvidas = Number(collaboration?.resolvedPendencyCount || 0) || 0;

        if (abertas > 0) {
            return {
                icone: "assignment_late",
                rotulo: abertas === 1 ? "1 pendência aberta" : `${abertas} pendências abertas`,
                descricao: "Há itens da mesa aguardando retorno do campo neste laudo.",
            };
        }

        if (resolvidas > 0) {
            return {
                icone: "task_alt",
                rotulo: "Pendências resolvidas",
                descricao: "A mesa já recebeu retorno do campo e não há pendências abertas agora.",
            };
        }

        return {
            icone: "hourglass_top",
            rotulo: "Canal em triagem",
            descricao: "Sem pendências abertas no momento. Acompanhe novas mensagens e chamados do laudo.",
        };
    };

    const extrairResumoReaberturaDocumentoEmitidoMesa = (pacote) => {
        const officialIssue = pacote?.emissao_oficial;
        if (!officialIssue || typeof officialIssue !== "object") {
            return null;
        }
        const reopened = officialIssue.last_reopened_issued_document;
        if (!reopened || typeof reopened !== "object") {
            return null;
        }
        const pdfArtifact = reopened.pdf_artifact && typeof reopened.pdf_artifact === "object"
            ? reopened.pdf_artifact
            : null;
        return {
            fileName: String(reopened.file_name || "").trim(),
            visibleInActiveCase: reopened.visible_in_active_case === true,
            hiddenFromActiveCase: reopened.visible_in_active_case === false,
            storageVersion: String(pdfArtifact?.storage_version || "").trim(),
        };
    };

    const renderizarPainelMesaOperacional = (pacote) => {
        medirSync("revisor.renderizarPainelMesaOperacional", () => {
            if (!els.mesaOperacaoPainel || !els.mesaOperacaoConteudo) return;

            if (!pacote || typeof pacote !== "object") {
                els.mesaOperacaoPainel.hidden = true;
                els.mesaOperacaoConteudo.innerHTML = "";
                renderizarPainelDocumentoTecnicoInline(null);
                sincronizarPlaceholderContextoMesa?.();
                return;
            }

            const resumoPendencias = pacote.resumo_pendencias || {};
            const ultimaInteracao = formatarDataHora(pacote.ultima_interacao_em);
            const criadoEm = formatarDataHora(pacote.criado_em);
            const totalWhispersRecentes = Array.isArray(pacote.whispers_recentes) ? pacote.whispers_recentes.length : 0;
            const collaboration = normalizarCollaborationSummary(pacote, {
                pendenciasAbertas: Number(resumoPendencias.abertas || 0) || 0,
                resolvedPendencyCount: Number(resumoPendencias.resolvidas || 0) || 0,
                recentWhisperCount: totalWhispersRecentes
            });
            const totalWhispers = collaboration.recentWhisperCount;
            const statusOperacional = obterResumoStatusOperacaoMesa(collaboration);
            const decisionSummary = collaboration.openPendencyCount > 0
                ? "Solicitar correção"
                : "Aprovar ou devolver";
            const reopenSummary = extrairResumoReaberturaDocumentoEmitidoMesa(pacote);
            atualizarIndicadoresListaLaudo(state.laudoAtivoId, {
                collaborationSummary: pacote?.collaboration?.summary || {
                    open_pendency_count: collaboration.openPendencyCount,
                    resolved_pendency_count: collaboration.resolvedPendencyCount,
                    recent_whisper_count: collaboration.recentWhisperCount,
                    unread_whisper_count: collaboration.unreadWhisperCount,
                    recent_review_count: collaboration.recentReviewCount,
                    has_open_pendencies: collaboration.hasOpenPendencies,
                    has_recent_whispers: collaboration.hasRecentWhispers,
                    requires_reviewer_attention: collaboration.requiresReviewerAttention
                }
            });

            els.mesaOperacaoConteudo.innerHTML = `
                <div class="mesa-operacao-topo">
                    <div>
                        <span class="mesa-operacao-eyebrow">Caso selecionado</span>
                        <h3>Mesa Avaliadora</h3>
                        <p>${escapeHtml(statusOperacional.descricao)}</p>
                    </div>
                    <span class="mesa-operacao-tag">
                        <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(statusOperacional.icone)}</span>
                        <span>${escapeHtml(statusOperacional.rotulo)}</span>
                    </span>
                </div>

                ${reopenSummary ? `
                    <div class="mesa-operacao-inline-tags">
                        <span class="mesa-operacao-inline-tag attention">Reemissão recomendada</span>
                        <span class="mesa-operacao-inline-tag">
                            ${escapeHtml(
                                reopenSummary.visibleInActiveCase
                                    ? "PDF operacional anterior ainda visível no caso"
                                    : "Documento substituído preservado no histórico interno"
                            )}
                        </span>
                        ${(reopenSummary.fileName || reopenSummary.storageVersion)
                            ? `<span class="mesa-operacao-inline-tag neutra">${escapeHtml(
                                [reopenSummary.fileName, reopenSummary.storageVersion].filter(Boolean).join(" • ")
                            )}</span>`
                            : ""}
                    </div>
                ` : ""}

                <div class="mesa-operacao-resumo">
                    <article class="mesa-operacao-kpi">
                        <span>Pendências do caso</span>
                        <strong>${escapeHtml(String(collaboration.openPendencyCount || 0))}</strong>
                        <small>Mensagens da mesa ainda em aberto para o inspetor.</small>
                    </article>
                    <article class="mesa-operacao-kpi">
                        <span>Decisão da Mesa</span>
                        <strong>${escapeHtml(decisionSummary)}</strong>
                        <small>${escapeHtml(String(collaboration.resolvedPendencyCount || 0))} pendência(s) resolvida(s) recentemente.</small>
                    </article>
                    <article class="mesa-operacao-kpi">
                        <span>Última interação</span>
                        <strong>${escapeHtml(ultimaInteracao)}</strong>
                        <small>Laudo iniciado em ${escapeHtml(criadoEm)}.</small>
                    </article>
                    <article class="mesa-operacao-kpi">
                        <span>Tempo em campo</span>
                        <strong>${escapeHtml(String(pacote.tempo_em_campo_minutos || 0))} min</strong>
                        <small>${escapeHtml(String(totalWhispers))} chamado(s) recente(s) no canal.</small>
                    </article>
                </div>

                <div class="mesa-operacao-blocos">
                    <section class="mesa-operacao-bloco mesa-operacao-bloco--decision" data-uxf-block="decidir-agora">
                        <header class="mesa-operacao-bloco-header">
                            <span>Decidir agora</span>
                            <h4>Pendências do caso</h4>
                            <p>Itens acionáveis que impedem aprovação, emissão ou continuidade sem retorno do campo.</p>
                        </header>
                        <div class="mesa-operacao-grid">
                            ${renderizarColunaOperacaoMesa({
                                titulo: "Abertas",
                                itens: pacote.pendencias_abertas,
                                tipo: "aberta",
                                mensagemVazia: "Nenhuma pendência aberta neste momento.",
                                permitirResponder: true
                            })}
                            ${renderizarColunaOperacaoMesa({
                                titulo: "Resolvidas",
                                itens: pacote.pendencias_resolvidas_recentes,
                                tipo: "resolvida",
                                mensagemVazia: "Ainda não há resoluções recentes para este laudo.",
                                permitirResponder: false
                            })}
                            ${renderizarColunaOperacaoMesa({
                                titulo: "Chamados",
                                itens: pacote.whispers_recentes,
                                tipo: "whisper",
                                mensagemVazia: "Nenhum chamado recente registrado.",
                                permitirResponder: true
                            })}
                        </div>
                    </section>

                    <section class="mesa-operacao-bloco" data-uxf-block="decisao-mesa">
                        <header class="mesa-operacao-bloco-header">
                            <span>Decisão operacional</span>
                            <h4>Decisão da Mesa</h4>
                            <p>Leitura de governança, revisão por seção e evidências que sustentam aprovar ou devolver.</p>
                        </header>
                        <div class="mesa-operacao-insights">
                            ${NS.renderizarGovernancaPolicyMesa?.(pacote.policy_summary) || ""}
                            ${NS.renderizarRevisaoPorBlocoMesa?.(pacote.revisao_por_bloco) || ""}
                            ${NS.renderizarCoverageMapMesa?.(pacote.coverage_map) || ""}
                        </div>
                    </section>

                    <section class="mesa-operacao-bloco" data-uxf-block="documento-emissao">
                        <header class="mesa-operacao-bloco-header">
                            <span>Documento</span>
                            <h4>Documento e emissão</h4>
                            <p>PDF operacional, pacote técnico e Emissão oficial ficam separados para evitar decisão ambígua.</p>
                        </header>
                        <div class="mesa-operacao-insights">
                            ${NS.renderizarAnexoPackMesa?.(pacote.anexo_pack) || ""}
                            ${NS.renderizarEmissaoOficialMesa?.(pacote.emissao_oficial) || ""}
                        </div>
                    </section>

                    <section class="mesa-operacao-bloco mesa-operacao-bloco--audit" data-uxf-block="historico-auditoria">
                        <header class="mesa-operacao-bloco-header">
                            <span>Acompanhar e auditar</span>
                            <h4>Histórico e auditoria</h4>
                            <p>Eventos, hashes, documentos substituídos e memória operacional sem competir com a ação principal.</p>
                        </header>
                        <div class="mesa-operacao-insights">
                            ${NS.renderizarHistoricoInspecaoMesa?.(pacote.historico_inspecao) || ""}
                            ${NS.renderizarVerificacaoPublicaMesa?.(pacote.verificacao_publica) || ""}
                            ${NS.renderizarHistoricoRefazerInspetor?.(pacote.historico_refazer_inspetor) || ""}
                            ${NS.renderizarMemoriaOperacionalFamilia?.(pacote.memoria_operacional_familia) || ""}
                        </div>
                    </section>
                </div>
            `;

            els.mesaOperacaoPainel.hidden = false;
            renderizarPainelDocumentoTecnicoInline(pacote);
            sincronizarPlaceholderContextoMesa?.();
            snapshotDOM(`revisor:painel-mesa:${Number(state.laudoAtivoId || 0) || 0}`);
        }, { laudoId: Number(state.laudoAtivoId || 0) || 0 }, "render");
    };

    Object.assign(NS, {
        renderizarItemOperacaoMesa,
        renderizarColunaOperacaoMesa,
        obterResumoStatusOperacaoMesa,
        renderizarPainelMesaOperacional
    });
})();
