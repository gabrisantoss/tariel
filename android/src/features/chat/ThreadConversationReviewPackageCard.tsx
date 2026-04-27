import { Text, View } from "react-native";

import type {
  MobileAttachment,
  MobileMesaReviewCommandPayload,
  MobileReviewPackage,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import {
  buildThreadConversationReviewDecisionContext,
  buildThreadConversationReviewPackageSummary,
  type ReviewPackageCaseContext,
} from "./ThreadConversationReviewPackageSummary";
import {
  ThreadConversationReviewActionsSection,
  ThreadConversationReviewDecisionFocusSection,
  ThreadConversationReviewDiffSection,
  ThreadConversationReviewHighlightedBlocksSection,
  ThreadConversationReviewOfficialIssueSection,
  ThreadConversationReviewRedFlagsSection,
  ThreadConversationReviewVerificationSection,
} from "./ThreadConversationReviewPackageSections";

export function renderizarReviewPackageMesa(
  reviewPackage: MobileReviewPackage | null | undefined,
  caseContext: ReviewPackageCaseContext,
  onExecutarComandoRevisaoMobile:
    | ((payload: MobileMesaReviewCommandPayload) => Promise<void>)
    | undefined,
  reviewCommandBusy: boolean,
  onAbrirAnexoOficial?: (attachment: MobileAttachment) => void,
) {
  const summary = buildThreadConversationReviewPackageSummary(
    reviewPackage,
    caseContext,
  );
  if (!summary) {
    return null;
  }
  const decisionContext = buildThreadConversationReviewDecisionContext(summary);

  const summaryText =
    summary.totalRequired > 0
      ? `${summary.totalAccepted}/${summary.totalRequired} evidências aceitas`
      : "PDF operacional pronto para revisão";
  const eyebrow =
    summary.modeLabel === "Família exige Mesa"
      ? "Mesa Avaliadora"
      : "Revisão interna governada";

  return (
    <View
      style={[styles.threadReviewCard, styles.threadReviewGovernanceCard]}
      testID="mesa-review-package-card"
    >
      <Text style={styles.threadReviewEyebrow}>{eyebrow}</Text>
      <Text style={styles.threadReviewTitle}>{summary.modeLabel}</Text>
      <Text style={styles.threadReviewDescription}>
        {summary.redFlagCount > 0
          ? summary.redFlagCount === 1
            ? "1 alerta crítico exige atenção antes da decisão."
            : `${summary.redFlagCount} alertas críticos exigem atenção antes da decisão.`
          : summary.blockerCount > 0
            ? summary.blockerCount === 1
              ? "1 bloqueio documental ainda aberto."
              : `${summary.blockerCount} bloqueios documentais ainda abertos.`
            : summaryText}
      </Text>
      <View style={styles.threadReviewMetaGrid}>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Etapa</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.lifecycleLabel}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Responsável</Text>
          <Text style={styles.threadReviewMetaValue}>{summary.ownerLabel}</Text>
        </View>
      </View>
      <Text style={styles.threadReviewFootnote}>
        {summary.lifecycleDescription}
      </Text>
      {summary.nextLifecycleSummary ? (
        <Text style={styles.threadReviewFootnote}>
          Próximas transições: {summary.nextLifecycleSummary}
        </Text>
      ) : null}
      {summary.surfaceActionSummary ? (
        <Text style={styles.threadReviewFootnote}>
          Ações disponíveis: {summary.surfaceActionSummary}
        </Text>
      ) : null}

      <View style={styles.threadReviewChipRail}>
        <View
          style={[
            styles.threadReviewChip,
            summary.documentStatusTone === "danger"
              ? styles.threadReviewChipDanger
              : summary.documentStatusTone === "accent"
                ? styles.threadReviewChipAccent
                : styles.threadReviewChipSuccess,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              summary.documentStatusTone === "danger"
                ? styles.threadReviewChipTextDanger
                : summary.documentStatusTone === "accent"
                  ? styles.threadReviewChipTextAccent
                  : styles.threadReviewChipTextSuccess,
            ]}
          >
            {summary.documentStatusLabel}
          </Text>
        </View>
        <View style={[styles.threadReviewChip, styles.threadReviewChipAccent]}>
          <Text
            style={[
              styles.threadReviewChipText,
              styles.threadReviewChipTextAccent,
            ]}
          >
            Cobertura {summary.totalAccepted}/{summary.totalRequired || 0}
          </Text>
        </View>
        <View
          style={[
            styles.threadReviewChip,
            summary.blockStatusTone === "danger"
              ? styles.threadReviewChipDanger
              : summary.blockStatusTone === "accent"
                ? styles.threadReviewChipAccent
                : styles.threadReviewChipSuccess,
          ]}
        >
          <Text
            style={[
              styles.threadReviewChipText,
              summary.blockStatusTone === "danger"
                ? styles.threadReviewChipTextDanger
                : summary.blockStatusTone === "accent"
                  ? styles.threadReviewChipTextAccent
                  : styles.threadReviewChipTextSuccess,
            ]}
          >
            {summary.blockStatusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.threadReviewMetaGrid}>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Irregularidades</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.totalIrregular}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Faltantes</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.totalMissing}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Refazer</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.historyCount}
          </Text>
        </View>
        <View style={styles.threadReviewMetaItem}>
          <Text style={styles.threadReviewMetaLabel}>Base validada</Text>
          <Text style={styles.threadReviewMetaValue}>
            {summary.approvedCount}
          </Text>
        </View>
      </View>

      {summary.reviewRequired !== null ? (
        <Text style={styles.threadReviewFootnote}>
          {summary.reviewRequired
            ? "Este caso ainda exige decisão governada."
            : "Este caso pode seguir sem gate adicional, conforme política ativa."}
        </Text>
      ) : null}

      {summary.entitlementMessage ? (
        <Text style={styles.threadReviewEntitlement}>
          {summary.entitlementMessage}
        </Text>
      ) : null}

      {summary.inspectionHistorySummary ? (
        <Text style={styles.threadReviewFootnote}>
          Última base aprovada registrada. {summary.inspectionHistorySummary}
        </Text>
      ) : null}
      {summary.humanOverrideReason ? (
        <Text style={styles.threadReviewFootnote}>
          {`Ajuste humano registrado${summary.humanOverrideActor ? ` por ${summary.humanOverrideActor}` : ""}${
            summary.humanOverrideWhen ? ` em ${summary.humanOverrideWhen}` : ""
          }: ${summary.humanOverrideReason}${
            summary.humanOverrideCount > 1
              ? ` (${summary.humanOverrideCount} registro(s))`
              : ""
          }`}
        </Text>
      ) : null}

      <ThreadConversationReviewVerificationSection summary={summary} />
      <ThreadConversationReviewOfficialIssueSection
        onAbrirAnexoOficial={onAbrirAnexoOficial}
        summary={summary}
      />
      <ThreadConversationReviewDiffSection summary={summary} />
      <ThreadConversationReviewRedFlagsSection summary={summary} />
      <ThreadConversationReviewDecisionFocusSection
        decisionContext={decisionContext}
        summary={summary}
      />
      <ThreadConversationReviewActionsSection
        decisionContext={decisionContext}
        onExecutarComandoRevisaoMobile={onExecutarComandoRevisaoMobile}
        reviewCommandBusy={reviewCommandBusy}
        summary={summary}
      />
      <ThreadConversationReviewHighlightedBlocksSection
        onExecutarComandoRevisaoMobile={onExecutarComandoRevisaoMobile}
        reviewCommandBusy={reviewCommandBusy}
        summary={summary}
      />
    </View>
  );
}
