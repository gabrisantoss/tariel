(function () {
    "use strict";

    function obterDataItemHistoricoCanonico(item = {}) {
        const bruto = String(
            item?.criado_em_iso ||
            item?.created_at ||
            item?.data_iso ||
            ""
        ).trim();
        if (!bruto) return null;

        const data = new Date(bruto);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function obterTipoRegistroHistoricoCanonico(item = {}, papel = "ia", anexos = []) {
        const tipoMensagem = String(item?.tipo || "").trim().toLowerCase();
        const texto = String(item?.texto || "").trim();

        if (papel === "sistema" || tipoMensagem.includes("system") || tipoMensagem.includes("evento")) {
            return "eventos";
        }

        if (papel === "mesa" && /(aprova|rejeita|ajuste|decis|valid|conclus|parecer)/i.test(texto)) {
            return "decisoes";
        }

        if (anexos.length && !texto) {
            return "anexos";
        }

        return "mensagens";
    }

    function construirResumoBuscaHistoricoCanonico(item = {}, papel = "ia", autor = "", anexos = []) {
        return [
            autor,
            papel,
            String(item?.tipo || ""),
            String(item?.texto || ""),
            String(item?.data || ""),
            ...anexos.map((anexo) => String(anexo?.nome || "").trim()),
        ]
            .join(" ")
            .toLowerCase();
    }

    function construirItemHistoricoWorkspaceDoPayload(item = {}, index = 0, dependencies = {}) {
        const papel = dependencies.obterPapelItemHistoricoCanonico?.(item) || "ia";
        const autor = dependencies.obterAutorItemHistoricoCanonico?.(item, papel) || "";
        const anexos = dependencies.extrairAnexosHistoricoCanonico?.(item) || [];
        const data = obterDataItemHistoricoCanonico(item);
        const tipo = obterTipoRegistroHistoricoCanonico(item, papel, anexos);
        const texto = String(item?.texto || "").replace(/\s+/g, " ").trim();

        return {
            index,
            sortIndex: index,
            origem: "canonico",
            mensagemId: Number(item?.id ?? item?.mensagem_id ?? 0) || null,
            autor,
            papel,
            tempo: String(item?.data || "").trim(),
            texto,
            anexos,
            tipo,
            data,
            grupo: dependencies.obterRotuloGrupoHistoricoWorkspace?.(data) || "Sem data",
            icone: dependencies.obterIconeHistoricoWorkspace?.(tipo, papel) || "chat",
            resumoBusca: construirResumoBuscaHistoricoCanonico(item, papel, autor, anexos),
            citacoes: Array.isArray(item?.citacoes) ? item.citacoes : [],
            confiancaIa: item?.confianca_ia && typeof item.confianca_ia === "object"
                ? { ...item.confianca_ia }
                : null,
        };
    }

    function construirItemHistoricoWorkspaceDoDom(linha, index = 0, dependencies = {}) {
        const detalhe = dependencies.obterDetalheLinhaWorkspace?.(linha) || {};
        const anexos = Array.from(linha?.querySelectorAll?.(".mensagem-anexo-chip") || [])
            .map((chip, chipIndex) => {
                const nome = String(
                    chip.querySelector("span:last-child")?.textContent ||
                    chip.textContent ||
                    ""
                ).replace(/\s+/g, " ").trim();
                if (!nome) return null;
                const url = chip.tagName === "A" ? String(chip.getAttribute("href") || "").trim() : "";
                return {
                    nome,
                    url,
                    tipo: "documento",
                    chave: `dom-${index}-${chipIndex}-${nome}`,
                };
            })
            .filter(Boolean);
        const data = dependencies.obterDataLinhaWorkspace?.(linha) || null;
        const tipo = dependencies.obterTipoRegistroHistoricoWorkspace?.(linha, detalhe) || "mensagens";
        const papel = detalhe.papel || dependencies.obterPapelLinhaWorkspace?.(linha) || "sistema";

        return {
            index,
            sortIndex: 100000 + index,
            origem: "dom",
            mensagemId: detalhe.mensagemId || null,
            autor: detalhe.autor || "",
            papel,
            tempo: detalhe.tempo || "",
            texto: detalhe.texto || "",
            anexos,
            tipo,
            data,
            grupo: dependencies.obterRotuloGrupoHistoricoWorkspace?.(data) || "Sem data",
            icone: dependencies.obterIconeHistoricoWorkspace?.(tipo, papel) || "chat",
            resumoBusca: dependencies.obterTextoBuscaLinhaWorkspace?.(linha) || "",
            citacoes: [],
            confiancaIa: null,
        };
    }

    function coletarItensSuplementaresHistoricoWorkspace(itensCanonicos = [], dependencies = {}) {
        const idsCanonicos = new Set(
            itensCanonicos
                .map((item) => Number(item?.mensagemId || 0) || null)
                .filter(Boolean)
        );
        const assinaturasCanonicas = new Set(
            itensCanonicos.map((item) => [
                item.papel,
                item.tempo,
                item.texto,
                item.anexos.map((anexo) => anexo?.nome || "").join("|"),
            ].join("::"))
        );

        return (dependencies.coletarLinhasWorkspace?.() || [])
            .map((linha, index) => construirItemHistoricoWorkspaceDoDom(linha, index, dependencies))
            .filter((item) => {
                if (item.papel === "sistema") return true;
                if (!item.mensagemId) return true;
                if (!idsCanonicos.has(item.mensagemId)) return true;

                const assinatura = [
                    item.papel,
                    item.tempo,
                    item.texto,
                    item.anexos.map((anexo) => anexo?.nome || "").join("|"),
                ].join("::");
                return !assinaturasCanonicas.has(assinatura);
            });
    }

    function construirItensHistoricoWorkspace(dependencies = {}) {
        const itensCanonicos = (dependencies.obterItensCanonicosHistoricoWorkspace?.() || [])
            .map((item, index) => construirItemHistoricoWorkspaceDoPayload(item, index, dependencies));
        const itensSuplementares = coletarItensSuplementaresHistoricoWorkspace(itensCanonicos, dependencies);

        return [...itensCanonicos, ...itensSuplementares]
            .sort((a, b) => {
                const dataA = a.data instanceof Date ? a.data.getTime() : null;
                const dataB = b.data instanceof Date ? b.data.getTime() : null;

                if (dataA != null && dataB != null && dataA !== dataB) {
                    return dataA - dataB;
                }
                if (dataA != null && dataB == null) return -1;
                if (dataA == null && dataB != null) return 1;
                return Number(a.sortIndex || a.index || 0) - Number(b.sortIndex || b.index || 0);
            })
            .map((item, index) => ({
                ...item,
                index,
            }));
    }

    function itemHistoricoWorkspaceAtendeFiltros(
        item,
        { termo = "", ator = "todos", tipo = "todos" } = {}
    ) {
        const matchAtor = ator === "todos" || item.papel === ator;
        const matchTipo = tipo === "todos" || item.tipo === tipo;
        const matchBusca = !termo || item.resumoBusca.includes(termo);
        return matchAtor && matchTipo && matchBusca;
    }

    window.TarielInspectorHistoryBuilders = Object.assign(
        window.TarielInspectorHistoryBuilders || {},
        {
            construirItensHistoricoWorkspace,
            construirItemHistoricoWorkspaceDoDom,
            construirItemHistoricoWorkspaceDoPayload,
            construirResumoBuscaHistoricoCanonico,
            coletarItensSuplementaresHistoricoWorkspace,
            itemHistoricoWorkspaceAtendeFiltros,
            obterDataItemHistoricoCanonico,
            obterTipoRegistroHistoricoCanonico,
        }
    );
})();
