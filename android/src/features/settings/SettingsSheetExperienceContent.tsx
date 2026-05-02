import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { useAppTranslation } from "../../i18n/appTranslation";
import {
  AI_MODEL_OPTIONS,
  RESPONSE_LANGUAGE_OPTIONS,
  RESPONSE_STYLE_OPTIONS,
  SPEECH_LANGUAGE_OPTIONS,
} from "../InspectorMobileApp.constants";
import { styles } from "../InspectorMobileApp.styles";
import { SettingsInfoButton } from "./SettingsPrimitives";

type ModeloIa = (typeof AI_MODEL_OPTIONS)[number];
type EstiloResposta = (typeof RESPONSE_STYLE_OPTIONS)[number];
type IdiomaResposta = (typeof RESPONSE_LANGUAGE_OPTIONS)[number];
type IdiomaGlobal = Exclude<IdiomaResposta, "Auto detectar">;
type IdiomaVoz = (typeof SPEECH_LANGUAGE_OPTIONS)[number];

const AI_MODEL_DETAILS: Record<ModeloIa, { subtitle: string }> = {
  rápido: {
    subtitle: "Respostas curtas com menor custo e latência.",
  },
  equilibrado: {
    subtitle: "Melhor equilíbrio entre velocidade e profundidade.",
  },
  avançado: {
    subtitle: "Mais contexto e análise para casos complexos.",
  },
};

const RESPONSE_STYLE_DETAILS: Record<EstiloResposta, { subtitle: string }> = {
  curto: {
    subtitle: "Prioriza respostas diretas e objetivas.",
  },
  padrão: {
    subtitle: "Equilibra contexto, clareza e concisão.",
  },
  detalhado: {
    subtitle: "Inclui mais contexto, passos e justificativas.",
  },
  criativo: {
    subtitle: "Permite formulações mais exploratórias quando fizer sentido.",
  },
};

const RESPONSE_LANGUAGE_DETAILS: Record<IdiomaResposta, { subtitle: string }> =
  {
    Português: {
      subtitle: "Mantém as respostas em português.",
    },
    Inglês: {
      subtitle: "Mantém as respostas em inglês.",
    },
    Espanhol: {
      subtitle: "Mantém as respostas em espanhol.",
    },
    "Auto detectar": {
      subtitle: "Apenas a IA acompanha o idioma mais adequado para a conversa.",
    },
  };

const SPEECH_LANGUAGE_DETAILS: Record<IdiomaVoz, { subtitle: string }> = {
  Sistema: {
    subtitle: "Usa o idioma principal configurado no celular.",
  },
  Português: {
    subtitle: "Usa português para leitura em voz alta e recursos de voz.",
  },
  Inglês: {
    subtitle: "Usa inglês para leitura em voz alta e recursos de voz.",
  },
  Espanhol: {
    subtitle: "Usa espanhol para leitura em voz alta e recursos de voz.",
  },
};

const GLOBAL_LANGUAGE_OPTIONS = RESPONSE_LANGUAGE_OPTIONS.filter(
  (option): option is IdiomaGlobal => option !== "Auto detectar",
);

function optionTestId(prefix: string, value: string): string {
  return `${prefix}-${value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function SettingsChoiceSheetContent<T extends string>({
  activeValue,
  details,
  onSelect,
  options,
  testIDPrefix,
}: {
  activeValue: T;
  details: Record<T, { subtitle: string }>;
  onSelect: (value: T) => void;
  options: readonly T[];
  testIDPrefix: string;
}) {
  const { t } = useAppTranslation();
  return (
    <View style={styles.settingsMiniList}>
      {options.map((option) => {
        const ativo = option === activeValue;
        const itemTestId = optionTestId(testIDPrefix, option);
        return (
          <Pressable
            key={`${testIDPrefix}-${option}`}
            onPress={() => onSelect(option)}
            style={[
              styles.settingsMiniListItem,
              styles.settingsMiniListItemPressable,
              ativo ? styles.settingsMiniListItemActive : null,
            ]}
            testID={itemTestId}
          >
            <View style={styles.settingsMiniListItemHeader}>
              <Text
                style={[
                  styles.settingsMiniListTitle,
                  ativo ? styles.settingsMiniListTitleActive : null,
                ]}
              >
                {t(option)}
              </Text>
              <View style={styles.settingsMiniListActions}>
                <SettingsInfoButton
                  description={details[option].subtitle}
                  style={styles.settingsMiniListInfoButton}
                  testID={`${itemTestId}-info`}
                  title={option}
                />
                <View
                  style={[
                    styles.settingsMiniListSelectionBadge,
                    ativo ? styles.settingsMiniListSelectionBadgeActive : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={ativo ? colors.white : colors.textSecondary}
                    name={ativo ? "check" : "circle-outline"}
                    size={14}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.settingsMiniListMeta}>
              {t(details[option].subtitle)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsAiModelSheetContent({
  modeloIa,
  onSelecionarModeloIa,
}: {
  modeloIa: ModeloIa;
  onSelecionarModeloIa: (value: ModeloIa) => void;
}) {
  return (
    <SettingsChoiceSheetContent
      activeValue={modeloIa}
      details={AI_MODEL_DETAILS}
      onSelect={onSelecionarModeloIa}
      options={AI_MODEL_OPTIONS}
      testIDPrefix="settings-ai-model-option"
    />
  );
}

export function SettingsResponseStyleSheetContent({
  estiloResposta,
  onSelecionarEstiloResposta,
}: {
  estiloResposta: EstiloResposta;
  onSelecionarEstiloResposta: (value: EstiloResposta) => void;
}) {
  return (
    <SettingsChoiceSheetContent
      activeValue={estiloResposta}
      details={RESPONSE_STYLE_DETAILS}
      onSelect={onSelecionarEstiloResposta}
      options={RESPONSE_STYLE_OPTIONS}
      testIDPrefix="settings-response-style-option"
    />
  );
}

export function SettingsResponseLanguageSheetContent({
  idiomaResposta,
  onSelecionarIdiomaResposta,
}: {
  idiomaResposta: IdiomaResposta;
  onSelecionarIdiomaResposta: (value: IdiomaResposta) => void;
}) {
  return (
    <SettingsChoiceSheetContent
      activeValue={idiomaResposta}
      details={RESPONSE_LANGUAGE_DETAILS}
      onSelect={onSelecionarIdiomaResposta}
      options={GLOBAL_LANGUAGE_OPTIONS}
      testIDPrefix="settings-response-language-option"
    />
  );
}

export function SettingsVoiceLanguageSheetContent({
  voiceLanguage,
  onSelecionarVoiceLanguage,
}: {
  voiceLanguage: IdiomaVoz;
  onSelecionarVoiceLanguage: (value: IdiomaVoz) => void;
}) {
  return (
    <SettingsChoiceSheetContent
      activeValue={voiceLanguage}
      details={SPEECH_LANGUAGE_DETAILS}
      onSelect={onSelecionarVoiceLanguage}
      options={SPEECH_LANGUAGE_OPTIONS}
      testIDPrefix="settings-voice-language-option"
    />
  );
}
