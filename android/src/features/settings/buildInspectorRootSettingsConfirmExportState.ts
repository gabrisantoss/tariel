import {
  compartilharTextoExportado,
  ehOpcaoValida,
  serializarPayloadExportacao,
} from "../common/appSupportHelpers";
import {
  buildMobileAccessSummary,
  buildMobileIdentityRuntimeNote,
  buildMobilePortalSwitchSummary,
  buildMobileWorkspaceSummary,
} from "../common/mobileUserAccess";
import { criarConversaNova } from "../chat/conversationHelpers";
import { limparCachePorPrivacidade } from "../common/inspectorLocalPersistence";
import { reautenticacaoAindaValida } from "./reauth";
import { AI_MODEL_OPTIONS } from "../InspectorMobileApp.constants";
import { useInspectorRootSettingsSurface } from "./useInspectorRootSettingsSurface";
import type { InspectorRootBootstrap } from "../useInspectorRootBootstrap";

interface BuildInspectorRootSettingsConfirmExportStateInput {
  bootstrap: InspectorRootBootstrap;
}

export function buildInspectorRootSettingsConfirmExportState({
  bootstrap,
}: BuildInspectorRootSettingsConfirmExportStateInput): Parameters<
  typeof useInspectorRootSettingsSurface
>[0]["uiState"]["confirmExportState"] {
  const localState = bootstrap.localState;
  const settingsBindings = bootstrap.settingsBindings;
  const settingsSupportState = bootstrap.settingsSupportState;
  const sessionFlow = bootstrap.sessionFlow;
  const shellSupport = bootstrap.shellSupport;
  const reauthActions = bootstrap.reauthActions;
  const sessionUser = sessionFlow.state.session?.bootstrap.usuario;

  return {
    accountState: {
      email: sessionFlow.state.email,
      emailAtualConta: settingsBindings.account.emailAtualConta,
      perfilExibicao: settingsBindings.account.perfilExibicao,
      perfilNome: settingsBindings.account.perfilNome,
      planoAtual: settingsSupportState.presentationState.planoAtual,
      resumoContaAcesso: buildMobileAccessSummary(sessionUser),
      identityRuntimeNote: buildMobileIdentityRuntimeNote(sessionUser),
      portalContinuationSummary: buildMobilePortalSwitchSummary(sessionUser),
      workspaceResumoConfiguracao: buildMobileWorkspaceSummary(sessionUser),
    },
    actionState: {
      abrirFluxoReautenticacao: reauthActions.abrirFluxoReautenticacao,
      abrirSheetConfiguracao:
        settingsSupportState.navigationActions.abrirSheetConfiguracao,
      compartilharTextoExportado,
      fecharConfirmacaoConfiguracao:
        settingsSupportState.navigationActions.fecharConfirmacaoConfiguracao,
      fecharSheetConfiguracao:
        settingsSupportState.navigationActions.fecharSheetConfiguracao,
      onCreateNewConversation: criarConversaNova,
      onIsValidAiModel: (value) => ehOpcaoValida(value, AI_MODEL_OPTIONS),
      onRegistrarEventoSegurancaLocal:
        settingsSupportState.registrarEventoSegurancaLocal,
      reautenticacaoAindaValida,
      serializarPayloadExportacao,
    },
    collectionState: {
      cacheLeitura: localState.cacheLeitura,
      conversaAtual: localState.conversa,
      eventosSeguranca: settingsSupportState.presentationState.eventosSeguranca,
      filaOffline: localState.filaOffline,
      filaSuporteLocal: settingsSupportState.presentationState.filaSuporteLocal,
      historicoOcultoIds: localState.historicoOcultoIds,
      integracoesExternas:
        settingsSupportState.presentationState.integracoesExternas,
      laudosDisponiveis: localState.laudosDisponiveis,
      laudosFixadosIds: localState.laudosFixadosIds,
      mensagemMesaRascunho: localState.mensagemMesa,
      mensagemRascunho: localState.mensagem,
      mensagensMesa: localState.mensagensMesa,
      notificacoes: localState.notificacoes,
    },
    draftState: {
      confirmSheet: settingsSupportState.navigationState.confirmSheet,
      confirmTextDraft: settingsSupportState.navigationState.confirmTextDraft,
      modeloIa: settingsBindings.ai.modeloIa,
      reautenticacaoExpiraEm:
        settingsSupportState.presentationState.reautenticacaoExpiraEm,
    },
    preferenceState: {
      compartilharMelhoriaIa: settingsBindings.ai.compartilharMelhoriaIa,
      corDestaque: settingsBindings.appearance.corDestaque,
      densidadeInterface: settingsBindings.appearance.densidadeInterface,
      economiaDados: settingsBindings.system.economiaDados,
      emailsAtivos: settingsBindings.notifications.emailsAtivos,
      estiloResposta: settingsBindings.ai.estiloResposta,
      idiomaResposta: settingsBindings.ai.idiomaResposta,
      memoriaIa: settingsBindings.ai.memoriaIa,
      mostrarConteudoNotificacao:
        settingsBindings.notifications.mostrarConteudoNotificacao,
      mostrarSomenteNovaMensagem:
        settingsBindings.notifications.mostrarSomenteNovaMensagem,
      settingsDocument: settingsBindings.store.settingsState,
      notificaPush: settingsBindings.notifications.notificaPush,
      notificaRespostas: settingsBindings.notifications.notificaRespostas,
      ocultarConteudoBloqueado:
        settingsBindings.notifications.ocultarConteudoBloqueado,
      retencaoDados: settingsBindings.dataControls.retencaoDados,
      salvarHistoricoConversas:
        settingsBindings.dataControls.salvarHistoricoConversas,
      tamanhoFonte: settingsBindings.appearance.tamanhoFonte,
      temaApp: settingsBindings.appearance.temaApp,
      usoBateria: settingsBindings.system.usoBateria,
      vibracaoAtiva: settingsBindings.notifications.vibracaoAtiva,
    },
    settersState: {
      limparCachePorPrivacidade,
      onSetAnexoMesaRascunho: localState.setAnexoMesaRascunho,
      onSetAnexoRascunho: localState.setAnexoRascunho,
      onSetBuscaHistorico: shellSupport.setBuscaHistorico,
      onSetCacheLeitura: localState.setCacheLeitura,
      onSetConversa: localState.setConversa,
      onSetLaudosDisponiveis: localState.setLaudosDisponiveis,
      onSetMensagem: localState.setMensagem,
      onSetMensagemMesa: localState.setMensagemMesa,
      onSetMensagensMesa: localState.setMensagensMesa,
      onSetModeloIa: settingsBindings.ai.setModeloIa,
      onSetEstiloResposta: settingsBindings.ai.setEstiloResposta,
      onSetIdiomaResposta: settingsBindings.ai.setIdiomaResposta,
      onSetNotificacoes: localState.setNotificacoes,
      onSetPreviewAnexoImagem: shellSupport.setPreviewAnexoImagem,
    },
  };
}
