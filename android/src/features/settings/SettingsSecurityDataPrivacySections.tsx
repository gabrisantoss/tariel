import { useState } from "react";

import {
  DATA_RETENTION_OPTIONS,
  MEDIA_COMPRESSION_OPTIONS,
} from "../InspectorMobileApp.constants";
import {
  SettingsPressRow,
  SettingsSection,
  SettingsSegmentedRow,
  SettingsSwitchRow,
} from "./SettingsPrimitives";

type DataRetention = (typeof DATA_RETENTION_OPTIONS)[number];
type MediaCompression = (typeof MEDIA_COMPRESSION_OPTIONS)[number];
type UploadSecurityTopic = "validacao" | "urls" | "bloqueios";

interface SettingsSecurityDataConversationsSectionProps {
  resumoDadosConversas: string;
  conversasOcultasTotal: number;
  salvarHistoricoConversas: boolean;
  compartilharMelhoriaIa: boolean;
  analyticsOptIn: boolean;
  crashReportsOptIn: boolean;
  wifiOnlySync: boolean;
  retencaoDados: DataRetention;
  backupAutomatico: boolean;
  sincronizacaoDispositivos: boolean;
  autoUploadAttachments: boolean;
  mediaCompression: MediaCompression;
  cacheStatusLabel: string;
  limpandoCache: boolean;
  onSetSalvarHistoricoConversas: (value: boolean) => void;
  onSetCompartilharMelhoriaIa: (value: boolean) => void;
  onSetAnalyticsOptIn: (value: boolean) => void;
  onSetCrashReportsOptIn: (value: boolean) => void;
  onSetWifiOnlySync: (value: boolean) => void;
  onExportarDados: (formato: "JSON") => void;
  onSetRetencaoDados: (value: DataRetention) => void;
  onAbrirMenuRetencaoDados: () => void;
  onAbrirMenuSincronizacaoWifi: () => void;
  onApagarHistoricoConfiguracoes: () => void;
  onLimparTodasConversasConfig: () => void;
  onToggleBackupAutomatico: (value: boolean) => void;
  onToggleSincronizacaoDispositivos: (value: boolean) => void;
  onToggleAutoUploadAttachments: (value: boolean) => void;
  onSetMediaCompression: (value: MediaCompression) => void;
  onLimparCache: () => void;
}

interface SettingsSecurityPermissionsSectionProps {
  resumoPermissoes: string;
  resumoPermissoesCriticas: string;
  microfonePermitido: boolean;
  cameraPermitida: boolean;
  arquivosPermitidos: boolean;
  notificacoesPermitidas: boolean;
  biometriaPermitida: boolean;
  showBiometricsPermission?: boolean;
  permissoesNegadasTotal: number;
  onGerenciarPermissao: (nome: string, status: string) => void;
  onAbrirAjustesDoSistema: (contexto: string) => void;
  onRevisarPermissoesCriticas: () => void;
}

interface SettingsSecurityFileUploadSectionProps {
  onDetalhesSegurancaArquivos: (topico: UploadSecurityTopic) => void;
}

interface SettingsSecurityDeleteAccountSectionProps {
  resumoExcluirConta: string;
  reautenticacaoStatus: string;
  onExportarAntesDeExcluirConta: () => void;
  onReautenticacaoSensivel: () => void;
  onExcluirConta: () => void;
}

type DataControlsMenu = "compressao" | null;

const MEDIA_COMPRESSION_INFO: readonly {
  title: string;
  value: string;
  icon: Parameters<typeof SettingsPressRow>[0]["icon"];
}[] = [
  {
    title: "Equilibrada",
    value: "padrão",
    icon: "scale-balance",
  },
  {
    title: "Leve",
    value: "mais qualidade",
    icon: "image-outline",
  },
  {
    title: "Original",
    value: "sem compressão",
    icon: "file-image-outline",
  },
  {
    title: "Forte",
    value: "menor arquivo",
    icon: "archive-arrow-down-outline",
  },
];

