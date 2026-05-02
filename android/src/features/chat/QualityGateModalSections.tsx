import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";

import type {
  ApiHealthStatus,
  MobileQualityGateResponse,
} from "../../types/mobile";
import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import type { MobileReportPackDraftSummary } from "./reportPackHelpers";
import { modalStyles } from "./QualityGateModal.styles";
import type {
  QualityGateStatusSummary,
  QualityGateSummaryChip,
  QualityGateStatusTone,
} from "./qualityGateModalHelpers";
import { QUALITY_GATE_OVERRIDE_MIN_REASON_LENGTH } from "./qualityGateHelpers";

function heroToneStyle(tone: QualityGateStatusTone) {
  if (tone === "success") {
    return modalStyles.summaryHeroSuccess;
  }
  if (tone === "accent") {
    return modalStyles.summaryHeroAccent;
  }
  return modalStyles.summaryHeroDanger;
}

function heroIconStyle(tone: QualityGateStatusTone) {
  if (tone === "success") {
    return modalStyles.summaryHeroIconSuccess;
  }
  if (tone === "accent") {
    return modalStyles.summaryHeroIconAccent;
  }
  return modalStyles.summaryHeroIconDanger;
}

function heroIconColor(tone: QualityGateStatusTone) {
  if (tone === "success") {
    return colors.success;
  }
  if (tone === "accent") {
    return colors.accent;
  }
  return colors.danger;
}

