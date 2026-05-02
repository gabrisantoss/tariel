import type { InspectorBaseDerivedState } from "../common/buildInspectorBaseDerivedState";
import {
  buildMobileAccessSummary,
  buildMobileHelpTopicsSummary,
  buildMobileIdentityRuntimeNote,
  buildMobileOperationalFootprintSummary,
  resolveMobilePortalSwitchLinks,
} from "../common/mobileUserAccess";
import { buildSettingsSheetBodyRenderer } from "./buildSettingsSheetBodyRenderer";
import { buildSettingsSheetConfirmAction } from "./buildSettingsSheetConfirmAction";

type SettingsSheetBodyParams = Parameters<
  typeof buildSettingsSheetBodyRenderer
>[0];
type SettingsSheetConfirmParams = Parameters<
  typeof buildSettingsSheetConfirmAction
>[0];

type InspectorSettingsSheetBaseState = Pick<
  InspectorBaseDerivedState,
  | "artigosAjudaFiltrados"
  | "integracoesConectadasTotal"
  | "integracoesDisponiveisTotal"
  | "resumoAtualizacaoApp"
  | "resumoFilaSuporteLocal"
  | "resumoSuporteApp"
  | "ultimaVerificacaoAtualizacaoLabel"
  | "workspaceResumoConfiguracao"
>;

interface BuildInspectorRootSettingsSheetPropsInput {
  accountState: Pick<
    SettingsSheetConfirmParams,
    | "contaTelefone"
    | "email"
    | "emailAtualConta"
    | "perfilExibicao"
    | "perfilFotoHint"
    | "perfilFotoUri"
    | "perfilNome"
    | "planoAtual"
    | "session"
    | "sessaoAtual"
    | "telefoneDraft"
  > &
    Pick<SettingsSheetBodyParams, "provedoresConectados">;
  actionsState: Pick<
    SettingsSheetBodyParams,
    | "formatarHorarioAtividade"
    | "formatarStatusReautenticacao"
    | "handleAlternarArtigoAjuda"
    | "handleAlternarIntegracaoExterna"
    | "onAbrirPortalContinuation"
    | "handleRemoverScreenshotBug"
    | "handleSelecionarEstiloResposta"
    | "handleSelecionarIdiomaResposta"
    | "handleSelecionarModeloIa"
    | "handleSelecionarScreenshotBug"
    | "handleSincronizarIntegracaoExterna"
    | "handleToggleBackupAutomatico"
    | "handleToggleSincronizacaoDispositivos"
    | "handleToggleUploadArquivos"
    | "onLicencas"
    | "onPoliticaPrivacidade"
    | "onTermosUso"
  > &
    Pick<
      SettingsSheetConfirmParams,
      | "compartilharTextoExportado"
      | "handleConfirmarSettingsSheetReauth"
      | "notificarConfiguracaoConcluida"
      | "onRegistrarEventoSegurancaLocal"
    > & {
      fecharSheetConfiguracao: () => void;
    };
  appState: {
    apiEnvironmentLabel: SettingsSheetBodyParams["apiEnvironmentLabel"];
    appBuildLabel: SettingsSheetBodyParams["appBuildLabel"];
    appName: SettingsSheetBodyParams["appName"];
    supportChannelLabel: SettingsSheetBodyParams["supportChannelLabel"];
  };
  backendState: Pick<
    SettingsSheetConfirmParams,
    | "enviarFotoPerfilNoBackend"
    | "enviarRelatoSuporteNoBackend"
    | "onAtualizarPerfilContaNoBackend"
    | "onAtualizarSenhaContaNoBackend"
    | "onPingApi"
    | "onUpdateAccountPhone"
  >;
  baseState: InspectorSettingsSheetBaseState;
  draftState: Pick<
    SettingsSheetBodyParams,
    | "artigoAjudaExpandidoId"
    | "autoUploadAttachments"
    | "backupAutomatico"
    | "bugAttachmentDraft"
    | "bugDescriptionDraft"
    | "bugEmailDraft"
    | "buscaAjuda"
    | "confirmarSenhaDraft"
    | "feedbackDraft"
    | "estiloResposta"
    | "idiomaResposta"
    | "integracaoSincronizandoId"
    | "integracoesExternas"
    | "modeloIa"
    | "nomeCompletoDraft"
    | "nomeExibicaoDraft"
    | "novaSenhaDraft"
    | "novoEmailDraft"
    | "reauthReason"
    | "reautenticacaoExpiraEm"
    | "retencaoDados"
    | "salvarHistoricoConversas"
    | "senhaAtualDraft"
    | "settingsSheet"
    | "sincronizacaoDispositivos"
    | "statusApi"
    | "statusAtualizacaoApp"
    | "ultimoTicketSuporte"
    | "uploadArquivosAtivo"
    | "wifiOnlySync"
  > &
    Pick<SettingsSheetConfirmParams, "cartaoAtual"> & {
      voiceLanguage?: SettingsSheetBodyParams["voiceLanguage"];
    };
  settersState: Pick<
    SettingsSheetConfirmParams,
    | "onSetBugAttachmentDraft"
    | "onSetBugDescriptionDraft"
    | "onSetBugEmailDraft"
    | "onSetCartaoAtual"
    | "onSetConfirmarSenhaDraft"
    | "onSetEmailAtualConta"
    | "onSetFeedbackDraft"
    | "onSetFilaSuporteLocal"
    | "onSetNomeCompletoDraft"
    | "onSetNomeExibicaoDraft"
    | "onSetNovaSenhaDraft"
    | "onSetPerfilExibicao"
    | "onSetPerfilFotoHint"
    | "onSetPerfilFotoUri"
    | "onSetPerfilNome"
    | "onSetPlanoAtual"
    | "onSetProvedoresConectados"
    | "onSetSenhaAtualDraft"
    | "onSetSession"
    | "onSetSettingsSheetLoading"
    | "onSetSettingsSheetNotice"
    | "onSetStatusApi"
    | "onSetStatusAtualizacaoApp"
    | "onSetTelefoneDraft"
    | "onSetUltimaVerificacaoAtualizacao"
  > &
    Pick<
      SettingsSheetBodyParams,
      | "onSetAutoUploadAttachments"
      | "onSetBuscaAjuda"
      | "onSetNovoEmailDraft"
      | "onSetWifiOnlySync"
    > & {
      onSetRetencaoDados: SettingsSheetBodyParams["handleSelecionarRetencaoDados"];
      onSetVoiceLanguage?: SettingsSheetBodyParams["handleSelecionarVoiceLanguage"];
    };
}

