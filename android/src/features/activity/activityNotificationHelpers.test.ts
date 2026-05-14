import {
  assinaturaMensagemMesa,
  assinaturaStatusLaudo,
  criarNotificacaoMesa,
  criarNotificacaoSistema,
  criarNotificacaoStatusLaudo,
  formatarTipoTemplateLaudo,
  hintDestinoNotificacaoAtividade,
  mapearStatusLaudoVisual,
  ordenarNotificacoesAtividade,
  prioridadeNotificacaoAtividade,
  rotuloCategoriaNotificacaoAtividade,
  sanitizarTextoNotificacaoAtividade,
  selecionarLaudosParaMonitoramentoMesa,
} from "./activityNotificationHelpers";

describe("activityNotificationHelpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("gera assinaturas e formatacoes canonicas", () => {
    expect(
      assinaturaStatusLaudo({
        status_card: "ajustes",
        status_revisao: "pendente",
        status_card_label: "Ajustes",
        permite_reabrir: true,
        permite_edicao: false,
        case_lifecycle_status: "devolvido_para_correcao",
        active_owner_role: "inspetor",
      } as any),
    ).toBe(
      "ajustes|pendente|Ajustes|1|0|devolvido_para_correcao|inspetor|laudo_em_coleta|chat_reopen",
    );
    expect(
      assinaturaMensagemMesa({
        id: 7,
        lida: true,
        resolvida_em: "",
        texto: "Mesa",
      } as any),
    ).toBe("7|1|not_applicable|Mesa");
    expect(formatarTipoTemplateLaudo("nr12_maquinas")).toBe("Nr12 Maquinas");
    expect(mapearStatusLaudoVisual("ajustes")).toEqual({
      tone: "danger",
      icon: "alert-circle-outline",
    });
    expect(mapearStatusLaudoVisual("emitido")).toEqual({
      tone: "success",
      icon: "file-document-check-outline",
    });
    expect(
      rotuloCategoriaNotificacaoAtividade({
        kind: "alerta_critico",
      } as any),
    ).toBe("Reemissão recomendada");
    expect(
      hintDestinoNotificacaoAtividade({
        targetThread: "finalizar",
      } as any),
    ).toBe("Abrir caso");
    expect(
      sanitizarTextoNotificacaoAtividade(
        "mobile_autonomous mobile_review_allowed primary_pdf_diverged reissue_reason_codes approval_snapshot_updated issue_state issued superseded revoked package_sha256 approval_snapshot_id reviewer_issue reviewer_decision tenant_without_mesa nr35_mesa_required_unavailable",
      ),
    ).toBe(
      "Revisão interna governada Revisão interna governada Reemissão recomendada motivos da reemissão nova aprovação governada Estado da emissão Documento emitido Documento substituído Histórico de emissões Hash do pacote Snapshot aprovado Emissão oficial Revisão governada Não incluído no pacote Família exige Mesa",
    );
    expect(
      assinaturaStatusLaudo({
        id: 12,
        status_card: "emitido",
        status_revisao: "aprovado",
        status_card_label: "Emitido",
        permite_reabrir: true,
        permite_edicao: false,
        case_lifecycle_status: "emitido",
        active_owner_role: "none",
        allowed_surface_actions: ["chat_reopen"],
        official_issue_summary: {
          label: "Reemissão recomendada",
          detail: "PDF emitido divergente · Emitido v0003 · Atual v0004",
          primary_pdf_diverged: true,
          issue_number: "EO-12",
          primary_pdf_storage_version: "v0003",
          current_primary_pdf_storage_version: "v0004",
        },
      } as any),
    ).toBe(
      "emitido|aprovado|Emitido|1|0|emitido|none|devolvido_para_correcao|chat_reopen|reissue|EO-12|v0003|v0004",
    );
  });

  it("cria notificacoes e seleciona laudos monitorados", () => {
    jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-03-30T10:00:00.000Z");
    jest.spyOn(Date, "now").mockReturnValue(100);
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    expect(
      criarNotificacaoStatusLaudo({
        id: 5,
        titulo: "Laudo 5",
        status_card: "ajustes",
        status_card_label: "Ajustes",
        status_revisao: "pendente",
        permite_reabrir: true,
        permite_edicao: false,
        case_lifecycle_status: "devolvido_para_correcao",
        active_owner_role: "inspetor",
        report_pack_draft: {
          quality_gates: {
            checklist_complete: false,
            required_image_slots_complete: false,
            critical_items_complete: false,
            autonomy_ready: false,
            final_validation_mode: "mesa_required",
          },
          items: [
            {
              item_codigo: "fixacao",
              veredito_ia_normativo: "pendente",
              approved_for_emission: false,
              missing_evidence: ["foto_obrigatoria"],
            },
          ],
        },
      } as any),
    ).toMatchObject({
      id: "status:5:ajustes|pendente|Ajustes|1|0|devolvido_para_correcao|inspetor|laudo_em_coleta|chat_reopen",
      targetThread: "chat",
      body: "Laudo 5 voltou para correção com 3 bloqueios no pré-laudo. Abra o chat para ajustar antes de reenviar.",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 15,
        titulo: "Laudo 15",
        status_card: "aguardando",
        status_card_label: "Aguardando",
        status_revisao: "ativo",
        permite_reabrir: false,
        permite_edicao: true,
        case_lifecycle_status: "em_revisao_mesa",
        active_owner_role: "mesa",
        report_pack_draft: {
          quality_gates: {
            autonomy_ready: true,
            final_validation_mode: "mesa_required",
          },
        },
      } as any),
    ).toMatchObject({
      title: "Caso pronto para Mesa Avaliadora",
      targetThread: "mesa",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 25,
        titulo: "Laudo 25",
        status_card: "aguardando",
        status_card_label: "Aguardando",
        status_revisao: "ativo",
        permite_reabrir: false,
        permite_edicao: true,
        case_lifecycle_status: "aguardando_mesa",
        active_owner_role: "mesa",
      } as any),
    ).toMatchObject({
      title: "Caso enviado para a Mesa Avaliadora",
      body: "Laudo 25 já foi enviado para a Mesa Avaliadora. Abra a aba Mesa para acompanhar a entrada da revisão humana.",
      targetThread: "mesa",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 16,
        titulo: "Laudo 16",
        status_card: "aberto",
        status_card_label: "Em andamento",
        status_revisao: "ativo",
        permite_reabrir: false,
        permite_edicao: true,
        case_lifecycle_status: "pre_laudo",
        active_owner_role: "inspetor",
        report_pack_draft: {
          quality_gates: {
            autonomy_ready: true,
            final_validation_mode: "self_service",
          },
        },
      } as any),
    ).toMatchObject({
      title: "Caso pronto para validar",
      targetThread: "chat",
      body: "Laudo 16 já está pronto para validação. Abra o caso para revisar o relatório e seguir pela emissão contextual.",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 26,
        titulo: "Laudo 26",
        status_card: "aguardando",
        status_card_label: "Em revisão",
        status_revisao: "ativo",
        permite_reabrir: false,
        permite_edicao: true,
        case_lifecycle_status: "em_revisao_mesa",
        active_owner_role: "mesa",
      } as any),
    ).toMatchObject({
      title: "Mesa revisando o caso",
      body: "Laudo 26 está em revisão humana. Abra a Mesa Avaliadora para acompanhar pendências e respostas.",
      targetThread: "mesa",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 6,
        titulo: "Laudo 6",
        status_card: "emitido",
        status_card_label: "Emitido",
        status_revisao: "aprovado",
        permite_reabrir: true,
        permite_edicao: false,
        case_lifecycle_status: "emitido",
        active_owner_role: "none",
        allowed_surface_actions: ["chat_reopen"],
        official_issue_summary: {
          label: "Reemissão recomendada",
          detail: "PDF emitido divergente · Emitido v0003 · Atual v0004",
          primary_pdf_diverged: true,
          issue_number: "EO-6",
          primary_pdf_storage_version: "v0003",
          current_primary_pdf_storage_version: "v0004",
        },
      } as any),
    ).toMatchObject({
      id: "status:6:emitido|aprovado|Emitido|1|0|emitido|none|devolvido_para_correcao|chat_reopen|reissue|EO-6|v0003|v0004",
      kind: "alerta_critico",
      title: "Reemissão recomendada",
      body: "Laudo 6: PDF emitido divergente · Emitido v0003 · Atual v0004. Abra o caso para reemitir pelo fluxo contextual.",
      targetThread: "chat",
    });
    expect(
      criarNotificacaoStatusLaudo({
        id: 7,
        titulo: "Laudo 7",
        status_card: "emitido",
        status_card_label: "Emitido",
        status_revisao: "aprovado",
        permite_reabrir: true,
        permite_edicao: false,
        case_lifecycle_status: "emitido",
        active_owner_role: "none",
        allowed_surface_actions: ["chat_reopen"],
        official_issue_summary: {
          label: "Reemissão recomendada",
          detail: "Reemissão motivada por nova aprovação governada.",
          reissue_recommended: true,
          primary_pdf_diverged: false,
          issue_number: "EO-7",
          reissue_reason_codes: ["approval_snapshot_updated"],
          reissue_reason_summary:
            "Reemissão motivada por nova aprovação governada.",
        },
      } as any),
    ).toMatchObject({
      kind: "alerta_critico",
      title: "Reemissão recomendada",
      body: "Laudo 7: Reemissão motivada por nova aprovação governada. Abra o caso para reemitir pelo fluxo contextual.",
      targetThread: "chat",
    });

    expect(
      criarNotificacaoMesa(
        "mesa_resolvida",
        {
          id: 9,
          laudo_id: 5,
          resolvida_em: "2026-03-30",
          texto: "Tudo certo",
        } as any,
        "Laudo 5",
      ),
    ).toMatchObject({
      id: "mesa:9:mesa_resolvida:resolved",
      title: "Pendência marcada como resolvida",
      targetThread: "mesa",
    });

    expect(
      criarNotificacaoSistema({
        title: "Aviso",
        body: "Corpo",
      }),
    ).toMatchObject({
      id: "system:100:8",
      targetThread: "chat",
    });

    expect(
      selecionarLaudosParaMonitoramentoMesa({
        laudoAtivoId: 3,
        laudos: [
          { id: 1, status_card: "aberto" },
          {
            id: 2,
            status_card: "ajustes",
            case_lifecycle_status: "devolvido_para_correcao",
          },
          {
            id: 3,
            status_card: "aguardando",
            case_lifecycle_status: "aguardando_mesa",
          },
          {
            id: 4,
            status_card: "aberto",
            case_lifecycle_status: "em_revisao_mesa",
          },
        ] as any,
      }),
    ).toEqual([3, 2, 4]);
  });

  it("prioriza alertas críticos e mesa reaberta antes de status comuns", () => {
    const ordered = ordenarNotificacoesAtividade([
      {
        id: "status-1",
        kind: "status",
        unread: true,
        createdAt: "2026-03-30T10:00:00.000Z",
      },
      {
        id: "mesa-1",
        kind: "mesa_reaberta",
        unread: true,
        createdAt: "2026-03-30T09:00:00.000Z",
      },
      {
        id: "critical-1",
        kind: "alerta_critico",
        unread: true,
        createdAt: "2026-03-30T08:00:00.000Z",
      },
    ] as any);

    expect(ordered.map((item) => item.id)).toEqual([
      "critical-1",
      "mesa-1",
      "status-1",
    ]);
    expect(prioridadeNotificacaoAtividade(ordered[0] as any)).toBe(0);
  });
});
