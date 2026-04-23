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

    function atualizarCopyWorkspaceStage(stage = "inspection", dependencies = {}) {
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
            ? dependencies.COPY_WORKSPACE_STAGE.assistant
            : (
                dependencies.conversaWorkspaceModoChatAtivo?.()
                    ? dependencies.COPY_WORKSPACE_STAGE.focusedConversation
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
        if (stage === "assistant") {
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
        const finalizacaoVisivel =
            workspaceAtivo &&
            !assistantAtivo &&
            !overlayAtivo &&
            !!laudoAtivoId &&
            viewAtual !== "inspection_mesa" &&
            dependencies.workspacePermiteFinalizacao?.(
                dependencies.obterPayloadStatusRelatorioWorkspaceAtual?.()
            );
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

        if (
            simulacaoFerramentasLocal &&
            chromeTecnicoOperacional &&
            !layoutCompacto &&
            dependencies.workspaceViewSuportaRail?.(viewAtual)
        ) {
            dependencies.estado.workspaceRailExpanded = true;
        }

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
            el.btnWorkspacePreview.hidden = !chromeTecnicoOperacional || railVisivel || viewAtual === "inspection_history";
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

        if (estado.workspaceStage === "assistant") {
            dependencies.aplicarContextoVisualWorkspace?.(dependencies.obterContextoVisualAssistente?.());
            dependencies.atualizarCopyWorkspaceStage?.("assistant");
            dependencies.atualizarPainelWorkspaceDerivado?.();
            return;
        }

        if (dependencies.conversaWorkspaceModoChatAtivo?.()) {
            dependencies.aplicarContextoVisualWorkspace?.();
            dependencies.atualizarCopyWorkspaceStage?.("inspection");
            dependencies.atualizarPainelWorkspaceDerivado?.();
            return;
        }

        const nomeTemplate = dependencies.NOMES_TEMPLATES?.[estado.tipoTemplateAtivo]
            || dependencies.NOMES_TEMPLATES?.padrao;
        const resumoMesa = dependencies.obterResumoOperacionalMesa?.() || {};
        const evidenceFirstAtivo = !!dependencies.modoEntradaEvidenceFirstAtivo?.();

        dependencies.aplicarContextoVisualWorkspace?.();
        dependencies.atualizarCopyWorkspaceStage?.("inspection");
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
