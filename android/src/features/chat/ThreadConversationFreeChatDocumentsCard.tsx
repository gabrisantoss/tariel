import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import type { MobileAttachment, MobileChatMessage } from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { nomeExibicaoAnexo, tamanhoHumanoAnexo } from "./attachmentUtils";

export interface FreeChatDocumentReviewItem {
  attachment: MobileAttachment;
  messageId: number | null;
  status: "current" | "previous";
  version: number;
  versionLabel: string;
}

function isPdfAttachment(anexo: MobileAttachment): boolean {
  const mime = String(anexo.mime_type || "")
    .trim()
    .toLowerCase();
  const name = nomeExibicaoAnexo(anexo, "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

export function buildFreeChatDocumentReviewItems(
  mensagens: MobileChatMessage[],
): FreeChatDocumentReviewItem[] {
  const chronological: Array<{
    attachment: MobileAttachment;
    messageId: number | null;
  }> = [];

  mensagens.forEach((mensagem) => {
    if (mensagem.papel !== "assistente" || !Array.isArray(mensagem.anexos)) {
      return;
    }

    mensagem.anexos.forEach((anexo) => {
      if (isPdfAttachment(anexo)) {
        chronological.push({
          attachment: anexo,
          messageId: mensagem.id,
        });
      }
    });
  });

  const total = chronological.length;
  return chronological
    .map((item, index) => {
      const version = index + 1;
      return {
        ...item,
        status: index === total - 1 ? "current" : "previous",
        version,
        versionLabel: `Versão ${version}`,
      } as FreeChatDocumentReviewItem;
    })
    .reverse();
}

function renderDocumentActionButton({
  disabled,
  icon,
  label,
  onPress,
  testID,
  tone,
}: {
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
  tone: "accent" | "success";
}) {
  const toneStyle =
    tone === "success"
      ? styles.threadReviewActionButtonSuccess
      : styles.threadReviewActionButtonAccent;
  const textStyle =
    tone === "success"
      ? styles.threadReviewActionButtonTextSuccess
      : styles.threadReviewActionButtonTextAccent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.threadReviewActionButton,
        toneStyle,
        disabled ? styles.threadReviewActionButtonDisabled : null,
      ]}
      testID={testID}
    >
      <View style={styles.threadReviewActionButtonContent}>
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={tone === "success" ? colors.success : colors.accent}
        />
        <Text style={[styles.threadReviewActionButtonText, textStyle]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function renderDocumentListItem({
  item,
  onAbrirAnexo,
  onCorrigirDocumento,
  testIDPrefix,
}: {
  item: FreeChatDocumentReviewItem;
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onCorrigirDocumento?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
  testIDPrefix: string;
}) {
  const nome = nomeExibicaoAnexo(item.attachment, "Relatório técnico.pdf");
  const tamanho = tamanhoHumanoAnexo(item.attachment.tamanho_bytes);

  return (
    <View
      key={`${item.version}-${item.attachment.id ?? testIDPrefix}`}
      style={styles.threadReviewListItem}
      testID={`${testIDPrefix}-item`}
    >
      <View
        style={[
          styles.threadReviewStatusBadge,
          item.status === "current"
            ? styles.threadReviewStatusBadgeSuccess
            : styles.threadReviewStatusBadgeAccent,
        ]}
      >
        <Text
          style={[
            styles.threadReviewStatusBadgeText,
            item.status === "current"
              ? styles.threadReviewStatusBadgeTextSuccess
              : styles.threadReviewStatusBadgeTextAccent,
          ]}
        >
          {item.status === "current" ? "Atual" : `v${item.version}`}
        </Text>
      </View>
      <View style={styles.threadReviewListCopy}>
        <Text style={styles.threadReviewListTitle}>
          {item.versionLabel} · {nome}
        </Text>
        <Text style={styles.threadReviewListText}>
          {item.messageId ? `Mensagem #${item.messageId}` : "Documento gerado"}
          {tamanho ? ` · ${tamanho}` : ""}
        </Text>
        <View style={styles.threadReviewActionsRail}>
          {renderDocumentActionButton({
            icon: "download-outline",
            label: "Baixar",
            onPress: () => onAbrirAnexo(item.attachment),
            testID: `${testIDPrefix}-download`,
            tone: "success",
          })}
          {renderDocumentActionButton({
            disabled: !onCorrigirDocumento,
            icon: "file-edit-outline",
            label: "Corrigir",
            onPress: () =>
              onCorrigirDocumento?.(item.attachment, item.versionLabel),
            testID: `${testIDPrefix}-correct`,
            tone: "accent",
          })}
        </View>
      </View>
    </View>
  );
}

export function renderizarDocumentosChatLivreRevisao(params: {
  mensagens: MobileChatMessage[];
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onCorrigirDocumento?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
}) {
  const documentos = buildFreeChatDocumentReviewItems(params.mensagens);
  const atual = documentos[0] || null;
  const anteriores = documentos.slice(1);

  if (!atual) {
    return (
      <View
        style={[styles.threadReviewCard, styles.threadOperationalPdfCard]}
        testID="free-chat-review-documents-card"
      >
        <Text style={styles.threadReviewEyebrow}>Revisar PDF</Text>
        <Text style={styles.threadReviewTitle}>Nenhum PDF</Text>
        <Text style={styles.threadReviewDescription}>
          Peça o relatório no chat livre.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.threadReviewCard, styles.threadOperationalPdfCard]}
      testID="free-chat-review-documents-card"
    >
      <Text style={styles.threadReviewEyebrow}>Revisar PDF</Text>
      <Text style={styles.threadReviewTitle}>Documento atual</Text>
      <Text style={styles.threadReviewDescription}>
        {documentos.length} versão{documentos.length === 1 ? "" : "ões"} no
        histórico.
      </Text>

      {renderDocumentListItem({
        item: atual,
        onAbrirAnexo: params.onAbrirAnexo,
        onCorrigirDocumento: params.onCorrigirDocumento,
        testIDPrefix: "free-chat-review-current-document",
      })}

      {anteriores.length ? (
        <View style={styles.threadReviewList}>
          <Text style={styles.threadReviewSectionTitle}>
            Documentos gerados
          </Text>
          {anteriores.map((item) =>
            renderDocumentListItem({
              item,
              onAbrirAnexo: params.onAbrirAnexo,
              onCorrigirDocumento: params.onCorrigirDocumento,
              testIDPrefix: `free-chat-review-document-${item.version}`,
            }),
          )}
        </View>
      ) : null}
    </View>
  );
}