export function buildInspectorRootSettingsSheetProps({
  accountState,
  actionsState,
  appState,
  backendState,
  baseState,
  draftState,
  settersState,
}: BuildInspectorRootSettingsSheetPropsInput) {
  const sessionUser = accountState.session?.bootstrap.usuario;
  const resumoContaAcesso = buildMobileAccessSummary(sessionUser);
  const resumoOperacaoApp = buildMobileOperationalFootprintSummary(sessionUser);
  const identityRuntimeNote = buildMobileIdentityRuntimeNote(sessionUser);
  const portalContinuationLinks = resolveMobilePortalSwitchLinks(sessionUser);
  const topicosAjudaResumo = buildMobileHelpTopicsSummary(sessionUser);
  const handleSelecionarRetencaoDados: SettingsSheetBodyParams["handleSelecionarRetencaoDados"] =
    (value) => {
      settersState.onSetRetencaoDados(value);
      actionsState.fecharSheetConfiguracao();
    };
  const handleSelecionarVoiceLanguage: SettingsSheetBodyParams["handleSelecionarVoiceLanguage"] =
    (value) => {
      settersState.onSetVoiceLanguage?.(value);
      actionsState.fecharSheetConfiguracao();
    };

  const handleConfirmarSettingsSheet = buildSettingsSheetConfirmAction({
    bugAttachmentDraft: draftState.bugAttachmentDraft,
    bugDescriptionDraft: draftState.bugDescriptionDraft,
    bugEmailDraft: draftState.bugEmailDraft,
    cartaoAtual: draftState.cartaoAtual,
    compartilharTextoExportado: actionsState.compartilharTextoExportado,
    confirmarSenhaDraft: draftState.confirmarSenhaDraft,
    contaTelefone: accountState.contaTelefone,
    email: accountState.email,
    emailAtualConta: accountState.emailAtualConta,
    enviarFotoPerfilNoBackend: backendState.enviarFotoPerfilNoBackend,
    enviarRelatoSuporteNoBackend: backendState.enviarRelatoSuporteNoBackend,
    feedbackDraft: draftState.feedbackDraft,
    handleConfirmarSettingsSheetReauth:
      actionsState.handleConfirmarSettingsSheetReauth,
    nomeCompletoDraft: draftState.nomeCompletoDraft,
    nomeExibicaoDraft: draftState.nomeExibicaoDraft,
    notificarConfiguracaoConcluida: actionsState.notificarConfiguracaoConcluida,
    novaSenhaDraft: draftState.novaSenhaDraft,
    novoEmailDraft: draftState.novoEmailDraft,
    onAtualizarPerfilContaNoBackend:
      backendState.onAtualizarPerfilContaNoBackend,
    onAtualizarSenhaContaNoBackend: backendState.onAtualizarSenhaContaNoBackend,
    onPingApi: backendState.onPingApi,
    onRegistrarEventoSegurancaLocal:
      actionsState.onRegistrarEventoSegurancaLocal,
    onSetBugAttachmentDraft: settersState.onSetBugAttachmentDraft,
    onSetBugDescriptionDraft: settersState.onSetBugDescriptionDraft,
    onSetBugEmailDraft: settersState.onSetBugEmailDraft,
    onSetCartaoAtual: settersState.onSetCartaoAtual,
    onSetConfirmarSenhaDraft: settersState.onSetConfirmarSenhaDraft,
    onSetEmailAtualConta: settersState.onSetEmailAtualConta,
    onSetFeedbackDraft: settersState.onSetFeedbackDraft,
    onSetFilaSuporteLocal: settersState.onSetFilaSuporteLocal,
    onSetNomeCompletoDraft: settersState.onSetNomeCompletoDraft,
    onSetNomeExibicaoDraft: settersState.onSetNomeExibicaoDraft,
    onSetNovaSenhaDraft: settersState.onSetNovaSenhaDraft,
    onSetPerfilExibicao: settersState.onSetPerfilExibicao,
    onSetPerfilFotoHint: settersState.onSetPerfilFotoHint,
    onSetPerfilFotoUri: settersState.onSetPerfilFotoUri,
    onSetPerfilNome: settersState.onSetPerfilNome,
    onSetPlanoAtual: settersState.onSetPlanoAtual,
    onSetProvedoresConectados: settersState.onSetProvedoresConectados,
    onSetSenhaAtualDraft: settersState.onSetSenhaAtualDraft,
    onSetSession: settersState.onSetSession,
    onSetSettingsSheetLoading: settersState.onSetSettingsSheetLoading,
    onSetSettingsSheetNotice: settersState.onSetSettingsSheetNotice,
    onSetStatusApi: settersState.onSetStatusApi,
    onSetStatusAtualizacaoApp: settersState.onSetStatusAtualizacaoApp,
    onSetTelefoneDraft: settersState.onSetTelefoneDraft,
    onSetUltimaVerificacaoAtualizacao:
      settersState.onSetUltimaVerificacaoAtualizacao,
    onUpdateAccountPhone: backendState.onUpdateAccountPhone,
    perfilExibicao: accountState.perfilExibicao,
    perfilFotoHint: accountState.perfilFotoHint,
    perfilFotoUri: accountState.perfilFotoUri,
    perfilNome: accountState.perfilNome,
    planoAtual: accountState.planoAtual,
    senhaAtualDraft: draftState.senhaAtualDraft,
    session: accountState.session,
    sessaoAtual: accountState.sessaoAtual,
    settingsSheet: draftState.settingsSheet,
    statusApi: draftState.statusApi,
    telefoneDraft: accountState.telefoneDraft,
    workspaceResumoConfiguracao: baseState.workspaceResumoConfiguracao,
  });

  const renderSettingsSheetBody = buildSettingsSheetBodyRenderer({
    apiEnvironmentLabel: appState.apiEnvironmentLabel,
    appBuildLabel: appState.appBuildLabel,
    appName: appState.appName,
    resumoContaAcesso,
    resumoOperacaoApp,
    identityRuntimeNote,
    portalContinuationLinks,
    topicosAjudaResumo,
    artigoAjudaExpandidoId: draftState.artigoAjudaExpandidoId,
    artigosAjudaFiltrados: baseState.artigosAjudaFiltrados,
    bugAttachmentDraft: draftState.bugAttachmentDraft,
    bugDescriptionDraft: draftState.bugDescriptionDraft,
    bugEmailDraft: draftState.bugEmailDraft,
    buscaAjuda: draftState.buscaAjuda,
    cartaoAtual: draftState.cartaoAtual,
    confirmarSenhaDraft: draftState.confirmarSenhaDraft,
    email: accountState.email,
    emailAtualConta: accountState.emailAtualConta,
    feedbackDraft: draftState.feedbackDraft,
    formatarHorarioAtividade: actionsState.formatarHorarioAtividade,
    formatarStatusReautenticacao: actionsState.formatarStatusReautenticacao,
    handleAlternarArtigoAjuda: actionsState.handleAlternarArtigoAjuda,
    handleAlternarIntegracaoExterna:
      actionsState.handleAlternarIntegracaoExterna,
    handleRemoverScreenshotBug: actionsState.handleRemoverScreenshotBug,
    handleSelecionarEstiloResposta: actionsState.handleSelecionarEstiloResposta,
    handleSelecionarIdiomaResposta: actionsState.handleSelecionarIdiomaResposta,
    handleSelecionarModeloIa: actionsState.handleSelecionarModeloIa,
    handleSelecionarVoiceLanguage,
    handleSelecionarRetencaoDados,
    handleSelecionarScreenshotBug: actionsState.handleSelecionarScreenshotBug,
    handleSincronizarIntegracaoExterna:
      actionsState.handleSincronizarIntegracaoExterna,
    handleToggleBackupAutomatico: actionsState.handleToggleBackupAutomatico,
    handleToggleSincronizacaoDispositivos:
      actionsState.handleToggleSincronizacaoDispositivos,
    handleToggleUploadArquivos: actionsState.handleToggleUploadArquivos,
    integracaoSincronizandoId: draftState.integracaoSincronizandoId,
    integracoesConectadasTotal: baseState.integracoesConectadasTotal,
    integracoesDisponiveisTotal: baseState.integracoesDisponiveisTotal,
    integracoesExternas: draftState.integracoesExternas,
    autoUploadAttachments: draftState.autoUploadAttachments,
    backupAutomatico: draftState.backupAutomatico,
    modeloIa: draftState.modeloIa,
    estiloResposta: draftState.estiloResposta,
    idiomaResposta: draftState.idiomaResposta,
    voiceLanguage: draftState.voiceLanguage || "Sistema",
    nomeCompletoDraft: draftState.nomeCompletoDraft,
    nomeExibicaoDraft: draftState.nomeExibicaoDraft,
    novaSenhaDraft: draftState.novaSenhaDraft,
    novoEmailDraft: draftState.novoEmailDraft,
    onSetBugDescriptionDraft: settersState.onSetBugDescriptionDraft,
    onSetBugEmailDraft: settersState.onSetBugEmailDraft,
    onSetBuscaAjuda: settersState.onSetBuscaAjuda,
    onSetConfirmarSenhaDraft: settersState.onSetConfirmarSenhaDraft,
    onSetFeedbackDraft: settersState.onSetFeedbackDraft,
    onSetNomeCompletoDraft: settersState.onSetNomeCompletoDraft,
    onSetNomeExibicaoDraft: settersState.onSetNomeExibicaoDraft,
    onSetNovaSenhaDraft: settersState.onSetNovaSenhaDraft,
    onSetNovoEmailDraft: settersState.onSetNovoEmailDraft,
    onSetSenhaAtualDraft: settersState.onSetSenhaAtualDraft,
    onSetTelefoneDraft: settersState.onSetTelefoneDraft,
    onSetWifiOnlySync: settersState.onSetWifiOnlySync,
    perfilFotoHint: accountState.perfilFotoHint,
    perfilFotoUri: accountState.perfilFotoUri,
    planoAtual: accountState.planoAtual,
    provedoresConectados: accountState.provedoresConectados,
    reauthReason: draftState.reauthReason,
    reautenticacaoExpiraEm: draftState.reautenticacaoExpiraEm,
    resumoAtualizacaoApp: baseState.resumoAtualizacaoApp,
    resumoFilaSuporteLocal: baseState.resumoFilaSuporteLocal,
    resumoSuporteApp: baseState.resumoSuporteApp,
    retencaoDados: draftState.retencaoDados,
    salvarHistoricoConversas: draftState.salvarHistoricoConversas,
    senhaAtualDraft: draftState.senhaAtualDraft,
    sessaoAtual: accountState.sessaoAtual,
    settingsSheet: draftState.settingsSheet,
    sincronizacaoDispositivos: draftState.sincronizacaoDispositivos,
    statusApi: draftState.statusApi,
    statusAtualizacaoApp: draftState.statusAtualizacaoApp,
    supportChannelLabel: appState.supportChannelLabel,
    telefoneDraft: accountState.telefoneDraft,
    ultimaVerificacaoAtualizacaoLabel:
      baseState.ultimaVerificacaoAtualizacaoLabel,
    ultimoTicketSuporte: draftState.ultimoTicketSuporte,
    uploadArquivosAtivo: draftState.uploadArquivosAtivo,
    wifiOnlySync: draftState.wifiOnlySync,
    workspaceLabel: baseState.workspaceResumoConfiguracao,
    onSetAutoUploadAttachments: settersState.onSetAutoUploadAttachments,
    onTermosUso: actionsState.onTermosUso,
    onPoliticaPrivacidade: actionsState.onPoliticaPrivacidade,
    onLicencas: actionsState.onLicencas,
    onAbrirPortalContinuation: actionsState.onAbrirPortalContinuation,
  });

  return {
    handleConfirmarSettingsSheet,
    renderSettingsSheetBody,
  };
}
