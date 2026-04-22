(function () {
    "use strict";

    function obterListaComandosSlash(query = "", dependencies = {}) {
        const termo = String(query || "").trim().toLowerCase();
        const comandos = Array.isArray(dependencies.COMANDOS_SLASH)
            ? dependencies.COMANDOS_SLASH
            : [];
        if (!termo) return [...comandos];
        return comandos.filter((comando) => {
            const universo = [
                comando.id,
                comando.titulo,
                comando.descricao,
                comando.atalho,
            ].join(" ").toLowerCase();
            return universo.includes(termo);
        });
    }

    function fecharSlashCommandPalette(dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        estado.slashIndiceAtivo = 0;
        if (el.slashCommandPalette) {
            el.slashCommandPalette.hidden = true;
            el.slashCommandPalette.innerHTML = "";
        }
    }

    function renderizarSlashCommandPalette(query = "", dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const escaparHtml = dependencies.escaparHtml || ((valor) => String(valor || ""));
        if (!el.slashCommandPalette) return;

        const lista = obterListaComandosSlash(query, dependencies);
        if (!lista.length) {
            el.slashCommandPalette.hidden = false;
            el.slashCommandPalette.innerHTML = `
                <div class="slash-command-item is-active">
                    <div>
                        <strong>Nenhum comando encontrado</strong>
                        <p>Tente /resumir, /pendencias, /mesa ou /gerar-conclusao.</p>
                    </div>
                    <kbd>Esc</kbd>
                </div>
            `;
            return;
        }

        estado.slashIndiceAtivo = Math.max(
            0,
            Math.min(estado.slashIndiceAtivo || 0, lista.length - 1)
        );
        el.slashCommandPalette.hidden = false;
        el.slashCommandPalette.innerHTML = lista
            .map((comando, index) => `
                <button
                    type="button"
                    class="slash-command-item${index === estado.slashIndiceAtivo ? " is-active" : ""}"
                    data-slash-command="${escaparHtml(comando.id)}"
                >
                    <div>
                        <strong>${escaparHtml(comando.atalho)}</strong>
                        <p>${escaparHtml(comando.descricao)}</p>
                    </div>
                    <kbd>${escaparHtml(comando.titulo)}</kbd>
                </button>
            `)
            .join("");
    }

    function definirValorComposer(texto = "", options = {}, dependencies = {}) {
        const el = dependencies.el || {};
        if (!el.campoMensagem) return false;

        const valorNovo = String(texto || "").trim();
        if (!valorNovo) return false;

        const substituir = options?.substituir !== false;
        el.campoMensagem.value = substituir
            ? valorNovo
            : [String(el.campoMensagem.value || "").trim(), valorNovo].filter(Boolean).join("\n");
        el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));

        try {
            el.campoMensagem.focus({ preventScroll: true });
        } catch (_) {
            el.campoMensagem.focus();
        }

        if (typeof el.campoMensagem.setSelectionRange === "function") {
            const fim = el.campoMensagem.value.length;
            el.campoMensagem.setSelectionRange(fim, fim);
        }

        return true;
    }

    function focarComposerInspector(dependencies = {}) {
        const el = dependencies.el || {};
        if (
            !(el.campoMensagem instanceof HTMLElement) ||
            el.campoMensagem.hidden ||
            el.campoMensagem.closest?.("[hidden], [inert]") ||
            el.campoMensagem.getClientRects().length === 0
        ) {
            return;
        }

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (
                    !(el.campoMensagem instanceof HTMLElement) ||
                    el.campoMensagem.hidden ||
                    el.campoMensagem.closest?.("[hidden], [inert]") ||
                    el.campoMensagem.getClientRects().length === 0
                ) {
                    return;
                }

                try {
                    el.campoMensagem.focus({ preventScroll: true });
                } catch (_) {
                    el.campoMensagem.focus();
                }

                if (typeof el.campoMensagem.setSelectionRange === "function") {
                    const fim = el.campoMensagem.value.length;
                    el.campoMensagem.setSelectionRange(fim, fim);
                }
            });
        });
    }

    function podeArmarPrimeiroEnvioNovoChat(dependencies = {}) {
        const el = dependencies.el || {};
        if (!el.campoMensagem || !el.btnEnviar) return false;
        if (!dependencies.landingNovoChatAtivo?.()) return false;

        const texto = String(el.campoMensagem.value || "").trim();
        const iaRespondendo = document.body?.dataset?.iaRespondendo === "true"
            || String(el.btnEnviar.dataset?.action || "").trim().toLowerCase() === "stop";

        if (!texto || texto.startsWith("/") || iaRespondendo) {
            return false;
        }

        return true;
    }

    function armarPrimeiroEnvioNovoChatPendente(dependencies = {}) {
        if (!podeArmarPrimeiroEnvioNovoChat(dependencies)) {
            return false;
        }

        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (snapshot?.assistantLandingFirstSendPending) {
            return true;
        }

        dependencies.sincronizarEstadoInspector?.(
            {
                assistantLandingFirstSendPending: true,
                freeChatConversationActive: false,
            },
            {
                persistirStorage: false,
            }
        );

        return true;
    }

    function prepararComposerParaEnvioModoEntrada(dependencies = {}) {
        if (!dependencies.modoEntradaEvidenceFirstAtivo?.()) return;

        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.();
        if (snapshot?.workspaceStage !== "inspection") return;

        const screenAtual = snapshot?.inspectorScreen || dependencies.resolveInspectorScreen?.();
        const viewAtual = dependencies.resolveWorkspaceView?.(screenAtual);
        if (viewAtual !== "inspection_record") return;

        dependencies.atualizarThreadWorkspace?.("conversa", {
            persistirURL: true,
            replaceURL: true,
        });
    }

    async function abrirMesaComContexto(detail = {}, dependencies = {}) {
        const el = dependencies.el || {};
        if (!dependencies.obterLaudoAtivoIdSeguro?.()) {
            dependencies.avisarMesaExigeInspecao?.();
            return;
        }

        dependencies.atualizarThreadWorkspace?.("mesa", {
            persistirURL: true,
            replaceURL: true,
        });
        await dependencies.abrirMesaWidget?.();

        const mensagemId = Number(detail?.mensagemId || 0) || null;
        const textoBase = String(detail?.texto || "").trim();
        if (mensagemId && textoBase) {
            dependencies.definirReferenciaMesaWidget?.({
                id: mensagemId,
                texto: textoBase,
            });
        }

        if (el.mesaWidgetInput) {
            const mensagem = String(detail?.mensagem || "").trim() || (
                textoBase
                    ? `Preciso de validação da mesa sobre este trecho:\n\n"${textoBase}"`
                    : "Solicito validação da mesa para este laudo."
            );
            el.mesaWidgetInput.value = mensagem;
            el.mesaWidgetInput.dispatchEvent(new Event("input", { bubbles: true }));
            el.mesaWidgetInput.focus();
        }

        dependencies.atualizarStatusChatWorkspace?.("mesa", "Canal da mesa pronto para revisão.");
        dependencies.mostrarToast?.("Canal da mesa aberto com contexto aplicado.", "sucesso", 1800);
    }

    function montarMensagemReemissaoWorkspace(detail = {}, dependencies = {}) {
        const resumoGovernanca = dependencies.construirResumoGovernancaHistoricoWorkspace?.() || {};
        const partes = ["Solicito revisão para reemissão do documento oficial deste caso."];

        if (resumoGovernanca.visible && resumoGovernanca.detail) {
            partes.push(resumoGovernanca.detail);
        }

        const textoBase = String(detail?.texto || "").trim();
        if (textoBase) {
            partes.push(`Trecho de apoio:\n\n"${textoBase}"`);
        }

        return partes.join("\n\n");
    }

    async function abrirReemissaoWorkspace(detail = {}, dependencies = {}) {
        await abrirMesaComContexto(
            {
                ...detail,
                mensagem: montarMensagemReemissaoWorkspace(detail, dependencies),
            },
            dependencies
        );
    }

    function obterEntradaReemissaoWorkspace(detail = {}, dependencies = {}) {
        const estado = dependencies.estado || {};
        const snapshot = dependencies.obterSnapshotEstadoInspectorAtual?.();
        const laudoAtivoId = dependencies.normalizarLaudoAtualId?.(snapshot?.laudoAtualId);
        const resumoGovernanca = dependencies.construirResumoGovernancaHistoricoWorkspace?.() || {};

        if (
            !laudoAtivoId ||
            !dependencies.estadoRelatorioPossuiContexto?.(snapshot?.estadoRelatorio) ||
            !resumoGovernanca.visible
        ) {
            return null;
        }

        return {
            ...detail,
            laudoId: laudoAtivoId,
            resumoGovernanca,
            texto: String(detail?.texto || "").trim(),
            estado,
        };
    }

    function limparComposerWorkspace(dependencies = {}) {
        const el = dependencies.el || {};
        if (!el.campoMensagem) return;
        el.campoMensagem.value = "";
        el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function obterTextoDeApoioComposer(dependencies = {}) {
        const el = dependencies.el || {};
        const texto = String(el.campoMensagem?.value || "").trim();
        if (!texto || texto.startsWith("/")) {
            return "";
        }
        return texto;
    }

    function redirecionarEntradaParaReemissaoWorkspace(detail = {}, dependencies = {}) {
        const entrada = obterEntradaReemissaoWorkspace(detail, dependencies);
        if (!entrada) return false;

        if (detail?.limparComposer) {
            limparComposerWorkspace(dependencies);
        }

        abrirReemissaoWorkspace(entrada, dependencies).catch(() => {});
        return true;
    }

    function executarComandoSlash(comandoId, options = {}, dependencies = {}) {
        const origem = options?.origem || "palette";
        const comandos = Array.isArray(dependencies.COMANDOS_SLASH)
            ? dependencies.COMANDOS_SLASH
            : [];
        const el = dependencies.el || {};
        const comando = comandos.find((item) => item.id === comandoId);
        if (!comando) return false;

        fecharSlashCommandPalette(dependencies);

        if (comando.id === "mesa") {
            const redirecionado = redirecionarEntradaParaReemissaoWorkspace(
                {
                    origem: `slash_${origem}`,
                    texto: obterTextoDeApoioComposer(dependencies),
                    limparComposer: true,
                },
                dependencies
            );
            if (!redirecionado) {
                abrirMesaComContexto(
                    {
                        mensagem: `Solicito validação da mesa sobre este laudo.\n\n${dependencies.montarResumoContextoIAWorkspace?.() || ""}`,
                    },
                    dependencies
                ).catch(() => {});
            }
            if (el.campoMensagem) {
                el.campoMensagem.value = "";
                el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
            }
            return true;
        }

        const aplicado = definirValorComposer(comando.prompt, { substituir: true }, dependencies);
        if (aplicado && origem !== "atalho") {
            dependencies.mostrarToast?.(`${comando.atalho} aplicado no composer.`, "info", 1800);
        }
        return aplicado;
    }

    function renderizarSugestoesComposer(dependencies = {}) {
        const el = dependencies.el || {};
        const escaparHtml = dependencies.escaparHtml || ((valor) => String(valor || ""));
        const sugestoesEntrada = Array.isArray(dependencies.SUGESTOES_ENTRADA_ASSISTENTE)
            ? dependencies.SUGESTOES_ENTRADA_ASSISTENTE
            : [];
        const comandos = Array.isArray(dependencies.COMANDOS_SLASH)
            ? dependencies.COMANDOS_SLASH
            : [];
        if (!el.composerSuggestions) return;

        if (dependencies.resolveWorkspaceView?.() === "assistant_landing") {
            el.composerSuggestions.innerHTML = sugestoesEntrada
                .slice(0, 3)
                .map((sugestao) => `
                    <button
                        type="button"
                        class="composer-suggestion composer-suggestion--entry"
                        data-suggestion-text="${escaparHtml(sugestao.prompt)}"
                        data-suggestion-priority="${escaparHtml(sugestao.prioridade || "secondary")}"
                    >
                        <span>${escaparHtml(sugestao.titulo)}</span>
                    </button>
                `)
                .join("");
            return;
        }

        if (dependencies.conversaWorkspaceModoChatAtivo?.()) {
            el.composerSuggestions.innerHTML = "";
            return;
        }

        const resumoGovernanca = dependencies.construirResumoGovernancaHistoricoWorkspace?.() || {};
        const sugestoes = comandos
            .filter((comando) => comando.sugestao)
            .filter((comando) => !resumoGovernanca.visible || comando.id !== "mesa")
            .slice(0, resumoGovernanca.visible ? 2 : 3);
        const sugestoesMarkup = [];

        if (resumoGovernanca.visible) {
            sugestoesMarkup.push(`
                <button
                    type="button"
                    class="composer-suggestion composer-suggestion--warning"
                    data-suggestion-action="reissue"
                >
                    <span class="material-symbols-rounded" aria-hidden="true">warning</span>
                    <span>${escaparHtml(resumoGovernanca.actionLabel || "Abrir reemissão na Mesa")}</span>
                </button>
            `);
        }

        sugestoesMarkup.push(...sugestoes.map((comando) => `
                <button
                    type="button"
                    class="composer-suggestion"
                    data-suggestion-command="${escaparHtml(comando.id)}"
                >
                    <span class="material-symbols-rounded" aria-hidden="true">${escaparHtml(comando.icone)}</span>
                    <span>${escaparHtml(comando.titulo)}</span>
                </button>
            `));

        el.composerSuggestions.innerHTML = sugestoesMarkup.join("");
    }

    function atualizarRecursosComposerWorkspace(dependencies = {}) {
        const el = dependencies.el || {};
        const valor = String(el.campoMensagem?.value || "").trimStart();
        if (valor.startsWith("/")) {
            renderizarSlashCommandPalette(valor.slice(1), dependencies);
        } else {
            fecharSlashCommandPalette(dependencies);
        }
    }

    function registrarPromptHistorico(texto = "", dependencies = {}) {
        const estado = dependencies.estado || {};
        const valor = String(texto || "").trim();
        if (!valor) return;

        estado.historicoPrompts = [
            valor,
            ...(estado.historicoPrompts || []).filter((item) => item !== valor),
        ].slice(0, 20);
        estado.indiceHistoricoPrompt = -1;
        estado.rascunhoHistoricoPrompt = "";
    }

    function navegarHistoricoPrompts(direcao = -1, dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const historico = Array.isArray(estado.historicoPrompts) ? estado.historicoPrompts : [];
        if (!historico.length || !el.campoMensagem) return false;

        if (estado.indiceHistoricoPrompt === -1) {
            estado.rascunhoHistoricoPrompt = String(el.campoMensagem.value || "");
        }

        const proximoIndice = (estado.indiceHistoricoPrompt || 0) + direcao;
        if (proximoIndice < -1 || proximoIndice >= historico.length) return false;

        estado.indiceHistoricoPrompt = proximoIndice;
        const proximoValor = proximoIndice === -1
            ? estado.rascunhoHistoricoPrompt
            : historico[proximoIndice];

        el.campoMensagem.value = proximoValor;
        el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    }

    function onCampoMensagemWorkspaceKeydown(event, dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const valor = String(el.campoMensagem?.value || "").trimStart();
        const paletteAberto = !el.slashCommandPalette?.hidden && valor.startsWith("/");

        if (paletteAberto) {
            const lista = obterListaComandosSlash(valor.slice(1), dependencies);

            if (event.key === "ArrowDown") {
                event.preventDefault();
                event.stopImmediatePropagation();
                estado.slashIndiceAtivo = Math.min(
                    Math.max(lista.length - 1, 0),
                    (estado.slashIndiceAtivo || 0) + 1
                );
                renderizarSlashCommandPalette(valor.slice(1), dependencies);
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                event.stopImmediatePropagation();
                estado.slashIndiceAtivo = Math.max(0, (estado.slashIndiceAtivo || 0) - 1);
                renderizarSlashCommandPalette(valor.slice(1), dependencies);
                return;
            }

            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const comando = lista[estado.slashIndiceAtivo || 0] || lista[0];
                if (comando) {
                    executarComandoSlash(comando.id, {}, dependencies);
                }
                return;
            }

            if (event.key === "Escape") {
                fecharSlashCommandPalette(dependencies);
                return;
            }
        }

        if (event.altKey && event.key === "ArrowUp") {
            if (navegarHistoricoPrompts(1, dependencies)) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            return;
        }

        if (event.altKey && event.key === "ArrowDown") {
            if (navegarHistoricoPrompts(-1, dependencies)) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            return;
        }

        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey
        ) {
            const textoComposer = obterTextoDeApoioComposer(dependencies);
            if (
                textoComposer &&
                redirecionarEntradaParaReemissaoWorkspace(
                    {
                        origem: "composer_enter",
                        texto: textoComposer,
                        limparComposer: true,
                    },
                    dependencies
                )
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            prepararComposerParaEnvioModoEntrada(dependencies);
            armarPrimeiroEnvioNovoChatPendente(dependencies);
        }
    }

    window.TarielInspectorWorkspaceComposer = Object.assign(
        window.TarielInspectorWorkspaceComposer || {},
        {
            abrirMesaComContexto,
            abrirReemissaoWorkspace,
            armarPrimeiroEnvioNovoChatPendente,
            atualizarRecursosComposerWorkspace,
            definirValorComposer,
            executarComandoSlash,
            fecharSlashCommandPalette,
            focarComposerInspector,
            montarMensagemReemissaoWorkspace,
            navegarHistoricoPrompts,
            obterEntradaReemissaoWorkspace,
            obterListaComandosSlash,
            obterTextoDeApoioComposer,
            onCampoMensagemWorkspaceKeydown,
            prepararComposerParaEnvioModoEntrada,
            redirecionarEntradaParaReemissaoWorkspace,
            registrarPromptHistorico,
            renderizarSlashCommandPalette,
            renderizarSugestoesComposer,
        }
    );
})();
