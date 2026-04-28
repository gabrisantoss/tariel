(function () {
    "use strict";

    function resumirTempoMesaInspector(valorIso = "") {
        const texto = String(valorIso || "").trim();
        if (!texto) return "Sem atualização operacional recente.";

        try {
            const data = new Date(texto);
            if (Number.isNaN(data.getTime())) {
                return "Sem atualização operacional recente.";
            }

            const diffMs = Date.now() - data.getTime();
            const diffMin = Math.max(1, Math.round(diffMs / 60000));
            if (diffMin < 60) return `há ${diffMin}min`;

            const diffHoras = Math.round(diffMin / 60);
            if (diffHoras < 24) return `há ${diffHoras} horas`;

            const diffDias = Math.round(diffHoras / 24);
            return diffDias <= 1 ? "ontem" : `há ${diffDias} dias`;
        } catch (_) {
            return "Sem atualização operacional recente.";
        }
    }

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
        const mensagens = Array.isArray(estado.mesaWidgetMensagens) ? estado.mesaWidgetMensagens : [];
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
        const momentoCanonicoFallback = resumirMomentoCanonicoMesaInspector(
            {
                lifecycleStatus,
                ownerRole,
                pendencias,
                naoLidas,
                resumoMesa: resumo,
                snapshot,
            }
        );
        const reviewPhaseLabel = String(snapshot?.review_phase_label || "").trim();
        const nextActionLabel = String(snapshot?.next_action_label || "").trim();
        const nextActionSummary = String(snapshot?.next_action_summary || "").trim();
        const operationalPhase = String(snapshot?.case_operational_phase || "").trim();
        const operationalPhaseLabel = String(snapshot?.case_operational_phase_label || "").trim();
        const operationalSummary = String(snapshot?.case_operational_summary || "").trim();
        const momentoCanonico = {
            ...momentoCanonicoFallback,
            key: operationalPhase || momentoCanonicoFallback.key,
            label: operationalPhaseLabel || momentoCanonicoFallback.label,
            detail: operationalSummary || momentoCanonicoFallback.detail,
        };
        const ultimaMensagem = mensagens.length ? mensagens[mensagens.length - 1] : null;
        const ultimaAtualizacao = resumirTempoMesaInspector(
            ultimaMensagem?.created_at
            || ultimaMensagem?.createdAt
            || ultimaMensagem?.criado_em_iso
            || ultimaMensagem?.data
            || snapshot?.updated_at
            || snapshot?.updatedAt
            || snapshot?.laudo_card?.updated_at
            || snapshot?.laudo_card?.updatedAt
            || ""
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
        } else if (
            momentoCanonico.key === "returned_to_field"
            || momentoCanonico.key === "field_collection"
        ) {
            proximoPasso = "Complete os ajustes pedidos e prepare um novo envio para revisão.";
        }
        const badgeTotal = Math.max(naoLidas, 0) + Math.max(pendencias, 0);
        const comentariosMesa = mensagens.filter((item) => {
            const itemKind = String(item?.item_kind || "").trim().toLowerCase();
            const messageKind = String(item?.message_kind || "").trim().toLowerCase();
            const tipo = String(item?.tipo || "").trim().toLowerCase();
            const pendencyState = String(item?.pendency_state || "").trim().toLowerCase();
            const entradaMesa = messageKind === "mesa_pendency" || itemKind === "pendency" || tipo === "humano_eng";
            return entradaMesa && pendencyState !== "open" && pendencyState !== "resolved";
        }).length;
        let comentarioTitle = "Sem comentários recentes";
        let comentarioDetail = "A mesa ainda não registrou retornos contextuais neste caso.";
        if (comentariosMesa > 0) {
            comentarioTitle = `${comentariosMesa} comentário${comentariosMesa > 1 ? "s" : ""} técnico${comentariosMesa > 1 ? "s" : ""}`;
            comentarioDetail = "Retornos contextuais da mesa já aparecem na linha do tempo deste caso.";
        }
        let pendenciaTitle = "Nenhuma pendência aberta";
        let pendenciaDetail = "Quando a mesa pedir ajuste ou evidência, isso aparecerá aqui.";
        if (pendencias > 0) {
            pendenciaTitle = `${pendencias} pendência${pendencias > 1 ? "s" : ""} aberta${pendencias > 1 ? "s" : ""}`;
            pendenciaDetail = "O caso depende de resposta objetiva do campo antes de avançar na revisão.";
        }
        let decisaoTitle = "Sem decisão final";
        let decisaoDetail = "A aprovação ou devolução formal do caso ainda não foi registrada.";
        if (momentoCanonico.key === "decision_ready") {
            decisaoTitle = "Decisão pronta para a mesa";
            decisaoDetail = "O caso já reúne contexto suficiente para aprovação ou devolução formal.";
        } else if (
            momentoCanonico.key === "returned_to_field"
            || momentoCanonico.key === "field_collection"
        ) {
            decisaoTitle = "Caso devolvido para correção";
            decisaoDetail = "A mesa já decidiu pelo retorno ao campo e agora aguarda novo envio.";
        } else if (momentoCanonico.key === "issue_ready" || momentoCanonico.key === "issued") {
            decisaoTitle = momentoCanonico.key === "issued" ? "Decisão concluída" : "Aprovado pela mesa";
            decisaoDetail = momentoCanonico.detail;
        }
        const pendenciasAbertasItens = mensagens.filter((item) => {
            const itemKind = String(item?.item_kind || "").trim().toLowerCase();
            const messageKind = String(item?.message_kind || "").trim().toLowerCase();
            const tipo = String(item?.tipo || "").trim().toLowerCase();
            const pendencyState = String(item?.pendency_state || "").trim().toLowerCase();
            const entradaMesa = messageKind === "mesa_pendency" || itemKind === "pendency" || tipo === "humano_eng";
            return entradaMesa && pendencyState === "open";
        });
        const anexosMesaRecentes = [];
        for (const item of [...mensagens].reverse()) {
            const tipo = String(item?.tipo || "").trim().toLowerCase();
            if (tipo !== "humano_eng") continue;
            const anexos = Array.isArray(item?.anexos) ? item.anexos : [];
            for (const anexo of anexos) {
                anexosMesaRecentes.push({
                    nome: String(anexo?.nome || "Anexo").trim() || "Anexo",
                    categoria: String(anexo?.categoria || "").trim() || "arquivo",
                    data: String(item?.data || "").trim(),
                });
            }
            if (anexosMesaRecentes.length >= 4) break;
        }

        if (el.workspaceMesaCardText) {
            el.workspaceMesaCardText.textContent = resumo.descricao;
        }
        if (el.workspaceMesaCardMode) {
            el.workspaceMesaCardMode.hidden = true;
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
        if (el.workspaceMesaStagePhase) {
            el.workspaceMesaStagePhase.textContent = reviewPhaseLabel || momentoCanonico.label;
        }
        if (el.workspaceMesaStagePhaseDetail) {
            el.workspaceMesaStagePhaseDetail.textContent = nextActionSummary || momentoCanonico.detail;
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
            el.workspaceMesaStageNextStep.textContent = nextActionSummary || proximoPasso;
        }
        if (el.workspaceMesaStageNextActionLabel) {
            el.workspaceMesaStageNextActionLabel.textContent = nextActionLabel || "Acompanhar revisão";
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
        if (el.workspaceMesaStageLastUpdated) {
            el.workspaceMesaStageLastUpdated.textContent = ultimaAtualizacao;
        }
        if (el.workspaceMesaStageStatusVisual) {
            el.workspaceMesaStageStatusVisual.textContent = `Status ${statusVisualLabel}`;
        }
        if (el.workspaceMesaStageLifecycle) {
            el.workspaceMesaStageLifecycle.textContent = `Etapa do caso ${momentoCanonico.lifecycleLabel}`;
        }
        if (el.workspaceMesaStageOwner) {
            el.workspaceMesaStageOwner.textContent = `Responsável ativo ${momentoCanonico.ownerLabel}`;
        }
        if (el.workspaceMesaStageMoment) {
            el.workspaceMesaStageMoment.textContent = momentoCanonico.label;
        }
        if (el.workspaceMesaStageMomentDetail) {
            el.workspaceMesaStageMomentDetail.textContent = momentoCanonico.detail;
        }
        if (el.workspaceMesaEventCommentTitle) {
            el.workspaceMesaEventCommentTitle.textContent = comentarioTitle;
        }
        if (el.workspaceMesaEventCommentDetail) {
            el.workspaceMesaEventCommentDetail.textContent = comentarioDetail;
        }
        if (el.workspaceMesaEventPendencyTitle) {
            el.workspaceMesaEventPendencyTitle.textContent = pendenciaTitle;
        }
        if (el.workspaceMesaEventPendencyDetail) {
            el.workspaceMesaEventPendencyDetail.textContent = pendenciaDetail;
        }
        if (el.workspaceMesaEventDecisionTitle) {
            el.workspaceMesaEventDecisionTitle.textContent = decisaoTitle;
        }
        if (el.workspaceMesaEventDecisionDetail) {
            el.workspaceMesaEventDecisionDetail.textContent = decisaoDetail;
        }
        if (el.workspaceMesaPendingTitle) {
            el.workspaceMesaPendingTitle.textContent = pendenciasAbertasItens.length > 0
                ? `${pendenciasAbertasItens.length} pendência${pendenciasAbertasItens.length > 1 ? "s" : ""} aguardando retorno`
                : "Nenhum pedido aberto da mesa";
        }
        if (el.workspaceMesaPendingDetail) {
            el.workspaceMesaPendingDetail.textContent = pendenciasAbertasItens.length > 0
                ? "Responda primeiro os pedidos abaixo para destravar a revisão."
                : "Quando a mesa pedir evidência, ajuste ou correção objetiva, isso aparecerá aqui.";
        }
        if (el.workspaceMesaPendingList) {
            el.workspaceMesaPendingList.innerHTML = "";
            const itens = pendenciasAbertasItens.slice(-3).reverse();
            for (const item of itens) {
                const li = document.createElement("li");
                li.className = "workspace-mesa-operational-list__item";
                const texto = String(item?.texto || "").trim() || "Pendência aberta pela mesa.";
                const data = String(item?.data || "").trim();
                li.innerHTML = `
                    <strong>${escaparHtmlMesaInspector(texto)}</strong>
                    <span>${escaparHtmlMesaInspector(data || "Ação esperada: responder pelo canal da mesa.")}</span>
                `;
                el.workspaceMesaPendingList.appendChild(li);
            }
            el.workspaceMesaPendingList.hidden = itens.length <= 0;
        }
        if (el.workspaceMesaPendingEmpty) {
            el.workspaceMesaPendingEmpty.hidden = pendenciasAbertasItens.length > 0;
        }
        if (el.workspaceMesaAttachmentsTitle) {
            el.workspaceMesaAttachmentsTitle.textContent = anexosMesaRecentes.length > 0
                ? `${anexosMesaRecentes.length} anexo${anexosMesaRecentes.length > 1 ? "s" : ""} recente${anexosMesaRecentes.length > 1 ? "s" : ""} da mesa`
                : "Nenhum anexo recente da mesa";
        }
        if (el.workspaceMesaAttachmentsDetail) {
            el.workspaceMesaAttachmentsDetail.textContent = anexosMesaRecentes.length > 0
                ? "Use estes arquivos como referência para responder à revisão sem procurar no histórico inteiro."
                : "Arquivos enviados pela revisão aparecem aqui para facilitar a resposta do campo.";
        }
        if (el.workspaceMesaAttachmentsList) {
            el.workspaceMesaAttachmentsList.innerHTML = "";
            for (const anexo of anexosMesaRecentes.slice(0, 4)) {
                const li = document.createElement("li");
                li.className = "workspace-mesa-operational-list__item";
                li.innerHTML = `
                    <strong>${escaparHtmlMesaInspector(anexo.nome)}</strong>
                    <span>${escaparHtmlMesaInspector(`${anexo.categoria}${anexo.data ? ` • ${anexo.data}` : ""}`)}</span>
                `;
                el.workspaceMesaAttachmentsList.appendChild(li);
            }
            el.workspaceMesaAttachmentsList.hidden = anexosMesaRecentes.length <= 0;
        }
        if (el.workspaceMesaAttachmentsEmpty) {
            el.workspaceMesaAttachmentsEmpty.hidden = anexosMesaRecentes.length > 0;
        }
        if (el.workspaceMesaEmptyState) {
            const vazio = mensagens.length <= 0;
            el.workspaceMesaEmptyState.hidden = !vazio;
        }
        if (el.workspaceMesaEmptyTitle) {
            el.workspaceMesaEmptyTitle.textContent = pendencias > 0
                ? "A mesa já sinalizou itens para correção neste caso"
                : "Esta aba concentra a comunicação institucional com a mesa";
        }
        if (el.workspaceMesaEmptyDetail) {
            el.workspaceMesaEmptyDetail.textContent = pendencias > 0
                ? "Mesmo sem conversa longa no histórico, use esta aba para responder às pendências, anexar evidências e acompanhar o próximo passo da revisão."
                : "Quando a revisão começar, você verá aqui comentários técnicos, pendências, anexos e decisões formais do caso.";
        }
        [el.workspaceTabBadgeMesa, el.workspaceChannelBadgeMesa].forEach((node) => {
            if (!node) return;
            const visivel = badgeTotal > 0;
            node.hidden = !visivel;
            node.textContent = visivel ? String(Math.min(badgeTotal, 99)) : "0";
        });
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
        return "Etapa não classificada";
    }

    function escaparHtmlMesaInspector(valor = "") {
        return String(valor || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
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
