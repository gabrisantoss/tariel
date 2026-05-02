import { buildRefreshAction } from "./buildRefreshAction";

function createRefreshAction(
  overrides: Partial<Parameters<typeof buildRefreshAction>[0]> = {},
) {
  return {
    abaAtiva: "chat" as const,
    carregarConversaAtual: jest.fn().mockResolvedValue({ laudoId: 88 }),
    carregarConversaPorLaudoId: jest.fn().mockResolvedValue({ laudoId: 88 }),
    carregarListaLaudos: jest.fn().mockResolvedValue([]),
    carregarMesaAtual: jest.fn().mockResolvedValue(undefined),
    conversa: { laudoId: 88 },
    criarNotificacaoSistema: jest.fn(() => ({
      id: "sync-1",
      unread: true,
      title: "ok",
      body: "ok",
      createdAt: "2026-05-02T10:00:00.000Z",
      kind: "system" as const,
      laudoId: null,
      targetThread: "chat" as const,
    })),
    filaOffline: [],
    onCanSyncOnCurrentNetwork: jest.fn().mockResolvedValue(true),
    onIsOfflineItemReadyForRetry: jest.fn().mockReturnValue(false),
    onPingApi: jest.fn().mockResolvedValue(true),
    onRegistrarNotificacoes: jest.fn(),
    onSetErroConversa: jest.fn(),
    onSetErroMesa: jest.fn(),
    onSetSincronizandoAgora: jest.fn(),
    onSetStatusApi: jest.fn(),
    onSetUsandoCacheOffline: jest.fn(),
    session: {
      accessToken: "token-123",
      bootstrap: {
        ok: true,
        app: {
          nome: "Tariel",
          portal: "inspetor",
          api_base_url: "https://api.tariel.test",
          suporte_whatsapp: "",
        },
        usuario: {
          id: 1,
          nome_completo: "Inspetor",
          email: "inspetor@tariel.test",
          telefone: "",
          foto_perfil_url: "",
          empresa_nome: "Tariel",
          empresa_id: 1,
          nivel_acesso: 3,
        },
      },
    },
    sincronizacaoDispositivos: true,
    sincronizarFilaOffline: jest.fn().mockResolvedValue(undefined),
    wifiOnlySync: false,
    ...overrides,
  } satisfies Parameters<typeof buildRefreshAction>[0];
}

describe("buildRefreshAction", () => {
  it("recarrega somente o laudo aberto, sem trocar para a conversa atual do servidor", async () => {
    const params = createRefreshAction();
    const refresh = buildRefreshAction(params);

    await refresh();

    expect(params.carregarListaLaudos).toHaveBeenCalledWith("token-123", true);
    expect(params.carregarConversaPorLaudoId).toHaveBeenCalledWith(
      "token-123",
      88,
      true,
    );
    expect(params.carregarConversaAtual).not.toHaveBeenCalled();
  });

  it("mantem novo chat limpo ao sincronizar sem laudo aberto", async () => {
    const params = createRefreshAction({
      conversa: { laudoId: null },
    });
    const refresh = buildRefreshAction(params);

    await refresh();

    expect(params.carregarListaLaudos).toHaveBeenCalledWith("token-123", true);
    expect(params.carregarConversaPorLaudoId).not.toHaveBeenCalled();
    expect(params.carregarConversaAtual).not.toHaveBeenCalled();
  });
});
