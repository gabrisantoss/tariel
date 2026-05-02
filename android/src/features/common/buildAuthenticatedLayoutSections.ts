import { TARIEL_APP_MARK } from "../InspectorMobileApp.constants";
import type {
  AuthenticatedLayoutInput,
  HistoryDrawerPanelMobileProps,
  ThreadContextCardPanelProps,
  ThreadHeaderControlsPanelProps,
} from "./inspectorUiBuilderTypes";
import type { ThreadComposerPanelProps } from "../chat/ThreadComposerPanel";
import type { ThreadConversationPaneProps } from "../chat/ThreadConversationPane";
import {
  hasCaseSurfaceAction,
  hasFormalCaseWorkflow,
} from "../chat/caseLifecycle";
import { guidedInspectionEmptyStateImageSource } from "../chat/guidedInspectionEmptyStateAssets";
import { guidedInspectionAccentColorForTemplate } from "../chat/guidedInspectionPresentation";

export function buildHistoryDrawerPanelProps(
  input: AuthenticatedLayoutInput,
): HistoryDrawerPanelMobileProps {
  return {
    brandMarkSource: TARIEL_APP_MARK,
    buscaHistorico: input.buscaHistorico,
    conversasOcultasTotal: input.conversasOcultasTotal,
    darkMode: input.settingsPrintDarkMode,
    historicoAgrupadoFinal: input.historicoAgrupadoFinal,
    historicoDrawerX: input.historicoDrawerX,
    historicoVazioTexto: input.historicoVazioTexto,
    historicoVazioTitulo: input.historicoVazioTitulo,
    historyDrawerPanResponder: input.historyDrawerPanResponder,
    laudoSelecionadoId: input.laudoSelecionadoId,
    onBuscaHistoricoChange: input.setBuscaHistorico,
    onCloseHistory: () => input.fecharHistorico({ limparBusca: true }),
    onHistorySearchFocusChange: input.setHistorySearchFocused,
    onExcluirConversaHistorico: (item) =>
      input.handleExcluirConversaHistorico(item),
    onSelecionarHistorico: (item) => {
      void input.handleSelecionarHistorico(item);
    },
  };
}

export function buildThreadComposerPanelProps(
  input: AuthenticatedLayoutInput,
): Omit<ThreadComposerPanelProps, "visible"> {
  const canReopen = hasCaseSurfaceAction({
    conversation: input.conversaAtiva,
    action: "chat_reopen",
  });
  const guidedAccentColor =
    !input.vendoMesa && input.guidedInspectionDraft
      ? guidedInspectionAccentColorForTemplate(
          input.guidedInspectionDraft.templateKey,
        )
      : null;

  return {
    accentColor: guidedAccentColor || input.accentColor,
    anexoMesaRascunho: input.anexoMesaRascunho,
    anexoRascunho: input.anexoRascunho,
    canReopen,
    darkMode: input.settingsPrintDarkMode,
    dynamicComposerInputStyle: input.dynamicComposerInputStyle,
    enviandoMensagem: input.enviandoMensagem,
    enviandoMesa: input.enviandoMesa,
    erroMesa: input.erroMesa,
    filaOfflineTotal: input.filaOfflineOrdenada.length,
    keyboardVisible: input.keyboardVisible,
    mensagem: input.mensagem,
    mensagemMesa: input.mensagemMesa,
    mensagemMesaReferenciaAtiva: input.mensagemMesaReferenciaAtiva,
    onAbrirSeletorAnexo: input.handleAbrirSeletorAnexo,
    onCloseQualityGate: input.handleFecharQualityGate,
    onClearAnexoMesaRascunho: () => input.setAnexoMesaRascunho(null),
    onClearAnexoRascunho: () => input.setAnexoRascunho(null),
    onConfirmQualityGate: () => {
      void input.handleConfirmarQualityGate();
    },
    onEnviarMensagem: () => {
      void input.handleEnviarMensagem();
    },
    onEnviarMensagemMesa: () => {
      void input.handleEnviarMensagemMesa();
    },
    onLimparReferenciaMesaAtiva: input.limparReferenciaMesaAtiva,
    onReopen: input.handleReabrir,
    onSincronizarFilaOffline: input.onSincronizarFilaOffline,
    onSetMensagem: input.setMensagem,
    onSetMensagemMesa: input.setMensagemMesa,
    onSetQualityGateReason: input.setQualityGateReason,
    placeholderComposer: input.placeholderComposer,
    placeholderMesa: input.placeholderMesa,
    podeAbrirAnexosChat: input.podeAbrirAnexosChat,
    podeAbrirAnexosMesa: input.podeAbrirAnexosMesa,
    podeAcionarComposer: input.podeAcionarComposer,
    podeEnviarComposer: input.podeEnviarComposer,
    podeEnviarMesa: input.podeEnviarMesa,
    podeUsarComposerMesa: input.podeUsarComposerMesa,
    qualityGateLoading: input.qualityGateLoading,
    qualityGateNotice: input.qualityGateNotice,
    qualityGatePayload: input.qualityGatePayload,
    qualityGateReason: input.qualityGateReason,
    qualityGateSubmitting: input.qualityGateSubmitting,
    qualityGateVisible: input.qualityGateVisible,
    showVoiceInputAction: input.showVoiceInputAction,
    sincronizandoFilaOffline: input.sincronizandoFilaOffline,
    statusApi: input.statusApi,
    onVoiceInputPress: input.onVoiceInputPress,
    voiceInputEnabled: input.voiceInputEnabled,
    composerNotice: input.composerNotice,
    vendoMesa: input.vendoMesa,
  };
}

