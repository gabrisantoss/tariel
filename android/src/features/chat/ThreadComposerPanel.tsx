import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import type {
  ApiHealthStatus,
  MobileQualityGateResponse,
} from "../../types/mobile";
import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import type { MessageReferenceState } from "./types";
import { QualityGateModal } from "./QualityGateModal";

type ComposerAttachmentDraft =
  | {
      kind: "image";
      label: string;
      resumo: string;
      previewUri: string;
    }
  | {
      kind: "image_set";
      label: string;
      resumo: string;
      imagens: Array<{
        previewUri: string;
      }>;
    }
  | {
      kind: "document";
      label: string;
      resumo: string;
    };

export interface ThreadComposerPanelProps {
  visible: boolean;
  darkMode?: boolean;
  keyboardVisible: boolean;
  canReopen: boolean;
  onReopen: () => void;
  filaOfflineTotal?: number;
  sincronizandoFilaOffline?: boolean;
  onSincronizarFilaOffline?: () => void;
  qualityGateVisible: boolean;
  qualityGateLoading: boolean;
  qualityGateSubmitting: boolean;
  qualityGatePayload: MobileQualityGateResponse | null;
  qualityGateReason: string;
  qualityGateNotice: string;
  statusApi: ApiHealthStatus;
  onCloseQualityGate: () => void;
  onConfirmQualityGate: () => void;
  onSetQualityGateReason: (value: string) => void;
  vendoMesa: boolean;
  erroMesa: string;
  mensagemMesaReferenciaAtiva: MessageReferenceState | null;
  onLimparReferenciaMesaAtiva: () => void;
  anexoMesaRascunho: ComposerAttachmentDraft | null;
  onClearAnexoMesaRascunho: () => void;
  podeAbrirAnexosMesa: boolean;
  podeUsarComposerMesa: boolean;
  mensagemMesa: string;
  onSetMensagemMesa: (value: string) => void;
  placeholderMesa: string;
  podeEnviarMesa: boolean;
  onEnviarMensagemMesa: () => void;
  enviandoMesa: boolean;
  showVoiceInputAction: boolean;
  onVoiceInputPress: () => void;
  voiceInputEnabled: boolean;
  composerNotice: string;
  anexoRascunho: ComposerAttachmentDraft | null;
  onClearAnexoRascunho: () => void;
  podeAbrirAnexosChat: boolean;
  podeAcionarComposer: boolean;
  mensagem: string;
  onSetMensagem: (value: string) => void;
  placeholderComposer: string;
  podeEnviarComposer: boolean;
  onEnviarMensagem: () => void;
  enviandoMensagem: boolean;
  onAbrirSeletorAnexo: () => void;
  dynamicComposerInputStyle: StyleProp<TextStyle>;
  accentColor: string;
}

