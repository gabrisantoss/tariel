import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  carregarDocumentoEditavelChatLivreMobile,
  salvarDocumentoEditavelChatLivreMobile,
} from "../../config/api";
import { colors } from "../../theme/tokens";
import type {
  MobileAttachment,
  MobileChatMessage,
  MobileFreeChatEditableDocument,
} from "../../types/mobile";
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
  tone: "accent" | "success" | "neutral";
}) {
  const toneStyle =
    tone === "neutral"
      ? styles.threadReviewActionButtonNeutral
      : tone === "success"
        ? styles.threadReviewActionButtonSuccess
        : styles.threadReviewActionButtonAccent;
  const textStyle =
    tone === "neutral"
      ? styles.threadReviewActionButtonTextNeutral
      : tone === "success"
        ? styles.threadReviewActionButtonTextSuccess
        : styles.threadReviewActionButtonTextAccent;
  const iconColor =
    tone === "neutral"
      ? colors.ink900
      : tone === "success"
        ? colors.success
        : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.threadReviewActionButton,
        styles.threadReviewCompactActionButton,
        toneStyle,
        disabled ? styles.threadReviewActionButtonDisabled : null,
      ]}
      testID={testID}
    >
      <View style={styles.threadReviewActionButtonContent}>
        <MaterialCommunityIcons name={icon} size={14} color={iconColor} />
        <Text style={[styles.threadReviewActionButtonText, textStyle]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function renderDocumentListItem({
  historyTitle,
  item,
  onAbrirAnexo,
  onCorrigirDocumento,
  testIDPrefix,
}: {
  historyTitle: string;
  item: FreeChatDocumentReviewItem;
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onCorrigirDocumento?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
  testIDPrefix: string;
}) {
  const tamanho = tamanhoHumanoAnexo(item.attachment.tamanho_bytes);
  const title =
    item.status === "current"
      ? "Relatório atual"
      : `Relatório anterior v${item.version}`;
  const subtitle = String(historyTitle || "Histórico do relatório").trim();

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
        <Text style={styles.threadReviewListTitle}>{title}</Text>
        <Text style={styles.threadReviewListText}>
          {subtitle}
          {tamanho ? ` · ${tamanho}` : ""}
        </Text>
        <View style={styles.threadReviewCompactActionsRail}>
          {renderDocumentActionButton({
            icon: "download-outline",
            label: "Baixar",
            onPress: () => onAbrirAnexo(item.attachment),
            testID: `${testIDPrefix}-download`,
            tone: "neutral",
          })}
          {renderDocumentActionButton({
            disabled: !onCorrigirDocumento,
            icon: "file-edit-outline",
            label: "Corrigir",
            onPress: () =>
              onCorrigirDocumento?.(item.attachment, item.versionLabel),
            testID: `${testIDPrefix}-correct`,
            tone: "neutral",
          })}
        </View>
      </View>
    </View>
  );
}