export function SettingsSecurityDataConversationsSection({
  salvarHistoricoConversas,
  compartilharMelhoriaIa,
  analyticsOptIn,
  crashReportsOptIn,
  wifiOnlySync,
  retencaoDados,
  mediaCompression,
  cacheStatusLabel,
  limpandoCache,
  onSetSalvarHistoricoConversas,
  onSetCompartilharMelhoriaIa,
  onSetAnalyticsOptIn,
  onSetCrashReportsOptIn,
  onExportarDados,
  onAbrirMenuRetencaoDados,
  onAbrirMenuSincronizacaoWifi,
  onApagarHistoricoConfiguracoes,
  onLimparTodasConversasConfig,
  onSetMediaCompression,
  onLimparCache,
}: SettingsSecurityDataConversationsSectionProps) {
  const [menuAberto, setMenuAberto] = useState<DataControlsMenu>(null);
  const alternarMenu = (menu: Exclude<DataControlsMenu, null>) => {
    setMenuAberto((atual) => (atual === menu ? null : menu));
  };

  return (
    <SettingsSection
      icon="forum-outline"
      subtitle="Controle retenção, consentimentos locais e regras de sincronização do app."
      testID="settings-section-dados-conversas"
      title="Controles de dados"
    >
      <SettingsSwitchRow
        icon="history"
        onValueChange={onSetSalvarHistoricoConversas}
        testID="settings-data-history-toggle-row"
        title="Salvar histórico de conversas"
        value={salvarHistoricoConversas}
      />
      <SettingsSwitchRow
        description="Autoriza usar suas interações para melhorar a IA do app."
        icon="share-variant-outline"
        onValueChange={onSetCompartilharMelhoriaIa}
        testID="settings-data-improve-toggle-row"
        title="Compartilhar dados para melhoria da IA"
        value={compartilharMelhoriaIa}
      />
      <SettingsSwitchRow
        description="Controla a gravação local de telemetria leve e diagnóstico operacional."
        icon="chart-line"
        onValueChange={onSetAnalyticsOptIn}
        testID="settings-data-analytics-toggle-row"
        title="Analytics do app"
        value={analyticsOptIn}
      />
      <SettingsSwitchRow
        description="Captura localmente erros JS não tratados quando houver consentimento."
        icon="alert-decagram-outline"
        onValueChange={onSetCrashReportsOptIn}
        testID="settings-data-crash-toggle-row"
        title="Relatórios de falha"
        value={crashReportsOptIn}
      />
      <SettingsPressRow
        description="Gera um arquivo para auditoria com conversas, histórico local, configurações exportáveis e registros operacionais do app."
        icon="database-export-outline"
        onPress={() => onExportarDados("JSON")}
        testID="settings-data-export-row"
        title="Exportar dados para auditoria"
        value="JSON"
      />
      <SettingsPressRow
        description="Define por quanto tempo o histórico pode permanecer salvo."
        icon="timer-sand"
        onPress={onAbrirMenuRetencaoDados}
        title="Retenção de dados"
        value={retencaoDados}
      />
      <SettingsPressRow
        description="Agrupa as regras de sincronização, Wi-Fi e envio automático."
        icon="wifi-sync"
        onPress={onAbrirMenuSincronizacaoWifi}
        title="Sincronização e Wi-Fi"
        value={wifiOnlySync ? "Wi-Fi" : "Livre"}
      />
      <SettingsPressRow
        description="Define a intensidade da compressão aplicada a imagens antes do envio."
        icon="image-size-select-small"
        onPress={() => alternarMenu("compressao")}
        title="Compressão de mídia"
        value={mediaCompression}
      />
      {menuAberto === "compressao" ? (
        <>
          <SettingsSegmentedRow
            icon="image-filter-center-focus"
            onChange={onSetMediaCompression}
            options={MEDIA_COMPRESSION_OPTIONS}
            testID="settings-data-compression-menu"
            title="Nível de compressão"
            value={mediaCompression}
          />
          {MEDIA_COMPRESSION_INFO.map((item) => (
            <SettingsPressRow
              key={item.title}
              icon={item.icon}
              title={item.title}
              value={item.value}
            />
          ))}
        </>
      ) : null}
      <SettingsPressRow
        description="Remove cache local de leitura, atividade e arquivos temporários do app."
        icon="broom"
        onPress={onLimparCache}
        title="Limpar cache local"
        value={limpandoCache ? "Limpando..." : cacheStatusLabel}
      />
      <SettingsPressRow
        danger
        description="Confirmação obrigatória antes da exclusão."
        icon="delete-sweep-outline"
        onPress={onApagarHistoricoConfiguracoes}
        title="Apagar histórico"
      />
      <SettingsPressRow
        danger
        description="Remove todas as conversas locais e sincronizadas deste perfil."
        icon="trash-can-outline"
        onPress={onLimparTodasConversasConfig}
        title="Excluir conversas"
      />
    </SettingsSection>
  );
}

