(function attachTarielInspectorWorkspaceHomeFlow(global) {
    "use strict";

    async function abrirLaudoPeloHome(
        laudoId,
        origem = "home_recent",
        tipoTemplate = "padrao",
        contextoVisual = null,
        threadTabPreferida = "",
        modoEntradaPayload = null,
        dependencies = {},
    ) {
        const id = Number(laudoId || 0) || null;
        if (!id) {
            dependencies.mostrarToast?.("Nenhum laudo recente disponível para continuar.", "aviso", 2600);
            return false;
        }

        dependencies.limparForcaTelaInicial?.();
        const tipoNormalizado = dependencies.normalizarTipoTemplate?.(tipoTemplate);
        const payloadModoEntrada = modoEntradaPayload && typeof modoEntradaPayload === "object"
            ? { ...modoEntradaPayload }
            : {};
        const threadTabInicial = String(threadTabPreferida || "").trim()
            ? dependencies.normalizarThreadTab?.(threadTabPreferida)
            : dependencies.resolverThreadTabInicialPorModoEntrada?.(payloadModoEntrada, "historico");
        dependencies.definirRetomadaHomePendente?.({
            laudoId: id,
            tipoTemplate: tipoNormalizado,
            contextoVisual: contextoVisual || null,
            expiresAt: Date.now() + 6000,
        });
        dependencies.registrarContextoVisualLaudo?.(id, contextoVisual);
        dependencies.aplicarContextoVisualWorkspace?.(contextoVisual || dependencies.criarContextoVisualPadrao?.());
        dependencies.atualizarEstadoModoEntrada?.(payloadModoEntrada);
        dependencies.sincronizarEstadoInspector?.({
            laudoAtualId: id,
            forceHomeLanding: false,
            modoInspecaoUI: "workspace",
            workspaceStage: "inspection",
            threadTab: threadTabInicial,
            overlayOwner: "",
            assistantLandingFirstSendPending: false,
            freeChatConversationActive: false,
        }, {
            persistirStorage: false,
        });

        if (typeof global.TarielChatPainel?.selecionarLaudo === "function") {
            const ok = !!global.TarielChatPainel.selecionarLaudo(id, {
                atualizarURL: true,
                origem,
                threadTab: threadTabInicial,
                ignorarBloqueioRelatorio: true,
                ...payloadModoEntrada,
            });
            if (ok) {
                dependencies.exibirInterfaceInspecaoAtiva?.(tipoNormalizado);
                dependencies.atualizarThreadWorkspace?.(threadTabInicial, {
                    persistirURL: true,
                    replaceURL: true,
                });
                dependencies.carregarPendenciasMesa?.({ laudoId: id, silencioso: true }).catch(() => {});
            }
            return ok;
        }

        try {
            if (typeof global.TarielAPI?.carregarLaudo === "function") {
                await global.TarielAPI.carregarLaudo(id, {
                    forcar: true,
                    silencioso: true,
                });
            }

            dependencies.emitirEventoTariel?.("tariel:laudo-selecionado", {
                laudoId: id,
                origem,
                threadTab: threadTabInicial,
                ...payloadModoEntrada,
            });
            dependencies.exibirInterfaceInspecaoAtiva?.(tipoNormalizado);
            dependencies.atualizarThreadWorkspace?.(threadTabInicial, {
                persistirURL: true,
                replaceURL: true,
            });
            dependencies.carregarPendenciasMesa?.({ laudoId: id, silencioso: true }).catch(() => {});
            return true;
        } catch (_erro) {
            dependencies.mostrarToast?.("Não foi possível abrir esse laudo agora.", "erro", 2800);
            return false;
        }
    }

    global.TarielInspectorWorkspaceHomeFlow = {
        abrirLaudoPeloHome,
    };
})(window);
