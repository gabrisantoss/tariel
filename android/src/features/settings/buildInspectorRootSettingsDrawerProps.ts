import type { InspectorBaseDerivedState } from "../common/buildInspectorBaseDerivedState";
import { buildInspectorSettingsDrawerInput } from "./buildInspectorSettingsDrawerInput";
import { buildInspectorSettingsDrawerPanelProps } from "./buildInspectorSettingsDrawerPanelProps";
import type { InspectorSettingsDrawerPanelBuilderInput } from "./settingsDrawerBuilderTypes";

type InspectorSettingsDrawerBaseState = Pick<
  InspectorBaseDerivedState,
  | "artigosAjudaFiltrados"
  | "contaEmailLabel"
  | "contaTelefoneLabel"
  | "conversasOcultasTotal"
  | "conversasVisiveisTotal"
  | "corDestaqueResumoConfiguracao"
  | "detalheGovernancaConfiguracao"
  | "eventosSegurancaFiltrados"
  | "existeProvedorDisponivel"
  | "iniciaisPerfilConfiguracao"
  | "integracoesConectadasTotal"
  | "integracoesDisponiveisTotal"
  | "mostrarGrupoContaAcesso"
  | "mostrarGrupoExperiencia"
  | "mostrarGrupoSeguranca"
  | "mostrarGrupoSistema"
  | "nomeUsuarioExibicao"
  | "outrasSessoesAtivas"
  | "perfilExibicaoLabel"
  | "perfilNomeCompleto"
  | "permissoesNegadasTotal"
  | "planoResumoConfiguracao"
  | "previewPrivacidadeNotificacao"
  | "provedoresConectadosTotal"
  | "provedorPrimario"
  | "reemissoesRecomendadasTotal"
  | "resumo2FAFootnote"
  | "resumo2FAStatus"
  | "resumoAlertaMetodosConta"
  | "resumoBlindagemSessoes"
  | "resumoCodigosRecuperacao"
  | "resumoContaAcesso"
  | "resumoDadosConversas"
  | "resumoExcluirConta"
  | "resumoFilaSuporteLocal"
  | "resumoGovernancaConfiguracao"
  | "resumoMetodosConta"
  | "resumoPermissoes"
  | "resumoPermissoesCriticas"
  | "resumoPrivacidadeNotificacoes"
  | "resumoSessaoAtual"
  | "resumoSuporteApp"
  | "settingsDrawerInOverview"
  | "settingsDrawerMatchesPage"
  | "settingsDrawerMatchesSection"
  | "settingsDrawerPageSections"
  | "settingsDrawerSectionMenuAtiva"
  | "settingsDrawerSubtitle"
  | "settingsDrawerTitle"
  | "settingsPrintDarkMode"
  | "sessoesSuspeitasTotal"
  | "temaResumoConfiguracao"
  | "temPrioridadesConfiguracao"
  | "ticketsBugTotal"
  | "ticketsFeedbackTotal"
  | "totalSecoesConfiguracaoVisiveis"
  | "ultimaVerificacaoAtualizacaoLabel"
  | "ultimoEventoProvedor"
  | "ultimoEventoSessao"
  | "ultimoTicketSuporteResumo"
  | "workspaceResumoConfiguracao"
> &
  Partial<Pick<InspectorBaseDerivedState, "densityScale" | "fontScale">>;

