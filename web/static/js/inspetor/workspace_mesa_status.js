(function () {
    "use strict";

    function atualizarStatusChatWorkspace(status = "pronto", texto = "", dependencies = {}) {
        const estado = dependencies.estado || {};
        const normalizado = ["respondendo", "documento", "interrompido", "erro", "mesa", "pronto"]
            .includes(String(status || "").trim().toLowerCase())
            ? String(status).trim().toLowerCase()
            : "pronto";

        estado.chatStatusIA = {
            status: normalizado,
            texto: String(texto || "").trim() || "Assistente pronto",
        };
    }

    function renderizarMesaCardWorkspace(dependencies = {}) {
        const estado = dependencies.estado || {};
        const el = dependencies.el || {};
        const resumo = dependencies.obterResumoOperacionalMesa?.() || {};
        const evidencias = dependencies.contarEvidenciasWorkspace?.() || 0;
        const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
        const naoLidas = Number(estado.mesaWidgetNaoLidas || 0) || 0;
        const nomesTemplates = dependencies.NOMES_TEMPLATES || {};
        const modelo = nomesTemplates[estado.tipoTemplateAtivo] || nomesTemplates.padrao;
        const operacao = dependencies.obterOperacaoWorkspace?.() || "Operação não identificada";
        const equipamento = String(estado.workspaceVisualContext?.title || "Registro técnico").trim() || "Registro técnico";
        const ultimoMovimento = resumo.descricao || "Sem atualização recente.";
        let proximoPasso = "Use o canal para alinhar dúvidas ou anexar novas evidências.";

        if (pendencias > 0) {
            proximoPasso = "Responda às pendências abertas para destravar a revisão.";
        } else if (naoLidas > 0) {
            proximoPasso = "Leia o retorno mais recente da mesa e ajuste o laudo se necessário.";
        } else if (resumo.status === "aguardando") {
            proximoPasso = "Aguarde a resposta da mesa ou complemente o caso com novo contexto.";
        }

        if (el.workspaceMesaCardText) {
            el.workspaceMesaCardText.textContent = resumo.descricao;
        }
        if (el.workspaceMesaCardStatus) {
            el.workspaceMesaCardStatus.textContent = resumo.chipStatus || resumo.titulo;
            el.workspaceMesaCardStatus.dataset.mesaStatus = String(resumo.status || "pronta");
        }
        if (el.workspaceMesaCardUnread) {
            el.workspaceMesaCardUnread.hidden = naoLidas <= 0;
            el.workspaceMesaCardUnread.textContent = naoLidas > 99 ? "99+ novas" : `${naoLidas} novas`;
        }
        if (el.workspaceMesaStageStatus) {
            el.workspaceMesaStageStatus.textContent = resumo.chipStatus || resumo.titulo;
        }
        if (el.workspaceMesaStagePendencias) {
            el.workspaceMesaStagePendencias.textContent = String(pendencias);
        }
        if (el.workspaceMesaStageEvidencias) {
            el.workspaceMesaStageEvidencias.textContent = String(evidencias);
        }
        if (el.workspaceMesaStageUnread) {
            el.workspaceMesaStageUnread.textContent = String(naoLidas);
        }
        if (el.workspaceMesaStageSummary) {
            el.workspaceMesaStageSummary.textContent = resumo.descricao;
        }
        if (el.workspaceMesaStageNextStep) {
            el.workspaceMesaStageNextStep.textContent = proximoPasso;
        }
        if (el.workspaceMesaStageTemplate) {
            el.workspaceMesaStageTemplate.textContent = modelo;
        }
        if (el.workspaceMesaStageOperation) {
            el.workspaceMesaStageOperation.textContent = operacao;
        }
        if (el.workspaceMesaStageEquipment) {
            el.workspaceMesaStageEquipment.textContent = equipamento;
        }
        if (el.workspaceMesaStageLastMovement) {
            el.workspaceMesaStageLastMovement.textContent = ultimoMovimento;
        }
    }

    function atualizarStatusMesa(status = "pronta", detalhe = "", dependencies = {}) {
        const estado = dependencies.estado || {};
        const statusNormalizado = dependencies.normalizarStatusMesa?.(status) || "pronta";
        estado.statusMesa = statusNormalizado;
        estado.statusMesaDescricao = String(detalhe || "").trim();
    }

    function atualizarStatusMesaPorComposer(modoMarcador, dependencies = {}) {
        const estado = dependencies.estado || {};
        if (modoMarcador === "insp") {
            if (estado.statusMesa !== "aguardando" && estado.statusMesa !== "respondeu") {
                atualizarStatusMesa("canal_ativo", "", dependencies);
            }
            return;
        }

        if (estado.statusMesa === "canal_ativo") {
            return;
        }
    }

    window.TarielInspectorWorkspaceMesaStatus = Object.assign(
        window.TarielInspectorWorkspaceMesaStatus || {},
        {
            atualizarStatusChatWorkspace,
            atualizarStatusMesa,
            atualizarStatusMesaPorComposer,
            renderizarMesaCardWorkspace,
        }
    );
})();
