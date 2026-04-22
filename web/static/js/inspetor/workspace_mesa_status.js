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
        const snapshot = dependencies.obterPayloadStatusRelatorioWorkspaceAtual?.() || {};
        const evidencias = dependencies.contarEvidenciasWorkspace?.() || 0;
        const pendencias = Number(estado.qtdPendenciasAbertas || 0) || 0;
        const naoLidas = Number(estado.mesaWidgetNaoLidas || 0) || 0;
        const nomesTemplates = dependencies.NOMES_TEMPLATES || {};
        const modelo = nomesTemplates[estado.tipoTemplateAtivo] || nomesTemplates.padrao;
        const operacao = dependencies.obterOperacaoWorkspace?.() || "Operação não identificada";
        const equipamento = String(estado.workspaceVisualContext?.title || "Registro técnico").trim() || "Registro técnico";
        const ultimoMovimento = resumo.descricao || "Sem atualização recente.";
        const lifecycleStatus = String(
            snapshot?.case_lifecycle_status ?? snapshot?.laudo_card?.case_lifecycle_status ?? ""
        ).trim().toLowerCase();
        const ownerRole = String(
            snapshot?.active_owner_role ?? snapshot?.laudo_card?.active_owner_role ?? ""
        ).trim().toLowerCase();
        const statusVisualLabel = String(
            snapshot?.status_visual_label
            ?? snapshot?.laudo_card?.status_visual_label
            ?? estado.workspaceVisualContext?.statusBadge
            ?? resumo.chipStatus
            ?? resumo.titulo
            ?? "Status visual indisponível"
        ).trim() || "Status visual indisponível";
        const momentoCanonico = resumirMomentoCanonicoMesaInspector(
            {
                lifecycleStatus,
                ownerRole,
                pendencias,
                naoLidas,
                resumoMesa: resumo,
                snapshot,
            }
        );
        let proximoPasso = "Use o canal para alinhar dúvidas ou anexar novas evidências.";

        if (pendencias > 0) {
            proximoPasso = "Responda às pendências abertas para destravar a revisão.";
        } else if (naoLidas > 0) {
            proximoPasso = "Leia o retorno mais recente da mesa e ajuste o laudo se necessário.";
        } else if (resumo.status === "aguardando") {
            proximoPasso = "Aguarde a resposta da mesa ou complemente o caso com novo contexto.";
        } else if (momentoCanonico.key === "decision_ready") {
            proximoPasso = "Consolide o caso e aguarde a decisão final da mesa.";
        } else if (momentoCanonico.key === "field_owner") {
            proximoPasso = "Complete os ajustes pedidos e prepare um novo envio para revisão.";
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
        if (el.workspaceMesaStageStatusVisual) {
            el.workspaceMesaStageStatusVisual.textContent = `Status ${statusVisualLabel}`;
        }
        if (el.workspaceMesaStageLifecycle) {
            el.workspaceMesaStageLifecycle.textContent = `Fluxo ${momentoCanonico.lifecycleLabel}`;
        }
        if (el.workspaceMesaStageOwner) {
            el.workspaceMesaStageOwner.textContent = `Owner ${momentoCanonico.ownerLabel}`;
        }
        if (el.workspaceMesaStageMoment) {
            el.workspaceMesaStageMoment.textContent = momentoCanonico.label;
        }
        if (el.workspaceMesaStageMomentDetail) {
            el.workspaceMesaStageMomentDetail.textContent = momentoCanonico.detail;
        }
    }

    function humanizarLifecycleMesaInspector(valor = "") {
        const chave = String(valor || "").trim().toLowerCase();
        if (chave === "analise_livre") return "Análise livre";
        if (chave === "pre_laudo") return "Pré-laudo";
        if (chave === "laudo_em_coleta") return "Laudo guiado";
        if (chave === "aguardando_mesa") return "Aguardando mesa";
        if (chave === "em_revisao_mesa") return "Em revisão na mesa";
        if (chave === "devolvido_para_correcao") return "Devolvido para correção";
        if (chave === "aprovado") return "Aprovado";
        if (chave === "emitido") return "Emitido";
        return "Fluxo legado";
    }

    function humanizarOwnerMesaInspector(valor = "") {
        const chave = String(valor || "").trim().toLowerCase();
        if (chave === "inspetor") return "Campo";
        if (chave === "mesa") return "Mesa";
        if (chave === "none") return "Conclusão";
        return "Indefinido";
    }

    function snapshotPermiteAcaoMesaInspector(snapshot = null, actionKey = "") {
        const action = String(actionKey || "").trim().toLowerCase();
        if (!action) return false;
        const itens = Array.isArray(snapshot?.allowed_surface_actions)
            ? snapshot.allowed_surface_actions
            : Array.isArray(snapshot?.laudo_card?.allowed_surface_actions)
                ? snapshot.laudo_card.allowed_surface_actions
                : [];
        return itens
            .map((item) => String(item || "").trim().toLowerCase())
            .includes(action);
    }

    function resumirMomentoCanonicoMesaInspector(context = {}) {
        const lifecycleStatus = String(context.lifecycleStatus || "").trim().toLowerCase();
        const ownerRole = String(context.ownerRole || "").trim().toLowerCase();
        const pendencias = Number(context.pendencias || 0) || 0;
        const naoLidas = Number(context.naoLidas || 0) || 0;
        const resumoMesa = context.resumoMesa && typeof context.resumoMesa === "object" ? context.resumoMesa : {};
        const snapshot = context.snapshot && typeof context.snapshot === "object" ? context.snapshot : null;

        const base = {
            key: "case_monitoring",
            label: "Monitorar caso",
            detail: "O caso segue em acompanhamento operacional e os sinais evoluem conforme a revisão anda.",
            lifecycleLabel: humanizarLifecycleMesaInspector(lifecycleStatus),
            ownerLabel: humanizarOwnerMesaInspector(ownerRole),
        };

        if (
            snapshotPermiteAcaoMesaInspector(snapshot, "mesa_approve") ||
            snapshotPermiteAcaoMesaInspector(snapshot, "mesa_return")
        ) {
            return {
                ...base,
                key: "decision_ready",
                label: "Decisão disponível",
                detail: "A mesa já pode aprovar ou devolver; o foco agora é fechar a revisão humana.",
            };
        }

        if (snapshotPermiteAcaoMesaInspector(snapshot, "chat_finalize")) {
            return {
                ...base,
                key: "waiting_field_send",
                label: "Aguardando envio do campo",
                detail: "A coleta ficou pronta, mas o caso ainda depende do envio formal para a mesa.",
            };
        }

        if (pendencias > 0) {
            return {
                ...base,
                key: "open_pendency",
                label: "Pendência aberta",
                detail: "A mesa já apontou ajuste ou evidência pendente e o campo precisa responder antes de avançar.",
            };
        }

        if (naoLidas > 0) {
            return {
                ...base,
                key: "mesa_reply_unread",
                label: "Retorno novo da mesa",
                detail: "Há mensagem recente da mesa aguardando leitura para orientar o próximo movimento do caso.",
            };
        }

        if (ownerRole === "inspetor") {
            return {
                ...base,
                key: "field_owner",
                label: "Campo em ação",
                detail: lifecycleStatus === "devolvido_para_correcao"
                    ? "O caso voltou ao inspetor com ajustes objetivos antes de um novo envio para revisão."
                    : "O caso segue no campo reunindo contexto, evidências e preparação para revisão.",
            };
        }

        if (ownerRole === "mesa") {
            return {
                ...base,
                key: "mesa_owner",
                label: "Mesa em ação",
                detail: "A validação humana da mesa é o próximo passo canônico deste caso.",
            };
        }

        if (lifecycleStatus === "aprovado") {
            return {
                ...base,
                key: "issue_ready",
                label: "Pronto para emissão",
                detail: "O caso já foi aprovado e aguarda a etapa final documental.",
            };
        }

        if (lifecycleStatus === "emitido") {
            return {
                ...base,
                key: "issued",
                label: "Emissão concluída",
                detail: "O ciclo atual já foi fechado com documento emitido e histórico preservado.",
            };
        }

        if (String(resumoMesa.status || "").trim().toLowerCase() === "aguardando") {
            return {
                ...base,
                key: "awaiting_mesa",
                label: "Aguardando mesa",
                detail: "O caso já foi enviado e agora espera retorno técnico ou decisão da mesa.",
            };
        }

        return base;
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
            resumirMomentoCanonicoMesaInspector,
        }
    );
})();
