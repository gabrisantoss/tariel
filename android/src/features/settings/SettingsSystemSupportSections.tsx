import { SPEECH_LANGUAGE_OPTIONS } from "../InspectorMobileApp.constants";
import {
  SettingsPressRow,
  SettingsScaleRow,
  SettingsSection,
  SettingsSwitchRow,
} from "./SettingsPrimitives";

type SpeechLanguage = (typeof SPEECH_LANGUAGE_OPTIONS)[number];

interface SettingsAdvancedResourcesSectionProps {
  speechEnabled: boolean;
  entradaPorVoz: boolean;
  respostaPorVoz: boolean;
  voiceLanguage: SpeechLanguage;
  speechRate: number;
  preferredVoiceLabel: string;
  ttsSupported: boolean;
  onToggleSpeechEnabled: (value: boolean) => void;
  onToggleEntradaPorVoz: (value: boolean) => void;
  onToggleRespostaPorVoz: (value: boolean) => void;
  onSetSpeechRate: (value: number) => void;
  onCyclePreferredVoice: () => void;
  onAbrirMenuIdiomaVoz: () => void;
}

interface SettingsSystemSectionProps {
  resumoPermissoes: string;
  appBuildChannel: string;
  appVersionLabel: string;
  onAbrirCentralAtividade?: () => void;
  onPermissoes: () => void;
  onSobreApp: () => void;
}

interface SettingsSupportSectionProps {
  resumoSuporteApp: string;
  emailRetorno: string;
  supportChannelLabel: string;
  resumoFilaSuporteLocal: string;
  planoResumoConfiguracao?: string;
  ultimoTicketSuporte: {
    kind: "bug" | "feedback";
    createdAtLabel: string;
  } | null;
  artigosAjudaCount?: number;
  ticketsBugTotal: number;
  ticketsFeedbackTotal: number;
  filaSuporteCount: number;
  onCentralAjuda?: () => void;
  onCanalSuporte?: () => void;
  onReportarProblema: () => void;
  onEnviarFeedback: () => void;
  onSobreApp?: () => void;
  onExportarDiagnosticoApp: () => void | Promise<void>;
  onTermosUso: () => void;
  onPoliticaPrivacidade: () => void;
  onLicencas: () => void;
  onLimparFilaSuporteLocal: () => void;
}

export function SettingsAdvancedResourcesSection({
  speechEnabled,
  entradaPorVoz,
  respostaPorVoz,
  voiceLanguage,
  speechRate,
  preferredVoiceLabel,
  ttsSupported,
  onToggleSpeechEnabled,
  onToggleEntradaPorVoz,
  onToggleRespostaPorVoz,
  onSetSpeechRate,
  onCyclePreferredVoice,
  onAbrirMenuIdiomaVoz,
}: SettingsAdvancedResourcesSectionProps) {
  return (
    <SettingsSection
      icon="account-voice"
      subtitle="Voz, leitura em voz alta e acessibilidade."
      testID="settings-section-recursos-avancados"
      title="Voz e acessibilidade"
    >
      <SettingsSwitchRow
        description="Habilita o conjunto de preferências de fala neste dispositivo."
        icon="account-voice"
        onValueChange={onToggleSpeechEnabled}
        testID="settings-speech-enabled-row"
        title="Ativar fala"
        value={speechEnabled}
      />
      <SettingsSwitchRow
        description="Prepara o app para abrir fluxos de fala com transcrição quando houver suporte."
        icon="microphone-outline"
        onValueChange={onToggleEntradaPorVoz}
        testID="settings-advanced-voice-input-row"
        title="Transcrever automaticamente"
        value={entradaPorVoz}
      />
      <SettingsPressRow
        description="Idioma preferido para voz, leitura e fallback de ditado."
        icon="translate"
        onPress={onAbrirMenuIdiomaVoz}
        title="Idioma de voz"
        value={voiceLanguage}
      />
      <SettingsScaleRow
        description="Afeta a velocidade real da síntese de voz."
        icon="speedometer"
        maxLabel="Rápida"
        minLabel="Lenta"
        onChange={onSetSpeechRate}
        title="Velocidade da fala"
        value={speechRate}
        values={[0.6, 0.8, 1, 1.2, 1.4]}
      />
      {ttsSupported ? (
        <SettingsPressRow
          description="Quando disponível no sistema, o app usa a voz escolhida na leitura automática."
          icon="account-voice"
          onPress={onCyclePreferredVoice}
          title="Voz preferida"
          value={preferredVoiceLabel}
        />
      ) : null}
      <SettingsSwitchRow
        description="Quando disponível no dispositivo, o app pode ler respostas em voz alta."
        icon="speaker-wireless"
        onValueChange={onToggleRespostaPorVoz}
        testID="settings-advanced-voice-output-row"
        title="Ler respostas automaticamente"
        value={respostaPorVoz}
      />
    </SettingsSection>
  );
}