function obterLaudoIdDoAnexo(attachment: MobileAttachment): number | null {
  const url = String(attachment.url || "").trim();
  const match = url.match(/\/laudo\/(\d+)\//);
  if (!match) {
    return null;
  }
  const laudoId = Number(match[1]);
  return Number.isFinite(laudoId) && laudoId > 0 ? laudoId : null;
}

function FreeChatEditableDocumentEditor(props: {
  attachment: MobileAttachment;
  document: MobileFreeChatEditableDocument;
  error: string;
  busy: boolean;
  notice: string;
  onCancel: () => void;
  onDocumentChange: (document: MobileFreeChatEditableDocument) => void;
  onSave: () => void;
}) {
  return (
    <View
      style={styles.threadReviewEditableEditor}
      testID="free-chat-pdf-editor"
    >
      <View style={styles.threadReviewEditableHeader}>
        <View style={styles.threadReviewListCopy}>
          <Text style={styles.threadReviewTitle}>PDF editável</Text>
          <Text style={styles.threadReviewDescription}>
            {nomeExibicaoAnexo(props.attachment, "PDF gerado")}
          </Text>
        </View>
        {props.busy ? <ActivityIndicator color={colors.ink900} /> : null}
      </View>

      {props.document.sections.map((section, index) => (
        <View key={section.key} style={styles.threadReviewEditableSection}>
          <Text style={styles.threadReviewEditableSectionTitle}>
            {section.title}
          </Text>
          <TextInput
            editable={!props.busy && section.editable !== false}
            multiline
            onChangeText={(content) => {
              const sections = props.document.sections.map(
                (current, currentIndex) =>
                  currentIndex === index ? { ...current, content } : current,
              );
              props.onDocumentChange({ ...props.document, sections });
            }}
            style={styles.threadReviewEditableInput}
            testID={`free-chat-pdf-editor-section-${section.key}`}
            value={section.content}
          />
        </View>
      ))}

      {props.error ? (
        <Text style={styles.threadReviewWarningText}>{props.error}</Text>
      ) : null}
      {props.notice ? (
        <Text style={styles.threadReviewEditableNotice}>{props.notice}</Text>
      ) : null}

      <View style={styles.threadReviewCompactActionsRail}>
        {renderDocumentActionButton({
          disabled: props.busy,
          icon: "close",
          label: "Cancelar",
          onPress: props.onCancel,
          testID: "free-chat-pdf-editor-cancel",
          tone: "neutral",
        })}
        {renderDocumentActionButton({
          disabled: props.busy,
          icon: "file-pdf-box",
          label: "Gerar PDF",
          onPress: props.onSave,
          testID: "free-chat-pdf-editor-save",
          tone: "neutral",
        })}
      </View>
    </View>
  );
}

function FreeChatDocumentsReviewCard(params: {
  historyTitle?: string;
  mensagens: MobileChatMessage[];
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onCorrigirDocumento?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
  onDocumentoGerado?: () => Promise<void> | void;
  sessionAccessToken?: string | null;
}) {
  const [documentoEditavel, setDocumentoEditavel] =
    useState<MobileFreeChatEditableDocument | null>(null);
  const [attachmentEmEdicao, setAttachmentEmEdicao] =
    useState<MobileAttachment | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [editorNotice, setEditorNotice] = useState("");

  const documentos = buildFreeChatDocumentReviewItems(params.mensagens);
  const atual = documentos[0] || null;
  const anteriores = documentos.slice(1);

  async function abrirEditor(item: FreeChatDocumentReviewItem) {
    const token = String(params.sessionAccessToken || "").trim();
    const laudoId = obterLaudoIdDoAnexo(item.attachment);
    const attachmentId = Number(item.attachment.id || 0);
    if (!token || !laudoId || !attachmentId) {
      setEditorError("Não foi possível abrir este PDF para edição.");
      setAttachmentEmEdicao(item.attachment);
      setDocumentoEditavel(null);
      return;
    }

    setAttachmentEmEdicao(item.attachment);
    setDocumentoEditavel(null);
    setEditorError("");
    setEditorNotice("");
    setEditorBusy(true);
    try {
      const resposta = await carregarDocumentoEditavelChatLivreMobile(
        token,
        laudoId,
        attachmentId,
      );
      setDocumentoEditavel(resposta.documento);
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o PDF editável.",
      );
    } finally {
      setEditorBusy(false);
    }
  }

  async function salvarEditor() {
    const token = String(params.sessionAccessToken || "").trim();
    const attachment = attachmentEmEdicao;
    const documento = documentoEditavel;
    const laudoId = attachment ? obterLaudoIdDoAnexo(attachment) : null;
    const attachmentId = Number(attachment?.id || 0);
    if (!token || !laudoId || !attachmentId || !documento) {
      setEditorError("Não foi possível gerar a nova versão.");
      return;
    }

    setEditorBusy(true);
    setEditorError("");
    setEditorNotice("");
    try {
      const resposta = await salvarDocumentoEditavelChatLivreMobile(
        token,
        laudoId,
        attachmentId,
        documento,
      );
      if (resposta.documento_editavel) {
        setDocumentoEditavel(resposta.documento_editavel);
      }
      setEditorNotice("Nova versão gerada.");
      await params.onDocumentoGerado?.();
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a nova versão do PDF.",
      );
    } finally {
      setEditorBusy(false);
    }
  }

  if (!atual) {
    return (
      <View
        style={[styles.threadReviewCard, styles.threadOperationalPdfCard]}
        testID="free-chat-review-documents-card"
      >
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
      {attachmentEmEdicao && documentoEditavel ? (
        <FreeChatEditableDocumentEditor
          attachment={attachmentEmEdicao}
          busy={editorBusy}
          document={documentoEditavel}
          error={editorError}
          notice={editorNotice}
          onCancel={() => {
            setAttachmentEmEdicao(null);
            setDocumentoEditavel(null);
            setEditorError("");
            setEditorNotice("");
          }}
          onDocumentChange={setDocumentoEditavel}
          onSave={salvarEditor}
        />
      ) : attachmentEmEdicao && editorBusy ? (
        <View style={styles.threadReviewEditableEditor}>
          <ActivityIndicator color={colors.ink900} />
          <Text style={styles.threadReviewEditableNotice}>
            Abrindo PDF editável...
          </Text>
        </View>
      ) : editorError ? (
        <Text style={styles.threadReviewWarningText}>{editorError}</Text>
      ) : null}

      {renderDocumentListItem({
        historyTitle: params.historyTitle || "",
        item: atual,
        onAbrirAnexo: params.onAbrirAnexo,
        onCorrigirDocumento: () => {
          void abrirEditor(atual);
        },
        testIDPrefix: "free-chat-review-current-document",
      })}

      {anteriores.length ? (
        <View style={styles.threadReviewList}>
          {anteriores.map((item) =>
            renderDocumentListItem({
              historyTitle: params.historyTitle || "",
              item,
              onAbrirAnexo: params.onAbrirAnexo,
              onCorrigirDocumento: () => {
                void abrirEditor(item);
              },
              testIDPrefix: `free-chat-review-document-${item.version}`,
            }),
          )}
        </View>
      ) : null}
    </View>
  );
}

export function renderizarDocumentosChatLivreRevisao(params: {
  historyTitle?: string;
  mensagens: MobileChatMessage[];
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  onCorrigirDocumento?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
  onDocumentoGerado?: () => Promise<void> | void;
  sessionAccessToken?: string | null;
}) {
  return <FreeChatDocumentsReviewCard {...params} />;
}
