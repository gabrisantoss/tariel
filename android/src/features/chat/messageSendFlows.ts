import {
  enviarAnexoMesaMobile,
  enviarMensagemChatMobile,
  enviarMensagemMesaMobile,
  uploadDocumentoChatMobile,
} from "../../config/api";
import { registrarEventoObservabilidade } from "../../config/observability";
import { type ChatAiRequestConfig } from "./preferences";
import type { ComposerAttachment } from "./types";
import {
  buildGuidedInspectionMessageContext,
  guidedInspectionDraftToMobilePayload,
  type GuidedInspectionDraft,
} from "../inspection/guidedInspection";
import type {
  MobileAttachment,
  MobileChatMode,
  MobileChatMessage,
  MobileChatSendResult,
  MobileGuidedInspectionDraftPayload,
  MobileLaudoCard,
  MobileMesaMessage,
  MobileMesaSendResponse,
} from "../../types/mobile";

interface ConversationSnapshot {
  laudoId: number | null;
  estado: string;
  statusCard: string;
  permiteEdicao: boolean;
  permiteReabrir: boolean;
  laudoCard: MobileLaudoCard | null;
  modo: MobileChatMode | string;
  mensagens: MobileChatMessage[];
}

interface MesaConversationSnapshot {
  laudoId: number | null;
  permiteEdicao: boolean;
  laudoCard?: {
    titulo?: string;
  } | null;
}

interface SendInspectorMessageFlowParams<TOfflineItem> {
  mensagem: string;
  anexoAtual: ComposerAttachment | null;
  snapshotConversa: ConversationSnapshot | null;
  guidedInspectionDraft: GuidedInspectionDraft | null;
  aiRequestConfig: ChatAiRequestConfig;
  sessionAccessToken: string;
  statusApi: string;
  podeEditarConversaNoComposer: (
    conversa: ConversationSnapshot | null | undefined,
  ) => boolean;
  textoFallbackAnexo: (anexo: ComposerAttachment | null) => string;
  normalizarModoChat: (
    modo: unknown,
    fallback?: MobileChatMode,
  ) => MobileChatMode;
  inferirSetorConversa: (
    conversa: ConversationSnapshot | null | undefined,
  ) => string;
  montarHistoricoParaEnvio: (
    mensagens: MobileChatMessage[],
  ) => Array<{ papel: "usuario" | "assistente"; texto: string }>;
  criarMensagemAssistenteServidor: (
    resposta: MobileChatSendResult,
  ) => MobileChatMessage | null;
  carregarConversaAtual: () => Promise<void>;
  carregarConversaPorLaudoId?: (laudoId: number) => Promise<void>;
  carregarListaLaudos: () => Promise<void>;
  erroSugereModoOffline: (erro: unknown) => boolean;
  criarItemFilaOffline: (params: {
    channel: "chat";
    laudoId: number | null;
    text: string;
    title: string;
    attachment: ComposerAttachment | null;
    guidedInspectionDraft?: MobileGuidedInspectionDraftPayload | null;
    aiMode: MobileChatMode;
    aiSummary: string;
    aiMessagePrefix: string;
    aiLearningOptIn?: boolean;
    aiTone?: ChatAiRequestConfig["tone"];
  }) => TOfflineItem;
  onSetMensagem: (value: string) => void;
  onSetAnexoRascunho: (value: ComposerAttachment | null) => void;
  onSetErroConversa: (value: string) => void;
  onSetEnviandoMensagem: (value: boolean) => void;
  onApplyOptimisticMessage: (
    mensagem: MobileChatMessage,
    modoAtivo: MobileChatMode,
  ) => void;
  onApplyAssistantResponse: (
    resposta: MobileChatSendResult,
    assistente: MobileChatMessage | null,
  ) => void;
  onReverterConversa: () => void;
  onQueueOfflineItem: (item: TOfflineItem) => void;
  onSetStatusOffline: () => void;
  onRestoreDraft: (texto: string, anexo: ComposerAttachment | null) => void;
}

