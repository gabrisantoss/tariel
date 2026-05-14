(function () {
    "use strict";

    const inspectorRuntime = window.TarielInspectorRuntime || null;
    const modules = typeof inspectorRuntime?.resolveModuleBucket === "function"
        ? inspectorRuntime.resolveModuleBucket("TarielInspetorModules")
        : (window.TarielInspetorModules = window.TarielInspetorModules || {});

    modules.registerUiBindings = function registerUiBindings(ctx) {
        const estado = ctx.state;
        const el = ctx.elements;
        const {
            mostrarToast,
            normalizarFiltroPendencias,
            obterLaudoAtivoIdSeguro,
            obterHeadersComCSRF,
            extrairMensagemErroHTTP,
            avisarMesaExigeInspecao,
            escaparHtml,
        } = ctx.shared;

        function normalizarTextoComandoModoLaudo(texto = "") {
            return String(texto || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, " ");
        }

        function detectarIntencaoModoLaudo(texto = "") {
            const normalizado = normalizarTextoComandoModoLaudo(texto);
            if (!normalizado) return "";
            if ([
                "sair do modo laudo",
                "sair do laudo",
                "pausar laudo",
                "pausar modo laudo",
                "modo off",
            ].some((gatilho) => normalizado === gatilho || normalizado.startsWith(`${gatilho} `))) {
                return "pause";
            }
            if ([
                "voltar ao modo laudo",
                "voltar para o laudo",
                "retomar laudo",
                "continuar laudo",
                "entrar no modo laudo",
            ].some((gatilho) => normalizado === gatilho || normalizado.startsWith(`${gatilho} `))) {
                return "resume";
            }
            return "";
        }

        function chaveModoColetaLaudo(laudoId) {
            return `tariel_report_context_enabled:${Number(laudoId || 0) || 0}`;
        }

        function modoColetaLaudoAtivo(laudoId = obterLaudoAtivoIdSeguro()) {
            const id = Number(laudoId || 0) || 0;
            if (id <= 0) return true;
            try {
                return window.localStorage?.getItem?.(chaveModoColetaLaudo(id)) !== "0";
            } catch (_) {
                return true;
            }
        }

        function definirModoColetaLaudo(laudoId, ativo) {
            const id = Number(laudoId || 0) || 0;
            if (id <= 0) return;
            try {
                window.localStorage?.setItem?.(chaveModoColetaLaudo(id), ativo ? "1" : "0");
            } catch (_) {}
            sincronizarBotaoModoColetaLaudo();
        }

        function sincronizarBotaoModoColetaLaudo() {
            const laudoId = obterLaudoAtivoIdSeguro();
            const ativo = modoColetaLaudoAtivo(laudoId);
            document.body.dataset.reportContextEnabled = ativo ? "true" : "false";

            if (!el.btnIniciarLaudoChatLivre) return;
            const label = el.btnIniciarLaudoChatLivre.querySelector("span:last-child");
            const icon = el.btnIniciarLaudoChatLivre.querySelector(".material-symbols-rounded");
            if (!laudoId) {
                if (label) label.textContent = "Laudo";
                if (icon) icon.textContent = "description";
                el.btnIniciarLaudoChatLivre.setAttribute("aria-label", "Criar novo laudo a partir do chat livre");
                return;
            }
            if (label) label.textContent = ativo ? "Sair do laudo" : "Voltar ao laudo";
            if (icon) icon.textContent = ativo ? "pause_circle" : "play_circle";
            el.btnIniciarLaudoChatLivre.setAttribute(
                "aria-label",
                ativo ? "Pausar coleta do laudo" : "Retomar coleta do laudo"
            );
        }

        function renderizarChecklistCompatibilidadeTemplate(itens = []) {
            if (!el.workspaceTemplateCompatibilityList) return;
            const lista = Array.isArray(itens) ? itens.filter((item) => item && typeof item === "object") : [];
            const escape = typeof escaparHtml === "function"
                ? escaparHtml
                : (valor = "") => String(valor || "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            if (!lista.length) {
                el.workspaceTemplateCompatibilityList.innerHTML = "";
                el.workspaceTemplateCompatibilityList.hidden = true;
                return;
            }

            el.workspaceTemplateCompatibilityList.hidden = false;
            el.workspaceTemplateCompatibilityList.innerHTML = lista
                .slice(0, 6)
                .map((item) => {
                    const titulo = String(item.title || item.titulo || "").trim();
                    const detalhe = String(item.detail || item.descricao || "").trim();
                    return `
                        <li>
                            <strong>${escape(titulo)}</strong>
                            ${detalhe ? `<span>${escape(detalhe)}</span>` : ""}
                        </li>
                    `;
                })
                .join("");
        }

        window.TarielInspectorReportMode = {
            detectIntent: detectarIntencaoModoLaudo,
            isEnabled: modoColetaLaudoAtivo,
            setEnabled: definirModoColetaLaudo,
            sync: sincronizarBotaoModoColetaLaudo,
        };

        function mesaAvaliadoraDisponivelParaUsuario() {
            return window.TARIEL?.hasUserCapability?.("inspector_send_to_mesa", true) ?? true;
        }

        function tenantCapabilityAtiva(capability, fallback = false) {
            return window.TARIEL?.hasUserCapability?.(capability, fallback) ?? !!fallback;
        }

        function abrirJanelaFerramentaLaudo(url) {
            const destino = String(url || "").trim();
            if (!destino) return;
            window.open(destino, "_blank", "noopener,noreferrer");
        }

        function urlFerramentaLaudo(action, laudoId) {
            const id = String(laudoId || "").trim();
            if (action === "templates") return "/revisao/templates-laudo";
            if (action === "editor") return "/revisao/templates-laudo/editor";
            if (!id) return "";
            if (action === "official_pdf") return `/app/laudo/${encodeURIComponent(id)}/preparar-emissao?tool=pdf`;
            if (action === "technical_package") return `/app/laudo/${encodeURIComponent(id)}/preparar-emissao?tool=pacote`;
            if (action === "signature") return `/app/laudo/${encodeURIComponent(id)}/assinatura`;
            return "";
        }

        function sincronizarFerramentasGovernadasLaudo() {
            const botoes = Array.isArray(el.workspaceRailToolButtons) ? el.workspaceRailToolButtons : [];
            const laudoAtivo = !!obterLaudoAtivoIdSeguro();
            const estadoRelatorio = String(
                ctx.actions?.obterEstadoRelatorioAtualSeguro?.()
                || estado.estadoRelatorio
                || "sem_relatorio"
            ).trim().toLowerCase();
            let visiveis = 0;
            botoes.forEach((botao) => {
                const capability = String(botao?.dataset?.requiredCapability || "").trim();
                const podeVer = !capability || tenantCapabilityAtiva(capability, false);
                const action = String(botao?.dataset?.railToolAction || "").trim();
                const exigeLaudo = ["signature", "official_pdf", "technical_package"].includes(action);
                const precisaAprovar = (
                    podeVer
                    && laudoAtivo
                    && action === "official_pdf"
                    && !["aprovado"].includes(estadoRelatorio)
                );
                botao.hidden = !podeVer;
                botao.setAttribute("aria-hidden", String(!podeVer));
                botao.classList.toggle("workspace-rail-tool--needs-case", podeVer && exigeLaudo && !laudoAtivo);
                botao.classList.toggle("workspace-rail-tool--needs-approval", precisaAprovar);
                botao.title = podeVer
                    ? (
                        exigeLaudo && !laudoAtivo
                            ? "Selecione ou inicie um laudo antes de abrir esta ferramenta."
                            : precisaAprovar
                                ? "Precisa aprovar primeiro. A preparacao abre os bloqueios e proximas acoes."
                            : "Liberado pelo pacote contratado desta empresa."
                    )
                    : "Nao contratado para esta empresa.";
                if (podeVer) {
                    visiveis += 1;
                    botao.dataset.toolStatus = exigeLaudo && !laudoAtivo
                        ? "sem-laudo"
                        : precisaAprovar
                            ? "precisa-aprovar"
                            : "liberado-pacote";
                }
            });
            if (el.workspaceRailToolboxHint) {
                el.workspaceRailToolboxHint.hidden = visiveis > 0;
                el.workspaceRailToolboxHint.textContent = "Ferramentas de revisão e emissão não estão contratadas para esta empresa.";
            }
        }

        function abrirFerramentaGovernadaLaudo(action) {
            const acao = String(action || "").trim();
            const laudoId = obterLaudoAtivoIdSeguro();
            if (["official_pdf", "technical_package", "signature"].includes(acao) && !laudoId) {
                mostrarToast("Selecione ou inicie um laudo antes de abrir esta ferramenta.", "aviso", 2600);
                return;
            }
            const url = urlFerramentaLaudo(acao, laudoId);
            if (!url) {
                mostrarToast("Ferramenta ainda não possui tela dedicada para este laudo.", "info", 2600);
                return;
            }
            abrirJanelaFerramentaLaudo(url);
        }

        function redirecionarMesaGovernadaParaCorrecoes() {
            mostrarToast(
                "Revisão Técnica não está contratada para esta empresa. Use Correções no próprio chat.",
                "info",
                2600
            );
            atualizarThreadWorkspace("correcoes", {
                persistirURL: true,
                replaceURL: true,
            });
        }

        function bindUiBindings() {
            if (estado.uiBindingsBound) return;
            estado.uiBindingsBound = true;

            const PERF = window.TarielPerf || window.TarielCore?.TarielPerf || null;
            const INPUT_ANEXO_ACCEPT_PADRAO = "image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const INPUT_ANEXO_MESA_ACCEPT_PADRAO = "image/png,image/jpeg,image/jpg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            const {
                abrirChatLivreInspector = () => false,
                abrirLaudoPeloHome = async () => false,
                abrirMesaComContexto = async () => {},
                abrirMesaWidget = async () => {},
                abrirNovaInspecaoComScreenSync = () => {},
                abrirPreviewWorkspace = async () => {},
                aplicarEstadoAcordeaoRailWorkspace = () => {},
                aplicarHighlightComposer = () => {},
                aplicarPrePromptDaAcaoRapida = () => false,
                armarPrimeiroEnvioNovoChatPendente = () => {},
                atualizarHistoricoHomeExpandido = () => {},
                atualizarRecursosComposerWorkspace = () => {},
                atualizarThreadWorkspace = () => {},
                citarMensagemWorkspace = () => {},
                copiarResumoContextoWorkspace = () => {},
                copiarTextoWorkspace = async () => {},
                definirBotaoLaudoCarregando = () => {},
                definirBotaoPreviewCarregando = () => {},
                definirReferenciaMesaWidget = () => {},
                executarComandoSlash = () => {},
                exportarPendenciasPdf = async () => {},
                extrairContextoVisualWorkspace = () => ({}),
                fecharBannerEngenharia = () => {},
                fecharMesaWidget = () => {},
                filtrarSidebarHistorico = () => {},
                filtrarTimelineWorkspace = () => {},
                finalizarInspecao = async () => null,
                fixarContextoWorkspace = () => {},
                focarComposerInspector = () => {},
                inserirTextoNoComposer = () => false,
                irParaMensagemPrincipal = async () => {},
                limparAnexoMesaWidget = () => {},
                limparContextoChatLivrePersonalizado = () => false,
                limparContextoFixadoWorkspace = () => {},
                normalizarFiltroChat = (valor) => String(valor || "").trim().toLowerCase(),
                normalizarFiltroTipoHistorico = (valor) => String(valor || "").trim().toLowerCase(),
                normalizarThreadTab = (valor) => String(valor || "").trim().toLowerCase(),
                obterEstadoRelatorioAtualSeguro = () => "sem_relatorio",
                obterMensagemMesaPorId = () => null,
                obterTextoDeApoioComposer = () => "",
                onCampoMensagemWorkspaceKeydown = () => {},
                prepararComposerParaEnvioModoEntrada = () => {},
                processarAcaoHome = () => {},
                promoverPrimeiraMensagemNovoChatSePronta = () => {},
                registrarPromptHistorico = () => {},
                redirecionarEntradaParaReemissaoWorkspace = () => false,
                removerContextoFixadoWorkspace = () => {},
                resolveWorkspaceView = () => "",
                rolarParaHistoricoHome = () => {},
                selecionarAnexoMesaWidget = () => {},
                sincronizarInspectorScreen = () => {},
                sincronizarScrollBackdrop = () => {},
                sincronizarSidebarLaudosTabs = () => {},
                togglePainelPendencias = () => {},
                workspaceViewSuportaRail = () => false,
                atualizarPendenciaIndividual = async () => {},
                carregarPendenciasMesa = async () => {},
                enviarMensagemMesaWidget = () => {},
                abrirReemissaoWorkspace = async () => {},
            } = ctx.actions;

            function abrirSeletorAnexo(tipo = "file") {
                const inputAnexo = document.getElementById("input-anexo");
                if (!inputAnexo) return;

                inputAnexo.setAttribute(
                    "accept",
                    tipo === "photo" ? "image/*" : INPUT_ANEXO_ACCEPT_PADRAO
                );
                inputAnexo.multiple = true;
                inputAnexo.click();
            }

            function abrirSeletorAnexoMesa(tipo = "file") {
                const inputAnexo = el.mesaWidgetInputAnexo;
                if (!inputAnexo) return;

                inputAnexo.setAttribute(
                    "accept",
                    tipo === "photo" ? "image/*" : INPUT_ANEXO_MESA_ACCEPT_PADRAO
                );
                inputAnexo.click();
            }

            el.btnHomeVerHistorico?.addEventListener("click", () => {
                rolarParaHistoricoHome({
                    expandir: Boolean(el.historicoHomeExtras?.length),
                });
            });
            el.btnHomeToggleHistoricoCompleto?.addEventListener("click", () => {
                const expandido = el.btnHomeToggleHistoricoCompleto?.getAttribute("aria-expanded") === "true";
                atualizarHistoricoHomeExpandido(!expandido);
                if (!expandido) {
                    rolarParaHistoricoHome();
                }
            });
            el.btnLimparContextoChatLivre?.addEventListener("click", () => {
                limparContextoChatLivrePersonalizado();
                focarComposerInspector();
            });
            el.btnWorkspaceCopyVerification?.addEventListener("click", async () => {
                const verificationUrl = String(
                    el.btnWorkspaceCopyVerification?.dataset?.verificationUrl || ""
                ).trim();
                if (!verificationUrl) {
                    mostrarToast("Ainda não há link público pronto para copiar.", "aviso", 2400);
                    return;
                }
                try {
                    await copiarTextoWorkspace(verificationUrl);
                    mostrarToast("Link de verificação copiado.", "sucesso", 2200);
                } catch (_) {
                    mostrarToast("Não foi possível copiar o link agora.", "erro", 2600);
                }
            });
            el.btnIniciarLaudoChatLivre?.addEventListener("click", () => {
                if (!el.campoMensagem || !el.btnEnviar) return;
                const laudoId = obterLaudoAtivoIdSeguro();
                if (laudoId) {
                    const proximo = !modoColetaLaudoAtivo(laudoId);
                    definirModoColetaLaudo(laudoId, proximo);
                    mostrarToast(
                        proximo
                            ? "Coleta do laudo retomada. As próximas mensagens entram no relatório."
                            : "Coleta do laudo pausada. As próximas mensagens ficam fora do PDF.",
                        "info",
                        2600
                    );
                    return;
                }
                const textoAtual = String(el.campoMensagem.value || "").trim();
                el.campoMensagem.value = textoAtual
                    ? `iniciar novo laudo\n\n${textoAtual}`
                    : "iniciar novo laudo";
                el.campoMensagem.dispatchEvent(new Event("input", { bubbles: true }));
                el.btnEnviar.click();
            });
            el.btnChecarNr35ChatLivre?.addEventListener("click", async () => {
                const laudoId = obterLaudoAtivoIdSeguro();
                if (!laudoId) {
                    mostrarToast("Inicie um laudo livre antes de checar compatibilidade.", "aviso", 2400);
                    return;
                }

                el.btnChecarNr35ChatLivre.disabled = true;
                if (el.workspaceTemplateCompatibility) {
                    el.workspaceTemplateCompatibility.hidden = false;
                }
                if (el.workspaceTemplateCompatibilityTitle) {
                    el.workspaceTemplateCompatibilityTitle.textContent = "Checando compatibilidade NR35...";
                }
                if (el.workspaceTemplateCompatibilityDetail) {
                    el.workspaceTemplateCompatibilityDetail.textContent =
                        "Analisando evidências, fotos e status técnico já coletados neste laudo.";
                }
                renderizarChecklistCompatibilidadeTemplate([]);

                try {
                    const resposta = await fetch(
                        `/app/api/laudo/${encodeURIComponent(String(laudoId))}/compatibilidade-template?tipo_template=nr35_linha_vida`,
                        {
                            method: "GET",
                            credentials: "same-origin",
                            headers: obterHeadersComCSRF?.() || { Accept: "application/json" },
                        }
                    );
                    if (!resposta.ok) {
                        throw new Error(await extrairMensagemErroHTTP?.(resposta, "Não foi possível checar a compatibilidade."));
                    }
                    const payload = await resposta.json();
                    const faltantes = Array.isArray(payload?.missing_evidence)
                        ? payload.missing_evidence
                        : [];
                    const resumoFaltantes = faltantes
                        .slice(0, 3)
                        .map((item) => String(item?.title || item?.detail || "").trim())
                        .filter(Boolean)
                        .join(" • ");

                    if (el.workspaceTemplateCompatibilityTitle) {
                        el.workspaceTemplateCompatibilityTitle.textContent = payload?.compatible
                            ? "Compatível com NR35 linha de vida"
                            : "Ainda faltam dados para NR35";
                    }
                    if (el.workspaceTemplateCompatibilityDetail) {
                        el.workspaceTemplateCompatibilityDetail.textContent = payload?.compatible
                            ? "As evidências atuais permitem seguir para um laudo guiado NR35. Revise a prévia antes da emissão."
                            : (resumoFaltantes || payload?.next_step || "Complete as evidências obrigatórias antes de migrar.");
                    }
                    renderizarChecklistCompatibilidadeTemplate(payload?.required_checklist || []);
                    mostrarToast(
                        payload?.compatible
                            ? "Laudo livre compatível com NR35."
                            : "A checagem apontou pendências para NR35.",
                        payload?.compatible ? "sucesso" : "aviso",
                        2600
                    );
                } catch (erro) {
                    if (el.workspaceTemplateCompatibilityTitle) {
                        el.workspaceTemplateCompatibilityTitle.textContent = "Falha ao checar compatibilidade";
                    }
                    if (el.workspaceTemplateCompatibilityDetail) {
                        el.workspaceTemplateCompatibilityDetail.textContent =
                            String(erro?.message || "").trim() || "Tente novamente em instantes.";
                    }
                    renderizarChecklistCompatibilidadeTemplate([]);
                    mostrarToast(
                        String(erro?.message || "").trim() || "Não foi possível checar a compatibilidade.",
                        "erro",
                        2800
                    );
                } finally {
                    el.btnChecarNr35ChatLivre.disabled = false;
                }
            });
            el.btnVerPendenciasChat?.addEventListener("click", () => {
                if (!obterLaudoAtivoIdSeguro()) {
                    mostrarToast("As pendências aparecem quando houver um laudo ativo.", "aviso", 2200);
                    return;
                }
                estado.workspaceRailExpanded = true;
                sincronizarInspectorScreen();

                const botaoPendenciasRail = Array.isArray(el.workspaceRailToggleButtons)
                    ? el.workspaceRailToggleButtons.find(
                        (botao) => String(botao?.dataset?.railToggle || "").trim() === "pendencias"
                    )
                    : null;

                if (botaoPendenciasRail) {
                    aplicarEstadoAcordeaoRailWorkspace(botaoPendenciasRail, true);
                }

                carregarPendenciasMesa({
                    silencioso: false,
                    filtro: estado.filtroPendencias,
                    forcar: true,
                }).catch(() => {});
            });
            el.btnPreviaChat?.addEventListener("click", async () => {
                if (!obterLaudoAtivoIdSeguro()) {
                    mostrarToast("Inicie um laudo antes de gerar prévia.", "aviso", 2200);
                    return;
                }
                definirBotaoPreviewCarregando(true);
                try {
                    await abrirPreviewWorkspace();
                } catch (erro) {
                    mostrarToast(
                        String(erro?.message || "").trim() || "Não foi possível gerar a pré-visualização agora.",
                        "aviso",
                        2600
                    );
                } finally {
                    definirBotaoPreviewCarregando(false);
                }
            });
            const definirRootWorkspaceAtivoDireto = (root, ativo) => {
                if (!root) return;
                const ativoBoolean = !!ativo;
                root.dataset.active = ativoBoolean ? "true" : "false";
                root.setAttribute("aria-hidden", String(!ativoBoolean));
                if (ativoBoolean) {
                    root.removeAttribute("hidden");
                } else {
                    root.setAttribute("hidden", "");
                }
                try {
                    root.inert = !ativoBoolean;
                } catch (_) {
                    if (ativoBoolean) {
                        root.removeAttribute("inert");
                    } else {
                        root.setAttribute("inert", "");
                    }
                }
            };

            const limparModoNrDireto = () => {
                const painel = el.painelChat || document.getElementById("painel-chat");
                [document.body, painel].forEach((alvo) => {
                    if (!alvo?.dataset) return;
                    delete alvo.dataset.nrVisualMode;
                    delete alvo.dataset.nrVisualTitle;
                    delete alvo.dataset.nrVisualBadge;
                });

                const tituloWorkspace = el.workspaceTituloLaudo || document.getElementById("workspace-titulo-laudo");
                if (tituloWorkspace) {
                    tituloWorkspace.textContent = "Tariel";
                    tituloWorkspace.dataset.nrTitleActive = "false";
                }

                const tituloModo = el.workspaceNrModeTitle || document.getElementById("workspace-nr-mode-title");
                if (tituloModo) {
                    tituloModo.textContent = "";
                    tituloModo.hidden = true;
                    tituloModo.setAttribute("aria-hidden", "true");
                }

                const campo = el.campoMensagem || document.getElementById("campo-mensagem");
                if (campo) {
                    campo.placeholder = "Peça ao Tariel";
                }
            };

            const forcarLandingChatLivreDireto = ({ limparTimeline = false } = {}) => {
                const painel = el.painelChat || document.getElementById("painel-chat");
                const shell = document.querySelector('[data-inspector-region="workspace-shell"]');
                const assistantRoot = document.querySelector('[data-workspace-view-root="assistant_landing"]');
                const assistantLanding = el.workspaceAssistantLanding || document.getElementById("workspace-assistant-landing");

                estado.freeChatTemplateContext = null;
                estado.laudoAtualId = null;
                estado.estadoRelatorio = "sem_relatorio";
                estado.workspaceStage = "assistant";
                estado.freeChatConversationActive = false;
                ctx.actions?.sincronizarEstadoInspector?.(
                    {
                        laudoAtualId: null,
                        estadoRelatorio: "sem_relatorio",
                        forceHomeLanding: false,
                        modoInspecaoUI: "workspace",
                        workspaceStage: "assistant",
                        inspectorScreen: "assistant_landing",
                        inspectorBaseScreen: "assistant_landing",
                        threadTab: "conversa",
                        overlayOwner: "",
                        assistantLandingFirstSendPending: false,
                        freeChatConversationActive: false,
                    },
                    {
                        persistirStorage: false,
                        syncScreen: false,
                    }
                );

                if (shell?.dataset) {
                    shell.dataset.workspaceView = "assistant_landing";
                    shell.dataset.active = "true";
                    shell.removeAttribute("hidden");
                    shell.setAttribute("aria-hidden", "false");
                    try {
                        shell.inert = false;
                    } catch (_) {
                        shell.removeAttribute("inert");
                    }
                }

                if (painel?.dataset) {
                    painel.dataset.laudoAtualId = "";
                    painel.dataset.estadoRelatorio = "sem_relatorio";
                    painel.dataset.workspaceStage = "assistant";
                    painel.dataset.freeChatConversationActive = "false";
                }

                document.querySelectorAll("[data-workspace-view-root]").forEach((root) => {
                    definirRootWorkspaceAtivoDireto(root, root === assistantRoot);
                });
                if (assistantLanding) {
                    assistantLanding.removeAttribute("hidden");
                    assistantLanding.setAttribute("aria-hidden", "false");
                }

                const rodape = el.rodapeEntrada || document.querySelector(".rodape-entrada");
                if (rodape) {
                    rodape.removeAttribute("hidden");
                    rodape.setAttribute("aria-hidden", "false");
                }
                const threadNav = document.querySelector(".thread-nav");
                if (threadNav) {
                    threadNav.hidden = true;
                    threadNav.setAttribute("aria-hidden", "true");
                }

                if (limparTimeline) {
                    document
                        .getElementById("area-mensagens")
                        ?.querySelectorAll(".linha-mensagem:not(#indicador-digitando), .controle-historico-antigo, .skeleton-carregamento")
                        .forEach((node) => node.remove());
                }

                limparModoNrDireto();
            };

            const abrirChatLivrePeloBotao = (botao, event = null) => {
                event?.preventDefault?.();
                event?.stopImmediatePropagation?.();
                limparContextoChatLivrePersonalizado({
                    silencioso: true,
                    sincronizarThread: false,
                });
                PERF?.begin?.("transition.novo_chat", {
                    origem: botao?.dataset?.inspectorEntry || botao?.id || botao?.dataset?.action || "chat_free_entry",
                });
                abrirChatLivreInspector({
                    origem: botao?.dataset?.inspectorEntry || botao?.id || botao?.dataset?.action || "chat_free_entry",
                    forcarLanding: true,
                });
                forcarLandingChatLivreDireto({ limparTimeline: true });
                document.dispatchEvent(new CustomEvent("tariel:toggle-sidebar", {
                    detail: {
                        aberta: false,
                        origem: "chat_livre_landing",
                    },
                    bubbles: true,
                }));
                focarComposerInspector();
            };

            if (document.body?.dataset.openAssistantChatCaptureBound !== "true") {
                document.body.dataset.openAssistantChatCaptureBound = "true";
                document.addEventListener("click", (event) => {
                    const botao = event.target?.closest?.('[data-action="open-assistant-chat"]');
                    if (!botao) return;
                    abrirChatLivrePeloBotao(botao, event);
                }, true);
            }

            el.botoesAbrirChatLivre.forEach((botao) => {
                if (!botao || botao.dataset.openAssistantChatBound === "true") return;
                botao.dataset.openAssistantChatBound = "true";
                botao.addEventListener("click", (event) => {
                    abrirChatLivrePeloBotao(botao, event);
                });
            });
            el.inputBuscaHistorico?.addEventListener("input", () => {
                filtrarSidebarHistorico(el.inputBuscaHistorico?.value || "");
            });
            el.inputBuscaHistorico?.addEventListener("keydown", (event) => {
                if (event.key !== "Escape") return;
                el.inputBuscaHistorico.value = "";
                filtrarSidebarHistorico("");
            });
            el.sidebarLaudosTabButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    const tab = String(botao.dataset.sidebarLaudosTabTrigger || "").trim().toLowerCase();
                    if (!tab || botao.disabled) return;
                    sincronizarSidebarLaudosTabs(tab);
                });
            });
            el.botoesHomeLaudosRecentes.forEach((botao) => {
                botao.addEventListener("click", async () => {
                    const laudoId = Number(botao.dataset.homeLaudoId || 0) || null;
                    const tipoTemplate = botao.dataset.homeTemplate || "padrao";
                    const contextoVisual = extrairContextoVisualWorkspace({
                        homeTitle: botao.dataset.homeTitle,
                        homeSubtitle: botao.dataset.homeSubtitle,
                        homeStatus: botao.dataset.homeStatus,
                    });
                    const modoEntradaPayload = {
                        entry_mode_preference: botao.dataset.entryModePreference || "",
                        entry_mode_effective: botao.dataset.entryModeEffective || "",
                        entry_mode_reason: botao.dataset.entryModeReason || "",
                    };
                    PERF?.begin?.("transition.abrir_laudo", {
                        origem: "home_recent",
                        laudoId,
                    });
                    definirBotaoLaudoCarregando(botao, true);
                    try {
                        await abrirLaudoPeloHome(
                            laudoId,
                            "home_recent",
                            tipoTemplate,
                            contextoVisual,
                            "",
                            modoEntradaPayload
                        );
                    } finally {
                        definirBotaoLaudoCarregando(botao, false);
                    }
                });
            });

            document.addEventListener("tariel:navigate-home", (event) => {
                event.preventDefault();
                processarAcaoHome(event?.detail || {});
            });
            [
                "tariel:laudo-selecionado",
                "tariel:estado-relatorio",
                "tariel:relatorio-iniciado",
                "tariel:relatorio-finalizado",
                "tariel:screen-synced",
            ].forEach((eventName) => {
                document.addEventListener(eventName, () => {
                    sincronizarFerramentasGovernadasLaudo();
                });
            });

            el.btnFinalizarInspecao?.addEventListener("click", finalizarInspecao);
            el.botoesFinalizarInspecao?.forEach((botao) => {
                if (botao === el.btnFinalizarInspecao) return;
                botao.addEventListener("click", finalizarInspecao);
            });
            el.workspaceRailThreadTabButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    const tabDestino = normalizarThreadTab(botao.dataset.railThreadTab || "conversa");
                    if (tabDestino === "mesa" && !mesaAvaliadoraDisponivelParaUsuario()) {
                        redirecionarMesaGovernadaParaCorrecoes();
                        return;
                    }
                    atualizarThreadWorkspace(tabDestino, {
                        persistirURL: true,
                    });
                });
            });
            sincronizarFerramentasGovernadasLaudo();
            el.workspaceRailToolButtons?.forEach((botao) => {
                botao.addEventListener("click", () => {
                    abrirFerramentaGovernadaLaudo(botao.dataset.railToolAction || "");
                });
            });
            const sincronizarBotaoSidebarEsquerda = () => {
                const botoes = [el.btnWorkspaceToggleLeftSidebar, el.btnSidebarEdgeToggle].filter(Boolean);
                const sidebar = document.getElementById("barra-historico");
                if (!botoes.length || !sidebar) return;

                const aberta = !sidebar.classList.contains("oculta");
                botoes.forEach((botao) => {
                    botao.setAttribute("aria-expanded", aberta ? "true" : "false");
                    botao.setAttribute(
                        "aria-label",
                        aberta ? "Esconder histórico lateral" : "Mostrar histórico lateral"
                    );
                    const icone = botao.querySelector(".material-symbols-rounded");
                    if (icone) {
                        icone.textContent = aberta ? "left_panel_close" : "left_panel_open";
                    }
                });
            };
            const alternarSidebarEsquerda = () => {
                document.dispatchEvent(new CustomEvent("tariel:toggle-sidebar", {
                    detail: { origem: "workspace-shell-edge" },
                    bubbles: true,
                }));
                window.setTimeout(sincronizarBotaoSidebarEsquerda, 0);
            };
            el.btnWorkspaceToggleLeftSidebar?.addEventListener("click", alternarSidebarEsquerda);
            el.btnSidebarEdgeToggle?.addEventListener("click", alternarSidebarEsquerda);
            sincronizarBotaoSidebarEsquerda();
            window.addEventListener("resize", sincronizarBotaoSidebarEsquerda);
            document.addEventListener("tariel:toggle-sidebar", () => {
                window.setTimeout(sincronizarBotaoSidebarEsquerda, 0);
            });
            const alternarWorkspaceRail = () => {
                const viewAtual = resolveWorkspaceView();
                if (!workspaceViewSuportaRail(viewAtual)) return;

                estado.workspaceRailExpanded = !estado.workspaceRailExpanded;
                sincronizarInspectorScreen();
            };
            el.btnWorkspaceToggleRail?.addEventListener("click", () => {
                alternarWorkspaceRail();
            });
            el.btnWorkspaceToggleRightRail?.addEventListener("click", () => {
                alternarWorkspaceRail();
            });
            el.btnRailEdgeToggle?.addEventListener("click", () => {
                alternarWorkspaceRail();
            });
            document.addEventListener("tariel:toggle-workspace-rail", () => {
                alternarWorkspaceRail();
            });
            el.btnWorkspacePreview?.addEventListener("click", async () => {
                definirBotaoPreviewCarregando(true);
                try {
                    await abrirPreviewWorkspace();
                } catch (erro) {
                    mostrarToast(
                        String(erro?.message || "").trim() || "Não foi possível gerar a pré-visualização agora.",
                        "aviso",
                        2600
                    );
                } finally {
                    definirBotaoPreviewCarregando(false);
                }
            });
            el.btnWorkspacePreviewRail?.addEventListener("click", async () => {
                definirBotaoPreviewCarregando(true);
                try {
                    await abrirPreviewWorkspace();
                } catch (erro) {
                    mostrarToast(
                        String(erro?.message || "").trim() || "Não foi possível gerar a pré-visualização agora.",
                        "aviso",
                        2600
                    );
                } finally {
                    definirBotaoPreviewCarregando(false);
                }
            });
            el.workspacePreviewActionButtons?.forEach((botao) => {
                botao.addEventListener("click", async () => {
                    if (!obterLaudoAtivoIdSeguro()) {
                        mostrarToast("Inicie um laudo antes de gerar prévia.", "aviso", 2200);
                        return;
                    }
                    definirBotaoPreviewCarregando(true);
                    try {
                        await abrirPreviewWorkspace();
                    } catch (erro) {
                        mostrarToast(
                            String(erro?.message || "").trim() || "Não foi possível gerar a pré-visualização agora.",
                            "aviso",
                            2600
                        );
                    } finally {
                        definirBotaoPreviewCarregando(false);
                    }
                });
            });
            el.btnAnexo?.addEventListener("click", () => {
                abrirSeletorAnexo("file");
            });
            el.btnFotoRapida?.addEventListener("click", () => {
                abrirSeletorAnexo("photo");
            });
            el.composerAttachmentTriggerButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    abrirSeletorAnexo(botao.dataset.composerAttachmentTrigger || "file");
                });
            });
            el.btnFecharBanner?.addEventListener("click", fecharBannerEngenharia);
            el.btnFecharPendenciasMesa?.addEventListener("click", () => {
                togglePainelPendencias(false);
            });
            el.btnExportarPendenciasPdf?.addEventListener("click", exportarPendenciasPdf);
            el.btnCarregarMaisPendencias?.addEventListener("click", async () => {
                await carregarPendenciasMesa({
                    silencioso: false,
                    filtro: estado.filtroPendencias,
                    append: true,
                    forcar: true,
                });
            });
            el.btnMarcarPendenciasLidas?.addEventListener("click", () => {
                ctx.actions.marcarPendenciasComoLidas?.();
            });
            el.botoesFiltroPendencias.forEach((botao) => {
                botao.addEventListener("click", async () => {
                    const filtro = normalizarFiltroPendencias(botao.dataset?.filtroPendencias);
                    if (filtro === estado.filtroPendencias) return;

                    estado.filtroPendencias = filtro;
                    ctx.actions.atualizarBotoesFiltroPendencias?.();
                    await carregarPendenciasMesa({
                        silencioso: true,
                        filtro: estado.filtroPendencias,
                        forcar: true,
                    });
                });
            });
            el.listaPendenciasMesa?.addEventListener("click", async (event) => {
                const alvo = event.target?.closest?.(".btn-pendencia-item");
                if (!alvo) return;

                const mensagemId = Number(alvo.dataset?.pendenciaId || 0) || null;
                const proximaLida = String(alvo.dataset?.proximaLida || "").toLowerCase() === "true";
                if (!mensagemId) return;

                await atualizarPendenciaIndividual(mensagemId, proximaLida);
            });

            el.campoMensagem?.addEventListener("input", () => {
                aplicarHighlightComposer(el.campoMensagem.value);
                sincronizarScrollBackdrop();
                atualizarRecursosComposerWorkspace();
            });
            el.campoMensagem?.addEventListener("scroll", sincronizarScrollBackdrop);
            el.campoMensagem?.addEventListener("keydown", onCampoMensagemWorkspaceKeydown, true);
            el.btnEnviar?.addEventListener("click", (event) => {
                const textoComposer = obterTextoDeApoioComposer();
                if (textoComposer && redirecionarEntradaParaReemissaoWorkspace({
                    origem: "composer_button",
                    texto: textoComposer,
                    limparComposer: true,
                })) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return;
                }
                prepararComposerParaEnvioModoEntrada();
                armarPrimeiroEnvioNovoChatPendente();
            }, true);
            el.chatThreadSearch?.addEventListener("input", () => {
                estado.chatBuscaTermo = String(el.chatThreadSearch.value || "").trim();
                filtrarTimelineWorkspace();
            });
            el.chatFilterButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    const filtro = normalizarFiltroChat(botao.dataset.chatFilter);
                    estado.chatFiltroTimeline = filtro;
                    el.chatFilterButtons.forEach((item) => {
                        const ativo = item === botao;
                        item.setAttribute("aria-pressed", ativo ? "true" : "false");
                    });
                    filtrarTimelineWorkspace();
                });
            });
            el.historyTypeFilterButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    const filtro = normalizarFiltroTipoHistorico(botao.dataset.historyTypeFilter);
                    estado.historyTypeFilter = filtro;
                    el.historyTypeFilterButtons.forEach((item) => {
                        const ativo = item === botao;
                        item.setAttribute("aria-pressed", ativo ? "true" : "false");
                    });
                    filtrarTimelineWorkspace();
                });
            });
            el.botoesWorkspaceHistoryContinue.forEach((botao) => {
                botao.addEventListener("click", () => {
                    atualizarThreadWorkspace("conversa", {
                        persistirURL: true,
                    });
                    focarComposerInspector();
                });
            });
            el.btnWorkspaceHistoryReissue?.addEventListener("click", () => {
                const acao = String(el.btnWorkspaceHistoryReissue?.dataset.historyGovernanceAction || "").trim();
                if (acao === "mesa") {
                    abrirMesaComContexto({
                        origem: "history_governance_card",
                    }).catch(() => {});
                    return;
                }
                abrirReemissaoWorkspace().catch(() => {});
            });
            el.workspaceHistoryTimeline?.addEventListener("click", async (event) => {
                const acao = event.target?.closest?.("[data-history-action]");
                if (!acao) return;

                const indice = Number(acao.dataset.historyIndex || -1);
                const item = Array.isArray(estado.historyRenderedItems) ? estado.historyRenderedItems[indice] : null;
                if (!item) return;

                const nomeAcao = String(acao.dataset.historyAction || "").trim();
                if (nomeAcao === "copiar") {
                    try {
                        await copiarTextoWorkspace(
                            item.texto
                            || item.anexos.map((anexo) => String(anexo?.nome || "").trim()).filter(Boolean).join(" • ")
                        );
                        mostrarToast("Trecho copiado.", "sucesso", 1800);
                    } catch (_) {
                        mostrarToast("Não foi possível copiar o trecho.", "aviso", 2200);
                    }
                    return;
                }

                if (nomeAcao === "fixar") {
                    fixarContextoWorkspace(item);
                    return;
                }

                if (nomeAcao === "citar") {
                    citarMensagemWorkspace(item);
                    return;
                }

                if (nomeAcao === "mesa") {
                    abrirMesaComContexto(item).catch(() => {});
                    return;
                }

                if (nomeAcao === "reissue") {
                    abrirReemissaoWorkspace(item).catch(() => {});
                }
            });
            el.workspaceRailToggleButtons.forEach((botao) => {
                botao.addEventListener("click", () => {
                    const expandido = botao.getAttribute("aria-expanded") === "true";
                    const proximo = !expandido;
                    aplicarEstadoAcordeaoRailWorkspace(botao, proximo);
                    if (proximo && String(botao.dataset.railToggle || "").trim() === "pendencias") {
                        carregarPendenciasMesa({
                            silencioso: false,
                            filtro: estado.filtroPendencias,
                            forcar: true,
                        }).catch(() => {});
                    }
                });
            });
            el.btnWorkspaceContextCopy?.addEventListener("click", () => {
                copiarResumoContextoWorkspace();
            });
            el.btnWorkspaceContextClear?.addEventListener("click", () => {
                limparContextoFixadoWorkspace();
                mostrarToast("Contexto fixado limpo.", "info", 1800);
            });
            el.workspaceContextPinnedList?.addEventListener("click", (event) => {
                const botao = event.target?.closest?.("[data-context-remove-index]");
                if (!botao) return;
                removerContextoFixadoWorkspace(botao.dataset.contextRemoveIndex);
            });
            el.composerSuggestions?.addEventListener("click", (event) => {
                const botaoTexto = event.target?.closest?.("[data-suggestion-text]");
                if (botaoTexto) {
                    inserirTextoNoComposer(String(botaoTexto.dataset.suggestionText || "").trim());
                    return;
                }
                const botaoAcao = event.target?.closest?.("[data-suggestion-action]");
                const acaoSugestao = String(botaoAcao?.dataset.suggestionAction || "").trim();
                if (acaoSugestao === "reissue") {
                    redirecionarEntradaParaReemissaoWorkspace({
                        origem: "composer_suggestion_reissue",
                        texto: obterTextoDeApoioComposer(),
                        limparComposer: true,
                    });
                    return;
                }
                if (acaoSugestao === "mesa") {
                    abrirMesaComContexto({
                        origem: "composer_suggestion_mesa",
                    }).catch(() => {});
                    return;
                }
                const botao = event.target?.closest?.("[data-suggestion-command]");
                if (!botao) return;
                executarComandoSlash(String(botao.dataset.suggestionCommand || "").trim(), {
                    origem: "sugestao",
                });
            });
            el.workspaceConversationEmpty?.addEventListener("click", (event) => {
                const botaoTexto = event.target?.closest?.("[data-suggestion-text]");
                if (!botaoTexto) return;
                inserirTextoNoComposer(String(botaoTexto.dataset.suggestionText || "").trim());
            });
            el.painelChat?.addEventListener("click", (event) => {
                const botaoFocoComposer = event.target?.closest?.("[data-focus-composer]");
                if (botaoFocoComposer) {
                    focarComposerInspector();
                    return;
                }

                const botaoTexto = event.target?.closest?.("[data-suggestion-text]");
                if (!botaoTexto) return;
                if (
                    botaoTexto.closest("#composer-suggestions") ||
                    botaoTexto.closest("#workspace-conversation-empty")
                ) {
                    return;
                }

                inserirTextoNoComposer(String(botaoTexto.dataset.suggestionText || "").trim());
                focarComposerInspector();
            });
            el.slashCommandPalette?.addEventListener("click", (event) => {
                const botao = event.target?.closest?.("[data-slash-command]");
                if (!botao) return;
                executarComandoSlash(String(botao.dataset.slashCommand || "").trim());
            });
            document.addEventListener("tariel:mensagem-copiar", async (event) => {
                const texto = String(event?.detail?.texto || "").trim();
                if (!texto) return;
                try {
                    await copiarTextoWorkspace(texto);
                    mostrarToast("Trecho copiado.", "sucesso", 1800);
                } catch (_) {
                    mostrarToast("Não foi possível copiar o trecho.", "aviso", 2200);
                }
            });
            document.addEventListener("tariel:mensagem-citar", (event) => {
                citarMensagemWorkspace(event?.detail || {});
            });
            document.addEventListener("tariel:mensagem-fixar-contexto", (event) => {
                fixarContextoWorkspace(event?.detail || {});
            });
            document.addEventListener("tariel:chat-status", (event) => {
                ctx.actions.atualizarStatusChatWorkspace?.(
                    event?.detail?.status || "pronto",
                    event?.detail?.texto || ""
                );
                sincronizarCabecalhoNrAtiva();
            });
            document.addEventListener("tariel:prompt-enviado", (event) => {
                const laudoId = obterLaudoAtivoIdSeguro();
                const intencaoModoLaudo = detectarIntencaoModoLaudo(event?.detail?.texto || "");
                if (laudoId && intencaoModoLaudo) {
                    definirModoColetaLaudo(laudoId, intencaoModoLaudo === "resume");
                }
                registrarPromptHistorico(event?.detail?.texto || "");
                armarPrimeiroEnvioNovoChatPendente();
                promoverPrimeiraMensagemNovoChatSePronta({ forcar: true, focarComposer: true });
                sincronizarCabecalhoNrAtiva();
            });
            document.addEventListener("tariel:executar-comando-slash", (event) => {
                const comando = String(event?.detail?.comando || "").trim().toLowerCase();
                if (!comando) return;

                const existe = Array.isArray(ctx.shared.COMANDOS_SLASH)
                    ? ctx.shared.COMANDOS_SLASH.some((item) => item.id === comando)
                    : false;
                if (!existe) return;

                event.preventDefault();
                executarComandoSlash(comando, { origem: "atalho" });
            });
            document.addEventListener("keydown", (event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                    if (el.chatThreadSearch) {
                        event.preventDefault();
                        el.chatThreadSearch.focus();
                        el.chatThreadSearch.select?.();
                    }
                    return;
                }
            });

            const fecharSeletorNrDoBotao = (botao) => {
                const seletorNr = botao?.closest?.("[data-guided-nr-picker]");
                if (seletorNr && "open" in seletorNr) {
                    seletorNr.open = false;
                }
            };

            const normalizarTextoModoNrAcao = (valor = "") => String(valor || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s-]+/g, "_");

            const resolverModoVisualNrAcao = (botao, contexto = null) => {
                const fonte = [
                    contexto?.runtimeTipo,
                    contexto?.templateKey,
                    contexto?.badge,
                    contexto?.title,
                    botao?.dataset?.runtimeTipo,
                    botao?.dataset?.tipo,
                    botao?.dataset?.badge,
                    botao?.dataset?.titulo,
                    botao?.dataset?.preprompt,
                ].map(normalizarTextoModoNrAcao).join(" ");

                if (!fonte || fonte.includes("padrao")) return "";
                if (fonte.includes("nr35") || fonte.includes("linha_vida") || fonte.includes("altura")) return "nr35";
                if (fonte.includes("nr33") || fonte.includes("confin")) return "nr33";
                if (fonte.includes("nr20") || fonte.includes("inflam") || fonte.includes("combust")) return "nr20";
                if (fonte.includes("nr13") || fonte.includes("caldeira") || fonte.includes("vaso")) return "nr13";
                if (fonte.includes("nr12") || fonte.includes("maquina")) return "nr12";
                if (fonte.includes("spda")) return "spda";
                if (fonte.includes("loto") || fonte.includes("bloqueio")) return "loto";
                if (fonte.includes("pie") || fonte.includes("prontuario_eletrico")) return "pie";
                if (fonte.includes("rti") || fonte.includes("nr10_rti")) return "rti";
                return "";
            };

            const obterTituloAcaoRapida = (botao) => String(
                botao?.dataset?.titulo
                || botao?.querySelector?.(".workspace-guided-nr-card__copy strong, .portal-model-card__header strong, strong")?.textContent
                || botao?.textContent
                || "NR"
            ).trim().replace(/\s+/g, " ");

            const criarContextoChatGuiadoFallback = (botao) => {
                const titulo = obterTituloAcaoRapida(botao);
                const runtimeTipo = String(botao?.dataset?.runtimeTipo || botao?.dataset?.tipo || "padrao").trim() || "padrao";
                const badge = String(botao?.dataset?.badge || titulo || "IA").trim() || "IA";
                const preprompt = String(botao?.dataset?.preprompt || "").trim();
                if (!titulo && !preprompt) return null;

                return {
                    kind: "free_chat_template",
                    templateKey: runtimeTipo,
                    runtimeTipo,
                    title: titulo || badge,
                    badge,
                    icon: String(botao?.dataset?.icone || "assignment").trim() || "assignment",
                    meta: String(botao?.dataset?.meta || "").trim(),
                    preprompt,
                    subtitle: `Chat livre • ${titulo || badge}`,
                    placeholder: `Peça ao Tariel sobre ${(titulo || badge).toLowerCase()}, evidências, riscos ou não conformidades`,
                    contextTitle: `Contexto ativo: ${titulo || badge}`,
                    contextStatus: `As próximas respostas vão priorizar ${titulo || badge} como contexto técnico principal.`,
                };
            };

            const resolverTituloModoNrVisual = (modo = "") => {
                const modoNormalizado = String(modo || "").trim().toLowerCase();
                const titulos = {
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
                return titulos[modoNormalizado] || "";
            };

            const aplicarModoVisualNrDireto = (botao, contexto = null) => {
                const contextoSeguro = contexto || criarContextoChatGuiadoFallback(botao);
                const modo = resolverModoVisualNrAcao(botao, contextoSeguro);
                let titulo = String(contextoSeguro?.title || obterTituloAcaoRapida(botao) || "").trim();
                if (!titulo && modo) {
                    titulo = resolverTituloModoNrVisual(modo);
                }
                const chaveAtiva = String(
                    contextoSeguro?.runtimeTipo
                    || contextoSeguro?.templateKey
                    || botao?.dataset?.runtimeTipo
                    || botao?.dataset?.tipo
                    || ""
                ).trim().toLowerCase();

                [document.body, el.painelChat].forEach((alvo) => {
                    if (!alvo?.dataset) return;
                    if (modo) {
                        alvo.dataset.nrVisualMode = modo;
                        if (titulo) {
                            alvo.dataset.nrVisualTitle = titulo;
                        }
                        if (contextoSeguro?.badge) {
                            alvo.dataset.nrVisualBadge = String(contextoSeguro.badge || "").trim();
                        }
                    } else {
                        delete alvo.dataset.nrVisualMode;
                        delete alvo.dataset.nrVisualTitle;
                        delete alvo.dataset.nrVisualBadge;
                    }
                });

                const tituloModo = el.workspaceNrModeTitle || document.getElementById("workspace-nr-mode-title");
                if (tituloModo) {
                    tituloModo.hidden = true;
                    tituloModo.setAttribute("aria-hidden", "true");
                    tituloModo.textContent = "";
                }

                const tituloWorkspace = el.workspaceTituloLaudo || document.getElementById("workspace-titulo-laudo");
                if (tituloWorkspace) {
                    tituloWorkspace.textContent = modo && titulo ? `Tariel está no modo ${titulo}` : "Tariel";
                    tituloWorkspace.dataset.nrTitleActive = modo && titulo ? "true" : "false";
                    if (modo && titulo) {
                        tituloWorkspace.dataset.nrModeLabel = titulo;
                    } else {
                        delete tituloWorkspace.dataset.nrModeLabel;
                    }
                }

                const statusBadge = el.workspaceStatusBadge || document.getElementById("workspace-status-badge");
                if (statusBadge && contextoSeguro?.badge) {
                    statusBadge.textContent = String(contextoSeguro.badge || "").trim().toUpperCase();
                }

                document.querySelectorAll(".btn-acao-rapida[data-chat-guided='true']").forEach((item) => {
                    const chaveItem = String(item.dataset.runtimeTipo || item.dataset.tipo || "").trim().toLowerCase();
                    const ativo = !!chaveAtiva && chaveItem === chaveAtiva;
                    item.dataset.contextActive = ativo ? "true" : "false";
                    item.setAttribute("aria-pressed", ativo ? "true" : "false");
                });

                const campo = el.campoMensagem || document.getElementById("campo-mensagem");
                if (contextoSeguro?.placeholder && campo) {
                    campo.placeholder = contextoSeguro.placeholder;
                }
            };

            const resolverModoNrPersistidoAtivo = () => {
                const placeholder = String(el.campoMensagem?.placeholder || "").trim();
                const modoPorPlaceholder = resolverModoVisualNrAcao(null, {
                    runtimeTipo: placeholder,
                    templateKey: placeholder,
                    title: placeholder,
                    preprompt: placeholder,
                });
                const modo = String(
                    document.body?.dataset?.nrVisualMode
                    || el.painelChat?.dataset?.nrVisualMode
                    || modoPorPlaceholder
                    || ""
                ).trim().toLowerCase();
                const titulo = String(
                    document.body?.dataset?.nrVisualTitle
                    || el.painelChat?.dataset?.nrVisualTitle
                    || resolverTituloModoNrVisual(modo)
                    || ""
                ).trim();
                const badge = String(
                    document.body?.dataset?.nrVisualBadge
                    || el.painelChat?.dataset?.nrVisualBadge
                    || ""
                ).trim();

                return { modo, titulo, badge };
            };

            const sincronizarCabecalhoNrAtiva = () => {
                const contexto = estado.freeChatTemplateContext;
                if (contexto && typeof contexto === "object") {
                    aplicarModoVisualNrDireto(null, contexto);
                    return true;
                }

                const {
                    modo: modoPersistido,
                    titulo: tituloPersistido,
                    badge: badgePersistido,
                } = resolverModoNrPersistidoAtivo();
                if (!tituloPersistido || !modoPersistido) return false;

                const tituloWorkspace = el.workspaceTituloLaudo || document.getElementById("workspace-titulo-laudo");
                if (tituloWorkspace) {
                    tituloWorkspace.textContent = `Tariel está no modo ${tituloPersistido}`;
                    tituloWorkspace.dataset.nrTitleActive = "true";
                    tituloWorkspace.dataset.nrModeLabel = tituloPersistido;
                }
                const tituloModo = el.workspaceNrModeTitle || document.getElementById("workspace-nr-mode-title");
                if (tituloModo) {
                    tituloModo.hidden = true;
                    tituloModo.setAttribute("aria-hidden", "true");
                    tituloModo.textContent = "";
                }
                const statusBadge = el.workspaceStatusBadge || document.getElementById("workspace-status-badge");
                if (statusBadge) {
                    if (badgePersistido) {
                        statusBadge.textContent = badgePersistido.toUpperCase();
                    }
                }
                return true;
            };

            if (el.workspaceTituloLaudo && el.workspaceTituloLaudo.dataset.nrTitleObserverBound !== "true") {
                el.workspaceTituloLaudo.dataset.nrTitleObserverBound = "true";
                const observarTituloNrAtivo = () => {
                    const {
                        modo: modoPersistido,
                        titulo: tituloPersistido,
                    } = resolverModoNrPersistidoAtivo();
                    if (!tituloPersistido) return;
                    const tituloWorkspace = el.workspaceTituloLaudo || document.getElementById("workspace-titulo-laudo");
                    if (!tituloWorkspace) return;
                    const tituloEsperado = `Tariel está no modo ${tituloPersistido}`;
                    if (String(tituloWorkspace.textContent || "").trim() === tituloEsperado) return;
                    if (typeof window.requestAnimationFrame === "function") {
                        window.requestAnimationFrame(() => sincronizarCabecalhoNrAtiva());
                    } else {
                        sincronizarCabecalhoNrAtiva();
                    }
                };
                if (typeof MutationObserver === "function") {
                    new MutationObserver(observarTituloNrAtivo).observe(el.workspaceTituloLaudo, {
                        childList: true,
                        characterData: true,
                        subtree: true,
                    });
                    [document.body, el.painelChat].forEach((alvo) => {
                        if (!alvo) return;
                        new MutationObserver(observarTituloNrAtivo).observe(alvo, {
                            attributes: true,
                            attributeFilter: ["data-nr-visual-mode", "data-nr-visual-title", "data-nr-visual-badge"],
                        });
                    });
                    if (el.campoMensagem) {
                        new MutationObserver(observarTituloNrAtivo).observe(el.campoMensagem, {
                            attributes: true,
                            attributeFilter: ["placeholder"],
                        });
                    }
                }
                sincronizarCabecalhoNrAtiva();
            }

            const aplicarContextoChatGuiadoSeguro = (botao) => {
                const contextoFallback = criarContextoChatGuiadoFallback(botao);
                if (!contextoFallback) return false;

                estado.freeChatTemplateContext = contextoFallback;
                estado.laudoAtualId = null;
                estado.estadoRelatorio = "sem_relatorio";
                estado.workspaceStage = "assistant";
                estado.freeChatConversationActive = false;
                try {
                    ctx.actions?.sincronizarEstadoInspector?.(
                        {
                            laudoAtualId: null,
                            estadoRelatorio: "sem_relatorio",
                            forceHomeLanding: false,
                            modoInspecaoUI: "workspace",
                            workspaceStage: "assistant",
                            inspectorScreen: "assistant_landing",
                            inspectorBaseScreen: "assistant_landing",
                            threadTab: "conversa",
                            assistantLandingFirstSendPending: false,
                            freeChatConversationActive: false,
                        },
                        {
                            persistirStorage: false,
                            syncScreen: false,
                        }
                    );
                } catch (erro) {
                    console.warn("Falha ao sincronizar estado da NR; mantendo modo visual direto.", erro);
                }

                try {
                    ctx.actions?.atualizarContextoWorkspaceAtivo?.();
                } catch (erro) {
                    console.warn("Falha ao sincronizar contexto da NR; mantendo modo visual direto.", erro);
                }
                aplicarModoVisualNrDireto(botao, contextoFallback);
                sincronizarCabecalhoNrAtiva();
                mostrarToast(`${contextoFallback.title} agora guia este chat livre.`, "sucesso", 2200);
                return true;
            };

            const processarBotaoAcaoRapida = async (botao) => {
                const tipo = botao?.dataset?.tipo;
                if (!tipo) return;

                const chatGuiado = String(botao.dataset.chatGuided || "").trim() === "true";
                const snapshotAtual = ctx.actions?.obterSnapshotEstadoInspectorAtual?.() || {};
                const screenBaseAtual = String(
                    snapshotAtual.inspectorBaseScreen
                    || ctx.actions?.resolveInspectorBaseScreen?.()
                    || ""
                ).trim();
                const estadoRelatorio = obterEstadoRelatorioAtualSeguro();

                if (chatGuiado) {
                    try {
                        abrirChatLivreInspector({
                            origem: screenBaseAtual === "portal_dashboard" ? "portal-open-chat" : "guided-nr-card",
                            forcarLanding: true,
                        });
                    } catch (erro) {
                        console.warn("Falha ao abrir chat livre antes de aplicar NR.", erro);
                    }

                    const contextoAplicado = aplicarContextoChatGuiadoSeguro(botao);
                    if (contextoAplicado) {
                        fecharSeletorNrDoBotao(botao);
                        focarComposerInspector();
                    }
                    return;
                }

                if (estadoRelatorio !== "relatorio_ativo") {
                    abrirNovaInspecaoComScreenSync({
                        tipoPrefill: tipo,
                        prePrompt: String(botao.dataset.preprompt || "").trim(),
                    });
                    return;
                }

                const prePromptAplicado = aplicarPrePromptDaAcaoRapida(botao);
                if (prePromptAplicado) {
                    mostrarToast("Pré-prompt aplicado no campo de mensagem.", "sucesso", 1800);
                }
            };

            const TEMPO_DEBOUNCE_ACAO_RAPIDA_MS = 650;
            const ultimaExecucaoAcaoRapida = new WeakMap();

            const tratarEventoBotaoAcaoRapida = async (event, options = {}) => {
                const botao = event.target?.closest?.(".btn-acao-rapida");
                if (!botao) return;

                const somenteChatGuiado = options.somenteChatGuiado === true;
                const chatGuiado = String(botao.dataset.chatGuided || "").trim() === "true";
                if (somenteChatGuiado && !chatGuiado) return;

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                if (botao.dataset.quickActionProcessing === "true") return;

                const agora = Date.now();
                const ultimaExecucao = ultimaExecucaoAcaoRapida.get(botao) || 0;
                if (agora - ultimaExecucao < TEMPO_DEBOUNCE_ACAO_RAPIDA_MS) return;
                ultimaExecucaoAcaoRapida.set(botao, agora);

                botao.dataset.quickActionProcessing = "true";
                try {
                    await processarBotaoAcaoRapida(botao);
                } catch (erro) {
                    console.warn("Falha ao processar ação rápida.", erro);
                    mostrarToast("Não consegui abrir essa NR agora. Tente novamente em instantes.", "aviso", 2400);
                } finally {
                    delete botao.dataset.quickActionProcessing;
                }
            };

            document.addEventListener("click", (event) => {
                void tratarEventoBotaoAcaoRapida(event);
            }, true);

            el.btnMesaWidgetToggle?.addEventListener("click", () => {
                if (!mesaAvaliadoraDisponivelParaUsuario()) {
                    redirecionarMesaGovernadaParaCorrecoes();
                    return;
                }
                if (!obterLaudoAtivoIdSeguro()) {
                    avisarMesaExigeInspecao();
                    return;
                }

                atualizarThreadWorkspace("mesa", {
                    persistirURL: true,
                    replaceURL: true,
                });
                abrirMesaWidget().catch(() => {});
            });
            el.btnFecharMesaWidget?.addEventListener("click", () => {
                fecharMesaWidget();
            });
            el.workspaceChannelTabButtons.forEach((botao) => {
                if (botao.dataset.workspaceChannelBound === "true") return;
                botao.dataset.workspaceChannelBound = "true";
                botao.addEventListener("click", () => {
                    const tabDestino = normalizarThreadTab(botao.dataset.workspaceChannelTab || "conversa");
                    if (tabDestino === "mesa" && !mesaAvaliadoraDisponivelParaUsuario()) {
                        redirecionarMesaGovernadaParaCorrecoes();
                        return;
                    }
                    if (tabDestino === "mesa" && !obterLaudoAtivoIdSeguro()) {
                        avisarMesaExigeInspecao();
                        return;
                    }

                    atualizarThreadWorkspace(tabDestino, {
                        persistirURL: true,
                        replaceURL: true,
                    });

                    if (tabDestino === "mesa") {
                        abrirMesaWidget().catch(() => {});
                        return;
                    }

                    if (tabDestino === "conversa") {
                        window.requestAnimationFrame(() => {
                            focarComposerInspector();
                        });
                    }
                });
            });
            el.mesaWidgetRefLimpar?.addEventListener("click", () => {
                ctx.actions.limparReferenciaMesaWidget?.();
            });
            el.mesaWidgetCarregarMais?.addEventListener("click", async () => {
                await ctx.actions.carregarMensagensMesaWidget?.({ append: true, silencioso: true });
            });
            el.mesaWidgetBtnAnexo?.addEventListener("click", () => {
                abrirSeletorAnexoMesa("file");
            });
            el.mesaWidgetBtnFoto?.addEventListener("click", () => {
                abrirSeletorAnexoMesa("photo");
            });
            el.mesaWidgetInputAnexo?.addEventListener("change", (event) => {
                const arquivo = event.target?.files?.[0];
                if (arquivo) {
                    selecionarAnexoMesaWidget(arquivo);
                    return;
                }
                limparAnexoMesaWidget();
            });
            el.mesaWidgetInputAnexo?.addEventListener("input", (event) => {
                const arquivo = event.target?.files?.[0];
                if (arquivo) {
                    selecionarAnexoMesaWidget(arquivo);
                    return;
                }
                limparAnexoMesaWidget();
            });
            el.mesaWidgetPreviewAnexo?.addEventListener("click", (event) => {
                const btnRemover = event.target?.closest?.(".mesa-widget-preview-remover");
                if (btnRemover) {
                    limparAnexoMesaWidget();
                }
            });
            el.mesaWidgetEnviar?.addEventListener("click", () => {
                enviarMensagemMesaWidget();
            });
            el.mesaWidgetInput?.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    enviarMensagemMesaWidget();
                }
            });
            el.mesaWidgetLista?.addEventListener("click", async (event) => {
                const botaoResponder = event.target?.closest?.("[data-responder-mensagem-id]");
                if (botaoResponder) {
                    const mensagemId = Number(botaoResponder.dataset.responderMensagemId || 0) || null;
                    if (!mensagemId) return;
                    const msg = obterMensagemMesaPorId(mensagemId);
                    if (msg) {
                        definirReferenciaMesaWidget(msg);
                    }
                    return;
                }

                const botaoRef = event.target?.closest?.("[data-ir-mensagem-id]");
                if (botaoRef) {
                    const referenciaId = Number(botaoRef.dataset.irMensagemId || 0) || null;
                    if (referenciaId) {
                        await irParaMensagemPrincipal(referenciaId);
                    }
                }
            });

            document.addEventListener("click", async (event) => {
                const alvoReferencia = event.target?.closest?.(".bloco-referencia-chat[data-ref-id]");
                if (!alvoReferencia) return;
                const referenciaId = Number(alvoReferencia.dataset.refId || 0) || null;
                if (referenciaId) {
                    await irParaMensagemPrincipal(referenciaId);
                }
            });
        }

        Object.assign(ctx.actions, {
            bindUiBindings,
        });
    };
})();