export function buildThreadContextCardProps(
  input: AuthenticatedLayoutInput,
): ThreadContextCardPanelProps {
  return {
    accentColor: input.accentColor,
    actions: input.threadActions,
    chips: input.chipsContextoThread,
    darkMode: input.settingsPrintDarkMode,
    description: input.laudoContextDescription,
    defaultExpanded: input.vendoFinalizacao,
    densityScale: input.densityScale,
    fontScale: input.fontScale,
    guidedTemplatesVisible: input.guidedTemplatesVisible,
    eyebrow:
      input.threadContextLayout === "entry_chooser"
        ? ""
        : input.vendoFinalizacao
          ? "finalização do caso"
          : input.vendoMesa
            ? "mesa avaliadora"
            : "chat do inspetor",
    insights: input.threadInsights,
    layout: input.threadContextLayout,
    onGuidedTemplatesVisibleChange: input.onGuidedTemplatesVisibleChange,
    spotlight: input.threadSpotlight,
    title: input.laudoContextTitle,
  };
}

export function buildThreadConversationPaneProps(
  input: AuthenticatedLayoutInput,
): ThreadConversationPaneProps {
  const guidedAccentColor =
    !input.vendoMesa && input.guidedInspectionDraft
      ? guidedInspectionAccentColorForTemplate(
          input.guidedInspectionDraft.templateKey,
        )
      : null;

  return {
    accentColor: input.accentColor,
    anexoAbrindoChave: input.anexoAbrindoChave,
    brandMarkSource: TARIEL_APP_MARK,
    carregandoConversa: input.carregandoConversa && !input.conversaAtiva,
    carregandoMesa: input.carregandoMesa,
    caseLifecycleStatus: input.conversaAtiva?.caseLifecycleStatus,
    caseWorkflowMode: input.conversaAtiva?.caseWorkflowMode,
    entryModeEffective:
      input.conversaAtiva?.entryModeEffective ||
      input.conversaAtiva?.laudoCard?.entry_mode_effective,
    activeOwnerRole: input.conversaAtiva?.activeOwnerRole,
    allowedNextLifecycleStatuses:
      input.conversaAtiva?.allowedNextLifecycleStatuses,
    allowedLifecycleTransitions:
      input.conversaAtiva?.allowedLifecycleTransitions,
    allowedSurfaceActions: input.conversaAtiva?.allowedSurfaceActions,
    mesaAcessoPermitido: input.mesaAcessoPermitido,
    conversaPermiteEdicao: Boolean(input.conversaAtiva?.permiteEdicao),
    conversaVazia: input.conversaVazia,
    darkMode: input.settingsPrintDarkMode,
    dynamicMessageBubbleStyle: input.dynamicMessageBubbleStyle,
    dynamicMessageTextStyle: input.dynamicMessageTextStyle,
    emptyStateImageAccessibilityLabel: input.guidedInspectionDraft
      ? `Ícone ${input.guidedInspectionDraft.templateLabel}`
      : undefined,
    emptyStateImageSource: guidedInspectionEmptyStateImageSource(
      input.guidedInspectionDraft?.templateKey,
    ),
    emptyStateTitle:
      input.guidedInspectionDraft?.templateLabel ||
      "Olá, sou Tariel. Como posso te ajudar?",
    enviandoMensagem: input.enviandoMensagem,
    keyboardVisible: input.keyboardVisible,
    mesaDisponivel: input.mesaDisponivel,
    mesaIndisponivelDescricao: input.mesaIndisponivelDescricao,
    mesaIndisponivelTitulo: input.mesaIndisponivelTitulo,
    mensagemChatDestacadaId: input.mensagemChatDestacadaId,
    mensagensMesa: input.mensagensMesa,
    mensagensVisiveis: input.mensagensVisiveis,
    nomeUsuarioExibicao: input.nomeUsuarioExibicao,
    obterResumoReferenciaMensagem: input.obterResumoReferenciaMensagem,
    onAbrirAnexo: input.handleAbrirAnexo,
    onAbrirMesaTab: () => input.setAbaAtiva("mesa"),
    onAbrirReferenciaNoChat: (id: number) => {
      void input.abrirReferenciaNoChat(id);
    },
    onAbrirQualityGate: input.handleAbrirQualityGate,
    onDefinirReferenciaMesaAtiva: input.definirReferenciaMesaAtiva,
    onExecutarComandoRevisaoMobile: (payload) =>
      input.handleExecutarComandoRevisaoMobile(payload),
    onRegistrarLayoutMensagemChat: input.registrarLayoutMensagemChat,
    onUsarPerguntaPreLaudo: input.handleUsarPerguntaPreLaudo,
    reportPackDraft: input.conversaAtiva?.reportPackDraft || null,
    reviewPackage: input.conversaAtiva?.reviewPackage || null,
    reviewCommandBusy: input.enviandoMesa,
    scrollRef: input.scrollRef,
    sessionAccessToken: input.sessionAccessToken,
    threadFrameAccentColor: guidedAccentColor,
    threadKeyboardPaddingBottom: input.threadKeyboardPaddingBottom,
    toAttachmentKey: input.chaveAnexo,
    vendoMesa: input.vendoMesa,
  };
}