interface SendMesaMessageFlowParams<TOfflineItem> {
  mensagemMesa: string;
  anexoAtual: ComposerAttachment | null;
  referenciaMensagemId: number | null;
  clientMessageId?: string | null;
  conversa: MesaConversationSnapshot;
  mensagensMesa: MobileMesaMessage[];
  sessionAccessToken: string;
  sessionUserId: number | null;
  statusApi: string;
  carregarListaLaudos: () => Promise<void>;
  erroSugereModoOffline: (erro: unknown) => boolean;
  textoFallbackAnexo: (anexo: ComposerAttachment | null) => string;
  criarItemFilaOffline: (params: {
    channel: "mesa";
    laudoId: number;
    text: string;
    title: string;
    attachment: ComposerAttachment | null;
    referenceMessageId: number | null;
    clientMessageId?: string | null;
  }) => TOfflineItem;
  atualizarResumoLaudoAtual: (resposta: MobileMesaSendResponse) => void;
  onSetMensagemMesa: (value: string) => void;
  onSetAnexoMesaRascunho: (value: ComposerAttachment | null) => void;
  onSetErroMesa: (value: string) => void;
  onSetEnviandoMesa: (value: boolean) => void;
  onSetMensagensMesa: (
    updater: (estadoAtual: MobileMesaMessage[]) => MobileMesaMessage[],
  ) => void;
  onSetMensagensMesaSnapshot: (snapshot: MobileMesaMessage[]) => void;
  onQueueOfflineItem: (item: TOfflineItem) => void;
  onSetStatusOffline: () => void;
  onRestoreDraft: (texto: string, anexo: ComposerAttachment | null) => void;
  onLimparReferenciaMesaAtiva: () => void;
  onSetLaudoMesaCarregado: (laudoId: number) => void;
}

