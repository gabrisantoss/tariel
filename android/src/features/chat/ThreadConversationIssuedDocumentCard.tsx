import { Pressable, Text, View } from "react-native";

import type { MobileAttachment, MobileReviewPackage } from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import {
  lerRegistro,
  lerTexto,
  resumirIntegridadePdfOficial,
} from "./ThreadConversationReviewCardUtils";

export function renderizarDocumentoEmitidoCard(
  reviewPackage: MobileReviewPackage | null | undefined,
  caseLifecycleStatus: string | undefined,
  onAbrirAnexoOficial?: (attachment: MobileAttachment) => void,
  testID = "chat-issued-document-card",
) {
  const review = lerRegistro(reviewPackage);
  const emissaoOficial = lerRegistro(review?.emissao_oficial);
  const currentIssue = lerRegistro(emissaoOficial?.current_issue);
  const verification = lerRegistro(review?.public_verification);
  const issueNumber = lerTexto(currentIssue?.issue_number);
  const downloadUrl =
    lerTexto(currentIssue?.download_url) ||
    lerTexto(emissaoOficial?.download_url);
  const downloadAttachment: MobileAttachment | null = downloadUrl
    ? {
        nome:
          lerTexto(currentIssue?.package_filename) ||
          `${issueNumber || "emissao_oficial"}.zip`,
        label:
          lerTexto(currentIssue?.download_label) || "Baixar pacote oficial",
        mime_type:
          lerTexto(currentIssue?.download_mime_type) || "application/zip",
        categoria: "emissao_oficial",
        url: downloadUrl,
      }
    : null;
  const issueState = lerTexto(currentIssue?.issue_state_label, "Emitido");
  const issuedAt = lerTexto(currentIssue?.issued_at);
  const verificationUrl = lerTexto(verification?.verification_url);
  const issueIntegrity = resumirIntegridadePdfOficial(
    emissaoOficial,
    currentIssue,
  );
  const emitted = caseLifecycleStatus === "emitido";

  if (!emitted && !issueNumber && !verificationUrl) {
    return null;
  }

  return (
    <View style={styles.threadReviewCard} testID={testID}>
      <Text style={styles.threadReviewEyebrow}>documento emitido</Text>
      <Text style={styles.threadReviewTitle}>
        {issueNumber || "PDF final governado"}
      </Text>
      <Text style={styles.threadReviewDescription}>
        {issueIntegrity.diverged
          ? "O PDF atual divergiu do documento emitido. Gere uma nova emissão antes de distribuir a versão atual."
          : emitted
            ? "O caso já foi emitido. Reabra apenas se precisar iniciar um novo ciclo técnico."
            : "A emissão oficial já está registrada para este caso."}
      </Text>
      <View style={styles.threadReviewMetaGrid}>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Estado</Text>
          <Text style={styles.threadReviewMetaValue}>{issueState}</Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Emitido em</Text>
          <Text style={styles.threadReviewMetaValue}>
            {issuedAt || "Rastreado"}
          </Text>
        </View>
      </View>
      {issueIntegrity.summary ? (
        <View style={styles.threadReviewWarningItem}>
          <Text style={styles.threadReviewWarningTitle}>
            {issueIntegrity.title}
          </Text>
          <Text style={styles.threadReviewWarningText}>
            {issueIntegrity.summary}
            {issueIntegrity.versionDetail
              ? ` ${issueIntegrity.versionDetail}.`
              : ""}
          </Text>
        </View>
      ) : null}
      {downloadAttachment ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onAbrirAnexoOficial}
          onPress={() => onAbrirAnexoOficial?.(downloadAttachment)}
          style={[
            styles.threadReviewActionButton,
            styles.threadReviewActionButtonAccent,
            !onAbrirAnexoOficial
              ? styles.threadReviewActionButtonDisabled
              : null,
          ]}
          testID="chat-issued-document-download"
        >
          <Text
            style={[
              styles.threadReviewActionButtonText,
              styles.threadReviewActionButtonTextAccent,
            ]}
          >
            Baixar pacote oficial
          </Text>
        </Pressable>
      ) : null}
      {verificationUrl ? (
        <Text style={styles.threadReviewFootnote}>
          Verificação pública: {verificationUrl}
        </Text>
      ) : null}
    </View>
  );
}
