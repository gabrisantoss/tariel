import {
  AI_MODEL_OPTIONS,
  CONVERSATION_TONE_OPTIONS,
  RESPONSE_LANGUAGE_OPTIONS,
  RESPONSE_STYLE_OPTIONS,
} from "../InspectorMobileApp.constants";
import {
  SettingsPressRow,
  SettingsSection,
  SettingsSegmentedRow,
  SettingsSwitchRow,
} from "./SettingsPrimitives";

type ModeloIa = (typeof AI_MODEL_OPTIONS)[number];
type EstiloResposta = (typeof RESPONSE_STYLE_OPTIONS)[number];
type IdiomaResposta = (typeof RESPONSE_LANGUAGE_OPTIONS)[number];
type TomConversa = (typeof CONVERSATION_TONE_OPTIONS)[number];

interface SettingsExperienceAiSectionProps {
  modeloIa: ModeloIa;
  estiloResposta: EstiloResposta;
  idiomaResposta: IdiomaResposta;
  memoriaIa: boolean;
  tomConversa: TomConversa;
  onAbrirMenuModeloIa: () => void;
  onAbrirMenuEstiloResposta: () => void;
  onAbrirMenuIdiomaResposta: () => void;
  onSetMemoriaIa: (value: boolean) => void;
  onSetTomConversa: (value: TomConversa) => void;
}

export function SettingsExperienceAiSection({
  modeloIa,
  estiloResposta,
  idiomaResposta,
  memoriaIa,
  tomConversa,
  onAbrirMenuModeloIa,
  onAbrirMenuEstiloResposta,
  onAbrirMenuIdiomaResposta,
  onSetMemoriaIa,
  onSetTomConversa,
}: SettingsExperienceAiSectionProps) {
  return (
    <SettingsSection
      icon="robot-outline"
      subtitle="Ajuste o comportamento da inteligência artificial nas conversas."
      title="Preferências da IA"
    >
      <SettingsPressRow
        icon="brain"
        onPress={onAbrirMenuModeloIa}
        testID="settings-ai-model-row"
        title="Modelo de IA"
        value={modeloIa}
      />
      <SettingsPressRow
        icon="message-text-outline"
        onPress={onAbrirMenuEstiloResposta}
        testID="settings-ai-response-style-row"
        title="Estilo de resposta"
        value={estiloResposta}
      />
      <SettingsPressRow
        icon="translate"
        onPress={onAbrirMenuIdiomaResposta}
        testID="settings-ai-response-language-row"
        title="Idioma do app e da IA"
        value={idiomaResposta}
      />
      <SettingsSwitchRow
        description="Permite lembrar preferências entre conversas."
        icon="memory"
        onValueChange={onSetMemoriaIa}
        title="Memória da IA"
        value={memoriaIa}
      />
      <SettingsSegmentedRow
        description="Tom principal do assistente durante a conversa."
        icon="account-voice"
        onChange={onSetTomConversa}
        options={CONVERSATION_TONE_OPTIONS}
        title="Tom da conversa"
        value={tomConversa}
      />
    </SettingsSection>
  );
}
