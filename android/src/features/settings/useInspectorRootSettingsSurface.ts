import { useInspectorRootSettingsEntryActions } from "./useInspectorRootSettingsEntryActions";
import { useInspectorRootSettingsOperationsActions } from "./useInspectorRootSettingsOperationsActions";
import { useInspectorRootSettingsSecurityActions } from "./useInspectorRootSettingsSecurityActions";
import { useInspectorRootSettingsUi } from "./useInspectorRootSettingsUi";

type InspectorRootSettingsEntryInput = Parameters<
  typeof useInspectorRootSettingsEntryActions
>[0];

type InspectorRootSettingsOperationsInput = Parameters<
  typeof useInspectorRootSettingsOperationsActions
>[0];

type InspectorRootSettingsSecurityInput = Parameters<
  typeof useInspectorRootSettingsSecurityActions
>[0];

type InspectorRootSettingsUiInput = Parameters<
  typeof useInspectorRootSettingsUi
>[0];

interface UseInspectorRootSettingsSurfaceInput {
  entryState: InspectorRootSettingsEntryInput;
  operationsState: InspectorRootSettingsOperationsInput;
  securityState: InspectorRootSettingsSecurityInput;
  uiState: Omit<InspectorRootSettingsUiInput, "sheetState" | "drawerState"> & {
    sheetState: Omit<
      InspectorRootSettingsUiInput["sheetState"],
      "actionsState"
    > & {
      actionsState: Omit<
        InspectorRootSettingsUiInput["sheetState"]["actionsState"],
        | "handleAlternarArtigoAjuda"
        | "handleAlternarIntegracaoExterna"
        | "handleRemoverScreenshotBug"
        | "handleSelecionarScreenshotBug"
        | "handleSincronizarIntegracaoExterna"
        | "onLicencas"
        | "onPoliticaPrivacidade"
        | "onTermosUso"
      >;
    };
    drawerState: Omit<
      InspectorRootSettingsUiInput["drawerState"],
      | "accountState"
      | "experienceState"
      | "securityState"
      | "supportAndSystemState"
    > & {
      accountState: Omit<
        InspectorRootSettingsUiInput["drawerState"]["accountState"],
        | "handleAlterarEmail"
        | "handleAlterarSenha"
        | "handleEditarPerfil"
        | "handleSolicitarLogout"
        | "handleUploadFotoPerfil"
      >;
      experienceState: Omit<
        InspectorRootSettingsUiInput["drawerState"]["experienceState"],
        | "handleAbrirEstiloResposta"
        | "handleAbrirIdiomaResposta"
        | "handleAbrirModeloIa"
      >;
      securityState: Omit<
        InspectorRootSettingsUiInput["drawerState"]["securityState"],
        | "handleAbrirAjustesDoSistema"
        | "handleCompartilharCodigosRecuperacao"
        | "handleConfirmarCodigo2FA"
        | "handleDetalhesSegurancaArquivos"
        | "handleEncerrarOutrasSessoes"
        | "handleEncerrarSessao"
        | "handleEncerrarSessaoAtual"
        | "handleEncerrarSessoesSuspeitas"
        | "handleGerarCodigosRecuperacao"
        | "handleApagarHistoricoConfiguracoes"
        | "handleLimparCache"
        | "handleLimparTodasConversasConfig"
        | "handleMudarMetodo2FA"
        | "handleReautenticacaoSensivel"
        | "handleRevisarSessao"
        | "handleToggle2FA"
        | "handleToggleBiometriaNoDispositivo"
        | "handleToggleProviderConnection"
      >;
      supportAndSystemState: Omit<
        InspectorRootSettingsUiInput["drawerState"]["supportAndSystemState"],
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
      >;
    };
  };
}

