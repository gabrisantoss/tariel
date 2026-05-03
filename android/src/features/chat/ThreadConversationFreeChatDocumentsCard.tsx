import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  carregarDocumentoEditavelChatLivreMobile,
  reavaliarEvidenciaDocumentoEditavelChatLivreMobile,
  salvarDocumentoEditavelChatLivreMobile,
} from "../../config/api";
import { colors } from "../../theme/tokens";
import type {
  MobileAttachment,
  MobileChatMessage,
  MobileFreeChatEditableDocument,
  MobileFreeChatEditableDocumentSection,
  MobileFreeChatEditableEvidence,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { montarAnexoImagem } from "./attachmentFileHelpers";
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

function obterPrefixoEvidencia(sectionKey: string): string {
  const match = String(sectionKey || "").match(/^(evidencia_\d+)_/);
  return match?.[1] || "";
}

function uriImagemEvidencia(evidence: MobileFreeChatEditableEvidence): string {
  return String(
    evidence.preview_uri || evidence.image_data_uri || evidence.image_url || "",
  ).trim();
}

function atualizarSecaoDocumentoEditavel(
  document: MobileFreeChatEditableDocument,
  sectionIndex: number,
  content: string,
): MobileFreeChatEditableDocument {
  const sections = document.sections.map((current, currentIndex) =>
    currentIndex === sectionIndex ? { ...current, content } : current,
  );
  return { ...document, sections };
}

function FreeChatEditableDocumentEditor(props: {
  attachment: MobileAttachment;
  document: MobileFreeChatEditableDocument;
  error: string;
  busy: boolean;
  evidenceBusyKey: string;
  notice: string;
  onCancel: () => void;
  onDocumentChange: (document: MobileFreeChatEditableDocument) => void;
  onReanalyzeEvidence: (evidenceKey: string) => Promise<void>;
  onSave: () => void;
}) {
  const [localEvidenceBusyKey, setLocalEvidenceBusyKey] = useState("");
  const evidences = props.document.evidences || [];
  const renderedSectionKeys = new Set<string>();

  async function substituirImagemEvidencia(evidenceKey: string) {
    if (props.busy || localEvidenceBusyKey || props.evidenceBusyKey) {
      return;
    }
    try {
      setLocalEvidenceBusyKey(evidenceKey);
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted && permissao.accessPrivileges !== "limited") {
        Alert.alert(
          "Biblioteca de imagens",
          "Permita acesso às imagens para substituir a evidência.",
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        base64: true,
        quality: 0.85,
      });
      if (resultado.canceled || !resultado.assets?.[0]) {
        return;
      }

      const anexo = montarAnexoImagem(
        resultado.assets[0],
        "Imagem substituída no PDF editável.",
      );
      const evidencesAtualizadas = evidences.map((evidence) =>
        evidence.key === evidenceKey
          ? {
              ...evidence,
              display_name: anexo.label,
              image_data_uri: anexo.dadosImagem,
              preview_uri: anexo.previewUri,
              source: "replacement",
              replacement: true,
            }
          : evidence,
      );
      props.onDocumentChange({
        ...props.document,
        evidences: evidencesAtualizadas,
      });
    } catch (error) {
      Alert.alert(
        "Imagem",
        error instanceof Error
          ? error.message
          : "Não foi possível substituir a imagem.",
      );
    } finally {
      setLocalEvidenceBusyKey("");
    }
  }

  async function reavaliarEvidencia(evidenceKey: string) {
    if (props.busy || localEvidenceBusyKey || props.evidenceBusyKey) {
      return;
    }
    setLocalEvidenceBusyKey(evidenceKey);
    try {
      await props.onReanalyzeEvidence(evidenceKey);
    } finally {
      setLocalEvidenceBusyKey("");
    }
  }

  function renderEditableSection(
    section: MobileFreeChatEditableDocumentSection,
    index: number,
  ) {
    renderedSectionKeys.add(section.key);
    return (
      <View key={section.key} style={styles.threadReviewEditableSection}>
        <Text style={styles.threadReviewEditableSectionTitle}>
          {section.title}
        </Text>
        <TextInput
          editable={!props.busy && section.editable !== false}
          multiline
          onChangeText={(content) => {
            props.onDocumentChange(
              atualizarSecaoDocumentoEditavel(props.document, index, content),
            );
          }}
          style={styles.threadReviewEditableInput}
          testID={`free-chat-pdf-editor-section-${section.key}`}
          value={section.content}
        />
      </View>
    );
  }

  const evidenceSectionsByKey = evidences.reduce<
    Record<
      string,
      Array<{ section: MobileFreeChatEditableDocumentSection; index: number }>
    >
  >((acc, evidence) => {
    acc[evidence.key] = [];
    return acc;
  }, {});
  props.document.sections.forEach((section, index) => {
    const prefix = obterPrefixoEvidencia(section.key);
    if (prefix && evidenceSectionsByKey[prefix]) {
      evidenceSectionsByKey[prefix].push({ section, index });
    }
  });

  const evidenceBusyKey = props.evidenceBusyKey || localEvidenceBusyKey;

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

      {props.document.sections.map((section, index) =>
        obterPrefixoEvidencia(section.key)
          ? null
          : renderEditableSection(section, index),
      )}

      {evidences.map((evidence, evidenceIndex) => {
        const imageUri = uriImagemEvidencia(evidence);
        const busyEvidence = evidenceBusyKey === evidence.key;
        const evidenceTitle =
          evidence.title || `Evidência ${evidence.index || evidenceIndex + 1}`;
        return (
          <View
            key={evidence.key}
            style={styles.threadReviewEditableEvidenceCard}
            testID={`free-chat-pdf-editor-evidence-${evidence.key}`}
          >
            <View style={styles.threadReviewEditableEvidenceHeader}>
              {imageUri ? (
                <Image
                  accessibilityLabel={`Imagem da ${evidenceTitle}`}
                  resizeMode="cover"
                  source={{ uri: imageUri }}
                  style={styles.threadReviewEditableEvidenceImage}
                  testID={`free-chat-pdf-editor-evidence-${evidence.key}-image`}
                />
              ) : (
                <View style={styles.threadReviewEditableEvidencePlaceholder}>
                  <MaterialCommunityIcons
                    name="image-off-outline"
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.threadReviewListCopy}>
                <Text style={styles.threadReviewEditableSectionTitle}>
                  {evidenceTitle}
                </Text>
                <Text style={styles.threadReviewEditableNotice}>
                  {evidence.display_name || "Imagem da evidência"}
                </Text>
                {busyEvidence ? (
                  <ActivityIndicator color={colors.ink900} size="small" />
                ) : null}
              </View>
            </View>
            <View style={styles.threadReviewCompactActionsRail}>
              {renderDocumentActionButton({
                disabled: props.busy || Boolean(evidenceBusyKey),
                icon: "image-edit-outline",
                label: "Substituir",
                onPress: () => {
                  void substituirImagemEvidencia(evidence.key);
                },
                testID: `free-chat-pdf-editor-evidence-${evidence.key}-replace`,
                tone: "neutral",
              })}
              {renderDocumentActionButton({
                disabled: props.busy || Boolean(evidenceBusyKey),
                icon: "auto-fix",
                label: "Reavaliar",
                onPress: () => {
                  void reavaliarEvidencia(evidence.key);
                },
                testID: `free-chat-pdf-editor-evidence-${evidence.key}-reanalyze`,
                tone: "neutral",
              })}
            </View>
            {(evidenceSectionsByKey[evidence.key] || []).map(
              ({ section, index }) => renderEditableSection(section, index),
            )}
          </View>
        );
      })}

      {props.document.sections.map((section, index) =>
        !renderedSectionKeys.has(section.key) &&
        obterPrefixoEvidencia(section.key)
          ? renderEditableSection(section, index)
          : null,
      )}

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
  const [editorEvidenceBusyKey, setEditorEvidenceBusyKey] = useState("");
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
    setEditorEvidenceBusyKey("");
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

  async function reavaliarEvidenciaEditor(evidenceKey: string) {
    const token = String(params.sessionAccessToken || "").trim();
    const attachment = attachmentEmEdicao;
    const documento = documentoEditavel;
    const laudoId = attachment ? obterLaudoIdDoAnexo(attachment) : null;
    const attachmentId = Number(attachment?.id || 0);
    if (!token || !laudoId || !attachmentId || !documento) {
      setEditorError("Não foi possível reavaliar esta evidência.");
      return;
    }

    setEditorEvidenceBusyKey(evidenceKey);
    setEditorError("");
    setEditorNotice("");
    try {
      const resposta = await reavaliarEvidenciaDocumentoEditavelChatLivreMobile(
        token,
        laudoId,
        attachmentId,
        evidenceKey,
        documento,
      );
      setDocumentoEditavel(resposta.documento);
      setEditorNotice(
        "Evidência reavaliada. Revise o texto antes de gerar o PDF.",
      );
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : "Não foi possível reavaliar esta evidência.",
      );
    } finally {
      setEditorEvidenceBusyKey("");
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
          evidenceBusyKey={editorEvidenceBusyKey}
          error={editorError}
          notice={editorNotice}
          onCancel={() => {
            setAttachmentEmEdicao(null);
            setDocumentoEditavel(null);
            setEditorError("");
            setEditorNotice("");
            setEditorEvidenceBusyKey("");
          }}
          onDocumentChange={setDocumentoEditavel}
          onReanalyzeEvidence={reavaliarEvidenciaEditor}
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
