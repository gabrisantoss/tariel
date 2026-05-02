import type { SettingsDrawerPanelProps } from "./SettingsDrawerPanel";
import type {
  InspectorSettingsAccountSectionInput,
  InspectorSettingsAdvancedResourcesSectionInput,
  InspectorSettingsExperienceSectionInput,
  InspectorSettingsOverviewSectionInput,
  InspectorSettingsSecuritySectionInput,
  InspectorSettingsSupportAndSystemSectionInput,
  SettingsDrawerPanelBuilderInput,
} from "./settingsDrawerBuilderTypes";

export function buildInspectorAccountSectionContentProps(
  input: InspectorSettingsAccountSectionInput,
): SettingsDrawerPanelProps["accountSectionContentProps"] {
  return (
    input.accountSectionContentProps || {
      contaEmailLabel: input.contaEmailLabel,
      contaTelefoneLabel: input.contaTelefoneLabel,
      onEditarPerfil: input.handleEditarPerfil,
      onAlterarEmail: input.handleAlterarEmail,
      onAlterarSenha: input.handleAlterarSenha,
      perfilExibicaoLabel: input.perfilExibicaoLabel,
      perfilNomeCompleto: input.perfilNomeCompleto,
      provedorPrimario: input.provedorPrimario,
    }
  );
}

export function buildInspectorAdvancedResourcesSectionProps(
  input: InspectorSettingsAdvancedResourcesSectionInput,
): SettingsDrawerPanelProps["advancedResourcesSectionProps"] {
  return (
    input.advancedResourcesSectionProps || {
      speechEnabled: input.speechEnabled,
      entradaPorVoz: input.entradaPorVoz,
      onAbrirMenuIdiomaVoz: input.handleAbrirMenuIdiomaVoz,
      onCyclePreferredVoice: input.onCyclePreferredVoice,
      onSetSpeechRate: input.setSpeechRate,
      onToggleSpeechEnabled: input.handleToggleSpeechEnabled,
      onToggleEntradaPorVoz: input.handleToggleEntradaPorVoz,
      onToggleRespostaPorVoz: input.handleToggleRespostaPorVoz,
      preferredVoiceLabel: input.preferredVoiceLabel,
      respostaPorVoz: input.respostaPorVoz,
      speechRate: input.speechRate,
      ttsSupported: input.ttsSupported,
      voiceLanguage: input.voiceLanguage,
    }
  );
}

export function buildInspectorExperienceSectionProps(
  input: InspectorSettingsExperienceSectionInput,
): Pick<
  SettingsDrawerPanelProps,
  | "experienceAiSectionProps"
  | "experienceAppearanceSectionProps"
  | "experienceNotificationsSectionProps"
> {
  return {
    experienceAiSectionProps: {
      estiloResposta: input.estiloResposta,
      idiomaResposta: input.idiomaResposta,
      memoriaIa: input.memoriaIa,
      modeloIa: input.modeloIa,
      onAbrirMenuEstiloResposta: input.handleAbrirEstiloResposta,
      onAbrirMenuIdiomaResposta: input.handleAbrirIdiomaResposta,
      onAbrirMenuModeloIa: input.handleAbrirModeloIa,
      onSetMemoriaIa: input.setMemoriaIa,
      onSetTomConversa: input.setTomConversa,
      tomConversa: input.tomConversa,
    },
    experienceAppearanceSectionProps: {
      animacoesAtivas: input.animacoesAtivas,
      corDestaque: input.corDestaque,
      densidadeInterface: input.densidadeInterface,
      economiaDados: input.economiaDados,
      onSetAnimacoesAtivas: input.setAnimacoesAtivas,
      onSetCorDestaque: input.setCorDestaque,
      onSetDensidadeInterface: input.setDensidadeInterface,
      onSetEconomiaDados: input.setEconomiaDados,
      onSetTamanhoFonte: input.setTamanhoFonte,
      onSetTemaApp: input.setTemaApp,
      onSetUsoBateria: input.setUsoBateria,
      tamanhoFonte: input.tamanhoFonte,
      temaApp: input.temaApp,
      usoBateria: input.usoBateria,
    },
    experienceNotificationsSectionProps:
      input.experienceNotificationsSectionProps || {
        chatCategoryEnabled: input.chatCategoryEnabled,
        criticalAlertsEnabled: input.criticalAlertsEnabled,
        emailsAtivos: input.emailsAtivos,
        mesaCategoryEnabled: input.mesaCategoryEnabled,
        notificaPush: input.notificaPush,
        notificaRespostas: input.notificaRespostas,
        notificacoesPermitidas: input.notificacoesPermitidas,
        onAbrirPermissaoNotificacoes: input.onAbrirPermissaoNotificacoes,
        onSetChatCategoryEnabled: input.setChatCategoryEnabled,
        onSetCriticalAlertsEnabled: input.setCriticalAlertsEnabled,
        onSetEmailsAtivos: input.setEmailsAtivos,
        onSetMesaCategoryEnabled: input.setMesaCategoryEnabled,
        onSetNotificaRespostas: input.setNotificaRespostas,
        onSetSomNotificacao: input.setSomNotificacao,
        onSetSystemCategoryEnabled: input.setSystemCategoryEnabled,
        onToggleNotificaPush: input.handleToggleNotificaPush,
        onToggleVibracao: input.handleToggleVibracao,
        showMesaCategory: input.mostrarCategoriaMesa,
        somNotificacao: input.somNotificacao,
        systemCategoryEnabled: input.systemCategoryEnabled,
        vibracaoAtiva: input.vibracaoAtiva,
      },
  };
}

