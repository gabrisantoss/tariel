import { Pressable, Text, View } from "react-native";

import type { MobileAttachment, MobileReviewPackage } from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import {
  classificarEstadoEmissaoOficial,
  lerArrayRegistros,
  lerRegistro,
  lerTexto,
  resumirIntegridadePdfOficial,
  sanitizarTextoThread,
} from "./ThreadConversationReviewCardUtils";

function formatarHashCurto(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 24) {
    return trimmed;
  }
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

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
  const issueState = classificarEstadoEmissaoOficial(currentIssue);
  const downloadUrl =
    lerTexto(currentIssue?.download_url) ||
    lerTexto(emissaoOficial?.download_url);
  const downloadAttachment: MobileAttachment | null =
    downloadUrl && issueState.active
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
  const issuedAt = lerTexto(currentIssue?.issued_at);
  const verificationUrl = lerTexto(verification?.verification_url);
  const packageFilename = lerTexto(currentIssue?.package_filename);
  const packageHash = lerTexto(currentIssue?.package_sha256);
  const verificationHash = lerTexto(currentIssue?.verification_hash);
  const reissueReasonSummary = sanitizarTextoThread(
    lerTexto(currentIssue?.reissue_reason_summary) ||
      lerTexto(emissaoOficial?.reissue_reason_summary),
  );
  const issueIntegrity = resumirIntegridadePdfOficial(
    emissaoOficial,
    currentIssue,
  );
  const emitted = caseLifecycleStatus === "emitido";
  const auditRows = [
    packageFilename
      ? {
          title: "Pacote oficial",
          value: packageFilename,
        }
      : null,
    packageHash
      ? {
          title: "Hash do pacote",
          value: formatarHashCurto(packageHash),
        }
      : null,
    verificationHash
      ? {
          title: "Auditoria",
          value: `Hash de verificação ${formatarHashCurto(verificationHash)}`,
        }
      : null,
    verificationUrl
      ? {
          title: "Auditoria",
          value: `Histórico/Auditoria: verificação pública disponível em ${verificationUrl}`,
        }
      : null,
  ].filter((item): item is { title: string; value: string } => item !== null);
  const trailRows = lerArrayRegistros(emissaoOficial?.audit_trail).slice(0, 3);

  if (!emitted && !issueNumber && !verificationUrl) {
    return null;
  }

  return (
    <View
      style={[styles.threadReviewCard, styles.threadOfficialIssueCard]}
      testID={testID}
    >
      <Text style={styles.threadReviewEyebrow}>
        {issueState.historical ? "Histórico de emissões" : "Emissão oficial"}
      </Text>
      <Text style={styles.threadReviewTitle}>{issueState.title}</Text>
      <Text style={styles.threadReviewDescription}>
        {issueState.historical
          ? "Esta emissão anterior fica preservada para auditoria e não compete com a versão principal do caso."
          : issueIntegrity.diverged || issueIntegrity.summary
            ? "A emissão oficial ativa continua disponível, mas há alerta de reemissão antes da próxima entrega pública."
            : downloadAttachment
              ? "A emissão oficial está concluída e o pacote oficial está pronto para download auditável."
              : emitted
                ? "A emissão oficial está registrada; o pacote oficial ainda não está disponível para download no app."
                : "A emissão oficial já está registrada para este caso."}
      </Text>
      <Text style={styles.threadReviewFootnote}>
        PDF operacional é artefato de trabalho. Emissão oficial é o registro
        congelado com pacote, hash e auditoria.
      </Text>
      <View style={styles.threadReviewChipRail}>
        <View
          style={[
            styles.threadReviewChip,
            issueState.historical
              ? styles.threadReviewChipDanger
              : styles.threadReviewChipSuccess,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              issueState.historical
                ? styles.threadReviewChipTextDanger
                : styles.threadReviewChipTextSuccess,
            ]}
          >
            {issueState.label}
          </Text>
        </View>
        {downloadAttachment ? (
          <View
            style={[styles.threadReviewChip, styles.threadReviewChipAccent]}
          >
            <Text
              style={[
                styles.threadReviewChipText,
                styles.threadReviewChipTextAccent,
              ]}
            >
              Pacote oficial
            </Text>
          </View>
        ) : null}
        {issueIntegrity.summary ? (
          <View
            style={[styles.threadReviewChip, styles.threadReviewChipDanger]}
          >
            <Text
              style={[
                styles.threadReviewChipText,
                styles.threadReviewChipTextDanger,
              ]}
            >
              Reemissão recomendada
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.threadReviewMetaGrid}>
        {issueNumber ? (
          <View style={styles.threadReviewMetaItem}>
            <Text style={styles.threadReviewMetaLabel}>Emissão</Text>
            <Text style={styles.threadReviewMetaValue}>{issueNumber}</Text>
          </View>
        ) : null}
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Status</Text>
          <Text style={styles.threadReviewMetaValue}>{issueState.label}</Text>
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
            {sanitizarTextoThread(issueIntegrity.summary)}
            {issueIntegrity.versionDetail
              ? ` ${sanitizarTextoThread(issueIntegrity.versionDetail)}.`
              : ""}
          </Text>
          {reissueReasonSummary &&
          reissueReasonSummary !== issueIntegrity.summary ? (
            <Text style={styles.threadReviewWarningText}>
              Motivo: {reissueReasonSummary}.
            </Text>
          ) : null}
        </View>
      ) : null}
      {downloadAttachment ? (
        <View style={styles.threadReviewActionStack}>
          <Text style={styles.threadReviewSectionTitle}>Download oficial</Text>
          <Text style={styles.threadReviewFootnote}>
            Ação principal: baixar o pacote oficial ativo deste caso.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!onAbrirAnexoOficial}
            onPress={() => onAbrirAnexoOficial?.(downloadAttachment)}
            style={[
              styles.threadReviewActionButton,
              styles.threadReviewActionButtonPrimary,
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
        </View>
      ) : null}
      {issueState.historical ? (
        <View style={styles.threadReviewList}>
          <Text style={styles.threadReviewSectionTitle}>
            Histórico de emissões
          </Text>
          <View style={styles.threadReviewListItem}>
            <View
              style={[
                styles.threadReviewStatusBadge,
                styles.threadReviewStatusBadgeDanger,
              ]}
            >
              <Text
                style={[
                  styles.threadReviewStatusBadgeText,
                  styles.threadReviewStatusBadgeTextDanger,
                ]}
              >
                Documento substituído
              </Text>
            </View>
            <View style={styles.threadReviewListCopy}>
              <Text style={styles.threadReviewListTitle}>
                Emissão preservada para auditoria
              </Text>
              <Text style={styles.threadReviewListText}>
                Não é a versão principal do caso e não recebe botão de download
                ativo neste card.
              </Text>
            </View>
          </View>
        </View>
      ) : null}
      {auditRows.length || trailRows.length ? (
        <View style={styles.threadReviewList}>
          <Text style={styles.threadReviewSectionTitle}>Auditoria</Text>
          {auditRows.map((item) => (
            <View
              key={`${item.title}-${item.value}`}
              style={styles.threadReviewListItem}
            >
              <View style={styles.threadReviewListCopy}>
                <Text style={styles.threadReviewListTitle}>{item.title}</Text>
                <Text style={styles.threadReviewListText}>{item.value}</Text>
              </View>
            </View>
          ))}
          {trailRows.map((item) => {
            const title = sanitizarTextoThread(
              lerTexto(item.title, "Evento documental"),
            );
            const status = sanitizarTextoThread(lerTexto(item.status_label));
            const summary = sanitizarTextoThread(lerTexto(item.summary));

            return (
              <View
                key={`${title}-${status}`}
                style={styles.threadReviewListItem}
              >
                <View style={styles.threadReviewListCopy}>
                  <Text style={styles.threadReviewListTitle}>{title}</Text>
                  {status ? (
                    <Text style={styles.threadReviewListText}>{status}</Text>
                  ) : null}
                  {summary ? (
                    <Text style={styles.threadReviewListText}>{summary}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
