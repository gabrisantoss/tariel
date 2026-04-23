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
                if (label) label.textContent = "Iniciar laudo";
                if (icon) icon.textContent = "description";
                el.btnIniciarLaudoChatLivre.setAttribute("aria-label", "Iniciar novo laudo a partir do chat livre");
                return;
            }
            if (label) label.textContent = ativo ? "Sair do laudo" : "Voltar ao laudo";
            if (icon) icon.textContent = ativo ? "pause_circle" : "play_circle";
            el.btnIniciarLaudoChatLivre.setAttribute(
                "aria-label",
                ativo ? "Pausar coleta do laudo" : "Retomar coleta do laudo"
            );
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
                el.workspaceRailToolboxHint.textContent = "Servicos de Mesa no Inspetor nao estao contratados para esta empresa.";
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
                "Mesa Avaliadora não está contratada para esta empresa. Use Correções no próprio chat.",
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
            el.botoesAbrirChatLivre.forEach((botao) => {
                botao.addEventListener("click", (event) => {
                    event.preventDefault();
                    PERF?.begin?.("transition.novo_chat", {
                        origem: botao.dataset.inspectorEntry || botao.id || botao.dataset.action || "chat_free_entry",
                    });
                    abrirChatLivreInspector({
                        origem: botao.dataset.inspectorEntry || botao.id || botao.dataset.action || "chat_free_entry",
                    });
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
            document.addEventListener("tariel:mensagem-enviar-mesa", (event) => {
                abrirMesaComContexto(event?.detail || {}).catch(() => {});
            });
            document.addEventListener("tariel:chat-status", (event) => {
                ctx.actions.atualizarStatusChatWorkspace?.(
                    event?.detail?.status || "pronto",
                    event?.detail?.texto || ""
                );
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

                if (event.altKey && event.key.toLowerCase() === "m" && estado.modoInspecaoUI === "workspace") {
                    event.preventDefault();
                    abrirMesaComContexto({
                        mensagem: `Solicito validação da mesa sobre este laudo.\n\n${ctx.actions.montarResumoContextoIAWorkspace?.() || ""}`,
                    }).catch(() => {});
                }
            });

            el.botoesAcoesRapidas.forEach((botao) => {
                botao.addEventListener("click", async () => {
                    const tipo = botao.dataset.tipo;
                    if (!tipo) return;

                    const estadoRelatorio = obterEstadoRelatorioAtualSeguro();

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
                });
            });

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