export function buildInspectorOverviewSectionProps(
  input: InspectorSettingsOverviewSectionInput,
): Pick<
  SettingsDrawerPanelProps,
  | "overviewContentProps"
  | "priorityActionsContentProps"
  | "sectionMenuContentProps"
> {
  return {
    overviewContentProps: {
      contaEmailLabel: input.contaEmailLabel,
      contaTelefoneLabel: input.contaTelefoneLabel,
      corDestaqueResumoConfiguracao: input.corDestaqueResumoConfiguracao,
      detalheGovernancaConfiguracao: input.detalheGovernancaConfiguracao,
      estiloRespostaResumoConfiguracao: input.estiloRespostaResumoConfiguracao,
      iniciaisPerfilConfiguracao: input.iniciaisPerfilConfiguracao,
      nomeUsuarioExibicao: input.nomeUsuarioExibicao,
      onAbrirCentralAtividade: input.handleAbrirCentralAtividade,
      onAbrirPaginaConfiguracoes: input.handleAbrirPaginaConfiguracoes,
      onFecharConfiguracoes: input.fecharConfiguracoes,
      onLogout: input.handleSolicitarLogout,
      onReportarProblema: input.handleReportarProblema,
      onUploadFotoPerfil: input.handleUploadFotoPerfil,
      perfilFotoUri: input.perfilFotoUri,
      planoResumoConfiguracao: input.planoResumoConfiguracao,
      reemissoesRecomendadasTotal: input.reemissoesRecomendadasTotal,
      resumoGovernancaConfiguracao: input.resumoGovernancaConfiguracao,
      settingsPrintDarkMode: input.settingsPrintDarkMode,
      temaResumoConfiguracao: input.temaResumoConfiguracao,
      workspaceResumoConfiguracao: input.workspaceResumoConfiguracao,
    },
    priorityActionsContentProps: {
      onRevisarPermissoesCriticas: input.handleRevisarPermissoesCriticas,
      onVerificarAtualizacoes: input.handleVerificarAtualizacoes,
      permissoesNegadasTotal: input.permissoesNegadasTotal,
      temPrioridadesConfiguracao: input.temPrioridadesConfiguracao,
      ultimaVerificacaoAtualizacaoLabel:
        input.ultimaVerificacaoAtualizacaoLabel,
    },
    sectionMenuContentProps: {
      onAbrirSecaoConfiguracoes: input.handleAbrirSecaoConfiguracoes,
    },
  };
}

export function buildInspectorSecuritySectionProps(
  input: InspectorSettingsSecuritySectionInput,
): Pick<
  SettingsDrawerPanelProps,
  | "securityActivitySectionProps"
  | "securityConnectedAccountsSectionProps"
  | "securityDataConversationsSectionProps"
  | "securityDeleteAccountSectionProps"
  | "securityDeviceProtectionSectionProps"
  | "securityIdentityVerificationSectionProps"
  | "securityPermissionsSectionProps"
  | "securitySessionsSectionProps"
  | "securityTwoFactorSectionProps"