export function useInspectorRootSettingsSurface({
  entryState,
  operationsState,
  securityState,
  uiState,
}: UseInspectorRootSettingsSurfaceInput) {
  const entryActions = useInspectorRootSettingsEntryActions(entryState);
  const operationsActions =
    useInspectorRootSettingsOperationsActions(operationsState);
  const securityActions =
    useInspectorRootSettingsSecurityActions(securityState);

  return useInspectorRootSettingsUi({
    ...uiState,
    sheetState: {
      ...uiState.sheetState,
      actionsState: {
        ...uiState.sheetState.actionsState,
        handleAlternarArtigoAjuda: entryActions.handleAlternarArtigoAjuda,
        handleAlternarIntegracaoExterna:
          operationsActions.handleAlternarIntegracaoExterna,
        handleRemoverScreenshotBug:
          operationsActions.handleRemoverScreenshotBug,
        handleSelecionarScreenshotBug:
          operationsActions.handleSelecionarScreenshotBug,
        handleSincronizarIntegracaoExterna:
          operationsActions.handleSincronizarIntegracaoExterna,
        onLicencas: entryActions.handleLicencas,
        onPoliticaPrivacidade: entryActions.handlePoliticaPrivacidade,
        onTermosUso: entryActions.handleTermosUso,
      },
    },
    drawerState: {
      ...uiState.drawerState,
      accountState: {
        ...uiState.drawerState.accountState,
        handleAlterarEmail: entryActions.handleAlterarEmail,
        handleAlterarSenha: entryActions.handleAlterarSenha,
        handleEditarPerfil: entryActions.handleEditarPerfil,
        handleSolicitarLogout: operationsActions.handleSolicitarLogout,
        handleUploadFotoPerfil: entryActions.handleUploadFotoPerfil,
      },
      experienceState: {
        ...uiState.drawerState.experienceState,
        handleAbrirEstiloResposta: entryActions.handleAbrirEstiloResposta,
        handleAbrirIdiomaResposta: entryActions.handleAbrirIdiomaResposta,
        handleAbrirModeloIa: entryActions.handleAbrirModeloIa,
      },
      securityState: {
        ...uiState.drawerState.securityState,
        handleAbrirAjustesDoSistema:
          securityActions.handleAbrirAjustesDoSistema,
        handleCompartilharCodigosRecuperacao:
          securityActions.handleCompartilharCodigosRecuperacao,
        handleConfirmarCodigo2FA: securityActions.handleConfirmarCodigo2FA,
        handleDetalhesSegurancaArquivos:
          operationsActions.handleDetalhesSegurancaArquivos,
        handleEncerrarOutrasSessoes:
          securityActions.handleEncerrarOutrasSessoes,
        handleEncerrarSessao: securityActions.handleEncerrarSessao,
        handleEncerrarSessaoAtual: securityActions.handleEncerrarSessaoAtual,
        handleEncerrarSessoesSuspeitas:
          securityActions.handleEncerrarSessoesSuspeitas,
        handleGerarCodigosRecuperacao:
          securityActions.handleGerarCodigosRecuperacao,
        handleApagarHistoricoConfiguracoes:
          operationsActions.handleApagarHistoricoConfiguracoes,
        handleLimparCache: operationsActions.handleLimparCache,
        handleLimparTodasConversasConfig:
          operationsActions.handleLimparTodasConversasConfig,
        handleMudarMetodo2FA: securityActions.handleMudarMetodo2FA,
        handleReautenticacaoSensivel:
          securityActions.handleReautenticacaoSensivel,
        handleRevisarSessao: securityActions.handleRevisarSessao,
        handleToggle2FA: securityActions.handleToggle2FA,
        handleToggleBiometriaNoDispositivo:
          securityActions.handleToggleBiometriaNoDispositivo,
        handleToggleProviderConnection:
          securityActions.handleToggleProviderConnection,
      },
      supportAndSystemState: {
        ...uiState.drawerState.supportAndSystemState,
        handleAbrirCanalSuporte: operationsActions.handleAbrirCanalSuporte,
        handleAbrirSobreApp: entryActions.handleAbrirSobreApp,
        handleCentralAjuda: entryActions.handleCentralAjuda,
        handleEnviarFeedback: entryActions.handleEnviarFeedback,
        handleExportarDiagnosticoApp:
          operationsActions.handleExportarDiagnosticoApp,
        handleLicencas: entryActions.handleLicencas,
        handleLimparFilaSuporteLocal:
          operationsActions.handleLimparFilaSuporteLocal,
        handlePermissoes: entryActions.handlePermissoes,
        handlePoliticaPrivacidade: entryActions.handlePoliticaPrivacidade,
        handleReportarProblema: entryActions.handleReportarProblema,
        handleTermosUso: entryActions.handleTermosUso,
        handleVerificarAtualizacoes:
          operationsActions.handleVerificarAtualizacoes,
      },
    },
  });
}
