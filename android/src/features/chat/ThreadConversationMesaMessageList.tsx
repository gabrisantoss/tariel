import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { EmptyState } from "../../components/EmptyState";
import { colorWithAlpha } from "../../theme/colorUtils";
import type {
  MobileAttachment,
  MobileChatMessage,
  MobileMesaMessage,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { MessageAttachmentCard, MessageReferenceCard } from "./MessageCards";

function obterEstadoPendenciaMesa(
  item: MobileMesaMessage,
): "not_applicable" | "open" | "resolved" {
  if (
    item.pendency_state === "open" ||
    item.pendency_state === "resolved" ||
    item.pendency_state === "not_applicable"
  ) {
    return item.pendency_state;
  }
  const mensagemEhMesa =
    item.item_kind === "pendency" ||
    item.message_kind === "mesa_pendency" ||
    item.tipo === "humano_eng";
  if (!mensagemEhMesa) {
    return "not_applicable";
  }
  return item.resolvida_em ? "resolved" : "open";
}

function mensagemMesaEhUsuario(item: MobileMesaMessage): boolean {
  return (
    item.message_kind === "inspector_whisper" ||
    item.message_kind === "inspector_message" ||
    item.item_kind === "whisper" ||
    item.tipo === "humano_insp"
  );
}

function mensagemMesaEhPendencia(item: MobileMesaMessage): boolean {
  return (
    item.item_kind === "pendency" ||
    item.message_kind === "mesa_pendency" ||
    item.tipo === "humano_eng"
  );
}

function obterContextoOperacionalMesa(item: MobileMesaMessage): {
  title: string;
  summary: string;
  requiredAction: string;
  replyModeLabel: string;
  failureReasons: string[];
} | null {
  const raw = item.operational_context;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (String(record.task_kind || "").trim() !== "coverage_return_request") {
    return null;
  }
  return {
    title: String(record.title || "").trim() || "Item de cobertura",
    summary: String(record.summary || "").trim(),
    requiredAction: String(record.required_action || "").trim(),
    replyModeLabel:
      String(record.expected_reply_mode_label || "").trim() || "resposta livre",
    failureReasons: Array.isArray(record.failure_reasons)
      ? record.failure_reasons.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [],
  };
}

type ThreadConversationMesaMessageListProps = {
  accentColor: string;
  anexoAbrindoChave: string;
  activeOwnerRole?: string;
  caseLifecycleStatus?: string;
  conversaPermiteEdicao: boolean;
  dynamicMessageBubbleStyle: StyleProp<ViewStyle>;
  dynamicMessageTextStyle: StyleProp<TextStyle>;
  freeChatDocumentReviewFlow?: boolean;
  hasReviewSummary: boolean;
  keyboardVisible: boolean;
  mensagensMesa: MobileMesaMessage[];
  mensagensVisiveis: MobileChatMessage[];
  nomeUsuarioExibicao: string;
  obterResumoReferenciaMensagem: (
    referenciaId: number | null,
    mensagensVisiveis: MobileChatMessage[],
    mensagensMesa: MobileMesaMessage[],
  ) => string;
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onAbrirReferenciaNoChat: (id: number) => void;
  onDefinirReferenciaMesaAtiva: (item: MobileMesaMessage) => void;
  sessionAccessToken: string | null;
  toAttachmentKey: (attachment: MobileAttachment, fallback: string) => string;
};

function buildReviewEmptyState(params: {
  activeOwnerRole?: string;
  caseLifecycleStatus?: string;
  freeChatDocumentReviewFlow?: boolean;
  hasReviewSummary: boolean;
}): {
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
} {
  const {
    activeOwnerRole,
    caseLifecycleStatus,
    freeChatDocumentReviewFlow = false,
    hasReviewSummary,
  } = params;

  if (freeChatDocumentReviewFlow) {
    return hasReviewSummary
      ? {
          description:
            "O relatório gerado no chat está acima. Novas correções e versões baixadas ficam concentradas nesta revisão.",
          icon: "clipboard-text-outline",
          title: "Sem novas correções",
        }
      : {
          description:
            "Peça o laudo no chat livre. O relatório gerado aparece aqui para revisão e novo download.",
          icon: "message-reply-text-outline",
          title: "Relatório ainda não gerado",
        };
  }

  if (caseLifecycleStatus === "aprovado" || caseLifecycleStatus === "emitido") {
    return {
      description:
        "A revisão não tem novas mensagens. O caso já pode seguir para a etapa final disponível.",
      icon: "check-decagram-outline",
      title: "Caso aprovado",
    };
  }

  if (caseLifecycleStatus === "devolvido_para_correcao") {
    return {
      description:
        "Quando a revisão registrar o que precisa ser corrigido, as pendências aparecem aqui. Faça os ajustes pelo chat e responda quando houver um pedido aberto.",
      icon: "alert-circle-outline",
      title: "Correção solicitada",
    };
  }

  if (
    activeOwnerRole === "mesa" ||
    caseLifecycleStatus === "aguardando_mesa" ||
    caseLifecycleStatus === "em_revisao_mesa"
  ) {
    return {
      description:
        "O caso está na etapa de revisão. Quando houver pedido de correção, aprovação ou comentário humano, tudo aparece nesta tela.",
      icon: "clipboard-clock-outline",
      title: "Aguardando revisão",
    };
  }

  if (hasReviewSummary) {
    return {
      description:
        "A prévia do caso está acima. Quando ela for enviada para revisão, os retornos humanos aparecem aqui.",
      icon: "clipboard-text-outline",
      title: "Revisão ainda sem retorno",
    };
  }

  return {
    description:
      "Use o chat para montar o caso com fotos, documentos e contexto. Quando o caso for enviado para revisão, pedidos de ajuste e aprovações aparecem aqui.",
    icon: "message-reply-text-outline",
    title: "Revisão ainda não iniciada",
  };
}

type MesaMessageSharedProps = Pick<
  ThreadConversationMesaMessageListProps,
  | "anexoAbrindoChave"
  | "accentColor"
  | "dynamicMessageTextStyle"
  | "onAbrirAnexo"
  | "onAbrirReferenciaNoChat"
  | "sessionAccessToken"
  | "toAttachmentKey"
> & {
  item: MobileMesaMessage;
  referenciaId: number | null;
  referenciaPreview: string;
};

function MesaMessageAttachments(
  props: Pick<
    ThreadConversationMesaMessageListProps,
    | "anexoAbrindoChave"
    | "accentColor"
    | "onAbrirAnexo"
    | "sessionAccessToken"
    | "toAttachmentKey"
  > & {
    attachments: MobileAttachment[] | null | undefined;
    messageId: number | string;
  },
) {
  const {
    accentColor,
    anexoAbrindoChave,
    attachments,
    messageId,
    onAbrirAnexo,
    sessionAccessToken,
    toAttachmentKey,
  } = props;

  if (!attachments?.length) {
    return null;
  }

  return (
    <View style={styles.messageAttachments}>
      {attachments.map((anexo, anexoIndex) => {
        const fallback = `${messageId}-anexo-${anexoIndex}`;
        return (
          <MessageAttachmentCard
            accentColor={accentColor}
            key={fallback}
            accessToken={sessionAccessToken}
            attachment={anexo}
            onPress={onAbrirAnexo}
            opening={anexoAbrindoChave === toAttachmentKey(anexo, fallback)}
          />
        );
      })}
    </View>
  );
}

function MesaOutgoingMessageBubble(
  props: MesaMessageSharedProps & {
    dynamicMessageBubbleStyle: StyleProp<ViewStyle>;
    nomeAutor: string;
  },
) {
  const {
    anexoAbrindoChave,
    accentColor,
    dynamicMessageBubbleStyle,
    dynamicMessageTextStyle,
    item,
    nomeAutor,
    onAbrirAnexo,
    onAbrirReferenciaNoChat,
    referenciaId,
    referenciaPreview,
    sessionAccessToken,
    toAttachmentKey,
  } = props;

  return (
    <View
      style={[
        styles.messageBubble,
        styles.messageBubbleOutgoing,
        dynamicMessageBubbleStyle,
      ]}
    >
      <Text style={[styles.messageAuthor, styles.messageAuthorOutgoing]}>
        {nomeAutor}
      </Text>
      {referenciaId ? (
        <MessageReferenceCard
          accentColor={accentColor}
          messageId={referenciaId}
          onPress={() => onAbrirReferenciaNoChat(referenciaId)}
          preview={referenciaPreview}
          variant="outgoing"
        />
      ) : null}
      <Text
        style={[
          styles.messageText,
          styles.messageTextOutgoing,
          dynamicMessageTextStyle,
        ]}
      >
        {item.texto}
      </Text>
      <MesaMessageAttachments
        accentColor={accentColor}
        anexoAbrindoChave={anexoAbrindoChave}
        attachments={item.anexos}
        messageId={item.id}
        onAbrirAnexo={onAbrirAnexo}
        sessionAccessToken={sessionAccessToken}
        toAttachmentKey={toAttachmentKey}
      />
      <Text style={[styles.messageMeta, styles.messageMetaOutgoing]}>
        {item.data}
        {item.resolvida_em_label
          ? ` • resolvida em ${item.resolvida_em_label}`
          : ""}
      </Text>
    </View>
  );
}

function MesaIncomingMessageBubble(
  props: MesaMessageSharedProps & {
    accentColor: string;
    conversaPermiteEdicao: boolean;
    nomeAutor: string;
    onDefinirReferenciaMesaAtiva: (item: MobileMesaMessage) => void;
  },
) {
  const {
    accentColor,
    anexoAbrindoChave,
    conversaPermiteEdicao,
    dynamicMessageTextStyle,
    item,
    nomeAutor,
    onAbrirAnexo,
    onAbrirReferenciaNoChat,
    onDefinirReferenciaMesaAtiva,
    referenciaId,
    referenciaPreview,
    sessionAccessToken,
    toAttachmentKey,
  } = props;
  const mensagemEhMesa = mensagemMesaEhPendencia(item);
  const estadoPendencia = obterEstadoPendenciaMesa(item);
  const operationalContext = obterContextoOperacionalMesa(item);

  return (
    <View style={styles.messageIncomingCluster}>
      <View style={[styles.messageAvatar, styles.messageAvatarMesa]}>
        <MaterialCommunityIcons
          color={accentColor}
          name="clipboard-text-outline"
          size={16}
        />
      </View>
      <View
        style={[
          styles.messageBubble,
          styles.messageBubbleIncomingShell,
          mensagemEhMesa
            ? styles.messageBubbleEngineering
            : styles.messageBubbleIncoming,
        ]}
      >
        <View style={styles.messageHeaderRow}>
          <Text style={styles.messageAuthor}>{nomeAutor}</Text>
          <View
            style={[
              styles.messageStatusBadge,
              estadoPendencia === "resolved"
                ? styles.messageStatusBadgeSuccess
                : styles.messageStatusBadgeAccent,
              estadoPendencia === "resolved"
                ? null
                : { backgroundColor: colorWithAlpha(accentColor, "18") },
            ]}
          >
            <Text
              style={[
                styles.messageStatusBadgeText,
                estadoPendencia === "resolved"
                  ? styles.messageStatusBadgeTextSuccess
                  : styles.messageStatusBadgeTextAccent,
                estadoPendencia === "resolved" ? null : { color: accentColor },
              ]}
            >
              {estadoPendencia === "resolved"
                ? "Resolvida"
                : estadoPendencia === "open"
                  ? "Pendência aberta"
                  : "Comentário da revisão"}
            </Text>
          </View>
        </View>
        {referenciaId ? (
          <MessageReferenceCard
            accentColor={accentColor}
            messageId={referenciaId}
            onPress={() => onAbrirReferenciaNoChat(referenciaId)}
            preview={referenciaPreview}
          />
        ) : null}
        {operationalContext ? (
          <View style={styles.messageOperationalCard}>
            <Text style={styles.messageOperationalEyebrow}>
              Correção solicitada
            </Text>
            <Text style={styles.messageOperationalTitle}>
              {operationalContext.title}
            </Text>
            {operationalContext.summary ? (
              <Text style={styles.messageOperationalText}>
                {operationalContext.summary}
              </Text>
            ) : null}
            {operationalContext.requiredAction ? (
              <Text style={styles.messageOperationalText}>
                Ação esperada: {operationalContext.requiredAction}
              </Text>
            ) : null}
            <Text style={styles.messageOperationalMeta}>
              Resposta esperada: {operationalContext.replyModeLabel}
            </Text>
            {operationalContext.failureReasons.length ? (
              <Text style={styles.messageOperationalMeta}>
                Motivos: {operationalContext.failureReasons.join(", ")}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.messageText, dynamicMessageTextStyle]}>
          {item.texto}
        </Text>
        <MesaMessageAttachments
          accentColor={accentColor}
          anexoAbrindoChave={anexoAbrindoChave}
          attachments={item.anexos}
          messageId={item.id}
          onAbrirAnexo={onAbrirAnexo}
          sessionAccessToken={sessionAccessToken}
          toAttachmentKey={toAttachmentKey}
        />
        {conversaPermiteEdicao ? (
          <View style={styles.messageActionRow}>
            <Pressable
              onPress={() => onDefinirReferenciaMesaAtiva(item)}
              style={styles.messageActionButton}
            >
              <MaterialCommunityIcons
                name="reply-outline"
                size={15}
                color={accentColor}
              />
              <Text style={styles.messageActionText}>
                {estadoPendencia === "open"
                  ? "Responder esta pendência"
                  : "Responder"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.messageMeta}>
          {item.data}
          {item.resolvida_em_label
            ? ` • resolvida em ${item.resolvida_em_label}`
            : ""}
        </Text>
      </View>
    </View>
  );
}

export function ThreadConversationMesaMessageList(
  props: ThreadConversationMesaMessageListProps,
) {
  const {
    accentColor,
    anexoAbrindoChave,
    activeOwnerRole,
    caseLifecycleStatus,
    conversaPermiteEdicao,
    dynamicMessageBubbleStyle,
    dynamicMessageTextStyle,
    freeChatDocumentReviewFlow,
    hasReviewSummary,
    keyboardVisible,
    mensagensMesa,
    mensagensVisiveis,
    nomeUsuarioExibicao,
    obterResumoReferenciaMensagem,
    onAbrirAnexo,
    onAbrirReferenciaNoChat,
    onDefinirReferenciaMesaAtiva,
    sessionAccessToken,
    toAttachmentKey,
  } = props;

  if (!mensagensMesa.length) {
    const emptyState = buildReviewEmptyState({
      activeOwnerRole,
      caseLifecycleStatus,
      freeChatDocumentReviewFlow,
      hasReviewSummary,
    });

    return (
      <View
        testID="mesa-thread-empty-state"
        style={[
          styles.threadEmptyState,
          keyboardVisible ? styles.threadEmptyStateKeyboardVisible : null,
        ]}
      >
        <EmptyState
          compact
          description={emptyState.description}
          eyebrow="Revisão"
          icon={emptyState.icon}
          title={emptyState.title}
        />
      </View>
    );
  }

  return (
    <View testID="mesa-thread-loaded">
      {mensagensMesa.map((item, index) => {
        const mensagemEhUsuario = mensagemMesaEhUsuario(item);
        const nomeAutor = mensagemEhUsuario ? nomeUsuarioExibicao : "Revisão";
        const referenciaId = Number(item.referencia_mensagem_id || 0) || null;
        const referenciaPreview = obterResumoReferenciaMensagem(
          referenciaId,
          mensagensVisiveis,
          mensagensMesa,
        );

        return (
          <View
            key={`${item.id}-${index}`}
            style={[
              styles.messageRow,
              mensagemEhUsuario
                ? styles.messageRowOutgoing
                : styles.messageRowIncoming,
            ]}
          >
            {mensagemEhUsuario ? (
              <MesaOutgoingMessageBubble
                accentColor={accentColor}
                anexoAbrindoChave={anexoAbrindoChave}
                dynamicMessageBubbleStyle={dynamicMessageBubbleStyle}
                dynamicMessageTextStyle={dynamicMessageTextStyle}
                item={item}
                nomeAutor={nomeAutor}
                onAbrirAnexo={onAbrirAnexo}
                onAbrirReferenciaNoChat={onAbrirReferenciaNoChat}
                referenciaId={referenciaId}
                referenciaPreview={referenciaPreview}
                sessionAccessToken={sessionAccessToken}
                toAttachmentKey={toAttachmentKey}
              />
            ) : (
              <MesaIncomingMessageBubble
                accentColor={accentColor}
                anexoAbrindoChave={anexoAbrindoChave}
                conversaPermiteEdicao={conversaPermiteEdicao}
                dynamicMessageTextStyle={dynamicMessageTextStyle}
                item={item}
                nomeAutor={nomeAutor}
                onAbrirAnexo={onAbrirAnexo}
                onAbrirReferenciaNoChat={onAbrirReferenciaNoChat}
                onDefinirReferenciaMesaAtiva={onDefinirReferenciaMesaAtiva}
                referenciaId={referenciaId}
                referenciaPreview={referenciaPreview}
                sessionAccessToken={sessionAccessToken}
                toAttachmentKey={toAttachmentKey}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