> {
  return {
    securityActivitySectionProps: {
      eventosSegurancaFiltrados: input.eventosSegurancaFiltrados,
      filtroEventosSeguranca: input.filtroEventosSeguranca,
      onReportarAtividadeSuspeita: input.handleReportarAtividadeSuspeita,
      onSetFiltroEventosSeguranca: input.setFiltroEventosSeguranca,
    },
    securityConnectedAccountsSectionProps: {
      onToggleProviderConnection: input.handleToggleProviderConnection,
      provedoresConectados: input.provedoresConectados,
      provedoresConectadosTotal: input.provedoresConectadosTotal,
      provedorPrimario: input.provedorPrimario,
      resumoAlertaMetodosConta: input.resumoAlertaMetodosConta,
      ultimoEventoProvedor: input.ultimoEventoProvedor,
    },
    securityDataConversationsSectionProps: {
      analyticsOptIn: input.analyticsOptIn,
      backupAutomatico: input.backupAutomatico,
      compartilharMelhoriaIa: input.compartilharMelhoriaIa,
      conversasOcultasTotal: input.conversasOcultasTotal,
      crashReportsOptIn: input.crashReportsOptIn,
      autoUploadAttachments: input.autoUploadAttachments,
      cacheStatusLabel: input.resumoCache,
      limpandoCache: input.limpandoCache,
      mediaCompression: input.mediaCompression,
      onAbrirMenuRetencaoDados: input.handleAbrirMenuRetencaoDados,
      onAbrirMenuSincronizacaoWifi: input.handleAbrirMenuSincronizacaoWifi,
      onApagarHistoricoConfiguracoes: input.handleApagarHistoricoConfiguracoes,
      onExportarDados: input.handleExportarDados,
      onLimparCache: input.handleLimparCache,
      onSetAnalyticsOptIn: input.setAnalyticsOptIn,
      onSetCrashReportsOptIn: input.setCrashReportsOptIn,
      onSetMediaCompression: input.setMediaCompression,
      onLimparTodasConversasConfig: input.handleLimparTodasConversasConfig,
      onSetCompartilharMelhoriaIa: input.setCompartilharMelhoriaIa,
      onSetRetencaoDados: input.setRetencaoDados,
      onSetSalvarHistoricoConversas: input.setSalvarHistoricoConversas,
      onSetWifiOnlySync: input.setWifiOnlySync,
      onToggleAutoUploadAttachments: input.setAutoUploadAttachments,
      onToggleBackupAutomatico: input.handleToggleBackupAutomatico,
      onToggleSincronizacaoDispositivos:
        input.handleToggleSincronizacaoDispositivos,
      retencaoDados: input.retencaoDados,
      resumoDadosConversas: input.resumoDadosConversas,
      salvarHistoricoConversas: input.salvarHistoricoConversas,
      sincronizacaoDispositivos: input.sincronizacaoDispositivos,
      wifiOnlySync: input.wifiOnlySync,
    },
    securityDeleteAccountSectionProps: {
      onExcluirConta: input.handleExcluirConta,
      onExportarAntesDeExcluirConta: input.handleExportarAntesDeExcluirConta,
      onReautenticacaoSensivel: input.handleReautenticacaoSensivel,
      reautenticacaoStatus: input.reautenticacaoStatus,
      resumoExcluirConta: input.resumoExcluirConta,
    },
    securityDeviceProtectionSectionProps: {
      biometricsSupported: false,
      deviceBiometricsEnabled: input.deviceBiometricsEnabled,
      hideInMultitask: input.hideInMultitask,
      lockTimeout: input.lockTimeout,
      onSetHideInMultitask: input.setHideInMultitask,
      onSetLockTimeout: input.setLockTimeout,
      onSetRequireAuthOnOpen: input.setRequireAuthOnOpen,
      onToggleBiometriaNoDispositivo: input.handleToggleBiometriaNoDispositivo,
      requireAuthOnOpen: input.requireAuthOnOpen,
    },
    securityIdentityVerificationSectionProps: {
      onReautenticacaoSensivel: input.handleReautenticacaoSensivel,
      reautenticacaoStatus: input.reautenticacaoStatus,
    },
    securityPermissionsSectionProps: {
      arquivosPermitidos: input.arquivosPermitidos,
      biometriaPermitida: input.biometriaPermitida,
      cameraPermitida: input.cameraPermitida,
      microfonePermitido: input.microfonePermitido,
      notificacoesPermitidas: input.notificacoesPermitidas,
      onAbrirAjustesDoSistema: input.handleAbrirAjustesDoSistema,
      onGerenciarPermissao: input.handleGerenciarPermissao,
      onRevisarPermissoesCriticas: input.handleRevisarPermissoesCriticas,
      permissoesNegadasTotal: input.permissoesNegadasTotal,
      resumoPermissoes: input.resumoPermissoes,
      resumoPermissoesCriticas: input.resumoPermissoesCriticas,
      showBiometricsPermission: false,
    },
    securitySessionsSectionProps: {
      onEncerrarOutrasSessoes: input.handleEncerrarOutrasSessoes,
      onEncerrarSessao: input.handleEncerrarSessao,
      onEncerrarSessaoAtual: input.handleEncerrarSessaoAtual,
      onEncerrarSessoesSuspeitas: input.handleEncerrarSessoesSuspeitas,
      onFecharConfiguracoes: input.fecharConfiguracoes,
      onLogout: input.handleLogout,
      onRevisarSessao: input.handleRevisarSessao,
      outrasSessoesAtivas: input.outrasSessoesAtivas,
      resumoBlindagemSessoes: input.resumoBlindagemSessoes,
      resumoSessaoAtual: input.resumoSessaoAtual,
      sessoesAtivas: input.sessoesAtivas,
      sessoesSuspeitasTotal: input.sessoesSuspeitasTotal,
      ultimoEventoSessao: input.ultimoEventoSessao,
    },
    securityTwoFactorSectionProps: {
      codigo2FA: input.codigo2FA,
      codigosRecuperacao: input.codigosRecuperacao,
      onCompartilharCodigosRecuperacao:
        input.handleCompartilharCodigosRecuperacao,
      onConfirmarCodigo2FA: input.handleConfirmarCodigo2FA,
      onGerarCodigosRecuperacao: input.handleGerarCodigosRecuperacao,
      onMudarMetodo2FA: input.handleMudarMetodo2FA,
      onSetCodigo2FA: input.setCodigo2FA,
      onSetRecoveryCodesEnabled: input.setRecoveryCodesEnabled,
      onToggle2FA: input.handleToggle2FA,
      reautenticacaoStatus: input.reautenticacaoStatus,
      recoveryCodesEnabled: input.recoveryCodesEnabled,
      resumo2FAFootnote: input.resumo2FAFootnote,
      resumo2FAStatus: input.resumo2FAStatus,
      resumoCodigosRecuperacao: input.resumoCodigosRecuperacao,
      twoFactorEnabled: input.twoFactorEnabled,
      twoFactorMethod: input.twoFactorMethod,
    },
  };
}

