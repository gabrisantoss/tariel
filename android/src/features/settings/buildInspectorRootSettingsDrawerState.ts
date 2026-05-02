import { APP_BUILD_CHANNEL } from "../InspectorMobileApp.constants";
import { hasMobileUserPortal } from "../common/mobileUserAccess";
import { useInspectorRootSettingsSurface } from "./useInspectorRootSettingsSurface";
import type { InspectorRootBootstrap } from "../useInspectorRootBootstrap";
import type { InspectorRootControllers } from "../useInspectorRootControllers";
import type { InspectorRootPresentationDerivedSnapshot } from "../buildInspectorRootDerivedState";

interface BuildInspectorRootSettingsDrawerStateInput {
  bootstrap: InspectorRootBootstrap;
  controllers: InspectorRootControllers;
  derivedState: InspectorRootPresentationDerivedSnapshot;
}

export function buildInspectorRootSettingsDrawerState({
  bootstrap,
  controllers,
  derivedState,
}: BuildInspectorRootSettingsDrawerStateInput): Parameters<
  typeof useInspectorRootSettingsSurface
>[0]["uiState"]["drawerState"] {
  const localState = bootstrap.localState;
  const settingsBindings = bootstrap.settingsBindings;
  const settingsSupportState = bootstrap.settingsSupportState;
  const sessionFlow = bootstrap.sessionFlow;
  const shellSupport = bootstrap.shellSupport;
  const runtimeController = bootstrap.runtimeController;
  const sessionUser = sessionFlow.state.session?.bootstrap.usuario;
  const mostrarCategoriaMesa = hasMobileUserPortal(sessionUser, "revisor");

  return {
    accountState: {
      email: sessionFlow.state.email,
      emailAtualConta: settingsBindings.account.emailAtualConta,
      perfilFotoHint: settingsBindings.account.perfilFotoHint,
      perfilFotoUri: settingsBindings.account.perfilFotoUri,
    },
    baseState: derivedState.inspectorBaseDerivedState,
    experienceState: {
      animacoesAtivas: settingsBindings.appearance.animacoesAtivas,
      chatCategoryEnabled: settingsBindings.notifications.chatCategoryEnabled,
      corDestaque: settingsBindings.appearance.corDestaque,
      criticalAlertsEnabled:
        settingsBindings.notifications.criticalAlertsEnabled,
      densidadeInterface: settingsBindings.appearance.densidadeInterface,
      economiaDados: settingsBindings.system.economiaDados,
      emailsAtivos: settingsBindings.notifications.emailsAtivos,
      entradaPorVoz: settingsBindings.speech.entradaPorVoz,
      estiloResposta: settingsBindings.ai.estiloResposta,
      handleAbrirMenuIdiomaVoz: () => {
        settingsSupportState.navigationActions.abrirSheetConfiguracao({
          kind: "voiceLanguage",
          title: "Idioma de voz",
          subtitle: "Escolha o idioma usado para voz e leitura em voz alta.",
        });
      },
      idiomaResposta: settingsBindings.ai.idiomaResposta,
      mediaCompression: settingsBindings.dataControls.mediaCompression,
      memoriaIa: settingsBindings.ai.memoriaIa,
      mesaCategoryEnabled: settingsBindings.notifications.mesaCategoryEnabled,
      mostrarCategoriaMesa,
      modeloIa: settingsBindings.ai.modeloIa,
      notificaPush: settingsBindings.notifications.notificaPush,
      notificaRespostas: settingsBindings.notifications.notificaRespostas,
      notificacoesPermitidas:
        settingsBindings.notifications.notificacoesPermitidas,
      onAbrirPermissaoNotificacoes:
        controllers.appLockController.actions.handleAbrirPermissaoNotificacoes,
      onCyclePreferredVoice:
        controllers.voiceInputController.onCyclePreferredVoice,
      preferredVoiceLabel: controllers.operationalState.preferredVoiceLabel,
      respostaPorVoz: settingsBindings.speech.respostaPorVoz,
      setAnimacoesAtivas: settingsBindings.appearance.setAnimacoesAtivas,
      setChatCategoryEnabled:
        settingsBindings.notifications.setChatCategoryEnabled,
      setCorDestaque: settingsBindings.appearance.setCorDestaque,
      setCriticalAlertsEnabled:
        settingsBindings.notifications.setCriticalAlertsEnabled,
      setDensidadeInterface: settingsBindings.appearance.setDensidadeInterface,
      setEconomiaDados: settingsBindings.system.setEconomiaDados,
      setEmailsAtivos: settingsBindings.notifications.setEmailsAtivos,
      setMemoriaIa: settingsBindings.ai.setMemoriaIa,
      setMesaCategoryEnabled:
        settingsBindings.notifications.setMesaCategoryEnabled,
      setNotificaRespostas: settingsBindings.notifications.setNotificaRespostas,
      setSomNotificacao: settingsBindings.notifications.setSomNotificacao,
      setSpeechRate: settingsBindings.speech.setSpeechRate,
      setSystemCategoryEnabled:
        settingsBindings.notifications.setSystemCategoryEnabled,
      setTamanhoFonte: settingsBindings.appearance.setTamanhoFonte,
      setTemaApp: settingsBindings.appearance.setTemaApp,
      setTomConversa: settingsBindings.ai.setTomConversa,
      setUsoBateria: settingsBindings.system.setUsoBateria,
      somNotificacao: settingsBindings.notifications.somNotificacao,
      speechEnabled: settingsBindings.speech.speechEnabled,
      speechRate: settingsBindings.speech.speechRate,
      systemCategoryEnabled:
        settingsBindings.notifications.systemCategoryEnabled,
      tamanhoFonte: settingsBindings.appearance.tamanhoFonte,
      temaApp: settingsBindings.appearance.temaApp,
      tomConversa: settingsBindings.ai.tomConversa,
      ttsSupported: runtimeController.voiceRuntimeState.ttsSupported,
      usoBateria: settingsBindings.system.usoBateria,
      vibracaoAtiva: settingsBindings.notifications.vibracaoAtiva,
      voiceLanguage: settingsBindings.speech.voiceLanguage,
    },
    navigationState: {
      appBuildChannel: APP_BUILD_CHANNEL,
      appVersionLabel: `${runtimeController.appRuntime.versionLabel} • ${runtimeController.appRuntime.buildLabel}`,
      configuracoesDrawerX: shellSupport.configuracoesDrawerX,
      fecharConfiguracoes: shellSupport.fecharConfiguracoes,
      handleAbrirCentralAtividade:
        controllers.activityCenterController.actions
          .handleAbrirCentralAtividade,
      handleAbrirPaginaConfiguracoes:
        settingsSupportState.navigationActions.handleAbrirPaginaConfiguracoes,
      handleAbrirSecaoConfiguracoes:
        settingsSupportState.navigationActions.handleAbrirSecaoConfiguracoes,
      handleVoltarResumoConfiguracoes:
        settingsSupportState.navigationActions.handleVoltarResumoConfiguracoes,
      settingsDrawerPage:
        settingsSupportState.navigationState.settingsDrawerPage,
      settingsDrawerPanResponder: shellSupport.settingsDrawerPanResponder,
    },
    securityState: {
      analyticsOptIn: settingsBindings.dataControls.analyticsOptIn,
      arquivosPermitidos: settingsBindings.security.arquivosPermitidos,
      autoUploadAttachments:
        settingsBindings.dataControls.autoUploadAttachments,
      backupAutomatico: settingsBindings.dataControls.backupAutomatico,
      biometriaPermitida: settingsBindings.security.biometriaPermitida,
      cameraPermitida: settingsBindings.security.cameraPermitida,
      codigo2FA: settingsSupportState.presentationState.codigo2FA,
      codigosRecuperacao:
        settingsSupportState.presentationState.codigosRecuperacao,
      compartilharMelhoriaIa: settingsBindings.ai.compartilharMelhoriaIa,
      crashReportsOptIn: settingsBindings.dataControls.crashReportsOptIn,
      deviceBiometricsEnabled:
        settingsBindings.security.deviceBiometricsEnabled,
      filtroEventosSeguranca:
        settingsSupportState.presentationState.filtroEventosSeguranca,
      handleAbrirMenuRetencaoDados: () => {
        settingsSupportState.navigationActions.abrirSheetConfiguracao({
          kind: "dataRetention",
          title: "Retenção de dados",
          subtitle: "Escolha por quanto tempo o histórico permanece salvo.",
        });
      },
      handleAbrirMenuSincronizacaoWifi: () => {
        settingsSupportState.navigationActions.abrirSheetConfiguracao({
          kind: "syncWifi",
          title: "Sincronização e Wi-Fi",
          subtitle:
            "Ajuste Wi-Fi, backup, sincronização entre dispositivos e anexos.",
        });
      },
      handleLogout: sessionFlow.actions.handleLogout,
      handleGerenciarPermissao:
        controllers.appLockController.actions.handleGerenciarPermissao,
      hideInMultitask: settingsBindings.security.hideInMultitask,
      limpandoCache: localState.limpandoCache,
      lockTimeout: settingsBindings.security.lockTimeout,
      mediaCompression: settingsBindings.dataControls.mediaCompression,
      microfonePermitido: settingsBindings.security.microfonePermitido,
      provedoresConectados:
        settingsSupportState.presentationState.provedoresConectados,
      reautenticacaoStatus:
        settingsSupportState.presentationState.reautenticacaoStatus,
      recoveryCodesEnabled:
        settingsSupportState.presentationState.recoveryCodesEnabled,
      requireAuthOnOpen: settingsBindings.security.requireAuthOnOpen,
      resumoCache: controllers.operationalState.resumoCache,
      retencaoDados: settingsBindings.dataControls.retencaoDados,
      salvarHistoricoConversas:
        settingsBindings.dataControls.salvarHistoricoConversas,
      setAnalyticsOptIn: settingsBindings.dataControls.setAnalyticsOptIn,
      setAutoUploadAttachments:
        settingsBindings.dataControls.setAutoUploadAttachments,
      setCodigo2FA: settingsSupportState.presentationActions.setCodigo2FA,
      setCompartilharMelhoriaIa: settingsBindings.ai.setCompartilharMelhoriaIa,
      setCrashReportsOptIn: settingsBindings.dataControls.setCrashReportsOptIn,
      setFiltroEventosSeguranca:
        settingsSupportState.presentationActions.setFiltroEventosSeguranca,
      setHideInMultitask: settingsBindings.security.setHideInMultitask,
      setLockTimeout: settingsBindings.security.setLockTimeout,
      setMediaCompression: settingsBindings.dataControls.setMediaCompression,
      setRecoveryCodesEnabled:
        settingsSupportState.presentationActions.setRecoveryCodesEnabled,
      setRequireAuthOnOpen: settingsBindings.security.setRequireAuthOnOpen,
      setRetencaoDados: settingsBindings.dataControls.setRetencaoDados,
      setSalvarHistoricoConversas:
        settingsBindings.dataControls.setSalvarHistoricoConversas,
      setWifiOnlySync: settingsBindings.dataControls.setWifiOnlySync,
      sessoesAtivas: settingsSupportState.presentationState.sessoesAtivas,
      sincronizacaoDispositivos:
        settingsBindings.dataControls.sincronizacaoDispositivos,
      twoFactorEnabled: settingsSupportState.presentationState.twoFactorEnabled,
      twoFactorMethod: settingsSupportState.presentationState.twoFactorMethod,
      wifiOnlySync: settingsBindings.dataControls.wifiOnlySync,
    },
    supportAndSystemState: {
      filaSuporteLocal: settingsSupportState.presentationState.filaSuporteLocal,
      supportChannelLabel: controllers.operationalState.canalSuporteLabel,
    },
  };
}