interface BuildInspectorRootSettingsDrawerPropsInput {
  accountState: Pick<
    InspectorSettingsDrawerPanelBuilderInput,
    | "email"
    | "emailAtualConta"
    | "handleAlterarEmail"
    | "handleAlterarSenha"
    | "handleEditarPerfil"
    | "handleSolicitarLogout"
    | "handleUploadFotoPerfil"
    | "perfilFotoHint"
    | "perfilFotoUri"
  >;
  baseState: InspectorSettingsDrawerBaseState;
  experienceState: Pick<
    InspectorSettingsDrawerPanelBuilderInput,
    | "animacoesAtivas"
    | "chatCategoryEnabled"
    | "corDestaque"
    | "criticalAlertsEnabled"
    | "densidadeInterface"
    | "economiaDados"
    | "emailsAtivos"
    | "entradaPorVoz"
    | "estiloResposta"
    | "handleAbrirEstiloResposta"
    | "handleAbrirIdiomaResposta"
    | "handleAbrirMenuIdiomaVoz"
    | "handleAbrirModeloIa"
    | "handleToggleEntradaPorVoz"
    | "handleToggleNotificaPush"
    | "handleToggleRespostaPorVoz"
    | "handleToggleSpeechEnabled"
    | "handleToggleVibracao"
    | "idiomaResposta"
    | "mediaCompression"
    | "memoriaIa"
    | "mesaCategoryEnabled"
    | "mostrarCategoriaMesa"
    | "modeloIa"
    | "notificaPush"
    | "notificaRespostas"
    | "notificacoesPermitidas"
    | "onAbrirPermissaoNotificacoes"
    | "onCyclePreferredVoice"
    | "preferredVoiceLabel"
    | "respostaPorVoz"
    | "setAnimacoesAtivas"
    | "setChatCategoryEnabled"
    | "setCorDestaque"
    | "setCriticalAlertsEnabled"
    | "setDensidadeInterface"
    | "setEconomiaDados"
    | "setEmailsAtivos"
    | "setMemoriaIa"
    | "setMesaCategoryEnabled"
    | "setNotificaRespostas"
    | "setSomNotificacao"
    | "setSpeechRate"
    | "setSystemCategoryEnabled"
    | "setTamanhoFonte"
    | "setTemaApp"
    | "setTomConversa"
    | "setUsoBateria"
    | "somNotificacao"
    | "speechEnabled"
    | "speechRate"
    | "systemCategoryEnabled"
    | "tamanhoFonte"
    | "temaApp"
    | "tomConversa"
    | "ttsSupported"
    | "usoBateria"
    | "vibracaoAtiva"
    | "voiceLanguage"
  >;
  navigationState: Pick<
    InspectorSettingsDrawerPanelBuilderInput,
    | "appBuildChannel"
    | "appVersionLabel"
    | "configuracoesDrawerX"
    | "fecharConfiguracoes"
    | "handleAbrirCentralAtividade"
    | "handleAbrirPaginaConfiguracoes"
    | "handleAbrirSecaoConfiguracoes"
    | "handleVoltarResumoConfiguracoes"
    | "settingsDrawerPage"
    | "settingsDrawerPanResponder"
  >;
  securityState: Pick<
    InspectorSettingsDrawerPanelBuilderInput,
    | "analyticsOptIn"
    | "arquivosPermitidos"
    | "autoUploadAttachments"
    | "backupAutomatico"
    | "biometriaPermitida"
    | "cameraPermitida"
    | "codigo2FA"
    | "codigosRecuperacao"
    | "compartilharMelhoriaIa"
    | "crashReportsOptIn"
    | "deviceBiometricsEnabled"
    | "filtroEventosSeguranca"
    | "handleAbrirAjustesDoSistema"
    | "handleAbrirMenuRetencaoDados"
    | "handleAbrirMenuSincronizacaoWifi"
    | "handleApagarHistoricoConfiguracoes"
    | "handleCompartilharCodigosRecuperacao"
    | "handleConfirmarCodigo2FA"
    | "handleDetalhesSegurancaArquivos"
    | "handleEncerrarOutrasSessoes"
    | "handleEncerrarSessao"
    | "handleEncerrarSessaoAtual"
    | "handleEncerrarSessoesSuspeitas"
    | "handleExcluirConta"
    | "handleExportarAntesDeExcluirConta"
    | "handleExportarDados"
    | "handleGerarCodigosRecuperacao"
    | "handleLogout"
    | "handleGerenciarPermissao"
    | "handleLimparCache"
    | "handleLimparTodasConversasConfig"
    | "handleMudarMetodo2FA"
    | "handleReautenticacaoSensivel"
    | "handleReportarAtividadeSuspeita"
    | "handleRevisarPermissoesCriticas"
    | "handleRevisarSessao"
    | "handleToggle2FA"
    | "handleToggleBackupAutomatico"
    | "handleToggleBiometriaNoDispositivo"
    | "handleToggleProviderConnection"
    | "handleToggleSincronizacaoDispositivos"
    | "hideInMultitask"
    | "limpandoCache"
    | "lockTimeout"
    | "mediaCompression"
    | "microfonePermitido"
    | "provedoresConectados"
    | "reautenticacaoStatus"
    | "recoveryCodesEnabled"
    | "requireAuthOnOpen"
    | "resumoCache"
    | "retencaoDados"
    | "salvarHistoricoConversas"
    | "setAnalyticsOptIn"
    | "setAutoUploadAttachments"
    | "setCodigo2FA"
    | "setCompartilharMelhoriaIa"
    | "setCrashReportsOptIn"
    | "setFiltroEventosSeguranca"
    | "setHideInMultitask"
    | "setLockTimeout"
    | "setMediaCompression"
    | "setRecoveryCodesEnabled"
    | "setRequireAuthOnOpen"
    | "setRetencaoDados"
    | "setSalvarHistoricoConversas"
    | "setWifiOnlySync"
    | "sessoesAtivas"
    | "sincronizacaoDispositivos"
    | "twoFactorEnabled"
    | "twoFactorMethod"
    | "wifiOnlySync"
  >;
  supportAndSystemState: Pick<
    InspectorSettingsDrawerPanelBuilderInput,
    | "filaSuporteLocal"
    | "handleAbrirCanalSuporte"
    | "handleAbrirSobreApp"
    | "handleCentralAjuda"
    | "handleEnviarFeedback"
    | "handleExportarDiagnosticoApp"
    | "handleLicencas"
    | "handleLimparFilaSuporteLocal"
    | "handlePermissoes"
    | "handlePoliticaPrivacidade"
    | "handleReportarProblema"
    | "handleTermosUso"
    | "handleVerificarAtualizacoes"
    | "supportChannelLabel"
  >;
}