export function criarClientMessageIdMesa(): string {
  return `mesa:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function resolverAnexoUploadUnico(anexo: ComposerAttachment) {
  if (anexo.kind === "image_set") {
    const primeiraImagem = anexo.imagens[0];
    return primeiraImagem
      ? {
          fileUri: primeiraImagem.fileUri,
          nome: primeiraImagem.label,
          mimeType: primeiraImagem.mimeType,
        }
      : null;
  }
  if (anexo.kind === "image") {
    return {
      fileUri: anexo.fileUri,
      nome: anexo.label,
      mimeType: anexo.mimeType,
    };
  }
  return {
    fileUri: anexo.fileUri,
    nome: anexo.nomeDocumento,
    mimeType: anexo.mimeType,
  };
}

function criarAnexoOtimista(
  anexo: ComposerAttachment | null,
): MobileAttachment[] | undefined {
  if (!anexo) {
    return undefined;
  }

  if (anexo.kind === "image") {
    return [
      {
        label: anexo.label,
        nome: anexo.label,
        nome_original: anexo.label,
        mime_type: anexo.mimeType,
        categoria: "imagem",
        eh_imagem: true,
        local_preview_uri: anexo.previewUri,
        local_uri: anexo.fileUri,
      },
    ];
  }

  if (anexo.kind === "image_set") {
    return anexo.imagens.map((imagem) => ({
      label: imagem.label,
      nome: imagem.label,
      nome_original: imagem.label,
      mime_type: imagem.mimeType,
      categoria: "imagem",
      eh_imagem: true,
      local_preview_uri: imagem.previewUri,
      local_uri: imagem.fileUri,
    }));
  }

  return [
    {
      label: anexo.label,
      nome: anexo.nomeDocumento,
      nome_original: anexo.nomeDocumento,
      mime_type: anexo.mimeType,
      categoria: "documento",
      eh_imagem: false,
      local_uri: anexo.fileUri,
    },
  ];
}

export async function sendInspectorMessageFlow<TOfflineItem>({
  mensagem,
  anexoAtual,
  snapshotConversa,
  guidedInspectionDraft,
  aiRequestConfig,
  sessionAccessToken,
  statusApi,
  podeEditarConversaNoComposer,
  textoFallbackAnexo,
  inferirSetorConversa,
  montarHistoricoParaEnvio,
  criarMensagemAssistenteServidor,
  carregarConversaAtual,
  carregarConversaPorLaudoId,
  carregarListaLaudos,
  erroSugereModoOffline,
  criarItemFilaOffline,
  onSetMensagem,
  onSetAnexoRascunho,
  onSetErroConversa,
  onSetEnviandoMensagem,
  onApplyOptimisticMessage,
  onApplyAssistantResponse,
  onReverterConversa,
  onQueueOfflineItem,
  onSetStatusOffline,
  onRestoreDraft,
}: SendInspectorMessageFlowParams<TOfflineItem>) {
  const texto = mensagem.trim();
  if (!texto && !anexoAtual) {
    return;
  }

  if (!podeEditarConversaNoComposer(snapshotConversa)) {
    onSetErroConversa(
      "Laudo em modo leitura. Reabra para enviar nova mensagem.",
    );
    return;
  }

  const textoExibicao = texto || textoFallbackAnexo(anexoAtual);
  const modoAtivo = aiRequestConfig.mode;
  const setorAtivo = inferirSetorConversa(snapshotConversa);

  const mensagemOtimista: MobileChatMessage = {
    id: Date.now(),
    papel: "usuario",
    texto: textoExibicao,
    tipo: "user",
    modo: modoAtivo,
    anexos: criarAnexoOtimista(anexoAtual),
  };

  onSetMensagem("");
  onSetAnexoRascunho(null);
  onSetErroConversa("");
  onSetEnviandoMensagem(true);
  onApplyOptimisticMessage(mensagemOtimista, modoAtivo);

  try {
    let dadosImagem = "";
    let dadosImagens: string[] = [];
    let textoDocumento = "";
    let nomeDocumento = "";

    if (anexoAtual?.kind === "image") {
      dadosImagem = anexoAtual.dadosImagem;
      dadosImagens = [anexoAtual.dadosImagem];
    } else if (anexoAtual?.kind === "image_set") {
      dadosImagens = anexoAtual.imagens.map((imagem) => imagem.dadosImagem);
      dadosImagem = dadosImagens[0] || "";
    } else if (anexoAtual?.kind === "document") {
      if (anexoAtual.textoDocumento) {
        textoDocumento = anexoAtual.textoDocumento;
        nomeDocumento = anexoAtual.nomeDocumento;
      } else {
        const documento = await uploadDocumentoChatMobile(sessionAccessToken, {
          uri: anexoAtual.fileUri,
          nome: anexoAtual.nomeDocumento,
          mimeType: anexoAtual.mimeType,
        });
        textoDocumento = documento.texto;
        nomeDocumento = documento.nome;
      }
    }

    const attachmentKind =
      anexoAtual?.kind === "image" || anexoAtual?.kind === "image_set"
        ? "image"
        : anexoAtual?.kind === "document"
          ? "document"
          : "none";

    const respostaChat = await enviarMensagemChatMobile(sessionAccessToken, {
      mensagem: texto,
      preferenciasIaMobile: aiRequestConfig.messagePrefix,
      dadosImagem,
      dadosImagens,
      setor: setorAtivo,
      textoDocumento,
      nomeDocumento,
      laudoId: snapshotConversa?.laudoId ?? null,
      iniciarLaudo: !snapshotConversa?.laudoId,
      modo: modoAtivo,
      learningOptIn: aiRequestConfig.learningOptIn,
      tone: aiRequestConfig.tone,
      guidedInspectionDraft: guidedInspectionDraft
        ? guidedInspectionDraftToMobilePayload(guidedInspectionDraft)
        : null,
      guidedInspectionContext: buildGuidedInspectionMessageContext(
        guidedInspectionDraft,
        attachmentKind,
      ),
      historico: montarHistoricoParaEnvio(snapshotConversa?.mensagens || []),
    });

    const mensagemAssistenteServidor =
      criarMensagemAssistenteServidor(respostaChat);
    onApplyAssistantResponse(respostaChat, mensagemAssistenteServidor);
    if (anexoAtual?.kind !== "image" && anexoAtual?.kind !== "image_set") {
      const laudoIdParaRecarregar =
        respostaChat.laudoId ?? snapshotConversa?.laudoId ?? null;
      if (laudoIdParaRecarregar && carregarConversaPorLaudoId) {
        await carregarConversaPorLaudoId(laudoIdParaRecarregar);
      } else if (snapshotConversa?.laudoId) {
        await carregarConversaAtual();
      }
    }
    await carregarListaLaudos();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível enviar a mensagem do inspetor.";
    const podeEnfileirar = Boolean(
      (texto.trim() || anexoAtual) &&
      (statusApi === "offline" || erroSugereModoOffline(error)),
    );

    onReverterConversa();
    if (podeEnfileirar) {
      const itemFila = criarItemFilaOffline({
        channel: "chat",
        laudoId: snapshotConversa?.laudoId ?? null,
        text: texto,
        title: snapshotConversa?.laudoCard?.titulo || "Nova inspeção",
        attachment: anexoAtual,
        guidedInspectionDraft: guidedInspectionDraft
          ? guidedInspectionDraftToMobilePayload(guidedInspectionDraft)
          : null,
        aiMode: modoAtivo,
        aiSummary: aiRequestConfig.summaryLabel,
        aiMessagePrefix: aiRequestConfig.messagePrefix,
        aiLearningOptIn: aiRequestConfig.learningOptIn,
        aiTone: aiRequestConfig.tone,
      });
      onQueueOfflineItem(itemFila);
      void registrarEventoObservabilidade({
        kind: "offline_queue",
        name: "offline_queue_enqueue",
        ok: true,
        count: 1,
        detail: "chat",
      });
      onSetErroConversa(
        "Sem conexão estável. O envio foi guardado na fila local.",
      );
      onSetStatusOffline();
    } else {
      onRestoreDraft(texto, anexoAtual);
      onSetErroConversa(message);
    }
  } finally {
    onSetEnviandoMensagem(false);
  }
}

export async function sendMesaMessageFlow<TOfflineItem>({
  mensagemMesa,
  anexoAtual,
  referenciaMensagemId,
  clientMessageId,
  conversa,
  mensagensMesa,
  sessionAccessToken,
  sessionUserId,
  statusApi,
  carregarListaLaudos,
  erroSugereModoOffline,
  textoFallbackAnexo,
  criarItemFilaOffline,
  atualizarResumoLaudoAtual,
  onSetMensagemMesa,
  onSetAnexoMesaRascunho,
  onSetErroMesa,
  onSetEnviandoMesa,
  onSetMensagensMesa,
  onSetMensagensMesaSnapshot,
  onQueueOfflineItem,
  onSetStatusOffline,
  onRestoreDraft,
  onLimparReferenciaMesaAtiva,
  onSetLaudoMesaCarregado,
}: SendMesaMessageFlowParams<TOfflineItem>) {
  const texto = mensagemMesa.trim();
  const clientMessageIdAtivo = String(
    clientMessageId || criarClientMessageIdMesa(),
  ).trim();

  if ((!texto && !anexoAtual) || !conversa.laudoId || !conversa.permiteEdicao) {
    return;
  }

  const textoExibicao = texto || textoFallbackAnexo(anexoAtual);
  const anexosOtimistas = criarAnexoOtimista(anexoAtual);
  const mensagemOtimista: MobileMesaMessage = {
    id: Date.now(),
    laudo_id: conversa.laudoId,
    tipo: "humano_insp",
    item_kind: "whisper",
    message_kind: "inspector_whisper",
    pendency_state: "not_applicable",
    texto: textoExibicao,
    remetente_id: sessionUserId,
    data: "Agora",
    criado_em_iso: new Date().toISOString(),
    lida: true,
    resolvida_em: "",
    resolvida_em_label: "",
    resolvida_por_nome: "",
    entrega_status: "queued",
    client_message_id: clientMessageIdAtivo,
    referencia_mensagem_id: referenciaMensagemId || undefined,
    anexos: anexosOtimistas,
  };

  onSetMensagemMesa("");
  onSetAnexoMesaRascunho(null);
  onSetErroMesa("");
  onSetEnviandoMesa(true);
  onSetMensagensMesa((estadoAtual) => [...estadoAtual, mensagemOtimista]);

  try {
    const anexoUpload = anexoAtual
      ? resolverAnexoUploadUnico(anexoAtual)
      : null;
    const resposta = anexoAtual
      ? await enviarAnexoMesaMobile(sessionAccessToken, conversa.laudoId, {
          uri: anexoUpload?.fileUri || "",
          nome: anexoUpload?.nome || "anexo",
          mimeType: anexoUpload?.mimeType || "application/octet-stream",
          texto,
          referenciaMensagemId,
          clientMessageId: clientMessageIdAtivo,
        })
      : await enviarMensagemMesaMobile(
          sessionAccessToken,
          conversa.laudoId,
          texto,
          referenciaMensagemId,
          clientMessageIdAtivo,
        );

    onSetMensagensMesa((estadoAtual) => {
      const semOtimista = estadoAtual.filter(
        (item) =>
          item.id !== mensagemOtimista.id &&
          item.id !== resposta.mensagem.id &&
          item.client_message_id !== resposta.mensagem.client_message_id,
      );
      const mensagemResposta =
        (anexoAtual?.kind === "image" || anexoAtual?.kind === "image_set") &&
        !resposta.mensagem.anexos?.length
          ? { ...resposta.mensagem, anexos: anexosOtimistas }
          : resposta.mensagem;
      return [...semOtimista, mensagemResposta].sort((a, b) => a.id - b.id);
    });

    atualizarResumoLaudoAtual(resposta);
    onLimparReferenciaMesaAtiva();
    onSetLaudoMesaCarregado(conversa.laudoId);
    await carregarListaLaudos();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível responder à mesa.";
    const podeEnfileirar = Boolean(
      (texto.trim() || anexoAtual) &&
      (statusApi === "offline" || erroSugereModoOffline(error)),
    );

    onSetMensagensMesaSnapshot(mensagensMesa);
    if (podeEnfileirar) {
      const itemFila = criarItemFilaOffline({
        channel: "mesa",
        laudoId: conversa.laudoId,
        text: texto,
        title: conversa.laudoCard?.titulo || `Laudo #${conversa.laudoId}`,
        attachment: anexoAtual,
        referenceMessageId: referenciaMensagemId,
        clientMessageId: clientMessageIdAtivo,
      });
      onQueueOfflineItem(itemFila);
      void registrarEventoObservabilidade({
        kind: "offline_queue",
        name: "offline_queue_enqueue",
        ok: true,
        count: 1,
        detail: "mesa",
      });
      onSetErroMesa(
        "Sem conexão estável. O envio para a mesa ficou guardado na fila local.",
      );
      onSetStatusOffline();
    } else {
      onRestoreDraft(texto, anexoAtual);
      onSetErroMesa(message);
    }
  } finally {
    onSetEnviandoMesa(false);
  }
}
