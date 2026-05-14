(function attachTarielInspectorWorkspaceStage(global) {
    "use strict";

    function atualizarNomeTemplateAtivo(tipo, dependencies = {}) {
        const tipoNormalizado = dependencies.normalizarTipoTemplate?.(tipo);
        dependencies.estado.tipoTemplateAtivo = tipoNormalizado;
        global.tipoTemplateAtivo = tipoNormalizado;
        dependencies.atualizarContextoWorkspaceAtivo?.();
    }

    function abrirNovaInspecaoComScreenSync(config = {}, dependencies = {}) {
        dependencies.abrirModalNovaInspecao?.(config);
        dependencies.sincronizarInspectorScreen?.();
    }

    function fecharNovaInspecaoComScreenSync(opcoes = {}, dependencies = {}) {
        const resultado = dependencies.fecharModalNovaInspecao?.(opcoes);
        dependencies.sincronizarInspectorScreen?.();
        return resultado;
    }

    function obterContextoChatLivrePersonalizadoVisivel(dependencies = {}) {
        const estado = dependencies.estado || {};
        const contexto = estado.freeChatTemplateContext;
        if (!contexto || typeof contexto !== "object") return null;

        if (estado.workspaceStage === "assistant") {
            return contexto;
        }

        if (dependencies.conversaWorkspaceModoChatAtivo?.()) {
            return contexto;
        }

        return null;
    }

    function montarCopyChatLivrePersonalizado(baseCopy = {}, contexto = {}) {
        const titulo = String(contexto.title || "Chat livre").trim() || "Chat livre";
        const placeholder = String(contexto.placeholder || "").trim()
            || `Peça ao Tariel sobre ${titulo.toLowerCase()}`;
        const contextTitle = String(contexto.contextTitle || "").trim()
            || `Contexto ativo: ${titulo}`;
        const contextStatus = String(contexto.contextStatus || "").trim()
            || `As proximas respostas vao priorizar ${titulo} como contexto tecnico principal.`;

        return {
            ...baseCopy,
            eyebrow: "Chat livre personalizado",
            headline: titulo,
            description: `Tariel vai manter perguntas, checklist e criterios focados em ${titulo}.`,
            placeholder,
            contextTitle,
            contextStatus,
        };
    }

    function renderizarRodapeContextoChatLivre(contexto = null, dependencies = {}) {
        const el = dependencies.el || {};
        const visivel = !!contexto;

        if (el.rodapeContexto) {
            el.rodapeContexto.hidden = !visivel;
            el.rodapeContexto.setAttribute("aria-hidden", String(!visivel));
        }
        if (el.btnLimparContextoChatLivre) {
            el.btnLimparContextoChatLivre.hidden = !visivel;
        }
        if (!visivel) {
            return;
        }

        if (el.rodapeContextoTitulo) {
            el.rodapeContextoTitulo.textContent = String(contexto.contextTitle || "").trim()
                || `Contexto ativo: ${String(contexto.title || "Chat livre").trim()}`;
        }
        if (el.rodapeContextoStatus) {
            el.rodapeContextoStatus.textContent = String(contexto.contextStatus || "").trim()
                || "As proximas respostas vao seguir este contexto tecnico.";
        }
    }

    function sincronizarEstadoVisualCardsGuiados(contexto = null, dependencies = {}) {
        const botoes = Array.isArray(dependencies.el?.botoesAcoesRapidas)
            ? dependencies.el.botoesAcoesRapidas
            : [];
        const chaveAtiva = String(
            contexto?.runtimeTipo || contexto?.templateKey || ""
        ).trim().toLowerCase();

        botoes.forEach((botao) => {
            if (!botao) return;
            if (String(botao.dataset.chatGuided || "").trim() !== "true") {
                botao.removeAttribute("data-context-active");
                botao.removeAttribute("aria-pressed");
                return;
            }

            const chaveBotao = String(
                botao.dataset.runtimeTipo || botao.dataset.tipo || ""
            ).trim().toLowerCase();
            const ativo = !!chaveAtiva && chaveBotao === chaveAtiva;
            botao.dataset.contextActive = ativo ? "true" : "false";
            botao.setAttribute("aria-pressed", ativo ? "true" : "false");
        });
    }

    function normalizarModoVisualNr(valor = "") {
        const texto = String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s-]+/g, "_");

        if (!texto || texto === "padrao" || texto === "ia" || texto === "geral") return "";
        if (texto.includes("nr35") || texto.includes("linha_vida") || texto.includes("altura")) return "nr35";
        if (texto.includes("nr33") || texto.includes("confin")) return "nr33";
        if (texto.includes("nr20") || texto.includes("inflam") || texto.includes("combust")) return "nr20";
        if (texto.includes("nr13") || texto.includes("caldeira") || texto.includes("vaso")) return "nr13";
        if (texto.includes("nr12") || texto.includes("maquina")) return "nr12";
        if (texto.includes("spda")) return "spda";
        if (texto.includes("loto") || texto.includes("bloqueio")) return "loto";
        if (texto.includes("pie") || texto.includes("prontuario_eletrico")) return "pie";
        if (texto.includes("rti") || texto.includes("nr10_rti")) return "rti";
        return "";
    }

    function resolverModoVisualNr(fonte = null) {
        if (!fonte) return "";
        if (typeof fonte === "string") return normalizarModoVisualNr(fonte);

        const candidatos = [
            fonte.runtimeTipo,
            fonte.templateKey,
            fonte.tipo,
            fonte.badge,
            fonte.title,
            fonte.meta,
            fonte.preprompt,
        ];

        for (const candidato of candidatos) {
            const modo = normalizarModoVisualNr(candidato);
            if (modo) return modo;
        }

        return "";
    }

    function resolverRotuloModoVisualNr(modo = "", fonte = null, dependencies = {}) {
        const modoNormalizado = normalizarModoVisualNr(modo || fonte);
        if (!modoNormalizado) return "";

        const tituloFonte = fonte && typeof fonte === "object"
            ? String(fonte.title || fonte.titulo || fonte.badge || "").trim()
            : "";
        if (tituloFonte) return tituloFonte;

        const tipoFonte = typeof fonte === "string" ? fonte : "";
        const nomeTemplate = dependencies.NOMES_TEMPLATES?.[tipoFonte]
            || dependencies.NOMES_TEMPLATES?.[modoNormalizado];
        if (nomeTemplate) return nomeTemplate;

        const rotulos = {
            rti: "RTI",
            pie: "PIE",
            spda: "SPDA",
            loto: "LOTO",
            nr12: "NR12 Máquinas",
            nr13: "NR13 Integridade",
            nr20: "NR20 Inflamáveis",
            nr33: "NR33 Espaço Confinado",
            nr35: "NR35 Linha de Vida",
        };

        return rotulos[modoNormalizado] || modoNormalizado.toUpperCase();
    }

    function montarTituloWorkspaceModoTariel(contexto = null) {
        const titulo = String(contexto?.title || contexto?.titulo || "").trim();
        return titulo ? `Tariel está no modo ${titulo}` : "Tariel";
    }

    function sincronizarModoVisualNr(modo = "", dependencies = {}) {
        const modoNormalizado = normalizarModoVisualNr(modo);
        const body = global.document?.body || null;
        const painelChat = dependencies.el?.painelChat || global.document?.getElementById?.("painel-chat") || null;

        [body, painelChat].forEach((elemento) => {
            if (!elemento?.dataset) return;
            if (modoNormalizado) {
                elemento.dataset.nrVisualMode = modoNormalizado;
            } else {
                delete elemento.dataset.nrVisualMode;
            }
        });
    }

    function sincronizarTituloModoNr(modo = "", fonte = null, dependencies = {}) {
        const el = dependencies.el || {};
        const elemento = el.workspaceNrModeTitle || global.document?.getElementById?.("workspace-nr-mode-title");
        const modoNormalizado = normalizarModoVisualNr(modo);
        const rotulo = resolverRotuloModoVisualNr(modoNormalizado, fonte, dependencies);
        const visivel = !!modoNormalizado && !!rotulo;

        [global.document?.body, el.painelChat || global.document?.getElementById?.("painel-chat")].forEach((alvo) => {
            if (!alvo?.dataset) return;
            if (visivel) {
                alvo.dataset.nrVisualTitle = rotulo;
            } else {
                delete alvo.dataset.nrVisualTitle;
            }
        });

        if (elemento) {
            elemento.hidden = true;
            elemento.setAttribute("aria-hidden", "true");
            elemento.textContent = "";
        }

        const tituloWorkspace = el.workspaceTituloLaudo || global.document?.getElementById?.("workspace-titulo-laudo");
        if (tituloWorkspace) {
            tituloWorkspace.textContent = visivel ? `Tariel está no modo ${rotulo}` : "Tariel";
            tituloWorkspace.dataset.nrTitleActive = visivel ? "true" : "false";
            if (visivel) {
                tituloWorkspace.dataset.nrModeLabel = rotulo;
            } else {
                delete tituloWorkspace.dataset.nrModeLabel;
            }
        }
    }

    function atualizarCopyWorkspaceStage(stage = "inspection", dependencies = {}) {
        const contextoChatLivre = obterContextoChatLivrePersonalizadoVisivel(dependencies);
        const evidenceFirstAtivo = !!dependencies.modoEntradaEvidenceFirstAtivo?.();
        const copyInspecao = evidenceFirstAtivo
            ? {
                ...dependencies.COPY_WORKSPACE_STAGE.inspection,
                headline: "Registro por evidências",
                description:
                    "Priorize anexos, fotos e provas do caso. Use o chat para contextualizar e fechar a narrativa técnica.",
                placeholder: "Descreva a evidência, o item verificado ou o anexo enviado",
            }
            : dependencies.COPY_WORKSPACE_STAGE.inspection;
        const copy = stage === "assistant"
            ? (
                contextoChatLivre
                    ? montarCopyChatLivrePersonalizado(
                        dependencies.COPY_WORKSPACE_STAGE.assistant,
                        contextoChatLivre
                    )
                    : dependencies.COPY_WORKSPACE_STAGE.assistant
            )
            : (
                dependencies.conversaWorkspaceModoChatAtivo?.()
                    ? (
                        contextoChatLivre
                            ? montarCopyChatLivrePersonalizado(
                                dependencies.COPY_WORKSPACE_STAGE.focusedConversation,
                                contextoChatLivre
                            )
                            : dependencies.COPY_WORKSPACE_STAGE.focusedConversation
                    )
                    : copyInspecao
            );
        const el = dependencies.el || {};

        if (el.workspaceEyebrow) {
            el.workspaceEyebrow.textContent = copy.eyebrow;
        }
        if (el.workspaceHeadline) {
            el.workspaceHeadline.textContent = copy.headline;
        }
        if (el.workspaceDescription) {
            el.workspaceDescription.textContent = copy.description;
        }
        if (el.campoMensagem) {
            el.campoMensagem.placeholder = copy.placeholder;
        }
        if (stage === "assistant" || (dependencies.conversaWorkspaceModoChatAtivo?.() && contextoChatLivre)) {
            if (el.rodapeContextoTitulo) {
                el.rodapeContextoTitulo.textContent = copy.contextTitle;
            }
            if (el.rodapeContextoStatus) {
                el.rodapeContextoStatus.textContent = copy.contextStatus;
            }
        }
        dependencies.atualizarWorkspaceEntryModeNote?.();
    }

    function atualizarControlesWorkspaceStage(dependencies = {}) {
        const el = dependencies.el || {};
        const simulacaoFerramentasLocal = !!global.TARIEL?.devInspectorToolSimulation;
        const screenBase = dependencies.resolveInspectorBaseScreen?.();
        const viewAtual = dependencies.resolveWorkspaceView?.(screenBase);
        const workspaceAtivo = screenBase !== "portal_dashboard";
        const assistantAtivo = workspaceAtivo && screenBase === "assistant_landing";
        const inspectionAtivo = workspaceAtivo && [
            "inspection_workspace",
            "inspection_conversation",
            "inspection_history",
            "inspection_record",
            "inspection_mesa",
            "inspection_corrections",
            "inspection_finalization",
        ].includes(screenBase);
        const overlayAtivo = !!dependencies.modalNovaInspecaoEstaAberta?.();
        const layoutCompacto = !!dependencies.layoutInspectorCompacto?.();
        const laudoAtivoId = dependencies.normalizarLaudoAtualId?.(
            dependencies.obterSnapshotEstadoInspectorAtual?.()?.laudoAtualId
            ?? dependencies.estado?.laudoAtualId
            ?? dependencies.obterLaudoAtivoIdSeguro?.()
        );
        const chromeTecnicoOperacional =
            workspaceAtivo &&
            !assistantAtivo &&
            !overlayAtivo &&
            (
                simulacaoFerramentasLocal
                || !dependencies.conversaWorkspaceModoChatAtivo?.(
                    screenBase,
                    dependencies.obterSnapshotEstadoInspectorAtual?.()
                )
            );
        if (
            simulacaoFerramentasLocal &&
            chromeTecnicoOperacional &&
            !layoutCompacto &&
            dependencies.workspaceViewSuportaRail?.(viewAtual) &&
            typeof dependencies.estado.workspaceRailExpanded !== "boolean"
        ) {
            dependencies.estado.workspaceRailExpanded = true;
        }
        const finalizacaoVisivel =
            workspaceAtivo &&
            !assistantAtivo &&
            !overlayAtivo &&
            !!laudoAtivoId &&
            viewAtual !== "inspection_mesa" &&
            dependencies.workspacePermiteFinalizacao?.(
                dependencies.obterPayloadStatusRelatorioWorkspaceAtual?.()
            ) &&
            viewAtual !== "inspection_finalization";
        const railVisivel = chromeTecnicoOperacional &&
            !layoutCompacto &&
            dependencies.resolveWorkspaceRailVisibility?.(screenBase);
        const composerVisivel =
            workspaceAtivo &&
            !overlayAtivo &&
            (
                assistantAtivo ||
                viewAtual === "inspection_conversation" ||
                (viewAtual === "inspection_record" && dependencies.modoEntradaEvidenceFirstAtivo?.())
            );

        if (el.rodapeEntrada) {
            el.rodapeEntrada.hidden = !composerVisivel;
        }
        if (el.btnIrFimChat) {
            el.btnIrFimChat.hidden = !chromeTecnicoOperacional || viewAtual !== "inspection_conversation";
        }
        if (el.btnMesaWidgetToggle) {
            el.btnMesaWidgetToggle.hidden = !chromeTecnicoOperacional;
        }
        dependencies.atualizarBotaoWorkspaceRail?.({
            chromeTecnicoOperacional,
            layoutCompacto,
            view: viewAtual,
            railVisivel,
        });
        if (el.btnWorkspacePreview) {
            el.btnWorkspacePreview.hidden = !chromeTecnicoOperacional || railVisivel || ["inspection_history", "inspection_finalization"].includes(viewAtual);
        }
        if (el.btnWorkspacePreviewRail) {
            el.btnWorkspacePreviewRail.hidden = !railVisivel || viewAtual === "inspection_mesa";
        }
        if (el.btnFinalizarInspecao) {
            el.btnFinalizarInspecao.hidden = !finalizacaoVisivel;
        }
        dependencies.sincronizarRotuloAcaoFinalizacaoWorkspace?.();
        if (el.btnWorkspaceOpenInspecaoModal) {
            el.btnWorkspaceOpenInspecaoModal.hidden = !workspaceAtivo || (!assistantAtivo && !inspectionAtivo) || overlayAtivo;
        }
        if (el.workspaceAssistantLanding) {
            el.workspaceAssistantLanding.hidden = !assistantAtivo || dependencies.coletarLinhasWorkspace?.().length > 0;
        }
        dependencies.atualizarWorkspaceEntryModeNote?.();
        dependencies.sincronizarInspectorScreen?.();
    }

    function atualizarContextoWorkspaceAtivo(dependencies = {}) {
        const el = dependencies.el || {};
        const estado = dependencies.estado || {};
        const contextoChatLivre = obterContextoChatLivrePersonalizadoVisivel(dependencies);
        const workspaceVisivel = String(estado.modoInspecaoUI || "workspace") === "workspace";
        const fonteModoVisualNr = contextoChatLivre || estado.tipoTemplateAtivo;
        const modoVisualNr = workspaceVisivel
            ? (
                contextoChatLivre
                    ? resolverModoVisualNr(contextoChatLivre)
                    : (
                        estado.workspaceStage !== "assistant" && !dependencies.conversaWorkspaceModoChatAtivo?.()
                            ? resolverModoVisualNr(estado.tipoTemplateAtivo)
                            : ""
                    )
            )
            : "";

        sincronizarEstadoVisualCardsGuiados(contextoChatLivre, dependencies);
        sincronizarModoVisualNr(modoVisualNr, dependencies);
        sincronizarTituloModoNr(modoVisualNr, fonteModoVisualNr, dependencies);

        if (estado.workspaceStage === "assistant") {
            dependencies.aplicarContextoVisualWorkspace?.(
                contextoChatLivre
                    ? {
                        title: montarTituloWorkspaceModoTariel(contextoChatLivre),
                        subtitle: String(contextoChatLivre.subtitle || "").trim()
                            || `Chat livre • ${String(contextoChatLivre.title || "").trim()}`,
                        statusBadge: String(contextoChatLivre.badge || "IA").trim() || "IA",
                    }
                    : dependencies.obterContextoVisualAssistente?.()
            );
            dependencies.atualizarCopyWorkspaceStage?.("assistant");
            renderizarRodapeContextoChatLivre(contextoChatLivre, dependencies);
            dependencies.atualizarPainelWorkspaceDerivado?.();
            return;
        }

        if (dependencies.conversaWorkspaceModoChatAtivo?.()) {
            dependencies.aplicarContextoVisualWorkspace?.(
                contextoChatLivre
                    ? {
                        title: montarTituloWorkspaceModoTariel(contextoChatLivre),
                        subtitle: String(contextoChatLivre.subtitle || "").trim()
                            || `Chat livre • ${String(contextoChatLivre.title || "").trim()}`,
                        statusBadge: String(contextoChatLivre.badge || "IA").trim() || "IA",
                    }
                    : dependencies.obterContextoVisualAssistente?.()
            );
            dependencies.atualizarCopyWorkspaceStage?.("inspection");
            renderizarRodapeContextoChatLivre(contextoChatLivre, dependencies);
            dependencies.atualizarPainelWorkspaceDerivado?.();
            return;
        }

        const nomeTemplate = dependencies.NOMES_TEMPLATES?.[estado.tipoTemplateAtivo]
            || dependencies.NOMES_TEMPLATES?.padrao;
        const resumoMesa = dependencies.obterResumoOperacionalMesa?.() || {};
        const evidenceFirstAtivo = !!dependencies.modoEntradaEvidenceFirstAtivo?.();

        dependencies.aplicarContextoVisualWorkspace?.();
        dependencies.atualizarCopyWorkspaceStage?.("inspection");
        renderizarRodapeContextoChatLivre(null, dependencies);
        if (el.rodapeContextoTitulo) {
            el.rodapeContextoTitulo.textContent = evidenceFirstAtivo
                ? `Registrar evidências primeiro em ${nomeTemplate}`
                : `Registrar evidências em ${nomeTemplate}`;
        }
        if (el.rodapeContextoStatus) {
            el.rodapeContextoStatus.textContent = evidenceFirstAtivo
                ? "Comece por anexos, fotos e provas do caso. O chat segue disponível para justificar a coleta."
                : resumoMesa.descricao;
        }

        dependencies.atualizarPainelWorkspaceDerivado?.();
        dependencies.atualizarWorkspaceEntryModeNote?.();
    }

    global.TarielInspectorWorkspaceStage = {
        atualizarNomeTemplateAtivo,
        abrirNovaInspecaoComScreenSync,
        fecharNovaInspecaoComScreenSync,
        atualizarCopyWorkspaceStage,
        atualizarControlesWorkspaceStage,
        atualizarContextoWorkspaceAtivo,
    };
})(window);
