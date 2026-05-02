import { enviarMensagemChatMobile } from "../../config/api";
import type { MobileChatMessage } from "../../types/mobile";
import { sendInspectorMessageFlow } from "./messageSendFlows";
import type { ChatAiRequestConfig } from "./preferences";
import type { ComposerAttachment } from "./types";

jest.mock("../../config/api", () => ({
  enviarAnexoMesaMobile: jest.fn(),
  enviarMensagemChatMobile: jest.fn(),
  enviarMensagemMesaMobile: jest.fn(),
  uploadDocumentoChatMobile: jest.fn(),
}));

jest.mock("../../config/observability", () => ({
  registrarEventoObservabilidade: jest.fn(),
}));

const aiRequestConfig: ChatAiRequestConfig = {
  learningOptIn: false,
  fallbackNotes: [],
  memoryEnabled: false,
  messagePrefix: "",
  model: "equilibrado",
  mode: "detalhado",
  responseLanguage: "Português",
  responseStyle: "padrão",
  summaryLabel: "Detalhado",
  temperature: 0.2,
  tone: "profissional",
};

describe("sendInspectorMessageFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (enviarMensagemChatMobile as jest.Mock).mockResolvedValue({
      assistantText: "Imagem recebida.",
      citacoes: [],
      confiancaIa: null,
      entry_mode_effective: "chat_first",
      entry_mode_preference: "chat_first",
      events: [],
      laudoCard: null,
      laudoId: 42,
      modo: "detalhado",
    });
  });

  it("preserva preview local da imagem na mensagem otimista", async () => {
    const anexoAtual: ComposerAttachment = {
      kind: "image",
      dadosImagem: "base64-image",
      fileUri: "file:///tmp/foto-original.jpg",
      label: "foto.jpg",
      mimeType: "image/jpeg",
      previewUri: "file:///tmp/foto-preview.jpg",
      resumo: "",
    };
    const onApplyOptimisticMessage = jest.fn();
    const carregarConversaAtual = jest.fn();
    const carregarListaLaudos = jest.fn();

    await sendInspectorMessageFlow({
      mensagem: "",
      anexoAtual,
      snapshotConversa: {
        estado: "sem_relatorio",
        laudoCard: null,
        laudoId: null,
        mensagens: [],
        modo: "detalhado",
        permiteEdicao: true,
        permiteReabrir: false,
        statusCard: "aberto",
      },
      guidedInspectionDraft: null,
      aiRequestConfig,
      sessionAccessToken: "token-123",
      statusApi: "online",
      podeEditarConversaNoComposer: () => true,
      textoFallbackAnexo: () => "Imagem enviada",
      normalizarModoChat: () => "detalhado",
      inferirSetorConversa: () => "",
      montarHistoricoParaEnvio: () => [],
      criarMensagemAssistenteServidor: () => null,
      carregarConversaAtual,
      carregarListaLaudos,
      erroSugereModoOffline: () => false,
      criarItemFilaOffline: jest.fn(),
      onSetMensagem: jest.fn(),
      onSetAnexoRascunho: jest.fn(),
      onSetErroConversa: jest.fn(),
      onSetEnviandoMensagem: jest.fn(),
      onApplyOptimisticMessage,
      onApplyAssistantResponse: jest.fn(),
      onReverterConversa: jest.fn(),
      onQueueOfflineItem: jest.fn(),
      onSetStatusOffline: jest.fn(),
      onRestoreDraft: jest.fn(),
    });

    expect(onApplyOptimisticMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        anexos: [
          expect.objectContaining({
            categoria: "imagem",
            eh_imagem: true,
            local_preview_uri: "file:///tmp/foto-preview.jpg",
            local_uri: "file:///tmp/foto-original.jpg",
          }),
        ],
        texto: "Imagem enviada",
      }),
      "detalhado",
    );
    expect(enviarMensagemChatMobile).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({
        dadosImagem: "base64-image",
      }),
    );
    expect(carregarConversaAtual).not.toHaveBeenCalled();
    expect(carregarListaLaudos).toHaveBeenCalledTimes(1);
  });

  it("nao duplica a mensagem atual dentro do historico enviado para IA", async () => {
    const historicoAnterior: MobileChatMessage[] = [
      {
        id: 10,
        papel: "usuario",
        texto: "Mensagem anterior",
        tipo: "texto",
      },
      {
        id: 11,
        papel: "assistente",
        texto: "Resposta anterior",
        tipo: "assistant",
      },
    ];
    const montarHistoricoParaEnvio = jest.fn(() => [
      { papel: "usuario" as const, texto: "Mensagem anterior" },
      { papel: "assistente" as const, texto: "Resposta anterior" },
    ]);
    const carregarConversaAtual = jest.fn();
    const carregarConversaPorLaudoId = jest.fn();

    await sendInspectorMessageFlow({
      mensagem: "olá",
      anexoAtual: null,
      snapshotConversa: {
        estado: "relatorio_ativo",
        laudoCard: null,
        laudoId: 42,
        mensagens: historicoAnterior,
        modo: "detalhado",
        permiteEdicao: true,
        permiteReabrir: false,
        statusCard: "aberto",
      },
      guidedInspectionDraft: null,
      aiRequestConfig,
      sessionAccessToken: "token-123",
      statusApi: "online",
      podeEditarConversaNoComposer: () => true,
      textoFallbackAnexo: () => "Anexo",
      normalizarModoChat: () => "detalhado",
      inferirSetorConversa: () => "geral",
      montarHistoricoParaEnvio,
      criarMensagemAssistenteServidor: () => null,
      carregarConversaAtual,
      carregarConversaPorLaudoId,
      carregarListaLaudos: jest.fn(),
      erroSugereModoOffline: () => false,
      criarItemFilaOffline: jest.fn(),
      onSetMensagem: jest.fn(),
      onSetAnexoRascunho: jest.fn(),
      onSetErroConversa: jest.fn(),
      onSetEnviandoMensagem: jest.fn(),
      onApplyOptimisticMessage: jest.fn(),
      onApplyAssistantResponse: jest.fn(),
      onReverterConversa: jest.fn(),
      onQueueOfflineItem: jest.fn(),
      onSetStatusOffline: jest.fn(),
      onRestoreDraft: jest.fn(),
    });

    expect(montarHistoricoParaEnvio).toHaveBeenCalledWith(historicoAnterior);
    expect(enviarMensagemChatMobile).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({
        historico: [
          { papel: "usuario", texto: "Mensagem anterior" },
          { papel: "assistente", texto: "Resposta anterior" },
        ],
        mensagem: "olá",
      }),
    );
    expect(carregarConversaPorLaudoId).toHaveBeenCalledWith(42);
    expect(carregarConversaAtual).not.toHaveBeenCalled();
  });

  it("recarrega diretamente o laudo criado no primeiro envio", async () => {
    (enviarMensagemChatMobile as jest.Mock).mockResolvedValueOnce({
      assistantText: "Caso criado.",
      citacoes: [],
      confiancaIa: null,
      events: [],
      laudoCard: null,
      laudoId: 144,
      modo: "detalhado",
    });
    const carregarConversaAtual = jest.fn();
    const carregarConversaPorLaudoId = jest.fn();

    await sendInspectorMessageFlow({
      mensagem: "abrir novo chat",
      anexoAtual: null,
      snapshotConversa: {
        estado: "sem_relatorio",
        laudoCard: null,
        laudoId: null,
        mensagens: [],
        modo: "detalhado",
        permiteEdicao: true,
        permiteReabrir: false,
        statusCard: "aberto",
      },
      guidedInspectionDraft: null,
      aiRequestConfig,
      sessionAccessToken: "token-123",
      statusApi: "online",
      podeEditarConversaNoComposer: () => true,
      textoFallbackAnexo: () => "Anexo",
      normalizarModoChat: () => "detalhado",
      inferirSetorConversa: () => "geral",
      montarHistoricoParaEnvio: jest.fn(() => []),
      criarMensagemAssistenteServidor: () => null,
      carregarConversaAtual,
      carregarConversaPorLaudoId,
      carregarListaLaudos: jest.fn(),
      erroSugereModoOffline: () => false,
      criarItemFilaOffline: jest.fn(),
      onSetMensagem: jest.fn(),
      onSetAnexoRascunho: jest.fn(),
      onSetErroConversa: jest.fn(),
      onSetEnviandoMensagem: jest.fn(),
      onApplyOptimisticMessage: jest.fn(),
      onApplyAssistantResponse: jest.fn(),
      onReverterConversa: jest.fn(),
      onQueueOfflineItem: jest.fn(),
      onSetStatusOffline: jest.fn(),
      onRestoreDraft: jest.fn(),
    });

    expect(carregarConversaPorLaudoId).toHaveBeenCalledWith(144);
    expect(carregarConversaAtual).not.toHaveBeenCalled();
    expect(enviarMensagemChatMobile).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({
        iniciarLaudo: true,
        laudoId: null,
      }),
    );
  });

  it("nao recarrega o laudo atual antigo se o primeiro envio nao retornar id", async () => {
    (enviarMensagemChatMobile as jest.Mock).mockResolvedValueOnce({
      assistantText: "Resposta sem laudo.",
      citacoes: [],
      confiancaIa: null,
      events: [],
      laudoCard: null,
      laudoId: null,
      modo: "detalhado",
    });
    const carregarConversaAtual = jest.fn();
    const carregarConversaPorLaudoId = jest.fn();

    await sendInspectorMessageFlow({
      mensagem: "chat limpo",
      anexoAtual: null,
      snapshotConversa: {
        estado: "sem_relatorio",
        laudoCard: null,
        laudoId: null,
        mensagens: [],
        modo: "detalhado",
        permiteEdicao: true,
        permiteReabrir: false,
        statusCard: "aberto",
      },
      guidedInspectionDraft: null,
      aiRequestConfig,
      sessionAccessToken: "token-123",
      statusApi: "online",
      podeEditarConversaNoComposer: () => true,
      textoFallbackAnexo: () => "Anexo",
      normalizarModoChat: () => "detalhado",
      inferirSetorConversa: () => "geral",
      montarHistoricoParaEnvio: jest.fn(() => []),
      criarMensagemAssistenteServidor: () => null,
      carregarConversaAtual,
      carregarConversaPorLaudoId,
      carregarListaLaudos: jest.fn(),
      erroSugereModoOffline: () => false,
      criarItemFilaOffline: jest.fn(),
      onSetMensagem: jest.fn(),
      onSetAnexoRascunho: jest.fn(),
      onSetErroConversa: jest.fn(),
      onSetEnviandoMensagem: jest.fn(),
      onApplyOptimisticMessage: jest.fn(),
      onApplyAssistantResponse: jest.fn(),
      onReverterConversa: jest.fn(),
      onQueueOfflineItem: jest.fn(),
      onSetStatusOffline: jest.fn(),
      onRestoreDraft: jest.fn(),
    });

    expect(enviarMensagemChatMobile).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({
        iniciarLaudo: true,
        laudoId: null,
      }),
    );
    expect(carregarConversaPorLaudoId).not.toHaveBeenCalled();
    expect(carregarConversaAtual).not.toHaveBeenCalled();
  });
});