export function buildThreadHeaderControlsProps(
  input: AuthenticatedLayoutInput,
): ThreadHeaderControlsPanelProps {
  const finalizacaoDisponivel = Boolean(
    input.conversaAtiva?.laudoId &&
    hasFormalCaseWorkflow({
      allowedSurfaceActions: input.conversaAtiva?.allowedSurfaceActions,
      conversation: input.conversaAtiva,
      entryModeEffective:
        input.conversaAtiva?.entryModeEffective ||
        input.conversaAtiva?.laudoCard?.entry_mode_effective,
      lifecycleStatus: input.conversaAtiva?.caseLifecycleStatus,
      workflowMode: input.conversaAtiva?.caseWorkflowMode,
    }),
  );

  return {
    accentColor: input.accentColor,
    chatHasActiveCase: Boolean(input.conversaAtiva?.laudoId),
    darkMode: input.settingsPrintDarkMode,
    finalizacaoDisponivel,
    filaOfflineTotal: input.filaOfflineOrdenada.length,
    densityScale: input.densityScale,
    fontScale: input.fontScale,
    headerSafeTopInset: input.headerSafeTopInset,
    keyboardVisible: input.keyboardVisible,
    mesaAcessoPermitido: input.mesaAcessoPermitido,
    notificacoesMesaLaudoAtual: input.notificacoesMesaLaudoAtual,
    notificacoesNaoLidas: input.notificacoesNaoLidas,
    onOpenNewChat: () => {
      void input.handleAbrirNovoChat();
    },
    onOpenChatTab: () => input.setAbaAtiva("chat"),
    onOpenFinalizarTab: () => input.setAbaAtiva("finalizar"),
    onOpenHistory: input.handleAbrirHistorico,
    onOpenMesaTab: () => input.setAbaAtiva("mesa"),
    onOpenSettings: input.handleAbrirConfiguracoes,
    vendoFinalizacao: input.vendoFinalizacao,
    vendoMesa: input.vendoMesa,
  };
}
