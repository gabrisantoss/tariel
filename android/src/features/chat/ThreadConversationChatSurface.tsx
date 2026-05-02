import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, type RefObject } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  AssistantCitationList,
  AssistantMessageContent,
} from "../../components/AssistantRichMessage";
import { EmptyState } from "../../components/EmptyState";
import { useAppTranslation } from "../../i18n/appTranslation";
import {
  colorWithAlpha,
  resolveAccentColorForMode,
} from "../../theme/colorUtils";
import type {
  MobileAttachment,
  MobileChatMessage,
  MobileMesaMessage,
  MobileReviewPackage,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { MessageAttachmentCard, MessageReferenceCard } from "./MessageCards";
import { ehImagemAnexo } from "./attachmentUtils";
import { stripEmbeddedChatAiPreferences } from "./preferences";
import { renderizarDocumentoEmitidoCard } from "./ThreadConversationIssuedDocumentCard";

interface ThreadConversationChatSurfaceProps {
  accentColor: string;
  carregandoConversa: boolean;
  conversaVazia: boolean;
  darkMode?: boolean;
  emptyStateImageAccessibilityLabel?: string;
  emptyStateImageSource?: ImageSourcePropType | null;
  emptyStateTitle?: string;
  keyboardVisible: boolean;
  threadKeyboardPaddingBottom: number;
  scrollRef: RefObject<ScrollView | null>;
  fluxoFormalAtivo: boolean;
  reviewPackage?: MobileReviewPackage | null;
  caseLifecycleStatus?: string;
  mensagensVisiveis: MobileChatMessage[];
  mensagensMesa: MobileMesaMessage[];
  obterResumoReferenciaMensagem: (
    referenciaId: number | null,
    mensagensVisiveis: MobileChatMessage[],
    mensagensMesa: MobileMesaMessage[],
  ) => string;
  onAbrirReferenciaNoChat: (id: number) => void;
  sessionAccessToken: string | null;
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  anexoAbrindoChave: string;
  toAttachmentKey: (attachment: MobileAttachment, fallback: string) => string;
  mensagemChatDestacadaId: number | null;
  onRegistrarLayoutMensagemChat: (id: number | null, y: number) => void;
  dynamicMessageBubbleStyle: StyleProp<ViewStyle>;
  dynamicMessageTextStyle: StyleProp<TextStyle>;
  enviandoMensagem: boolean;
}

function buildLatestAssistantDocumentAttachmentKey(
  mensagens: MobileChatMessage[],
): string {
  let latestKey = "";

  mensagens.forEach((mensagem, messageIndex) => {
    if (mensagem.papel !== "assistente" || !Array.isArray(mensagem.anexos)) {
      return;
    }

    mensagem.anexos.forEach((anexo, attachmentIndex) => {
      if (ehImagemAnexo(anexo)) {
        return;
      }
      latestKey = `${mensagem.id ?? `msg-${messageIndex}`}:${attachmentIndex}`;
    });
  });

  return latestKey;
}

function mensagemTemImagem(mensagem: MobileChatMessage): boolean {
  return Boolean(mensagem.anexos?.some((anexo) => ehImagemAnexo(anexo)));
}

function textoEhFallbackImagem(texto: string, textoTraduzido: string): boolean {
  const valor = texto.trim();
  return (
    valor === "[imagem]" ||
    valor === "Imagem enviada" ||
    valor === textoTraduzido
  );
}

export function ThreadConversationChatSurface({
  accentColor,
  carregandoConversa,
  conversaVazia,
  darkMode = false,
  emptyStateImageAccessibilityLabel,
  emptyStateImageSource,
  emptyStateTitle,
  keyboardVisible,
  threadKeyboardPaddingBottom,
  scrollRef,
  fluxoFormalAtivo,
  reviewPackage,
  caseLifecycleStatus,
  mensagensVisiveis,
  mensagensMesa,
  obterResumoReferenciaMensagem,
  onAbrirReferenciaNoChat,
  sessionAccessToken,
  onAbrirAnexo,
  anexoAbrindoChave,
  toAttachmentKey,
  mensagemChatDestacadaId,
  onRegistrarLayoutMensagemChat,
  dynamicMessageBubbleStyle,
  dynamicMessageTextStyle,
  enviandoMensagem,
}: ThreadConversationChatSurfaceProps) {
  const { t } = useAppTranslation();
  const visibleAccentColor = resolveAccentColorForMode(accentColor, darkMode);
  const normalizarTextoRenderizado = (
    texto: string,
    options: { mensagemEhUsuario: boolean },
  ) =>
    stripEmbeddedChatAiPreferences(texto, {
      fallbackHiddenOnly: options.mensagemEhUsuario
        ? t("Evidência enviada")
        : "",
    });

  useEffect(() => {
    if (mensagemChatDestacadaId) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [
    carregandoConversa,
    mensagemChatDestacadaId,
    mensagensVisiveis.length,
    scrollRef,
  ]);

  if (carregandoConversa) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={visibleAccentColor} size="large" />
        <Text
          style={[styles.loadingText, darkMode ? styles.loadingTextDark : null]}
        >
          {t("Carregando a conversa do inspetor...")}
        </Text>
      </View>
    );
  }

  if (conversaVazia) {
    return (
      <View
        style={[
          styles.threadEmptyState,
          keyboardVisible ? styles.threadEmptyStateKeyboardVisible : null,
        ]}
      >
        <EmptyState
          compact
          darkMode={darkMode}
          icon="message-processing-outline"
          imageAccessibilityLabel={emptyStateImageAccessibilityLabel}
          imageSource={emptyStateImageSource}
          title={emptyStateTitle ? t(emptyStateTitle) : undefined}
        />
      </View>
    );
  }

  const latestAssistantDocumentAttachmentKey =
    buildLatestAssistantDocumentAttachmentKey(mensagensVisiveis);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.threadScroll}
      contentContainerStyle={[
        styles.threadContent,
        keyboardVisible ? styles.threadContentKeyboard : null,
        keyboardVisible ? { paddingBottom: threadKeyboardPaddingBottom } : null,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID="chat-thread-surface"
    >
      {fluxoFormalAtivo
        ? renderizarDocumentoEmitidoCard(
            reviewPackage,
            caseLifecycleStatus,
            onAbrirAnexo,
          )
        : null}
      {mensagensVisiveis.map((item, index) => {
        const mensagemEhUsuario = item.papel === "usuario";
        const mensagemEhEngenharia = item.papel === "engenheiro";
        const mensagemEhAssistente = item.papel === "assistente";
        const textoRenderizado = normalizarTextoRenderizado(item.texto, {
          mensagemEhUsuario,
        });
        const textoImagemFallback = t("Imagem enviada");
        const textoMensagem =
          textoRenderizado === "[imagem]"
            ? textoImagemFallback
            : textoRenderizado;
        const ocultarTextoImagemUsuario =
          mensagemEhUsuario &&
          textoEhFallbackImagem(textoRenderizado, textoImagemFallback) &&
          mensagemTemImagem(item);
        const nomeAutor = mensagemEhEngenharia ? t("Revisão") : "";
        const referenciaId = Number(item.referencia_mensagem_id || 0) || null;
        const referenciaPreview = obterResumoReferenciaMensagem(
          referenciaId,
          mensagensVisiveis,
          mensagensMesa,
        );
        const mensagemDestacada = Boolean(
          item.id && item.id === mensagemChatDestacadaId,
        );

        return (
          <View
            key={`${item.id ?? "placeholder"}-${index}`}
            onLayout={(event) =>
              onRegistrarLayoutMensagemChat(item.id, event.nativeEvent.layout.y)
            }
            style={[
              styles.messageRow,
              mensagemEhUsuario
                ? styles.messageRowOutgoing
                : styles.messageRowIncoming,
            ]}
          >
            {mensagemEhUsuario ? (
              <View
                style={[
                  styles.messageBubble,
                  styles.messageBubbleOutgoing,
                  mensagemDestacada ? styles.messageBubbleReferenced : null,
                ]}
              >
                {referenciaId ? (
                  <MessageReferenceCard
                    accentColor={visibleAccentColor}
                    messageId={referenciaId}
                    onPress={() => onAbrirReferenciaNoChat(referenciaId)}
                    preview={referenciaPreview}
                    variant="outgoing"
                  />
                ) : null}
                {!ocultarTextoImagemUsuario ? (
                  <Text
                    style={[
                      styles.messageText,
                      styles.messageTextOutgoing,
                      dynamicMessageTextStyle,
                    ]}
                  >
                    {textoMensagem}
                  </Text>
                ) : null}
                {item.anexos?.length ? (
                  <View style={styles.messageAttachments}>
                    {item.anexos.map((anexo, anexoIndex) => {
                      return (
                        <MessageAttachmentCard
                          accentColor={visibleAccentColor}
                          key={`${item.id ?? "msg"}-anexo-${anexoIndex}`}
                          accessToken={sessionAccessToken}
                          attachment={anexo}
                          onPress={onAbrirAnexo}
                          opening={
                            anexoAbrindoChave ===
                            toAttachmentKey(
                              anexo,
                              `${item.id ?? "msg"}-anexo-${anexoIndex}`,
                            )
                          }
                        />
                      );
                    })}
                  </View>
                ) : null}
                {item.citacoes?.length ? (
                  <Text
                    style={[styles.messageMeta, styles.messageMetaOutgoing]}
                  >
                    {t(
                      `${item.citacoes.length} referência${item.citacoes.length > 1 ? "s" : ""} anexada`,
                    )}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.messageIncomingCluster,
                  !mensagemEhEngenharia
                    ? styles.messageIncomingClusterAssistant
                    : null,
                ]}
              >
                {mensagemEhEngenharia ? (
                  <View
                    style={[
                      styles.messageAvatar,
                      styles.messageAvatarEngineering,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={visibleAccentColor}
                      name="clipboard-check-outline"
                      size={16}
                    />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.messageBubble,
                    styles.messageBubbleIncomingShell,
                    !mensagemEhEngenharia
                      ? styles.messageBubbleIncomingAssistant
                      : null,
                    mensagemEhEngenharia
                      ? styles.messageBubbleEngineering
                      : styles.messageBubbleIncoming,
                    darkMode && mensagemEhEngenharia
                      ? styles.messageBubbleEngineeringDark
                      : null,
                    darkMode && !mensagemEhEngenharia
                      ? styles.messageBubbleIncomingDark
                      : null,
                    mensagemDestacada ? styles.messageBubbleReferenced : null,
                    dynamicMessageBubbleStyle,
                  ]}
                >
                  {mensagemEhEngenharia ? (
                    <View style={styles.messageHeaderRow}>
                      <Text style={styles.messageAuthor}>{nomeAutor}</Text>
                      <View
                        style={[
                          styles.messageStatusBadge,
                          styles.messageStatusBadgeAccent,
                          {
                            backgroundColor: colorWithAlpha(
                              visibleAccentColor,
                              "18",
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageStatusBadgeText,
                            styles.messageStatusBadgeTextAccent,
                            { color: visibleAccentColor },
                          ]}
                        >
                          {t("Revisão")}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {referenciaId ? (
                    <MessageReferenceCard
                      accentColor={visibleAccentColor}
                      messageId={referenciaId}
                      onPress={() => onAbrirReferenciaNoChat(referenciaId)}
                      preview={referenciaPreview}
                    />
                  ) : null}
                  {mensagemEhAssistente ? (
                    <AssistantMessageContent
                      text={textoMensagem}
                      textStyle={[
                        styles.messageText,
                        darkMode ? styles.messageTextDark : null,
                        dynamicMessageTextStyle,
                      ]}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        darkMode ? styles.messageTextDark : null,
                        dynamicMessageTextStyle,
                      ]}
                    >
                      {textoMensagem}
                    </Text>
                  )}
                  {item.anexos?.length ? (
                    <View style={styles.messageAttachments}>
                      {item.anexos.map((anexo, anexoIndex) => {
                        const attachmentKey = `${
                          item.id ?? `msg-${index}`
                        }:${anexoIndex}`;
                        const latestAssistantDocumentAttachment =
                          mensagemEhAssistente &&
                          !ehImagemAnexo(anexo) &&
                          attachmentKey ===
                            latestAssistantDocumentAttachmentKey;

                        return (
                          <MessageAttachmentCard
                            accentColor={visibleAccentColor}
                            key={`${item.id ?? "msg"}-anexo-${anexoIndex}`}
                            accessToken={sessionAccessToken}
                            attachment={anexo}
                            onPress={onAbrirAnexo}
                            opening={
                              anexoAbrindoChave ===
                              toAttachmentKey(
                                anexo,
                                `${item.id ?? "msg"}-anexo-${anexoIndex}`,
                              )
                            }
                            testID={
                              latestAssistantDocumentAttachment
                                ? "chat-last-assistant-document-attachment"
                                : undefined
                            }
                          />
                        );
                      })}
                    </View>
                  ) : null}
                  {mensagemEhAssistente ? (
                    <AssistantCitationList citations={item.citacoes} />
                  ) : item.citacoes?.length ? (
                    <Text style={styles.messageMeta}>
                      {t(
                        `${item.citacoes.length} referência${item.citacoes.length > 1 ? "s" : ""} anexada`,
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        );
      })}

      {enviandoMensagem ? (
        <View style={styles.typingRow} testID="chat-thread-typing">
          <View
            style={[
              styles.typingBubble,
              darkMode ? styles.typingBubbleDark : null,
            ]}
          >
            <ActivityIndicator color={visibleAccentColor} size="small" />
            <Text
              style={[
                styles.typingText,
                darkMode ? styles.typingTextDark : null,
              ]}
            >
              {t("Tariel está respondendo")}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
