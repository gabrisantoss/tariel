import { Text, View } from "react-native";

import type { MobileReportPackDraft } from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { buildReportPackDraftSummary } from "./reportPackHelpers";
import { sanitizarTextoThread } from "./ThreadConversationReviewCardUtils";
import {
  ThreadConversationReportPackActionsSection,
  ThreadConversationReportPackAnalysisBasisSection,
  ThreadConversationReportPackBlocksSection,
  ThreadConversationReportPackDocumentSections,
  ThreadConversationReportPackEvidenceSlotsSection,
  ThreadConversationReportPackExecutiveSection,
  ThreadConversationReportPackFlowSection,
  ThreadConversationReportPackMissingEvidenceNotes,
  ThreadConversationReportPackNextQuestionsSection,
  ThreadConversationReportPackReviewRequiredSection,
} from "./ThreadConversationReportPackDraftSections";

export function renderizarReportPackDraftCard(
  reportPackDraft: MobileReportPackDraft | null | undefined,
  options?: {
    canFinalize?: boolean;
    mode?: "chat" | "mesa";
    onAbrirMesaTab?: () => void;
    onAbrirQualityGate?: () => void | Promise<void>;
    onUsarPerguntaPreLaudo?: (value: string) => void;
    testID?: string;
  },
) {
  const mode = options?.mode || "chat";
  const testID = options?.testID || "chat-report-pack-card";
  const summary = buildReportPackDraftSummary(reportPackDraft);
  if (!summary) {
    return null;
  }

  const coverageText = summary.totalBlocks
    ? `${summary.readyBlocks}/${summary.totalBlocks} blocos prontos`
    : summary.readinessLabel;
  const evidenceText = summary.evidenceCount
    ? `${summary.evidenceCount} evidência${summary.evidenceCount === 1 ? "" : "s"} vinculada${summary.evidenceCount === 1 ? "" : "s"}`
    : "Sem evidências vinculadas";
  const pendingText =
    summary.pendingBlocks > 0
      ? `${summary.pendingBlocks} bloco${summary.pendingBlocks === 1 ? "" : "s"} pendente${summary.pendingBlocks === 1 ? "" : "s"}`
      : "Sem pendências do caso";
  const attentionText =
    summary.attentionBlocks > 0
      ? `${summary.attentionBlocks} bloco${summary.attentionBlocks === 1 ? "" : "s"} em atenção`
      : "Sem revisão pendente";
  const visibleBlocks = [...summary.blockSummaries]
    .filter((item) => item.status !== "ready")
    .sort((left, right) => {
      const priority = (value: string) => {
        if (value === "attention") {
          return 0;
        }
        if (value === "pending") {
          return 1;
        }
        return 2;
      };
      return priority(left.status) - priority(right.status);
    })
    .slice(0, 4);
  const highlightedSections = summary.highlightedDocumentSections.length
    ? summary.highlightedDocumentSections
    : summary.documentSections.slice(0, 4);
  const visibleEvidenceSlots = [...summary.requiredEvidenceSlots]
    .sort((left, right) => Number(left.resolved) - Number(right.resolved))
    .slice(0, 3);
  const visibleExecutiveSections = summary.executiveSections
    .filter((item) => item.status !== "ready")
    .slice(0, 2);
  const analysisBasisEntries = [
    summary.analysisBasisSummary.coverage_summary
      ? {
          key: "coverage",
          title: "Cobertura",
          summary: summary.analysisBasisSummary.coverage_summary,
        }
      : null,
    summary.analysisBasisSummary.photo_summary
      ? {
          key: "photo",
          title: "Fotos",
          summary: summary.analysisBasisSummary.photo_summary,
        }
      : null,
    summary.analysisBasisSummary.document_summary
      ? {
          key: "document",
          title: "Documentos",
          summary: summary.analysisBasisSummary.document_summary,
        }
      : null,
    summary.analysisBasisSummary.context_summary
      ? {
          key: "context",
          title: "Contexto",
          summary: summary.analysisBasisSummary.context_summary,
        }
      : null,
  ].filter(
    (item): item is { key: string; title: string; summary: string } =>
      item !== null,
  );
  const minimumEvidenceLabel = [
    `${summary.minimumEvidence.fotos} foto${summary.minimumEvidence.fotos === 1 ? "" : "s"}`,
    `${summary.minimumEvidence.documentos} doc${summary.minimumEvidence.documentos === 1 ? "" : "s"}`,
    `${summary.minimumEvidence.textos} texto${summary.minimumEvidence.textos === 1 ? "" : "s"}`,
  ].join(" · ");
  const hasMinimumEvidence =
    summary.minimumEvidence.fotos > 0 ||
    summary.minimumEvidence.documentos > 0 ||
    summary.minimumEvidence.textos > 0;
  const showQuestionActions =
    mode === "chat" &&
    summary.nextQuestions.length > 0 &&
    Boolean(options?.onUsarPerguntaPreLaudo);
  const showFinalizeAction =
    mode === "chat" &&
    Boolean(options?.canFinalize) &&
    summary.readyForStructuredForm &&
    Boolean(options?.onAbrirQualityGate);
  const showOpenMesaAction =
    mode === "chat" &&
    summary.finalValidationMode === "mesa_required" &&
    Boolean(options?.onAbrirMesaTab);

  return (
    <View
      style={[styles.threadReviewCard, styles.threadOperationalPdfCard]}
      testID={testID}
    >
      <Text style={styles.threadReviewEyebrow}>PDF operacional</Text>
      <Text style={styles.threadReviewTitle}>
        {sanitizarTextoThread(summary.readinessLabel)}
      </Text>
      <Text style={styles.threadReviewDescription}>
        {sanitizarTextoThread(summary.readinessDetail)}
      </Text>
      <Text style={styles.threadReviewFootnote}>
        Este card resume o PDF operacional. A emissão oficial aparece em bloco
        separado quando estiver disponível.
      </Text>
      {summary.inspectionContextLabel ? (
        <Text style={styles.threadReviewFootnote}>
          {sanitizarTextoThread(summary.inspectionContextLabel)}
          {summary.inspectionContextDetail
            ? ` · ${sanitizarTextoThread(summary.inspectionContextDetail)}`
            : ""}
        </Text>
      ) : null}
      <View style={styles.threadReviewMetaGrid}>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Documento</Text>
          <Text style={styles.threadReviewMetaValue}>
            {sanitizarTextoThread(summary.templateLabel)}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Revisão</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.finalValidationModeLabel}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Cobertura</Text>
          <Text style={styles.threadReviewMetaValue}>{coverageText}</Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Evidências</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.evidenceCount || 0}
          </Text>
        </View>
      </View>
      <Text style={styles.threadReviewFootnote}>
        Família:{" "}
        {sanitizarTextoThread(
          summary.familyLabel || summary.familyKey || "Governada",
        )}
        {hasMinimumEvidence ? ` · Mínimo exigido: ${minimumEvidenceLabel}` : ""}
      </Text>
      <Text style={styles.threadReviewFootnote}>{evidenceText}</Text>
      {summary.imageCount > 0 ? (
        <Text style={styles.threadReviewFootnote}>
          {`${summary.imageCount} foto${summary.imageCount === 1 ? "" : "s"} já consolidada${summary.imageCount === 1 ? "" : "s"} no rascunho.`}
        </Text>
      ) : null}
      {summary.readyForStructuredForm ? (
        <Text style={styles.threadReviewFootnote}>
          Documento estruturado pronto para consolidação formal.
        </Text>
      ) : null}
      {summary.checklistGroupTitles.length ? (
        <Text style={styles.threadReviewFootnote}>
          Checklist canônico:{" "}
          {summary.checklistGroupTitles.map(sanitizarTextoThread).join(" · ")}
        </Text>
      ) : null}
      {summary.maxConflictScore > 0 ? (
        <Text style={styles.threadReviewFootnote}>
          Revisão normativa: sinais para conferência humana.
        </Text>
      ) : null}
      <View style={styles.threadReviewChipRail}>
        <View
          style={[
            styles.threadReviewChip,
            summary.autonomyReady
              ? styles.threadReviewChipSuccess
              : styles.threadReviewChipAccent,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              summary.autonomyReady
                ? styles.threadReviewChipTextSuccess
                : styles.threadReviewChipTextAccent,
            ]}
          >
            {summary.autonomyReady
              ? "Pronto para validar"
              : "PDF operacional em montagem"}
          </Text>
        </View>
        <View
          style={[
            styles.threadReviewChip,
            summary.pendingBlocks > 0
              ? styles.threadReviewChipDanger
              : styles.threadReviewChipSuccess,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              summary.pendingBlocks > 0
                ? styles.threadReviewChipTextDanger
                : styles.threadReviewChipTextSuccess,
            ]}
          >
            {pendingText}
          </Text>
        </View>
        <View
          style={[
            styles.threadReviewChip,
            summary.attentionBlocks > 0
              ? styles.threadReviewChipAccent
              : styles.threadReviewChipSuccess,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              summary.attentionBlocks > 0
                ? styles.threadReviewChipTextAccent
                : styles.threadReviewChipTextSuccess,
            ]}
          >
            {attentionText}
          </Text>
        </View>
        {summary.exampleAvailable ? (
          <View
            style={[styles.threadReviewChip, styles.threadReviewChipSuccess]}
          >
            <Text
              style={[
                styles.threadReviewChipText,
                styles.threadReviewChipTextSuccess,
              ]}
            >
              Exemplo canônico disponível
            </Text>
          </View>
        ) : null}
      </View>
      <ThreadConversationReportPackActionsSection
        onAbrirMesaTab={options?.onAbrirMesaTab}
        onAbrirQualityGate={options?.onAbrirQualityGate}
        showFinalizeAction={showFinalizeAction}
        showOpenMesaAction={showOpenMesaAction}
        testID={testID}
      />
      <ThreadConversationReportPackDocumentSections
        items={highlightedSections}
      />
      <ThreadConversationReportPackEvidenceSlotsSection
        items={visibleEvidenceSlots}
      />
      <ThreadConversationReportPackBlocksSection items={visibleBlocks} />
      <ThreadConversationReportPackMissingEvidenceNotes
        items={summary.missingEvidenceMessages}
      />
      <ThreadConversationReportPackExecutiveSection
        items={visibleExecutiveSections}
      />
      <ThreadConversationReportPackReviewRequiredSection
        items={summary.reviewRequired}
      />
      <ThreadConversationReportPackAnalysisBasisSection
        items={analysisBasisEntries}
      />
      <ThreadConversationReportPackFlowSection
        items={summary.documentFlowEntries}
      />
      <ThreadConversationReportPackNextQuestionsSection
        items={summary.nextQuestions}
        onUsarPerguntaPreLaudo={options?.onUsarPerguntaPreLaudo}
        showQuestionActions={showQuestionActions}
        testID={testID}
      />
    </View>
  );
}