export function SettingsSystemSection({
  resumoPermissoes,
  appVersionLabel,
  onAbrirCentralAtividade = () => undefined,
  onPermissoes,
  onSobreApp,
}: SettingsSystemSectionProps) {
  return (
    <SettingsSection
      icon="cellphone-cog"
      subtitle="Permissões e informações básicas do aplicativo."
      testID="settings-section-sistema"
      title="Sistema"
    >
      <SettingsPressRow
        icon="shield-sync-outline"
        onPress={onPermissoes}
        testID="settings-system-permissions-center-row"
        title="Permissões"
        value={resumoPermissoes}
      />
      <SettingsPressRow
        description="Eventos recentes, entregas e sinais operacionais do app."
        icon="bell-badge-outline"
        onPress={onAbrirCentralAtividade}
        testID="settings-system-activity-center-row"
        title="Central de atividades"
        value="Abrir"
      />
      <SettingsPressRow
        description="Versão, termos, privacidade e licenças."
        icon="information-outline"
        onPress={onSobreApp}
        testID="settings-system-about-row"
        title="Sobre"
        value={appVersionLabel}
      />
    </SettingsSection>
  );
}

export function SettingsSupportSection({
  resumoSuporteApp,
  emailRetorno,
  supportChannelLabel,
  resumoFilaSuporteLocal,
  ticketsBugTotal,
  ticketsFeedbackTotal,
  filaSuporteCount,
  onCanalSuporte,
  onReportarProblema,
  onEnviarFeedback,
  onExportarDiagnosticoApp,
  onLimparFilaSuporteLocal,
}: SettingsSupportSectionProps) {
  return (
    <SettingsSection
      icon="lifebuoy"
      subtitle="Bug, suporte, feedback e diagnóstico."
      testID="settings-section-suporte"
      title="Falar com o suporte"
    >
      <SettingsPressRow
        description={resumoSuporteApp}
        icon="bug-outline"
        onPress={onReportarProblema}
        testID="settings-support-report-bug-row"
        title="Informar bug"
        value={
          ticketsBugTotal ? `${ticketsBugTotal} na fila` : "Abrir formulário"
        }
      />
      {onCanalSuporte ? (
        <SettingsPressRow
          description="Abre o canal disponível para conversar com a equipe de suporte."
          icon="headset"
          onPress={onCanalSuporte}
          testID="settings-support-channel-row"
          title="Falar com o suporte"
          value={supportChannelLabel}
        />
      ) : null}
      <SettingsPressRow
        description={emailRetorno}
        icon="message-draw"
        onPress={onEnviarFeedback}
        testID="settings-support-send-feedback-row"
        title="Enviar feedback"
        value={
          ticketsFeedbackTotal
            ? `${ticketsFeedbackTotal} na fila`
            : "Enviar ideia"
        }
      />
      <SettingsPressRow
        description={resumoFilaSuporteLocal}
        icon="file-export-outline"
        onPress={() => {
          void onExportarDiagnosticoApp();
        }}
        testID="settings-support-export-diagnostic-row"
        title="Exportar diagnóstico"
        value="TXT"
      />
      {filaSuporteCount ? (
        <SettingsPressRow
          danger
          icon="tray-remove"
          onPress={onLimparFilaSuporteLocal}
          title="Limpar fila local"
          value="Remover itens"
        />
      ) : null}
    </SettingsSection>
  );
}