export function QualityGateSummaryHero(props: {
  statusSummary: QualityGateStatusSummary;
  summaryChips: QualityGateSummaryChip[];
}) {
  const { statusSummary, summaryChips } = props;
  const { t } = useAppTranslation();

  return (
    <View style={[modalStyles.summaryHero, heroToneStyle(statusSummary.tone)]}>
      <View style={modalStyles.summaryHeroTop}>
        <View
          style={[
            modalStyles.summaryHeroIcon,
            heroIconStyle(statusSummary.tone),
          ]}
        >
          <MaterialCommunityIcons
            color={heroIconColor(statusSummary.tone)}
            name={statusSummary.icon}
            size={18}
          />
        </View>
        <View style={modalStyles.summaryHeroCopy}>
          <Text style={modalStyles.summaryHeroLabel}>
            {t(statusSummary.label)}
          </Text>
          <Text style={modalStyles.summaryHeroDescription}>
            {t(statusSummary.description)}
          </Text>
        </View>
      </View>
      <View style={modalStyles.summaryChipRow}>
        {summaryChips.map((item) => (
          <View key={item.key} style={modalStyles.summaryChip}>
            <Text style={modalStyles.summaryChipText}>{t(item.label)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function QualityGateMetricRow(props: {
  evidenceCount: string | null;
  photoCount: string | null;
  reportPackSummary: MobileReportPackDraftSummary | null;
  textCount: string | null;
}) {
  const { evidenceCount, photoCount, reportPackSummary, textCount } = props;
  const { t } = useAppTranslation();

  return (
    <View style={modalStyles.metricRow}>
      {textCount ? (
        <View style={modalStyles.metricCard}>
          <Text style={modalStyles.metricValue}>{textCount}</Text>
          <Text style={modalStyles.metricLabel}>{t("Registros")}</Text>
        </View>
      ) : null}
      {evidenceCount ? (
        <View style={modalStyles.metricCard}>
          <Text style={modalStyles.metricValue}>{evidenceCount}</Text>
          <Text style={modalStyles.metricLabel}>{t("Evidências")}</Text>
        </View>
      ) : null}
      {photoCount ? (
        <View style={modalStyles.metricCard}>
          <Text style={modalStyles.metricValue}>{photoCount}</Text>
          <Text style={modalStyles.metricLabel}>{t("Fotos")}</Text>
        </View>
      ) : null}
      {reportPackSummary?.totalBlocks ? (
        <View style={modalStyles.metricCard}>
          <Text style={modalStyles.metricValue}>
            {`${reportPackSummary.readyBlocks}/${reportPackSummary.totalBlocks}`}
          </Text>
          <Text style={modalStyles.metricLabel}>{t("Blocos")}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function QualityGateReportPackSection(props: {
  blockingNarrative?: string;
  reportPackSummary: MobileReportPackDraftSummary | null;
}) {
  const { blockingNarrative, reportPackSummary } = props;
  const { t } = useAppTranslation();
  if (!reportPackSummary) {
    return null;
  }

  return (
    <View style={modalStyles.section} testID="quality-gate-report-pack-section">
      <Text style={modalStyles.sectionTitle}>
        {t("Prontidão do pré-laudo")}
      </Text>
      <Text style={modalStyles.sectionDescription}>
        {t(
          `${reportPackSummary.readinessLabel}. ${reportPackSummary.readinessDetail}`,
        )}
      </Text>
      {blockingNarrative ? (
        <Text style={modalStyles.issueMeta}>{t(blockingNarrative)}</Text>
      ) : null}
      <Text style={modalStyles.issueMeta}>
        {t(
          `${reportPackSummary.templateLabel} • ${reportPackSummary.finalValidationModeLabel} • conflito ${reportPackSummary.maxConflictScore}`,
        )}
      </Text>
      {reportPackSummary.blockSummaries.map((item) => (
        <View key={item.key} style={modalStyles.issueCard}>
          <View style={modalStyles.issueHeader}>
            <Text style={modalStyles.issueTitle}>{t(item.title)}</Text>
            <Text style={modalStyles.issueBadge}>{t(item.statusLabel)}</Text>
          </View>
          <Text style={modalStyles.issueText}>{t(item.summary)}</Text>
        </View>
      ))}
      {reportPackSummary.missingEvidenceMessages.map((item) => (
        <Text key={item} style={modalStyles.sectionDescription}>
          {t(item)}
        </Text>
      ))}
    </View>
  );
}

export function QualityGateMissingItemsSection(props: {
  items: NonNullable<MobileQualityGateResponse["faltantes"]>;
}) {
  const { items } = props;
  const { t } = useAppTranslation();
  if (!items.length) {
    return null;
  }

  return (
    <View style={modalStyles.section}>
      <Text style={modalStyles.sectionTitle}>
        {t("Pendências que ainda bloqueiam o caso")}
      </Text>
      {items.map((item) => (
        <View key={item.id} style={modalStyles.issueCard}>
          <View style={modalStyles.issueHeader}>
            <Text style={modalStyles.issueTitle}>{t(item.titulo)}</Text>
            <Text style={modalStyles.issueBadge}>{t("Faltante")}</Text>
          </View>
          <Text style={modalStyles.issueMeta}>
            {t(item.categoria || "coleta")} • {t("atual")}{" "}
            {String(item.atual ?? "-")} • {t("mínimo")}{" "}
            {String(item.minimo ?? "-")}
          </Text>
          {!!item.observacao && (
            <Text style={modalStyles.issueText}>{t(item.observacao)}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function QualityGateGuideSection(props: {
  payload: MobileQualityGateResponse;
}) {
  const { t } = useAppTranslation();
  const guideItems = props.payload.roteiro_template?.itens || [];
  if (!guideItems.length) {
    return null;
  }

  return (
    <View style={modalStyles.section}>
      <Text style={modalStyles.sectionTitle}>
        {t("Roteiro obrigatório do template")}
      </Text>
      {!!props.payload.roteiro_template?.descricao && (
        <Text style={modalStyles.sectionDescription}>
          {t(props.payload.roteiro_template.descricao)}
        </Text>
      )}
      {guideItems.map((item) => (
        <View key={item.id} style={modalStyles.guideItem}>
          <MaterialCommunityIcons
            color={colors.accent}
            name="check-circle-outline"
            size={16}
          />
          <View style={modalStyles.guideCopy}>
            <Text style={modalStyles.guideTitle}>{t(item.titulo)}</Text>
            {!!item.descricao && (
              <Text style={modalStyles.guideDescription}>
                {t(item.descricao)}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export function QualityGateOverrideSection(props: {
  onChangeReason: (value: string) => void;
  payload: MobileQualityGateResponse;
  reason: string;
  reasonRequired: boolean;
}) {
  const { onChangeReason, payload, reason, reasonRequired } = props;
  const { t } = useAppTranslation();

  return (
    <View style={modalStyles.section}>
      <Text style={modalStyles.sectionTitle}>
        {t("Exceção governada disponível")}
      </Text>
      <Text style={modalStyles.sectionDescription}>
        {t(
          payload.human_override_policy?.message ||
            "A divergência pode seguir com justificativa interna.",
        )}
      </Text>
      {payload.human_override_policy?.matched_override_case_labels?.length ? (
        <View style={modalStyles.caseLabelRow}>
          {payload.human_override_policy.matched_override_case_labels.map(
            (label) => (
              <View key={label} style={modalStyles.caseLabelChip}>
                <Text style={modalStyles.caseLabelText}>{t(label)}</Text>
              </View>
            ),
          )}
        </View>
      ) : null}
      <Text style={modalStyles.responsibilityText}>
        {t(payload.human_override_policy?.responsibility_notice || "")}
      </Text>
      <TextInput
        multiline
        onChangeText={onChangeReason}
        placeholder={t(
          "Explique internamente por que o caso seguirá mesmo assim.",
        )}
        placeholderTextColor={colors.textSecondary}
        style={modalStyles.reasonInput}
        value={reason}
      />
      <Text style={modalStyles.reasonHint}>
        {reasonRequired
          ? t(
              `Justificativa interna obrigatória com pelo menos ${QUALITY_GATE_OVERRIDE_MIN_REASON_LENGTH} caracteres.`,
            )
          : t("Justificativa interna opcional.")}
      </Text>
    </View>
  );
}

export function QualityGateCorrectionSection(props: {
  blockingNarrative: string;
  reviewModeLabel: string;
}) {
  const { blockingNarrative, reviewModeLabel } = props;
  const { t } = useAppTranslation();
  const nextAction =
    reviewModeLabel === "Mesa obrigatória"
      ? "Resolva os bloqueios no chat e então siga para a Mesa."
      : "Resolva os bloqueios no chat e valide novamente neste quality gate.";

  return (
    <View style={modalStyles.section}>
      <Text style={modalStyles.sectionTitle}>
        {t("Correção necessária antes de seguir")}
      </Text>
      <Text style={modalStyles.sectionDescription}>
        {blockingNarrative
          ? t(`${blockingNarrative} ainda seguram o avanço. ${nextAction}`)
          : t(`Ajuste a coleta do caso antes de seguir. ${nextAction}`)}
      </Text>
    </View>
  );
}

export function QualityGateOfflineCard(props: { statusApi: ApiHealthStatus }) {
  const { t } = useAppTranslation();
  if (props.statusApi !== "offline") {
    return null;
  }

  return (
    <View style={modalStyles.offlineCard}>
      <MaterialCommunityIcons color={colors.accent} name="wifi-off" size={16} />
      <Text style={modalStyles.offlineText}>
        {t(
          "Se a confirmação falhar por conexão, a finalização pode ficar guardada na fila offline.",
        )}
      </Text>
    </View>
  );
}