export function buildInspectorRootSettingsDrawerProps({
  accountState,
  baseState,
  experienceState,
  navigationState,
  securityState,
  supportAndSystemState,
}: BuildInspectorRootSettingsDrawerPropsInput): ReturnType<
  typeof buildInspectorSettingsDrawerPanelProps
> {
  return buildInspectorSettingsDrawerPanelProps(
    buildInspectorSettingsDrawerInput({
      account: {
        contaEmailLabel: baseState.contaEmailLabel,
        contaTelefoneLabel: baseState.contaTelefoneLabel,
        email: accountState.email,
        emailAtualConta: accountState.emailAtualConta,
        handleAlterarEmail: accountState.handleAlterarEmail,
        handleAlterarSenha: accountState.handleAlterarSenha,
        handleEditarPerfil: accountState.handleEditarPerfil,
        handleSolicitarLogout: accountState.handleSolicitarLogout,
        handleUploadFotoPerfil: accountState.handleUploadFotoPerfil,
        iniciaisPerfilConfiguracao: baseState.iniciaisPerfilConfiguracao,
        nomeUsuarioExibicao: baseState.nomeUsuarioExibicao,
        perfilExibicaoLabel: baseState.perfilExibicaoLabel,
        perfilFotoHint: accountState.perfilFotoHint,
        perfilFotoUri: accountState.perfilFotoUri,
        perfilNomeCompleto: baseState.perfilNomeCompleto,
        planoResumoConfiguracao: baseState.planoResumoConfiguracao,
        provedorPrimario: baseState.provedorPrimario,
        reemissoesRecomendadasTotal: baseState.reemissoesRecomendadasTotal,
        resumoContaAcesso: baseState.resumoContaAcesso,
        resumoGovernancaConfiguracao: baseState.resumoGovernancaConfiguracao,
        resumoMetodosConta: baseState.resumoMetodosConta,
        workspaceResumoConfiguracao: baseState.workspaceResumoConfiguracao,
        detalheGovernancaConfiguracao: baseState.detalheGovernancaConfiguracao,
        estiloRespostaResumoConfiguracao: experienceState.estiloResposta,
      },
      experience: {
        animacoesAtivas: experienceState.animacoesAtivas,
        artigosAjudaFiltrados: baseState.artigosAjudaFiltrados,
        chatCategoryEnabled: experienceState.chatCategoryEnabled,
        corDestaque: experienceState.corDestaque,
        criticalAlertsEnabled: experienceState.criticalAlertsEnabled,
        densidadeInterface: experienceState.densidadeInterface,
        economiaDados: experienceState.economiaDados,
        emailsAtivos: experienceState.emailsAtivos,
        entradaPorVoz: experienceState.entradaPorVoz,
        estiloResposta: experienceState.estiloResposta,
        handleAbrirMenuIdiomaVoz: experienceState.handleAbrirMenuIdiomaVoz,
        handleAbrirEstiloResposta: experienceState.handleAbrirEstiloResposta,
        handleAbrirIdiomaResposta: experienceState.handleAbrirIdiomaResposta,
        handleAbrirModeloIa: experienceState.handleAbrirModeloIa,
        handleToggleEntradaPorVoz: experienceState.handleToggleEntradaPorVoz,
        handleToggleNotificaPush: experienceState.handleToggleNotificaPush,
        handleToggleRespostaPorVoz: experienceState.handleToggleRespostaPorVoz,
        handleToggleSpeechEnabled: experienceState.handleToggleSpeechEnabled,
        handleToggleVibracao: experienceState.handleToggleVibracao,
        idiomaResposta: experienceState.idiomaResposta,
        mediaCompression: experienceState.mediaCompression,
        memoriaIa: experienceState.memoriaIa,
        mesaCategoryEnabled: experienceState.mesaCategoryEnabled,
        mostrarCategoriaMesa: experienceState.mostrarCategoriaMesa,
        modeloIa: experienceState.modeloIa,
        notificaPush: experienceState.notificaPush,
        notificaRespostas: experienceState.notificaRespostas,
        notificacoesPermitidas: experienceState.notificacoesPermitidas,
        onAbrirPermissaoNotificacoes:
          experienceState.onAbrirPermissaoNotificacoes,
        onCyclePreferredVoice: experienceState.onCyclePreferredVoice,
        preferredVoiceLabel: experienceState.preferredVoiceLabel,
        respostaPorVoz: experienceState.respostaPorVoz,
        setAnimacoesAtivas: experienceState.setAnimacoesAtivas,
        setChatCategoryEnabled: experienceState.setChatCategoryEnabled,
        setCorDestaque: experienceState.setCorDestaque,
        setCriticalAlertsEnabled: experienceState.setCriticalAlertsEnabled,
        setDensidadeInterface: experienceState.setDensidadeInterface,
        setEconomiaDados: experienceState.setEconomiaDados,
        setEmailsAtivos: experienceState.setEmailsAtivos,
        setMemoriaIa: experienceState.setMemoriaIa,
        setMesaCategoryEnabled: experienceState.setMesaCategoryEnabled,
        setNotificaRespostas: experienceState.setNotificaRespostas,
        setSomNotificacao: experienceState.setSomNotificacao,
        setSpeechRate: experienceState.setSpeechRate,
        setSystemCategoryEnabled: experienceState.setSystemCategoryEnabled,
        setTamanhoFonte: experienceState.setTamanhoFonte,
        setTemaApp: experienceState.setTemaApp,
        setTomConversa: experienceState.setTomConversa,
        setUsoBateria: experienceState.setUsoBateria,
        somNotificacao: experienceState.somNotificacao,
        speechEnabled: experienceState.speechEnabled,
        speechRate: experienceState.speechRate,
        systemCategoryEnabled: experienceState.systemCategoryEnabled,
        tamanhoFonte: experienceState.tamanhoFonte,
        temaApp: experienceState.temaApp,
        tomConversa: experienceState.tomConversa,
        ttsSupported: experienceState.ttsSupported,
        usoBateria: experienceState.usoBateria,
        vibracaoAtiva: experienceState.vibracaoAtiva,
        voiceLanguage: experienceState.voiceLanguage,
      },
      navigation: {
        appBuildChannel: navigationState.appBuildChannel,
        appVersionLabel: navigationState.appVersionLabel,
        configuracoesDrawerX: navigationState.configuracoesDrawerX,
        densityScale: baseState.densityScale,
        fecharConfiguracoes: navigationState.fecharConfiguracoes,
        handleAbrirCentralAtividade:
          navigationState.handleAbrirCentralAtividade,
        fontScale: baseState.fontScale,
        handleAbrirPaginaConfiguracoes:
          navigationState.handleAbrirPaginaConfiguracoes,
        handleAbrirSecaoConfiguracoes:
          navigationState.handleAbrirSecaoConfiguracoes,
        handleVoltarResumoConfiguracoes:
          navigationState.handleVoltarResumoConfiguracoes,
        mostrarGrupoContaAcesso: baseState.mostrarGrupoContaAcesso,
        mostrarGrupoExperiencia: baseState.mostrarGrupoExperiencia,
        mostrarGrupoSeguranca: baseState.mostrarGrupoSeguranca,
        mostrarGrupoSistema: baseState.mostrarGrupoSistema,
        settingsDrawerInOverview: baseState.settingsDrawerInOverview,
        settingsDrawerMatchesPage: baseState.settingsDrawerMatchesPage,
        settingsDrawerMatchesSection: baseState.settingsDrawerMatchesSection,
        settingsDrawerPage: navigationState.settingsDrawerPage,
        settingsDrawerPageSections: baseState.settingsDrawerPageSections,
        settingsDrawerPanResponder: navigationState.settingsDrawerPanResponder,
        settingsDrawerSectionMenuAtiva:
          baseState.settingsDrawerSectionMenuAtiva,
        settingsDrawerSubtitle: baseState.settingsDrawerSubtitle,
        settingsDrawerTitle: baseState.settingsDrawerTitle,
        settingsPrintDarkMode: baseState.settingsPrintDarkMode,
        temaResumoConfiguracao: baseState.temaResumoConfiguracao,
        temPrioridadesConfiguracao: baseState.temPrioridadesConfiguracao,
        totalSecoesConfiguracaoVisiveis:
          baseState.totalSecoesConfiguracaoVisiveis,
      },
      security: {
        analyticsOptIn: securityState.analyticsOptIn,
        arquivosPermitidos: securityState.arquivosPermitidos,
        autoUploadAttachments: securityState.autoUploadAttachments,
        backupAutomatico: securityState.backupAutomatico,
        biometriaPermitida: securityState.biometriaPermitida,
        cameraPermitida: securityState.cameraPermitida,
        codigo2FA: securityState.codigo2FA,
        codigosRecuperacao: securityState.codigosRecuperacao,
        compartilharMelhoriaIa: securityState.compartilharMelhoriaIa,
        conversasOcultasTotal: baseState.conversasOcultasTotal,
        crashReportsOptIn: securityState.crashReportsOptIn,
        deviceBiometricsEnabled: securityState.deviceBiometricsEnabled,
        eventosSegurancaFiltrados: baseState.eventosSegurancaFiltrados,
        filtroEventosSeguranca: securityState.filtroEventosSeguranca,
        handleAbrirAjustesDoSistema: securityState.handleAbrirAjustesDoSistema,
        handleAbrirMenuRetencaoDados:
          securityState.handleAbrirMenuRetencaoDados,
        handleAbrirMenuSincronizacaoWifi:
          securityState.handleAbrirMenuSincronizacaoWifi,
        handleApagarHistoricoConfiguracoes:
          securityState.handleApagarHistoricoConfiguracoes,
        handleCompartilharCodigosRecuperacao:
          securityState.handleCompartilharCodigosRecuperacao,
        handleConfirmarCodigo2FA: securityState.handleConfirmarCodigo2FA,
        handleDetalhesSegurancaArquivos:
          securityState.handleDetalhesSegurancaArquivos,
        handleEncerrarOutrasSessoes: securityState.handleEncerrarOutrasSessoes,
        handleEncerrarSessao: securityState.handleEncerrarSessao,
        handleEncerrarSessaoAtual: securityState.handleEncerrarSessaoAtual,
        handleEncerrarSessoesSuspeitas:
          securityState.handleEncerrarSessoesSuspeitas,
        handleExcluirConta: securityState.handleExcluirConta,
        handleExportarAntesDeExcluirConta:
          securityState.handleExportarAntesDeExcluirConta,
        handleExportarDados: securityState.handleExportarDados,
        handleGerarCodigosRecuperacao:
          securityState.handleGerarCodigosRecuperacao,
        handleLogout: securityState.handleLogout,
        handleGerenciarPermissao: securityState.handleGerenciarPermissao,
        handleLimparCache: securityState.handleLimparCache,
        handleLimparTodasConversasConfig:
          securityState.handleLimparTodasConversasConfig,
        handleMudarMetodo2FA: securityState.handleMudarMetodo2FA,
        handleReautenticacaoSensivel:
          securityState.handleReautenticacaoSensivel,
        handleReportarAtividadeSuspeita:
          securityState.handleReportarAtividadeSuspeita,
        handleRevisarPermissoesCriticas:
          securityState.handleRevisarPermissoesCriticas,
        handleRevisarSessao: securityState.handleRevisarSessao,
        handleToggle2FA: securityState.handleToggle2FA,
        handleToggleBackupAutomatico:
          securityState.handleToggleBackupAutomatico,
        handleToggleBiometriaNoDispositivo:
          securityState.handleToggleBiometriaNoDispositivo,
        handleToggleProviderConnection:
          securityState.handleToggleProviderConnection,
        handleToggleSincronizacaoDispositivos:
          securityState.handleToggleSincronizacaoDispositivos,
        hideInMultitask: securityState.hideInMultitask,
        limpandoCache: securityState.limpandoCache,
        lockTimeout: securityState.lockTimeout,
        mediaCompression: securityState.mediaCompression,
        microfonePermitido: securityState.microfonePermitido,
        outrasSessoesAtivas: baseState.outrasSessoesAtivas,
        permissoesNegadasTotal: baseState.permissoesNegadasTotal,
        provedoresConectados: securityState.provedoresConectados,
        provedoresConectadosTotal: baseState.provedoresConectadosTotal,
        provedorPrimario: baseState.provedorPrimario,
        reautenticacaoStatus: securityState.reautenticacaoStatus,
        recoveryCodesEnabled: securityState.recoveryCodesEnabled,
        requireAuthOnOpen: securityState.requireAuthOnOpen,
        resumo2FAFootnote: baseState.resumo2FAFootnote,
        resumo2FAStatus: baseState.resumo2FAStatus,
        resumoAlertaMetodosConta: baseState.resumoAlertaMetodosConta,
        resumoBlindagemSessoes: baseState.resumoBlindagemSessoes,
        resumoCache: securityState.resumoCache,
        resumoCodigosRecuperacao: baseState.resumoCodigosRecuperacao,
        resumoDadosConversas: baseState.resumoDadosConversas,
        resumoExcluirConta: baseState.resumoExcluirConta,
        resumoPermissoes: baseState.resumoPermissoes,
        resumoPermissoesCriticas: baseState.resumoPermissoesCriticas,
        resumoSessaoAtual: baseState.resumoSessaoAtual,
        retencaoDados: securityState.retencaoDados,
        salvarHistoricoConversas: securityState.salvarHistoricoConversas,
        setAnalyticsOptIn: securityState.setAnalyticsOptIn,
        setAutoUploadAttachments: securityState.setAutoUploadAttachments,
        setCodigo2FA: securityState.setCodigo2FA,
        setCompartilharMelhoriaIa: securityState.setCompartilharMelhoriaIa,
        setCrashReportsOptIn: securityState.setCrashReportsOptIn,
        setFiltroEventosSeguranca: securityState.setFiltroEventosSeguranca,
        setHideInMultitask: securityState.setHideInMultitask,
        setLockTimeout: securityState.setLockTimeout,
        setMediaCompression: securityState.setMediaCompression,
        setRecoveryCodesEnabled: securityState.setRecoveryCodesEnabled,
        setRequireAuthOnOpen: securityState.setRequireAuthOnOpen,
        setRetencaoDados: securityState.setRetencaoDados,
        setSalvarHistoricoConversas: securityState.setSalvarHistoricoConversas,
        setWifiOnlySync: securityState.setWifiOnlySync,
        sessoesAtivas: securityState.sessoesAtivas,
        sessoesSuspeitasTotal: baseState.sessoesSuspeitasTotal,
        sincronizacaoDispositivos: securityState.sincronizacaoDispositivos,
        twoFactorEnabled: securityState.twoFactorEnabled,
        twoFactorMethod: securityState.twoFactorMethod,
        ultimoEventoProvedor: baseState.ultimoEventoProvedor,
        ultimoEventoSessao: baseState.ultimoEventoSessao,
        wifiOnlySync: securityState.wifiOnlySync,
      },
      supportAndSystem: {
        contaEmailLabel: baseState.contaEmailLabel,
        contaTelefoneLabel: baseState.contaTelefoneLabel,
        corDestaqueResumoConfiguracao: baseState.corDestaqueResumoConfiguracao,
        existeProvedorDisponivel: baseState.existeProvedorDisponivel,
        fecharConfiguracoes: navigationState.fecharConfiguracoes,
        filaSuporteLocal: supportAndSystemState.filaSuporteLocal,
        handleAbrirCanalSuporte: supportAndSystemState.handleAbrirCanalSuporte,
        handleAbrirSobreApp: supportAndSystemState.handleAbrirSobreApp,
        handleCentralAjuda: supportAndSystemState.handleCentralAjuda,
        handleEnviarFeedback: supportAndSystemState.handleEnviarFeedback,
        handleExportarDiagnosticoApp:
          supportAndSystemState.handleExportarDiagnosticoApp,
        handleLicencas: supportAndSystemState.handleLicencas,
        handleLimparFilaSuporteLocal:
          supportAndSystemState.handleLimparFilaSuporteLocal,
        handlePermissoes: supportAndSystemState.handlePermissoes,
        handlePoliticaPrivacidade:
          supportAndSystemState.handlePoliticaPrivacidade,
        handleReportarProblema: supportAndSystemState.handleReportarProblema,
        handleTermosUso: supportAndSystemState.handleTermosUso,
        handleVerificarAtualizacoes:
          supportAndSystemState.handleVerificarAtualizacoes,
        integracoesConectadasTotal: baseState.integracoesConectadasTotal,
        integracoesDisponiveisTotal: baseState.integracoesDisponiveisTotal,
        planoResumoConfiguracao: baseState.planoResumoConfiguracao,
        resumoFilaSuporteLocal: baseState.resumoFilaSuporteLocal,
        resumoPermissoes: baseState.resumoPermissoes,
        resumoSuporteApp: baseState.resumoSuporteApp,
        supportChannelLabel: supportAndSystemState.supportChannelLabel,
        ticketsBugTotal: baseState.ticketsBugTotal,
        ticketsFeedbackTotal: baseState.ticketsFeedbackTotal,
        ultimaVerificacaoAtualizacaoLabel:
          baseState.ultimaVerificacaoAtualizacaoLabel,
        ultimoTicketSuporteResumo: baseState.ultimoTicketSuporteResumo,
      },
    }),
  );
}