export function buildInspectorSupportAndSystemSectionProps(
  input: InspectorSettingsSupportAndSystemSectionInput &
    Pick<InspectorSettingsOverviewSectionInput, "planoResumoConfiguracao">,
): Pick<
  SettingsDrawerPanelBuilderInput,
  "supportSectionProps" | "systemSectionProps"
> {
  return {
    supportSectionProps: {
      onCanalSuporte:
        input.supportChannelLabel === "Canal indisponível"
          ? undefined
          : input.handleAbrirCanalSuporte,
      onCentralAjuda: input.handleCentralAjuda,
      onEnviarFeedback: input.handleEnviarFeedback,
      onExportarDiagnosticoApp: input.handleExportarDiagnosticoApp,
      onLicencas: input.handleLicencas,
      onLimparFilaSuporteLocal: input.handleLimparFilaSuporteLocal,
      onPoliticaPrivacidade: input.handlePoliticaPrivacidade,
      onReportarProblema: input.handleReportarProblema,
      onSobreApp: input.handleAbrirSobreApp,
      onTermosUso: input.handleTermosUso,
      planoResumoConfiguracao: input.planoResumoConfiguracao,
      resumoFilaSuporteLocal: input.resumoFilaSuporteLocal,
      resumoSuporteApp: input.resumoSuporteApp,
      supportChannelLabel: input.supportChannelLabel,
      ticketsBugTotal: input.ticketsBugTotal,
      ticketsFeedbackTotal: input.ticketsFeedbackTotal,
      ultimoTicketSuporte: input.ultimoTicketSuporteResumo,
    },
    systemSectionProps: {
      appBuildChannel: input.appBuildChannel,
      appVersionLabel: input.appVersionLabel,
      onPermissoes: input.handlePermissoes,
      onSobreApp: input.handleAbrirSobreApp,
      resumoPermissoes: input.resumoPermissoes,
    },
  };
}
