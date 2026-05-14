(function attachTarielInspectorWorkspaceOrchestration(global) {
    "use strict";

    function definirWorkspaceStage(stage = "assistant", dependencies = {}) {
        const proximoStage = dependencies.normalizarWorkspaceStage?.(stage) || "assistant";
        dependencies.sincronizarEstadoInspector?.(
            { workspaceStage: proximoStage },
            { persistirStorage: false }
        );
        dependencies.atualizarCopyWorkspaceStage?.(proximoStage);
        dependencies.atualizarControlesWorkspaceStage?.();
    }

    function atualizarContextoWorkspaceAtivo(dependencies = {}) {
        return dependencies.InspectorWorkspaceStage?.atualizarContextoWorkspaceAtivo?.({
            el: dependencies.el,
            estado: dependencies.estado,
            aplicarContextoVisualWorkspace: dependencies.aplicarContextoVisualWorkspace,
            obterContextoVisualAssistente: dependencies.obterContextoVisualAssistente,
            atualizarCopyWorkspaceStage: dependencies.atualizarCopyWorkspaceStage,
            atualizarPainelWorkspaceDerivado: dependencies.atualizarPainelWorkspaceDerivado,
            conversaWorkspaceModoChatAtivo: dependencies.conversaWorkspaceModoChatAtivo,
            NOMES_TEMPLATES: dependencies.NOMES_TEMPLATES,
            obterResumoOperacionalMesa: dependencies.obterResumoOperacionalMesa,
            modoEntradaEvidenceFirstAtivo: dependencies.modoEntradaEvidenceFirstAtivo,
            atualizarWorkspaceEntryModeNote: dependencies.atualizarWorkspaceEntryModeNote,
        });
    }

    function definirModoInspecaoUI(modo = "home", dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.definirModoInspecaoUI?.(modo, {
            normalizarModoInspecaoUI: dependencies.normalizarModoInspecaoUI,
            sincronizarEstadoInspector: dependencies.sincronizarEstadoInspector,
            atualizarControlesWorkspaceStage: dependencies.atualizarControlesWorkspaceStage,
            estado: dependencies.estado,
            el: dependencies.el,
            fecharMesaWidget: dependencies.fecharMesaWidget,
            limparReferenciaMesaWidget: dependencies.limparReferenciaMesaWidget,
            limparAnexoMesaWidget: dependencies.limparAnexoMesaWidget,
            atualizarContextoWorkspaceAtivo: dependencies.atualizarContextoWorkspaceAtivo,
        });
    }

    function exibirInterfaceInspecaoAtiva(tipo, dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.exibirInterfaceInspecaoAtiva?.(tipo, {
            limparFluxoNovoChatFocado: dependencies.limparFluxoNovoChatFocado,
            definirWorkspaceStage: dependencies.definirWorkspaceStage,
            atualizarNomeTemplateAtivo: dependencies.atualizarNomeTemplateAtivo,
            carregarContextoFixadoWorkspace: dependencies.carregarContextoFixadoWorkspace,
            definirModoInspecaoUI: dependencies.definirModoInspecaoUI,
            renderizarResumoOperacionalMesa: dependencies.renderizarResumoOperacionalMesa,
            renderizarSugestoesComposer: dependencies.renderizarSugestoesComposer,
            atualizarStatusChatWorkspace: dependencies.atualizarStatusChatWorkspace,
            estado: dependencies.estado,
        });
    }

    function exibirLandingAssistenteIA(options = {}, dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.exibirLandingAssistenteIA?.(
            options,
            {
                definirRetomadaHomePendente: dependencies.definirRetomadaHomePendente,
                limparFluxoNovoChatFocado: dependencies.limparFluxoNovoChatFocado,
                atualizarEstadoModoEntrada: dependencies.atualizarEstadoModoEntrada,
                estado: dependencies.estado,
                sincronizarEstadoInspector: dependencies.sincronizarEstadoInspector,
                resetarFiltrosHistoricoWorkspace: dependencies.resetarFiltrosHistoricoWorkspace,
                definirWorkspaceStage: dependencies.definirWorkspaceStage,
                aplicarContextoVisualWorkspace: dependencies.aplicarContextoVisualWorkspace,
                obterContextoVisualAssistente: dependencies.obterContextoVisualAssistente,
                definirModoInspecaoUI: dependencies.definirModoInspecaoUI,
                atualizarThreadWorkspace: dependencies.atualizarThreadWorkspace,
                limparPainelPendencias: dependencies.limparPainelPendencias,
                fecharSlashCommandPalette: dependencies.fecharSlashCommandPalette,
                renderizarResumoOperacionalMesa: dependencies.renderizarResumoOperacionalMesa,
                renderizarSugestoesComposer: dependencies.renderizarSugestoesComposer,
                atualizarStatusChatWorkspace: dependencies.atualizarStatusChatWorkspace,
            }
        );
    }

    function abrirChatLivreInspector(options = {}, dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.abrirChatLivreInspector?.(
            options,
            {
                obterSnapshotEstadoInspectorAtual: dependencies.obterSnapshotEstadoInspectorAtual,
                redirecionarEntradaParaReemissaoWorkspace: dependencies.redirecionarEntradaParaReemissaoWorkspace,
                origemChatLivreEhPortal: dependencies.origemChatLivreEhPortal,
                entradaChatLivreDisponivel: dependencies.entradaChatLivreDisponivel,
                sincronizarVisibilidadeAcoesChatLivre: dependencies.sincronizarVisibilidadeAcoesChatLivre,
                mostrarToast: dependencies.mostrarToast,
                fecharModalGateQualidade: dependencies.fecharModalGateQualidade,
                modalNovaInspecaoEstaAberta: dependencies.modalNovaInspecaoEstaAberta,
                fecharNovaInspecaoComScreenSync: dependencies.fecharNovaInspecaoComScreenSync,
                limparForcaTelaInicial: dependencies.limparForcaTelaInicial,
                sincronizarEstadoInspector: dependencies.sincronizarEstadoInspector,
                exibirLandingAssistenteIA: dependencies.exibirLandingAssistenteIA,
                sincronizarInspectorScreen: dependencies.sincronizarInspectorScreen,
                focarComposerInspector: dependencies.focarComposerInspector,
                emitirEventoTariel: dependencies.emitirEventoTariel,
            }
        ) || false;
    }

    function promoverPortalParaChatNoModoFoco(options = {}, dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.promoverPortalParaChatNoModoFoco?.(
            options,
            {
                obterSnapshotEstadoInspectorAtual: dependencies.obterSnapshotEstadoInspectorAtual,
                modoFocoPodePromoverPortalParaChat: dependencies.modoFocoPodePromoverPortalParaChat,
                abrirChatLivreInspector: dependencies.abrirChatLivreInspector,
            }
        ) || false;
    }

    function restaurarTelaSemRelatorio(options = {}, dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.restaurarTelaSemRelatorio?.(
            options,
            {
                homeForcadoAtivo: dependencies.homeForcadoAtivo,
                resetarInterfaceInspecao: dependencies.resetarInterfaceInspecao,
                exibirLandingAssistenteIA: dependencies.exibirLandingAssistenteIA,
            }
        );
    }

    function resetarInterfaceInspecao(dependencies = {}) {
        return dependencies.InspectorWorkspaceContextFlow?.resetarInterfaceInspecao?.({
            definirRetomadaHomePendente: dependencies.definirRetomadaHomePendente,
            limparFluxoNovoChatFocado: dependencies.limparFluxoNovoChatFocado,
            atualizarEstadoModoEntrada: dependencies.atualizarEstadoModoEntrada,
            estado: dependencies.estado,
            resetarFiltrosHistoricoWorkspace: dependencies.resetarFiltrosHistoricoWorkspace,
            definirWorkspaceStage: dependencies.definirWorkspaceStage,
            definirModoInspecaoUI: dependencies.definirModoInspecaoUI,
            atualizarThreadWorkspace: dependencies.atualizarThreadWorkspace,
            atualizarHistoricoHomeExpandido: dependencies.atualizarHistoricoHomeExpandido,
            renderizarResumoOperacionalMesa: dependencies.renderizarResumoOperacionalMesa,
            limparPainelPendencias: dependencies.limparPainelPendencias,
            fecharSlashCommandPalette: dependencies.fecharSlashCommandPalette,
            atualizarStatusChatWorkspace: dependencies.atualizarStatusChatWorkspace,
        });
    }

    async function abrirLaudoPeloHome(
        laudoId,
        origem = "home_recent",
        tipoTemplate = "padrao",
        contextoVisual = null,
        threadTabPreferida = "",
        modoEntradaPayload = null,
        dependencies = {},
    ) {
        return dependencies.InspectorWorkspaceHomeFlow?.abrirLaudoPeloHome?.(
            laudoId,
            origem,
            tipoTemplate,
            contextoVisual,
            threadTabPreferida,
            modoEntradaPayload,
            {
                mostrarToast: dependencies.mostrarToast,
                limparForcaTelaInicial: dependencies.limparForcaTelaInicial,
                normalizarTipoTemplate: dependencies.normalizarTipoTemplate,
                normalizarThreadTab: dependencies.normalizarThreadTab,
                resolverThreadTabInicialPorModoEntrada: dependencies.resolverThreadTabInicialPorModoEntrada,
                definirRetomadaHomePendente: dependencies.definirRetomadaHomePendente,
                registrarContextoVisualLaudo: dependencies.registrarContextoVisualLaudo,
                aplicarContextoVisualWorkspace: dependencies.aplicarContextoVisualWorkspace,
                criarContextoVisualPadrao: dependencies.criarContextoVisualPadrao,
                atualizarEstadoModoEntrada: dependencies.atualizarEstadoModoEntrada,
                sincronizarEstadoInspector: dependencies.sincronizarEstadoInspector,
                exibirInterfaceInspecaoAtiva: dependencies.exibirInterfaceInspecaoAtiva,
                atualizarThreadWorkspace: dependencies.atualizarThreadWorkspace,
                carregarPendenciasMesa: dependencies.carregarPendenciasMesa,
                emitirEventoTariel: dependencies.emitirEventoTariel,
            }
        ) || false;
    }

    async function iniciarInspecao(
        tipo,
        options = {},
        dependencies = {},
    ) {
        const estado = dependencies.estado || {};
        if (estado.iniciandoInspecao) return null;

        const tipoSubmissao = String(tipo || "padrao").trim() || "padrao";
        const tipoNormalizado = dependencies.normalizarTipoTemplate?.(
            options.runtimeTipoTemplate || tipoSubmissao
        );
        dependencies.limparForcaTelaInicial?.();

        if (!global.TarielAPI?.iniciarRelatorio) {
            dependencies.mostrarToast?.("A API do chat ainda não está pronta.", "erro", 3000);
            return null;
        }

        estado.iniciandoInspecao = true;
        dependencies.definirBotaoIniciarCarregando?.(true);

        try {
            const respostaBruta = await global.TarielAPI.iniciarRelatorio(tipoSubmissao, {
                dadosFormulario: options.dadosFormulario,
                entryModePreference: options.entryModePreference,
            });
            const resposta = dependencies.enriquecerPayloadLaudoComContextoVisual?.(
                respostaBruta,
                options.contextoVisual
            );

            if (!resposta) {
                return null;
            }

            if (dependencies.modalNovaInspecaoEstaAberta?.()) {
                dependencies.fecharNovaInspecaoComScreenSync?.({ forcar: true, restaurarFoco: false });
            }

            const laudoId = Number(resposta?.laudo_id ?? resposta?.laudoId ?? 0) || null;
            dependencies.registrarContextoVisualLaudo?.(laudoId, options.contextoVisual);
            dependencies.atualizarEstadoModoEntrada?.(resposta, { atualizarPadrao: true });
            dependencies.emitirSincronizacaoLaudo?.(resposta, { selecionar: true });
            const threadTabInicial = dependencies.resolverThreadTabInicialPorModoEntrada?.(
                resposta,
                "conversa"
            );

            dependencies.definirRetomadaHomePendente?.({
                laudoId,
                tipoTemplate: tipoNormalizado,
                contextoVisual: options.contextoVisual || null,
                expiresAt: Date.now() + 15000,
            });

            if (laudoId) {
                await dependencies.abrirLaudoPeloHome?.(
                    laudoId,
                    "new_inspection",
                    tipoNormalizado,
                    options.contextoVisual || null,
                    threadTabInicial
                );
                return resposta;
            }

            dependencies.exibirInterfaceInspecaoAtiva?.(tipoNormalizado);
            return resposta;
        } finally {
            estado.iniciandoInspecao = false;
            dependencies.definirBotaoIniciarCarregando?.(false);
        }
    }

    async function finalizarInspecao(dependencies = {}) {
        return dependencies.InspectorWorkspaceDeliveryFlow?.finalizarInspecao?.({
            estado: dependencies.estado,
            mostrarToast: dependencies.mostrarToast,
            definirBotaoFinalizarCarregando: dependencies.definirBotaoFinalizarCarregando,
        }) || null;
    }

    global.TarielInspectorWorkspaceOrchestration = {
        abrirChatLivreInspector,
        abrirLaudoPeloHome,
        atualizarContextoWorkspaceAtivo,
        definirModoInspecaoUI,
        definirWorkspaceStage,
        exibirInterfaceInspecaoAtiva,
        exibirLandingAssistenteIA,
        finalizarInspecao,
        iniciarInspecao,
        promoverPortalParaChatNoModoFoco,
        resetarInterfaceInspecao,
        restaurarTelaSemRelatorio,
    };
})(window);
