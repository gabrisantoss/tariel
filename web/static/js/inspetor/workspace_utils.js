(function attachTarielInspectorWorkspaceUtils(global) {
    "use strict";

    async function navegarParaHome(destino, options = {}, dependencies = {}) {
        const {
            windowRef = global,
            desativarContextoAtivoParaHome,
            mostrarToast,
            definirRetomadaHomePendente,
            limparEstadoHomeNoCliente,
            marcarForcaTelaInicial,
        } = dependencies;
        const preservarContexto = options.preservarContexto !== false;
        const homeDestino = String(destino || "/").trim() || "/";
        let desativou = true;

        if (homeDestino === "/" || homeDestino.startsWith("/#")) {
            windowRef.location.assign(homeDestino);
            return;
        }

        if (!preservarContexto) {
            desativou = await desativarContextoAtivoParaHome?.();
        }

        if (!desativou && !preservarContexto) {
            mostrarToast?.(
                "Não foi possível limpar o contexto ativo. Recarregando a central.",
                "aviso",
                2400
            );
        }

        definirRetomadaHomePendente?.(null);
        limparEstadoHomeNoCliente?.();
        if (preservarContexto) {
            marcarForcaTelaInicial?.();
        }
        windowRef.location.assign(homeDestino);
    }

    function processarAcaoHome(detail = {}, dependencies = {}) {
        const destino = String(detail?.destino || "/").trim() || "/";
        return dependencies.navegarParaHome?.(destino, {
            preservarContexto: detail?.preservarContexto !== false,
        });
    }

    function resumirTexto(texto, limite = 140) {
        const base = String(texto || "").replace(/\s+/g, " ").trim();
        if (!base) return "Mensagem sem conteúdo";
        return base.length > limite ? `${base.slice(0, limite)}...` : base;
    }

    function normalizarConexaoMesaWidget(valor) {
        const status = String(valor || "").trim().toLowerCase();
        if (status === "reconectando") return "reconectando";
        if (status === "offline") return "offline";
        return "conectado";
    }

    function pluralizarMesa(total, singular, plural) {
        return Number(total || 0) === 1 ? singular : (plural || `${singular}s`);
    }

    function obterTipoTemplateDoPayload(dados = {}, dependencies = {}) {
        const normalizarTipoTemplate = dependencies.normalizarTipoTemplate;
        const tipoTemplateAtivo = dependencies.estado?.tipoTemplateAtivo;
        return normalizarTipoTemplate?.(
            dados?.tipoTemplate ||
            dados?.tipo_template ||
            dados?.template ||
            tipoTemplateAtivo
        );
    }

    function inserirTextoNoComposer(texto, dependencies = {}) {
        const campoMensagem = dependencies.el?.campoMensagem;
        const textoLimpo = String(texto || "").trim();

        if (!campoMensagem || !textoLimpo) {
            return false;
        }

        const valorAtual = String(campoMensagem.value || "").trim();
        campoMensagem.value = valorAtual ? `${valorAtual}\n${textoLimpo}` : textoLimpo;

        campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
        campoMensagem.dispatchEvent(new Event("change", { bubbles: true }));
        try {
            campoMensagem.focus({ preventScroll: true });
        } catch (_) {
            campoMensagem.focus();
        }

        if (typeof campoMensagem.setSelectionRange === "function") {
            const fim = campoMensagem.value.length;
            campoMensagem.setSelectionRange(fim, fim);
        }

        return true;
    }

    function aplicarPrePromptDaAcaoRapida(botao, dependencies = {}) {
        const texto = String(botao?.dataset?.preprompt || "").trim();
        return dependencies.inserirTextoNoComposer?.(texto);
    }

    function inferirBadgeContextoChatLivrePersonalizado(payload = {}) {
        const candidatos = [
            payload.badge,
            payload.title,
            payload.runtimeTipo,
            payload.tipo,
            payload.preprompt,
        ];

        for (const candidato of candidatos) {
            const texto = String(candidato || "").trim();
            if (!texto) continue;
            const correspondencia = texto.match(/\bnr\s*-?\s*(\d{1,2})\b/i);
            if (correspondencia?.[1]) {
                return `NR${correspondencia[1]}`;
            }
        }

        const fallback = String(
            payload.title || payload.runtimeTipo || payload.tipo || "IA"
        ).trim().toUpperCase();
        return fallback.length > 12 ? fallback.slice(0, 12).trim() : fallback;
    }

    function normalizarContextoChatLivrePersonalizado(payload = {}, dependencies = {}) {
        const normalizarTipoTemplate =
            dependencies.normalizarTipoTemplate
            || ((valor) => String(valor || "padrao").trim().toLowerCase() || "padrao");
        const runtimeTipo = normalizarTipoTemplate(
            payload.runtimeTipo
            || payload.runtime_tipo
            || payload.templateKey
            || payload.tipo
            || "padrao"
        );
        const title = String(
            payload.title
            || payload.titulo
            || payload.label
            || payload.nome
            || runtimeTipo
        ).trim();
        const preprompt = String(payload.preprompt || payload.prePrompt || "").trim();

        if (!title && !preprompt) {
            return null;
        }

        const badge = inferirBadgeContextoChatLivrePersonalizado({
            ...payload,
            runtimeTipo,
            title,
            preprompt,
        });
        const titleLower = title.toLowerCase();

        return {
            kind: "free_chat_template",
            templateKey: runtimeTipo,
            runtimeTipo,
            title,
            badge,
            icon: String(payload.icon || payload.icone || "assignment").trim() || "assignment",
            meta: String(payload.meta || "").trim(),
            preprompt,
            subtitle: `Chat livre • ${title}`,
            placeholder: `Peça ao Tariel sobre ${titleLower}, evidências, riscos ou não conformidades`,
            contextTitle: `Contexto ativo: ${title}`,
            contextStatus: `As próximas respostas vão priorizar ${title} como contexto técnico principal.`,
        };
    }

    function contextosChatLivrePersonalizadosSaoIguais(a, b, dependencies = {}) {
        const contextoA = normalizarContextoChatLivrePersonalizado(a, dependencies);
        const contextoB = normalizarContextoChatLivrePersonalizado(b, dependencies);
        if (!contextoA && !contextoB) return true;
        if (!contextoA || !contextoB) return false;
        return contextoA.runtimeTipo === contextoB.runtimeTipo
            && String(contextoA.title || "").trim() === String(contextoB.title || "").trim()
            && String(contextoA.preprompt || "").trim() === String(contextoB.preprompt || "").trim();
    }

    function criarContextoChatLivrePersonalizadoDoBotao(botao, dependencies = {}) {
        if (!botao?.dataset) return null;
        return normalizarContextoChatLivrePersonalizado(
            {
                tipo: botao.dataset.tipo,
                runtime_tipo: botao.dataset.runtimeTipo,
                titulo: botao.dataset.titulo,
                badge: botao.dataset.badge,
                preprompt: botao.dataset.preprompt,
                icone: botao.dataset.icone,
                meta: botao.dataset.meta,
            },
            dependencies
        );
    }

    function montarPreferenciasOcultasChatLivrePersonalizado(contexto = {}, dependencies = {}) {
        const contextoNormalizado = normalizarContextoChatLivrePersonalizado(contexto, dependencies);
        if (!contextoNormalizado) return "";

        return [
            "[preferencias_ia_mobile]",
            `Modo fixo desta conversa: chat livre personalizado para ${contextoNormalizado.title}.`,
            `Contexto normativo principal: ${contextoNormalizado.badge || contextoNormalizado.runtimeTipo || contextoNormalizado.title}.`,
            `Atue com foco tecnico principal em ${contextoNormalizado.title}.`,
            "Considere esta NR e este contexto como referencia prioritaria da conversa enquanto o modo estiver ativo.",
            "Priorize perguntas, checklist, evidencias, riscos, nao conformidades, terminologia, documentacao obrigatoria e criterios de conformidade ligados a esse contexto.",
            contextoNormalizado.preprompt
                ? `Diretriz base: ${contextoNormalizado.preprompt}`
                : "",
            contextoNormalizado.meta
                ? `Escopo operacional esperado: ${contextoNormalizado.meta}`
                : "",
            "Se o usuario for ambiguo, interprete primeiro pelo escopo dessa NR antes de generalizar.",
            "So amplie para outras normas ou temas se o usuario pedir explicitamente ou se isso for indispensavel para nao induzir erro tecnico.",
            "[/preferencias_ia_mobile]",
        ]
            .filter(Boolean)
            .join("\n");
    }

    function obterLaudoAtivoIdSeguro(dependencies = {}) {
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.() || {};
        return dependencies.normalizarLaudoAtualId?.(snapshot.laudoAtualId);
    }

    function obterHeadersComCSRF(extra = {}, dependencies = {}) {
        const docRef = dependencies.document || global.document;
        const base = { Accept: "application/json", ...extra };

        if (global.TarielCore?.comCabecalhoCSRF) {
            return global.TarielCore.comCabecalhoCSRF(base);
        }

        const tokenMeta = docRef?.querySelector?.('meta[name="csrf-token"]')?.content?.trim() || "";
        return tokenMeta ? { ...base, "X-CSRF-Token": tokenMeta } : base;
    }

    async function extrairMensagemErroHTTP(resposta, fallback = "") {
        if (!resposta) return String(fallback || "").trim();

        try {
            const tipoConteudo = String(resposta.headers?.get("content-type") || "").toLowerCase();

            if (tipoConteudo.includes("application/json")) {
                const payload = await resposta.json();
                const detalhe =
                    payload?.detail ??
                    payload?.erro ??
                    payload?.mensagem ??
                    payload?.message ??
                    "";

                if (typeof detalhe === "string" && detalhe.trim()) {
                    return detalhe.trim();
                }

                if (Array.isArray(detalhe) && detalhe.length > 0) {
                    return String(
                        detalhe
                            .map((item) => String(item?.msg || item || "").trim())
                            .filter(Boolean)
                            .join(" | ")
                    ).trim();
                }
            } else {
                const bruto = String(await resposta.text()).trim();
                if (bruto) {
                    return bruto.slice(0, 240);
                }
            }
        } catch (_) {
            // Fallback silencioso.
        }

        return String(fallback || `Falha HTTP ${resposta.status || ""}`).trim();
    }

    function obterTokenCsrf(dependencies = {}) {
        const docRef = dependencies.document || global.document;
        return docRef?.querySelector?.('meta[name="csrf-token"]')?.content || "";
    }

    function limparEstadoHomeNoCliente(dependencies = {}) {
        try {
            global.localStorage?.removeItem?.("tariel_laudo_atual");
        } catch (_) {
            // silêncio intencional
        }

        try {
            const url = new URL(global.location.href);
            url.searchParams.delete("laudo");
            url.searchParams.delete("aba");
            global.history.replaceState({ laudoId: null, threadTab: null }, "", url.toString());
        } catch (_) {
            // silêncio intencional
        }

        dependencies.sincronizarEstadoInspector?.(
            {
                laudoAtualId: null,
                forceHomeLanding: false,
            },
            {
                persistirStorage: false,
            }
        );
    }

    async function desativarContextoAtivoParaHome(dependencies = {}) {
        const laudoAtivo = dependencies.obterLaudoAtivo?.();
        const estadoAtual = dependencies.obterEstadoRelatorioAtualSeguro?.();

        if (!laudoAtivo && estadoAtual !== "relatorio_ativo") {
            return true;
        }

        try {
            const resposta = await global.fetch("/app/api/laudo/desativar", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-Token": obterTokenCsrf(dependencies),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            return resposta.ok;
        } catch (_) {
            return false;
        }
    }

    function marcarForcaTelaInicial(dependencies = {}) {
        dependencies.sincronizarEstadoInspector?.({ forceHomeLanding: true });
    }

    function paginaSolicitaHomeLanding(dependencies = {}) {
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.() || {};
        return !!snapshot.forceHomeLanding
            || dependencies.lerFlagForcaHomeStorage?.()
            || dependencies.paginaSolicitaHomeLandingViaURL?.();
    }

    function limparForcaTelaInicial(dependencies = {}) {
        dependencies.sincronizarEstadoInspector?.({ forceHomeLanding: false });

        try {
            const url = new URL(global.location.href);
            if (url.searchParams.get("home") === "1") {
                url.searchParams.delete("home");
                global.history.replaceState(global.history.state || {}, "", url.toString());
            }
        } catch (_) {
            // silêncio intencional
        }
    }

    function homeForcadoAtivo(dependencies = {}) {
        return !!dependencies.obterSnapshotEstadoInspectorAtual?.()?.forceHomeLanding
            || dependencies.paginaSolicitaHomeLandingViaURL?.();
    }

    global.TarielInspectorWorkspaceUtils = {
        desativarContextoAtivoParaHome,
        navegarParaHome,
        limparEstadoHomeNoCliente,
        limparForcaTelaInicial,
        homeForcadoAtivo,
        aplicarPrePromptDaAcaoRapida,
        contextosChatLivrePersonalizadosSaoIguais,
        criarContextoChatLivrePersonalizadoDoBotao,
        extrairMensagemErroHTTP,
        inserirTextoNoComposer,
        inferirBadgeContextoChatLivrePersonalizado,
        marcarForcaTelaInicial,
        montarPreferenciasOcultasChatLivrePersonalizado,
        normalizarConexaoMesaWidget,
        normalizarContextoChatLivrePersonalizado,
        obterHeadersComCSRF,
        obterLaudoAtivoIdSeguro,
        obterTipoTemplateDoPayload,
        obterTokenCsrf,
        paginaSolicitaHomeLanding,
        pluralizarMesa,
        processarAcaoHome,
        resumirTexto,
    };
})(window);