export function SettingsSecurityPermissionsSection({
  microfonePermitido,
  cameraPermitida,
  arquivosPermitidos,
  notificacoesPermitidas: _notificacoesPermitidas,
  biometriaPermitida,
  showBiometricsPermission = false,
  onGerenciarPermissao,
  onAbrirAjustesDoSistema,
}: SettingsSecurityPermissionsSectionProps) {
  return (
    <SettingsSection
      icon="shield-key-outline"
      subtitle="Status atual de acesso ao microfone, câmera e arquivos."
      title="Permissões"
    >
      <SettingsPressRow
        icon="microphone-outline"
        onPress={() =>
          onGerenciarPermissao(
            "Microfone",
            microfonePermitido ? "permitido" : "negado",
          )
        }
        title="Microfone"
        value={microfonePermitido ? "Permitido" : "Negado"}
      />
      <SettingsPressRow
        icon="camera-outline"
        onPress={() =>
          onGerenciarPermissao(
            "Câmera",
            cameraPermitida ? "permitido" : "negado",
          )
        }
        title="Câmera"
        value={cameraPermitida ? "Permitido" : "Negado"}
      />
      <SettingsPressRow
        icon="file-document-outline"
        onPress={() =>
          onGerenciarPermissao(
            "Arquivos",
            arquivosPermitidos ? "permitido" : "negado",
          )
        }
        title="Arquivos"
        value={arquivosPermitidos ? "Permitido" : "Negado"}
      />
      {showBiometricsPermission ? (
        <SettingsPressRow
          icon="fingerprint"
          onPress={() =>
            onGerenciarPermissao(
              "Biometria",
              biometriaPermitida ? "permitido" : "negado",
            )
          }
          title="Biometria"
          value={biometriaPermitida ? "Permitido" : "Negado"}
        />
      ) : null}
      <SettingsPressRow
        description="Abra diretamente os ajustes do Android para revisar todas as permissões deste app."
        icon="open-in-app"
        onPress={() =>
          onAbrirAjustesDoSistema("as permissões do app do inspetor")
        }
        title="Abrir ajustes do sistema"
      />
    </SettingsSection>
  );
}

export function SettingsSecurityFileUploadSection({
  onDetalhesSegurancaArquivos,
}: SettingsSecurityFileUploadSectionProps) {
  return (
    <SettingsSection
      icon="file-lock-outline"
      subtitle="Uploads são tratados como área crítica com validação e armazenamento protegido."
      title="Segurança de arquivos enviados"
    >
      <SettingsPressRow
        description="Tipos aceitos: PDF, JPG, PNG e DOCX, com limite de 20 MB por arquivo."
        icon="shield-check-outline"
        onPress={() => onDetalhesSegurancaArquivos("validacao")}
        title="Validação de tipo e tamanho"
        value="Ativa"
      />
      <SettingsPressRow
        description="Os arquivos só são servidos por URLs assinadas e vinculadas ao acesso correto."
        icon="link-variant"
        onPress={() => onDetalhesSegurancaArquivos("urls")}
        title="URLs protegidas"
        value="Assinadas"
      />
      <SettingsPressRow
        description="Falhas de validação e bloqueios devolvem feedback claro antes do envio."
        icon="alert-octagon-outline"
        onPress={() => onDetalhesSegurancaArquivos("bloqueios")}
        title="Falhas e bloqueios"
        value="Com feedback"
      />
    </SettingsSection>
  );
}

export function SettingsSecurityDeleteAccountSection({
  reautenticacaoStatus,
  onExportarAntesDeExcluirConta,
  onReautenticacaoSensivel,
  onExcluirConta,
}: SettingsSecurityDeleteAccountSectionProps) {
  return (
    <SettingsSection
      icon="alert-outline"
      subtitle="Área crítica para remoção permanente da conta."
      testID="settings-section-excluir-conta"
      title="Excluir conta"
    >
      <SettingsPressRow
        description="Faça um backup do perfil antes da exclusão definitiva."
        icon="database-export-outline"
        onPress={onExportarAntesDeExcluirConta}
        testID="settings-delete-export-before-row"
        title="Exportar dados antes de excluir"
        value="JSON"
      />
      <SettingsPressRow
        description="Ações destrutivas só seguem quando a verificação de identidade está válida."
        icon="shield-refresh-outline"
        onPress={onReautenticacaoSensivel}
        testID="settings-delete-reauth-row"
        title="Status da reautenticação"
        value={reautenticacaoStatus}
      />
      <SettingsPressRow
        description="Ação destrutiva com múltiplas confirmações e reautenticação."
        danger
        icon="delete-alert-outline"
        onPress={onExcluirConta}
        testID="settings-delete-account-row"
        title="Excluir conta permanentemente"
      />
    </SettingsSection>
  );
}