function AttachmentDraftCard({
  attachment,
  darkMode = false,
  scope,
  onRemove,
}: {
  attachment: ComposerAttachmentDraft;
  darkMode?: boolean;
  scope: "chat" | "mesa";
  onRemove: () => void;
}) {
  const { t } = useAppTranslation();
  const baseTestId = `${scope}-attachment-draft`;
  const showImageCarousel = attachment.kind === "image_set";

  return (
    <View
      style={[
        styles.attachmentDraftCard,
        darkMode ? styles.attachmentDraftCardDark : null,
      ]}
      testID={`${baseTestId}-card`}
    >
      <View style={styles.attachmentDraftHeader}>
        {attachment.kind === "image" ? (
          <Image
            source={{
              uri: attachment.previewUri,
            }}
            style={styles.attachmentDraftPreview}
            testID={`${baseTestId}-kind-image`}
          />
        ) : attachment.kind === "document" ? (
          <View
            style={[
              styles.attachmentDraftIcon,
              darkMode ? styles.attachmentDraftIconDark : null,
            ]}
            testID={`${baseTestId}-kind-document`}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={darkMode ? "#AFC0D2" : colors.textSecondary}
            />
          </View>
        ) : null}
        <View style={styles.attachmentDraftCopy}>
          <Text
            style={[
              styles.attachmentDraftTitle,
              darkMode ? styles.attachmentDraftTitleDark : null,
            ]}
            testID={`${baseTestId}-title`}
          >
            {t(attachment.label)}
          </Text>
          <Text
            style={[
              styles.attachmentDraftDescription,
              darkMode ? styles.attachmentDraftDescriptionDark : null,
            ]}
            testID={`${baseTestId}-description`}
          >
            {t(attachment.resumo)}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          style={[
            styles.attachmentDraftRemove,
            darkMode ? styles.attachmentDraftRemoveDark : null,
          ]}
          testID={`${baseTestId}-remove`}
        >
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={darkMode ? "#AFC0D2" : colors.textSecondary}
          />
        </Pressable>
      </View>
      {showImageCarousel ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentDraftCarousel}
          contentContainerStyle={styles.attachmentDraftCarouselContent}
          testID={`${baseTestId}-image-carousel`}
        >
          {attachment.imagens.map((imagem, index) => (
            <View
              key={`${imagem.previewUri}-${index}`}
              style={styles.attachmentDraftCarouselItem}
            >
              <Image
                source={{ uri: imagem.previewUri }}
                style={styles.attachmentDraftCarouselImage}
                testID={`${baseTestId}-carousel-image-${index}`}
              />
              <View style={styles.attachmentDraftCarouselBadge}>
                <Text style={styles.attachmentDraftCarouselBadgeText}>
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function ThreadComposerPanel({
  visible,
  darkMode = false,
  keyboardVisible,
  canReopen,
  onReopen,
  filaOfflineTotal = 0,
  sincronizandoFilaOffline = false,
  onSincronizarFilaOffline,
  qualityGateVisible,
  qualityGateLoading,
  qualityGateSubmitting,
  qualityGatePayload,
  qualityGateReason,
  qualityGateNotice,
  statusApi,
  onCloseQualityGate,
  onConfirmQualityGate,
  onSetQualityGateReason,
  vendoMesa,
  erroMesa,
  mensagemMesaReferenciaAtiva,
  onLimparReferenciaMesaAtiva,
  anexoMesaRascunho,
  onClearAnexoMesaRascunho,
  podeAbrirAnexosMesa,
  podeUsarComposerMesa,
  mensagemMesa,
  onSetMensagemMesa,
  placeholderMesa,
  podeEnviarMesa,
  onEnviarMensagemMesa,
  enviandoMesa,
  showVoiceInputAction,
  onVoiceInputPress,
  voiceInputEnabled,
  composerNotice,
  anexoRascunho,
  onClearAnexoRascunho,
  podeAbrirAnexosChat,
  podeAcionarComposer,
  mensagem,
  onSetMensagem,
  placeholderComposer: _placeholderComposer,
  podeEnviarComposer,
  onEnviarMensagem,
  enviandoMensagem,
  onAbrirSeletorAnexo,
  dynamicComposerInputStyle,
  accentColor,
}: ThreadComposerPanelProps) {
  const { t } = useAppTranslation();

  if (!visible) {
    return null;
  }

  const showComposerHeader =
    vendoMesa && (!podeUsarComposerMesa || Boolean(composerNotice));
  const showInlineComposerNotice = Boolean(!vendoMesa && composerNotice);
  const showOfflineQueueAction =
    filaOfflineTotal > 0 && Boolean(onSincronizarFilaOffline);
  const composerTitle = podeUsarComposerMesa
    ? t("Responder à revisão")
    : t("Revisão em leitura");
  const composerStatusLabel = vendoMesa
    ? podeUsarComposerMesa
      ? t("Resposta liberada")
      : t("Modo leitura")
    : "";
  const composerStatusStyle = vendoMesa
    ? podeUsarComposerMesa
      ? styles.composerStatusBadgeAccent
      : null
    : null;
  const composerStatusTextStyle = vendoMesa
    ? podeUsarComposerMesa
      ? styles.composerStatusBadgeTextAccent
      : null
    : null;
  const placeholderChat = "";

  return (
    <View
      style={[
        styles.composerCard,
        keyboardVisible ? styles.composerCardKeyboardVisible : null,
      ]}
    >
      {showComposerHeader ? (
        <View style={styles.composerHeader}>
          <View style={styles.composerHeaderCopy}>
            <Text
              style={[
                styles.composerTitle,
                darkMode ? styles.composerTitleDark : null,
              ]}
            >
              {composerTitle}
            </Text>
            {!!composerNotice ? (
              <Text
                style={[
                  styles.composerSubtitle,
                  darkMode ? styles.composerSubtitleDark : null,
                ]}
              >
                {t(composerNotice)}
              </Text>
            ) : null}
          </View>
          <View style={[styles.composerStatusBadge, composerStatusStyle]}>
            <Text
              style={[styles.composerStatusBadgeText, composerStatusTextStyle]}
            >
              {composerStatusLabel}
            </Text>
          </View>
        </View>
      ) : null}

      {canReopen || showInlineComposerNotice || showOfflineQueueAction ? (
        <View style={styles.composerMiniActions}>
          {showOfflineQueueAction ? (
            <Pressable
              accessibilityLabel={t("Sincronizar fila offline")}
              accessibilityState={{ disabled: sincronizandoFilaOffline }}
              hitSlop={8}
              onPress={() => {
                if (sincronizandoFilaOffline) {
                  return;
                }
                onSincronizarFilaOffline?.();
              }}
              style={[
                styles.composerMiniAction,
                darkMode ? styles.composerMiniActionDark : null,
                sincronizandoFilaOffline
                  ? styles.composerMiniActionDisabled
                  : null,
              ]}
              testID="chat-composer-offline-sync-emoji"
            >
              <Text style={styles.composerMiniActionEmoji}>🔁</Text>
            </Pressable>
          ) : null}
          {canReopen ? (
            <Pressable
              accessibilityLabel={t("Reabrir laudo")}
              hitSlop={8}
              onPress={onReopen}
              style={[
                styles.composerMiniAction,
                darkMode ? styles.composerMiniActionDark : null,
              ]}
              testID="chat-composer-reopen-icon"
            >
              <MaterialCommunityIcons
                name="history"
                size={14}
                color={accentColor}
              />
            </Pressable>
          ) : null}
          {showInlineComposerNotice ? (
            <Pressable
              accessibilityLabel={t("Detalhes da configuração atual da IA")}
              hitSlop={8}
              onPress={() => {
                Alert.alert(t("Configuração atual da IA"), t(composerNotice));
              }}
              style={[
                styles.composerMiniAction,
                darkMode ? styles.composerMiniActionDark : null,
              ]}
              testID="chat-composer-ai-notice-icon"
            >
              <MaterialCommunityIcons
                name="robot-outline"
                size={14}
                color={darkMode ? "#AFC0D2" : colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {vendoMesa ? (
        <>
          {!!erroMesa && <Text style={styles.errorText}>{t(erroMesa)}</Text>}

          {mensagemMesaReferenciaAtiva ? (
            <View
              style={[
                styles.composerReferenceCard,
                darkMode ? styles.composerReferenceCardDark : null,
              ]}
            >
              <View style={styles.composerReferenceCopy}>
                <Text style={styles.composerReferenceTitle}>
                  {t("Respondendo")} #{mensagemMesaReferenciaAtiva.id}
                </Text>
                <Text
                  style={[
                    styles.composerReferenceText,
                    darkMode ? styles.composerReferenceTextDark : null,
                  ]}
                >
                  {mensagemMesaReferenciaAtiva.texto}
                </Text>
              </View>
              <Pressable
                onPress={onLimparReferenciaMesaAtiva}
                style={[
                  styles.composerReferenceRemove,
                  darkMode ? styles.composerReferenceRemoveDark : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color={darkMode ? "#AFC0D2" : colors.textSecondary}
                />
              </Pressable>
            </View>
          ) : null}

          {anexoMesaRascunho ? (
            <AttachmentDraftCard
              attachment={anexoMesaRascunho}
              darkMode={darkMode}
              scope="mesa"
              onRemove={onClearAnexoMesaRascunho}
            />
          ) : null}

          <View
            style={[
              styles.composerRow,
              darkMode ? styles.composerRowDark : null,
            ]}
          >
            <Pressable
              accessibilityState={{ disabled: !podeAbrirAnexosMesa }}
              onPress={() => {
                if (!podeAbrirAnexosMesa) {
                  return;
                }
                onAbrirSeletorAnexo();
              }}
              style={[
                styles.attachInsideButton,
                !podeAbrirAnexosMesa ? styles.attachButtonDisabled : null,
              ]}
              testID="mesa-attach-button"
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={darkMode ? "#AFC0D2" : colors.textSecondary}
              />
            </Pressable>
            {showVoiceInputAction ? (
              <Pressable
                accessibilityState={{ disabled: !voiceInputEnabled }}
                onPress={() => {
                  onVoiceInputPress();
                }}
                style={[
                  styles.attachInsideButton,
                  !voiceInputEnabled ? styles.attachButtonDisabled : null,
                ]}
                testID="mesa-voice-button"
              >
                <MaterialCommunityIcons
                  name={
                    voiceInputEnabled ? "microphone-outline" : "microphone-off"
                  }
                  size={18}
                  color={darkMode ? "#AFC0D2" : colors.textSecondary}
                />
              </Pressable>
            ) : null}
            <TextInput
              editable={podeUsarComposerMesa}
              multiline
              onChangeText={onSetMensagemMesa}
              placeholder={t(placeholderMesa)}
              placeholderTextColor={darkMode ? "#8999AB" : colors.textSecondary}
              style={[
                styles.composerInput,
                darkMode ? styles.composerInputDark : null,
                dynamicComposerInputStyle,
                !podeUsarComposerMesa ? styles.composerInputDisabled : null,
              ]}
              testID="mesa-composer-input"
              value={mensagemMesa}
            />

            <Pressable
              accessibilityState={{ disabled: !podeEnviarMesa }}
              onPress={() => {
                if (!podeEnviarMesa) {
                  return;
                }
                onEnviarMensagemMesa();
              }}
              style={[
                styles.sendButton,
                { backgroundColor: accentColor },
                !podeEnviarMesa ? styles.sendButtonDisabled : null,
              ]}
              testID="mesa-send-button"
            >
              {enviandoMesa ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={colors.white}
                />
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {anexoRascunho ? (
            <AttachmentDraftCard
              attachment={anexoRascunho}
              darkMode={darkMode}
              scope="chat"
              onRemove={onClearAnexoRascunho}
            />
          ) : null}

          <View
            style={[
              styles.composerRow,
              darkMode ? styles.composerRowDark : null,
            ]}
          >
            <Pressable
              accessibilityState={{ disabled: !podeAbrirAnexosChat }}
              onPress={() => {
                if (!podeAbrirAnexosChat) {
                  return;
                }
                onAbrirSeletorAnexo();
              }}
              style={[
                styles.attachInsideButton,
                !podeAbrirAnexosChat ? styles.attachButtonDisabled : null,
              ]}
              testID="chat-attach-button"
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={darkMode ? "#AFC0D2" : colors.textSecondary}
              />
            </Pressable>
            {showVoiceInputAction ? (
              <Pressable
                accessibilityState={{ disabled: !voiceInputEnabled }}
                onPress={() => {
                  onVoiceInputPress();
                }}
                style={[
                  styles.attachInsideButton,
                  !voiceInputEnabled ? styles.attachButtonDisabled : null,
                ]}
                testID="chat-voice-button"
              >
                <MaterialCommunityIcons
                  name={
                    voiceInputEnabled ? "microphone-outline" : "microphone-off"
                  }
                  size={18}
                  color={darkMode ? "#AFC0D2" : colors.textSecondary}
                />
              </Pressable>
            ) : null}
            <TextInput
              editable={podeAcionarComposer}
              multiline
              onChangeText={onSetMensagem}
              placeholder={placeholderChat}
              placeholderTextColor={darkMode ? "#8999AB" : colors.textSecondary}
              style={[
                styles.composerInput,
                darkMode ? styles.composerInputDark : null,
                dynamicComposerInputStyle,
                !podeAcionarComposer ? styles.composerInputDisabled : null,
              ]}
              testID="chat-composer-input"
              value={mensagem}
            />

            <Pressable
              accessibilityState={{ disabled: !podeEnviarComposer }}
              onPress={() => {
                if (!podeEnviarComposer) {
                  return;
                }
                onEnviarMensagem();
              }}
              style={[
                styles.sendButton,
                { backgroundColor: accentColor },
                !podeEnviarComposer ? styles.sendButtonDisabled : null,
              ]}
              testID="chat-send-button"
            >
              {enviandoMensagem ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={colors.white}
                />
              )}
            </Pressable>
          </View>
        </>
      )}

      <QualityGateModal
        loading={qualityGateLoading}
        notice={qualityGateNotice}
        onChangeReason={onSetQualityGateReason}
        onClose={onCloseQualityGate}
        onConfirm={onConfirmQualityGate}
        payload={qualityGatePayload}
        reason={qualityGateReason}
        statusApi={statusApi}
        submitting={qualityGateSubmitting}
        visible={qualityGateVisible}
      />
    </View>
  );
}
