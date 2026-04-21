(function () {
    "use strict";

    function montarAtributosHistoricoWorkspace(item = {}, dependencies = {}) {
        const normalizarFiltroTipoHistorico = dependencies.normalizarFiltroTipoHistorico || ((v) => v);
        const escaparHtml = dependencies.escaparHtml || ((v) => String(v || ""));
        const tipo = normalizarFiltroTipoHistorico(item.tipo);
        const papel = String(item.papel || "sistema").trim().toLowerCase() || "sistema";
        const atributos = [
            'class="workspace-history-card"',
            'data-history-card="true"',
            `data-history-type="${escaparHtml(tipo)}"`,
            `data-history-role="${escaparHtml(papel)}"`,
        ];

        if (Array.isArray(item.anexos) && item.anexos.length) {
            atributos.push('data-history-has-attachments="true"');
        }
        if (String(item.texto || "").trim()) {
            atributos.push('data-history-has-text="true"');
        }

        return atributos.join(" ");
    }

    function montarRotuloTipoHistoricoWorkspace(tipo = "mensagens") {
        if (tipo === "eventos") return "Evento";
        if (tipo === "anexos") return "Anexo";
        if (tipo === "decisoes") return "Decisão";
        return "Mensagem";
    }

    function montarMetadadosIaHistoricoWorkspace(item = {}, dependencies = {}) {
        const escaparHtml = dependencies.escaparHtml || ((v) => String(v || ""));
        const confianca = item?.confiancaIa && typeof item.confiancaIa === "object"
            ? item.confiancaIa
            : null;
        const citacoes = Array.isArray(item?.citacoes) ? item.citacoes : [];
        const nivel = String(
            confianca?.nivel ||
            confianca?.classificacao ||
            confianca?.faixa ||
            ""
        ).trim();
        const proveniencia = String(
            confianca?.proveniência ||
            confianca?.proveniencia ||
            confianca?.fonte ||
            ""
        ).trim();

        if (!nivel && !proveniencia && !citacoes.length) {
            return "";
        }

        return `
            <details class="workspace-history-card__details">
                <summary>Metadados IA</summary>
                <div class="workspace-history-card__details-body">
                    ${nivel ? `<span>${escaparHtml(`Confiança ${nivel}`)}</span>` : ""}
                    ${proveniencia ? `<span>${escaparHtml(`Proveniência ${proveniencia}`)}</span>` : ""}
                    ${citacoes.length ? `<span>${escaparHtml(`${citacoes.length} ${citacoes.length === 1 ? "citação" : "citações"}`)}</span>` : ""}
                </div>
            </details>
        `;
    }

    function sincronizarEstadoVisualHistoricoWorkspace(options = {}, dependencies = {}) {
        const el = dependencies.el || {};
        const vazio = !!options?.vazio;
        const estadoVisual = vazio ? "empty" : "ready";
        [el.workspaceHistoryRoot, el.workspaceHistoryViewRoot, el.workspaceHistoryTimeline, el.workspaceHistoryEmpty]
            .forEach((node) => {
                if (node) {
                    node.dataset.historyState = estadoVisual;
                }
            });
    }

    function renderizarHistoricoWorkspace(itens = [], options = {}, dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const escaparHtml = dependencies.escaparHtml || ((v) => String(v || ""));
        const resumoGovernanca = dependencies.construirResumoGovernancaHistoricoWorkspace?.() || {};
        const totalMensagensReais = Number(options?.totalMensagensReais || 0) || 0;
        const acaoMesaHistorico = resumoGovernanca.visible
            ? { action: "reissue", label: "Reemissão" }
            : { action: "mesa", label: "Mesa" };

        estado.historyRenderedItems = Array.isArray(itens) ? itens : [];

        if (!el.workspaceHistoryTimeline || !el.workspaceHistoryEmpty) return;

        if (!estado.historyRenderedItems.length) {
            el.workspaceHistoryTimeline.innerHTML = "";
            el.workspaceHistoryEmpty.hidden = false;
            sincronizarEstadoVisualHistoricoWorkspace({ vazio: true }, dependencies);
            return;
        }

        el.workspaceHistoryEmpty.hidden = true;
        sincronizarEstadoVisualHistoricoWorkspace({ vazio: false }, dependencies);
        const grupos = [];
        let grupoAtual = null;

        estado.historyRenderedItems.forEach((item, itemIndex) => {
            if (!grupoAtual || grupoAtual.rotulo !== item.grupo) {
                grupoAtual = {
                    rotulo: item.grupo,
                    itens: [],
                };
                grupos.push(grupoAtual);
            }

            grupoAtual.itens.push({ ...item, renderIndex: itemIndex });
        });

        el.workspaceHistoryTimeline.innerHTML = grupos
            .map((grupo) => `
                <section class="workspace-history-group" data-history-group>
                    <header class="workspace-history-group__header" data-history-group-header>
                        <span>${escaparHtml(grupo.rotulo)}</span>
                    </header>
                    <div class="workspace-history-group__items" data-history-group-items>
                        ${grupo.itens.map((item) => `
                            <article ${montarAtributosHistoricoWorkspace(item, dependencies)} ${resumoGovernanca.visible ? 'data-history-reissue="true"' : ""}>
                                <div class="workspace-history-card__icon" aria-hidden="true">
                                    <span class="material-symbols-rounded">${escaparHtml(item.icone)}</span>
                                </div>
                                <div class="workspace-history-card__body">
                                    <div class="workspace-history-card__meta">
                                        <div class="workspace-history-card__identity">
                                            <strong>${escaparHtml(item.autor || "Registro")}</strong>
                                            <span>${escaparHtml(montarRotuloTipoHistoricoWorkspace(item.tipo))}</span>
                                        </div>
                                        <small>${escaparHtml(item.tempo || "")}</small>
                                    </div>
                                    ${item.texto ? `<p class="workspace-history-card__text">${escaparHtml(item.texto)}</p>` : ""}
                                    ${item.anexos.length ? `
                                        <div class="workspace-history-card__attachments">
                                            ${item.anexos.map((anexo) => {
                                                const nome = escaparHtml(String(anexo?.nome || "").trim());
                                                const url = String(anexo?.url || "").trim();
                                                return url
                                                    ? `<a class="workspace-history-card__attachment" href="${escaparHtml(url)}" target="_blank" rel="noreferrer">${nome}</a>`
                                                    : `<span class="workspace-history-card__attachment">${nome}</span>`;
                                            }).join("")}
                                        </div>
                                    ` : ""}
                                    ${item.papel === "ia" ? montarMetadadosIaHistoricoWorkspace(item, dependencies) : ""}
                                    ${item.papel === "sistema" || item.tipo === "eventos" ? "" : `
                                        <div class="workspace-history-card__actions">
                                            <button type="button" class="workspace-history-card__action" data-history-action="copiar" data-history-index="${item.renderIndex}">Copiar</button>
                                            <button type="button" class="workspace-history-card__action" data-history-action="fixar" data-history-index="${item.renderIndex}">Fixar</button>
                                            <details class="workspace-history-card__more">
                                                <summary>Mais</summary>
                                                <div class="workspace-history-card__more-menu">
                                                    <button type="button" class="workspace-history-card__action" data-history-action="citar" data-history-index="${item.renderIndex}">Citar</button>
                                                    <button type="button" class="workspace-history-card__action" data-history-action="${acaoMesaHistorico.action}" data-history-index="${item.renderIndex}">${acaoMesaHistorico.label}</button>
                                                </div>
                                            </details>
                                        </div>
                                    `}
                                </div>
                            </article>
                        `).join("")}
                    </div>
                </section>
            `)
            .join("");

        if (totalMensagensReais === 0) {
            el.workspaceHistoryEmpty.hidden = false;
        }
    }

    function obterChaveContextoFixadoWorkspace(dependencies = {}) {
        const laudoId = dependencies.obterLaudoAtivoIdSeguro?.();
        return `tariel_workspace_contexto_fixado_${laudoId || "ativo"}`;
    }

    function persistirContextoFixadoWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        try {
            localStorage.setItem(
                obterChaveContextoFixadoWorkspace(dependencies),
                JSON.stringify(Array.isArray(estado.contextoFixado) ? estado.contextoFixado : [])
            );
        } catch (_) {
            // armazenamento local opcional
        }
    }

    function carregarContextoFixadoWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        try {
            const bruto = localStorage.getItem(obterChaveContextoFixadoWorkspace(dependencies));
            const itens = JSON.parse(bruto || "[]");
            estado.contextoFixado = Array.isArray(itens) ? itens.filter(Boolean).slice(0, 8) : [];
        } catch (_) {
            estado.contextoFixado = [];
        }
    }

    function obterResumoSinteseIAWorkspace(dependencies = {}) {
        const resumirTexto = dependencies.resumirTexto || ((texto) => String(texto || ""));
        const bruto = String(window.TarielAPI?.obterUltimoDiagnosticoBruto?.() || "").trim();
        if (bruto) {
            return resumirTexto(bruto, 180);
        }

        const linhas = dependencies.coletarLinhasWorkspace?.() || [];
        for (let i = linhas.length - 1; i >= 0; i -= 1) {
            const linha = linhas[i];
            if (dependencies.obterPapelLinhaWorkspace?.(linha) !== "ia") continue;
            const texto = dependencies.obterDetalheLinhaWorkspace?.(linha)?.texto;
            if (texto) return resumirTexto(texto, 180);
        }

        return "A última resposta consolidada da IA aparecerá aqui.";
    }

    function obterOperacaoWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        const subtitulo = String(estado.workspaceVisualContext?.subtitle || "").trim();
        if (!subtitulo) return "Operação não identificada";
        return subtitulo.split("•")[0].trim() || subtitulo;
    }

    function montarResumoContextoIAWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        const nomesTemplates = dependencies.NOMES_TEMPLATES || {};
        const titulo = String(estado.workspaceVisualContext?.title || "Registro Técnico").trim();
        const operacao = obterOperacaoWorkspace(dependencies);
        const modelo = nomesTemplates[estado.tipoTemplateAtivo] || nomesTemplates.padrao;
        const evidencias = dependencies.contarEvidenciasWorkspace?.() || 0;
        const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
        const sintese = obterResumoSinteseIAWorkspace(dependencies);
        const fixados = (estado.contextoFixado || [])
            .slice(0, 3)
            .map((item) => `- ${item.autor}: ${item.texto}`)
            .join("\n");

        return [
            `Equipamento: ${titulo}`,
            `Operação: ${operacao}`,
            `Modelo: ${modelo}`,
            `Evidências: ${evidencias}`,
            `Pendências: ${pendencias}`,
            `Síntese atual: ${sintese}`,
            fixados ? `Contexto fixado:\n${fixados}` : "",
        ]
            .filter(Boolean)
            .join("\n");
    }

    function renderizarContextoIAWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const nomesTemplates = dependencies.NOMES_TEMPLATES || {};
        const escaparHtml = dependencies.escaparHtml || ((v) => String(v || ""));
        const pluralizarChat = dependencies.pluralizarChat || ((n, a, b) => (n === 1 ? a : b));
        const evidencias = dependencies.contarEvidenciasWorkspace?.() || 0;
        const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
        const modelo = nomesTemplates[estado.tipoTemplateAtivo] || nomesTemplates.padrao;
        const operacao = obterOperacaoWorkspace(dependencies);
        const resumoMesa = dependencies.obterResumoOperacionalMesa?.() || {};

        if (el.workspaceContextTemplate) {
            el.workspaceContextTemplate.textContent = modelo;
        }
        if (el.workspaceContextEvidencias) {
            el.workspaceContextEvidencias.textContent = String(evidencias);
        }
        if (el.workspaceContextPendencias) {
            el.workspaceContextPendencias.textContent = String(pendencias);
        }
        if (el.workspaceContextMesa) {
            el.workspaceContextMesa.textContent = resumoMesa.chipStatus || resumoMesa.titulo;
        }
        if (el.workspaceContextEquipment) {
            el.workspaceContextEquipment.textContent = String(estado.workspaceVisualContext?.title || "Registro Técnico");
        }
        if (el.workspaceContextOperation) {
            el.workspaceContextOperation.textContent = operacao;
        }
        if (el.workspaceContextSummary) {
            el.workspaceContextSummary.textContent = obterResumoSinteseIAWorkspace(dependencies);
        }

        const fixados = Array.isArray(estado.contextoFixado) ? estado.contextoFixado : [];
        if (el.workspacePinnedCard) {
            const mostrarCardFixado = fixados.length > 0;
            el.workspacePinnedCard.hidden = !mostrarCardFixado;
            el.workspacePinnedCard.setAttribute("aria-hidden", String(!mostrarCardFixado));
        }
        if (el.workspaceContextPinnedCount) {
            el.workspaceContextPinnedCount.textContent = `${fixados.length} ${pluralizarChat(fixados.length, "item", "itens")}`;
        }
        if (el.workspaceContextPinnedList) {
            if (!fixados.length) {
                el.workspaceContextPinnedList.innerHTML = `
                    <p class="workspace-context-pinned-empty">
                        Fixe mensagens importantes para manter fatos críticos sempre à vista.
                    </p>
                `;
            } else {
                el.workspaceContextPinnedList.innerHTML = fixados
                    .map((item, index) => `
                        <article class="workspace-context-pin">
                            <div class="workspace-context-pin__meta">
                                <strong>${escaparHtml(item.autor || "Registro")}</strong>
                                <span>${escaparHtml(item.papel || "contexto")}</span>
                            </div>
                            <p>${escaparHtml(item.texto || "")}</p>
                            <button type="button" class="workspace-context-pin__remove" data-context-remove-index="${index}">
                                Remover
                            </button>
                        </article>
                    `)
                    .join("");
            }
        }
    }

    function fixarContextoWorkspace(detail = {}, dependencies = {}) {
        const estado = dependencies.estado || {};
        const resumirTexto = dependencies.resumirTexto || ((texto) => String(texto || ""));
        const textoBase = String(detail?.texto || "").trim() || (
            Array.isArray(detail?.anexos)
                ? detail.anexos.map((anexo) => String(anexo?.nome || "").trim()).filter(Boolean).join(" • ")
                : ""
        );
        const texto = resumirTexto(textoBase, 220);
        if (!texto) return;

        const existente = (estado.contextoFixado || []).find((item) => {
            const itemId = Number(item?.mensagemId || 0) || null;
            const alvoId = Number(detail?.mensagemId || 0) || null;
            return (itemId && alvoId && itemId === alvoId) || String(item?.texto || "") === texto;
        });

        if (existente) {
            dependencies.mostrarToast?.("Esse contexto já está fixado.", "info", 1800);
            return;
        }

        estado.contextoFixado = [
            {
                mensagemId: Number(detail?.mensagemId || 0) || null,
                autor: String(detail?.autor || "Registro").trim() || "Registro",
                papel: String(detail?.papel || "contexto").trim() || "contexto",
                texto,
            },
            ...(Array.isArray(estado.contextoFixado) ? estado.contextoFixado : []),
        ].slice(0, 8);

        persistirContextoFixadoWorkspace(dependencies);
        renderizarContextoIAWorkspace(dependencies);
        dependencies.mostrarToast?.("Trecho fixado no contexto da IA.", "sucesso", 1800);
    }

    function removerContextoFixadoWorkspace(index, dependencies = {}) {
        const estado = dependencies.estado || {};
        const alvo = Number(index);
        if (!Number.isFinite(alvo) || alvo < 0) return;
        estado.contextoFixado = (estado.contextoFixado || []).filter((_, idx) => idx !== alvo);
        persistirContextoFixadoWorkspace(dependencies);
        renderizarContextoIAWorkspace(dependencies);
    }

    function limparContextoFixadoWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        estado.contextoFixado = [];
        persistirContextoFixadoWorkspace(dependencies);
        renderizarContextoIAWorkspace(dependencies);
    }

    async function copiarResumoContextoWorkspace(dependencies = {}) {
        try {
            await dependencies.copiarTextoWorkspace?.(montarResumoContextoIAWorkspace(dependencies));
            dependencies.mostrarToast?.("Resumo operacional copiado.", "sucesso", 1800);
        } catch (_) {
            dependencies.mostrarToast?.("Não foi possível copiar o resumo agora.", "aviso", 2200);
        }
    }

    window.TarielInspectorWorkspaceHistoryContext = Object.assign(
        window.TarielInspectorWorkspaceHistoryContext || {},
        {
            carregarContextoFixadoWorkspace,
            copiarResumoContextoWorkspace,
            fixarContextoWorkspace,
            limparContextoFixadoWorkspace,
            montarResumoContextoIAWorkspace,
            obterOperacaoWorkspace,
            obterResumoSinteseIAWorkspace,
            persistirContextoFixadoWorkspace,
            removerContextoFixadoWorkspace,
            renderizarContextoIAWorkspace,
            renderizarHistoricoWorkspace,
        }
    );
})();
