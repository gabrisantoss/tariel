import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type PanResponderInstance,
} from "react-native";

import { EmptyState } from "../../components/EmptyState";
import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import { resolverCaseLifecycleStatus } from "../chat/caseLifecycle";
import { buildReportPackDraftSummary } from "../chat/reportPackHelpers";
import {
  getOfficialIssueReissueDetail,
  isOfficialIssueReissueRecommended,
} from "../common/officialIssueSummary";
import { HistoryDrawerListItem } from "./HistoryDrawerListItem";
import type {
  HistoryDrawerPanelItem,
  HistoryDrawerSection,
} from "./historyDrawerTypes";

export type {
  HistoryDrawerPanelItem,
  HistoryDrawerSection,
} from "./historyDrawerTypes";

function pluralizeHistoryCases(value: number): string {
  return `${value} caso${value === 1 ? "" : "s"}`;
}

function buildHistorySearchResultLabel(value: number): string {
  return `${pluralizeHistoryCases(value)} encontrado${value === 1 ? "" : "s"}.`;
}

function buildHistorySummaryCounts(items: readonly HistoryDrawerPanelItem[]) {
  return items.reduce(
    (acc, item) => {
      const lifecycleStatus = resolverCaseLifecycleStatus({
        card: {
          ...item,
          tipo_template: item.tipo_template || undefined,
        },
      });
      if (
        lifecycleStatus === "aguardando_mesa" ||
        lifecycleStatus === "em_revisao_mesa"
      ) {
        acc.mesa += 1;
      } else if (
        lifecycleStatus === "emitido" ||
        lifecycleStatus === "aprovado"
      ) {
        acc.concluidos += 1;
      } else {
        acc.emAndamento += 1;
      }
      return acc;
    },
    { concluidos: 0, emAndamento: 0, mesa: 0 },
  );
}

function buildHistorySignalCounts(items: readonly HistoryDrawerPanelItem[]) {
  return items.reduce(
    (acc, item) => {
      const reportPackSummary = buildReportPackDraftSummary(
        item.report_pack_draft,
      );
      if (item.entry_mode_effective === "evidence_first") {
        acc.guided += 1;
      } else if (item.entry_mode_effective === "chat_first") {
        acc.chatLivre += 1;
      }

      if (isOfficialIssueReissueRecommended(item.official_issue_summary)) {
        acc.reemissao += 1;
      }

      if (
        reportPackSummary?.autonomyReady ||
        reportPackSummary?.readyForStructuredForm
      ) {
        acc.prontosParaValidar += 1;
      }

      return acc;
    },
    { chatLivre: 0, guided: 0, prontosParaValidar: 0, reemissao: 0 },
  );
}

function buildHistoryResumeSuggestion(
  items: readonly HistoryDrawerPanelItem[],
): {
  title: string;
  detail: string;
  emphasis: string;
} | null {
  if (!items.length) {
    return null;
  }

  const pick =
    items.find((item) =>
      isOfficialIssueReissueRecommended(item.official_issue_summary),
    ) ||
    items.find((item) => {
      const summary = buildReportPackDraftSummary(item.report_pack_draft);
      return Boolean(summary?.autonomyReady || summary?.readyForStructuredForm);
    }) ||
    items.find((item) => {
      const lifecycleStatus = resolverCaseLifecycleStatus({
        card: {
          ...item,
          tipo_template: item.tipo_template || undefined,
        },
      });
      return (
        lifecycleStatus === "aguardando_mesa" ||
        lifecycleStatus === "em_revisao_mesa" ||
        lifecycleStatus === "devolvido_para_correcao"
      );
    }) ||
    items[0];

  const reportPackSummary = buildReportPackDraftSummary(pick.report_pack_draft);
  const lifecycleStatus = resolverCaseLifecycleStatus({
    card: {
      ...pick,
      tipo_template: pick.tipo_template || undefined,
    },
  });
  const inspectionContext =
    reportPackSummary?.inspectionContextLabel?.trim() || "";
  const governanceDetail = getOfficialIssueReissueDetail(
    pick.official_issue_summary,
    "",
  );

  if (isOfficialIssueReissueRecommended(pick.official_issue_summary)) {
    return {
      title: pick.titulo || "Documento com reemissão pendente",
      detail:
        governanceDetail ||
        "O PDF oficial atual divergiu da última emissão congelada. Retome este caso para reemitir com rastreabilidade.",
      emphasis: "Reemitir documento",
    };
  }

  if (
    reportPackSummary?.autonomyReady ||
    reportPackSummary?.readyForStructuredForm
  ) {
    return {
      title: pick.titulo || "Caso pronto para validar",
      detail:
        inspectionContext ||
        "O pré-laudo já atingiu a base mínima para seguir em Finalizar e passar pelo gate de qualidade.",
      emphasis: "Abrir Finalizar",
    };
  }

  if (
    lifecycleStatus === "aguardando_mesa" ||
    lifecycleStatus === "em_revisao_mesa"
  ) {
    return {
      title: pick.titulo || "Caso em revisão",
      detail:
        governanceDetail ||
        "A revisão humana já foi aberta. Use a aba Mesa ou a central de atividade para acompanhar o retorno.",
      emphasis: "Acompanhar mesa",
    };
  }

  if (lifecycleStatus === "devolvido_para_correcao") {
    return {
      title: pick.titulo || "Caso devolvido",
      detail:
        governanceDetail ||
        "Há pendências de correção registradas. Retome a coleta no chat antes de tentar finalizar novamente.",
      emphasis: "Corrigir no chat",
    };
  }

  return {
    title: pick.titulo || "Retomar operação",
    detail:
      inspectionContext ||
      pick.preview ||
      "Continue a coleta técnica deste caso a partir do último contexto registrado.",
    emphasis: "Retomar coleta",
  };
}

function buildHistorySummaryText(
  items: readonly HistoryDrawerPanelItem[],
  buscaHistorico: string,
): string {
  const totals = buildHistorySummaryCounts(items);
  const signals = buildHistorySignalCounts(items);

  if (buscaHistorico.trim()) {
    const searchSignals = [
      signals.guided ? `${signals.guided} guiados` : "",
      signals.prontosParaValidar
        ? `${signals.prontosParaValidar} prontos para validar`
        : "",
      signals.reemissao ? `${signals.reemissao} com reemissao` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return searchSignals
      ? `${buildHistorySearchResultLabel(items.length)} ${searchSignals}.`
      : buildHistorySearchResultLabel(items.length);
  }

  return `${totals.emAndamento} em andamento · ${totals.mesa} na mesa · ${totals.concluidos} concluidos`;
}

export interface HistoryDrawerPanelProps<TItem extends HistoryDrawerPanelItem> {
  darkMode?: boolean;
  historyDrawerPanResponder: PanResponderInstance;
  historicoDrawerX: Animated.Value;
  onCloseHistory: () => void;
  onHistorySearchFocusChange: (focused: boolean) => void;
  buscaHistorico: string;
  onBuscaHistoricoChange: (value: string) => void;
  conversasOcultasTotal: number;
  historicoAgrupadoFinal: HistoryDrawerSection<TItem>[];
  laudoSelecionadoId: number | null;
  onSelecionarHistorico: (item: TItem) => void;
  onExcluirConversaHistorico: (item: TItem) => void;
  historicoVazioTitulo: string;
  historicoVazioTexto: string;
  brandMarkSource: ImageSourcePropType;
}

export function HistoryDrawerPanel<TItem extends HistoryDrawerPanelItem>({
  darkMode = false,
  historyDrawerPanResponder,
  historicoDrawerX,
  onCloseHistory,
  onHistorySearchFocusChange,
  buscaHistorico,
  onBuscaHistoricoChange,
  conversasOcultasTotal,
  historicoAgrupadoFinal,
  laudoSelecionadoId,
  onSelecionarHistorico,
  onExcluirConversaHistorico,
  historicoVazioTitulo,
  historicoVazioTexto,
}: HistoryDrawerPanelProps<TItem>) {
  const { t } = useAppTranslation();
  const itensVisiveis = historicoAgrupadoFinal.flatMap(
    (section) => section.items,
  );
  const totals = buildHistorySummaryCounts(itensVisiveis);
  const signals = buildHistorySignalCounts(itensVisiveis);
  const totalVisiveis = historicoAgrupadoFinal.reduce(
    (total, section) => total + section.items.length,
    0,
  );
  const totalFixados = historicoAgrupadoFinal.reduce(
    (total, section) =>
      total + section.items.filter((item) => item.pinado).length,
    0,
  );
  const totalHistorico = totalVisiveis + conversasOcultasTotal;
  const exibirBusca = totalHistorico > 0 || Boolean(buscaHistorico.trim());
  const resumeSuggestion = buscaHistorico.trim()
    ? null
    : buildHistoryResumeSuggestion(itensVisiveis);

  return (
    <Animated.View
      {...historyDrawerPanResponder.panHandlers}
      style={[
        styles.sidePanelDrawer,
        styles.sidePanelDrawerLeft,
        darkMode ? styles.sidePanelDrawerPrintDark : null,
        { transform: [{ translateX: historicoDrawerX }] },
      ]}
      testID="history-drawer"
    >
      <View style={styles.sidePanelHeader}>
        <View style={styles.sidePanelCopy}>
          <Text
            style={[
              styles.sidePanelTitle,
              darkMode ? styles.sidePanelTitlePrintDark : null,
            ]}
          >
            {t("Histórico")}
          </Text>
          <Text
            style={[
              styles.sidePanelDescription,
              darkMode ? styles.sidePanelDescriptionPrintDark : null,
            ]}
          >
            {t("Conversas recentes")}
          </Text>
        </View>
        <Pressable
          onPress={onCloseHistory}
          style={[
            styles.sidePanelCloseButton,
            darkMode ? styles.sidePanelCloseButtonPrintDark : null,
          ]}
          testID="close-history-drawer-button"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={darkMode ? "#F0F4F8" : colors.textPrimary}
          />
        </Pressable>
      </View>

      {exibirBusca ? (
        <View
          style={[
            styles.historySummaryCard,
            darkMode ? styles.historySummaryCardDark : null,
          ]}
          testID="history-summary-card"
        >
          <View
            style={[
              styles.historySearchShell,
              darkMode ? styles.historySearchShellDark : null,
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={darkMode ? "#AFC0D2" : colors.textSecondary}
            />
            <TextInput
              onChangeText={onBuscaHistoricoChange}
              onBlur={() => onHistorySearchFocusChange(false)}
              onFocus={() => onHistorySearchFocusChange(true)}
              placeholder={t("Buscar histórico")}
              placeholderTextColor={darkMode ? "#8999AB" : colors.textSecondary}
              style={[
                styles.historySearchInput,
                darkMode ? styles.historySearchInputDark : null,
              ]}
              testID="history-search-input"
              value={buscaHistorico}
            />
          </View>
          <View style={styles.historySummaryHeader}>
            <View style={styles.historySummaryCopy}>
              <Text style={styles.historySummaryEyebrow}>
                {buscaHistorico.trim() ? t("Busca ativa") : t("Retomada rapida")}
              </Text>
              <Text
                style={[
                  styles.historySummaryTitle,
                  darkMode ? styles.historySummaryTitleDark : null,
                ]}
              >
                {t("Radar da operação")}
              </Text>
            </View>
            <Text
              style={[
                styles.historySummaryCountLabel,
                darkMode ? styles.historySummaryCountLabelDark : null,
              ]}
            >
              {t(pluralizeHistoryCases(totalVisiveis))}
            </Text>
          </View>
          <View style={styles.historySummaryMetricGrid}>
            <View
              style={[
                styles.historySummaryMetricCard,
                darkMode ? styles.historySummaryMetricCardDark : null,
              ]}
            >
              <Text
                style={[
                  styles.historySummaryMetricValue,
                  darkMode ? styles.historySummaryMetricValueDark : null,
                ]}
              >
                {totals.emAndamento}
              </Text>
              <Text
                style={[
                  styles.historySummaryMetricLabel,
                  darkMode ? styles.historySummaryMetricLabelDark : null,
                ]}
              >
                {t("em andamento")}
              </Text>
            </View>
            <View
              style={[
                styles.historySummaryMetricCard,
                darkMode ? styles.historySummaryMetricCardDark : null,
              ]}
            >
              <Text
                style={[
                  styles.historySummaryMetricValue,
                  darkMode ? styles.historySummaryMetricValueDark : null,
                ]}
              >
                {totals.mesa}
              </Text>
              <Text
                style={[
                  styles.historySummaryMetricLabel,
                  darkMode ? styles.historySummaryMetricLabelDark : null,
                ]}
              >
                {t("na mesa")}
              </Text>
            </View>
            <View
              style={[
                styles.historySummaryMetricCard,
                darkMode ? styles.historySummaryMetricCardDark : null,
              ]}
            >
              <Text
                style={[
                  styles.historySummaryMetricValue,
                  darkMode ? styles.historySummaryMetricValueDark : null,
                ]}
              >
                {totals.concluidos}
              </Text>
              <Text
                style={[
                  styles.historySummaryMetricLabel,
                  darkMode ? styles.historySummaryMetricLabelDark : null,
                ]}
              >
                {t("concluidos")}
              </Text>
            </View>
          </View>
          <View style={styles.historySummaryPills}>
            <View
              style={[
                styles.historySummaryPill,
                darkMode ? styles.historySummaryPillDark : null,
              ]}
            >
              <Text
                style={[
                  styles.historySummaryPillText,
                  darkMode ? styles.historySummaryPillTextDark : null,
                ]}
              >
                {t(`${totalFixados} fixados`)}
              </Text>
            </View>
            <View
              style={[
                styles.historySummaryPill,
                darkMode ? styles.historySummaryPillDark : null,
              ]}
            >
              <Text
                style={[
                  styles.historySummaryPillText,
                  darkMode ? styles.historySummaryPillTextDark : null,
                ]}
              >
                {t(`${conversasOcultasTotal} ocultos`)}
              </Text>
            </View>
            {signals.guided ? (
              <View
                style={[
                  styles.historySummaryPill,
                  darkMode ? styles.historySummaryPillDark : null,
                ]}
              >
                <Text
                  style={[
                    styles.historySummaryPillText,
                    darkMode ? styles.historySummaryPillTextDark : null,
                  ]}
                  testID="history-summary-guided-pill"
                >
                  {t(`${signals.guided} guiados`)}
                </Text>
              </View>
            ) : null}
            {signals.reemissao ? (
              <View
                style={[
                  styles.historySummaryPill,
                  darkMode ? styles.historySummaryPillDark : null,
                ]}
              >
                <Text
                  style={[
                    styles.historySummaryPillText,
                    darkMode ? styles.historySummaryPillTextDark : null,
                  ]}
                  testID="history-summary-reissue-pill"
                >
                  {t(
                    `${signals.reemissao} reemissão recomendada${signals.reemissao === 1 ? "" : "s"}`,
                  )}
                </Text>
              </View>
            ) : null}
            {signals.prontosParaValidar ? (
              <View
                style={[
                  styles.historySummaryPill,
                  darkMode ? styles.historySummaryPillDark : null,
                ]}
              >
                <Text
                  style={[
                    styles.historySummaryPillText,
                    darkMode ? styles.historySummaryPillTextDark : null,
                  ]}
                  testID="history-summary-validation-pill"
                >
                  {t(
                    `${signals.prontosParaValidar} pronto${signals.prontosParaValidar === 1 ? "" : "s"} para validar`,
                  )}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.historySummaryText,
              darkMode ? styles.historySummaryTextDark : null,
            ]}
          >
            {t(buildHistorySummaryText(itensVisiveis, buscaHistorico))}
          </Text>
          {!buscaHistorico.trim() && signals.chatLivre ? (
            <Text
              style={[
                styles.historySummaryText,
                darkMode ? styles.historySummaryTextDark : null,
              ]}
              testID="history-summary-entry-mode-text"
            >
              {t(
                `${signals.guided} guiados · ${signals.chatLivre} em chat livre`,
              )}
            </Text>
          ) : null}
          {resumeSuggestion ? (
            <View
              style={[
                styles.historyResumeCard,
                darkMode ? styles.historyResumeCardDark : null,
              ]}
              testID="history-resume-suggestion-card"
            >
              <View style={styles.historyResumeHeader}>
                <View style={styles.historyResumeCopy}>
                  <Text style={styles.historyResumeEyebrow}>
                    {t("Retomada sugerida")}
                  </Text>
                  <Text
                    style={[
                      styles.historyResumeTitle,
                      darkMode ? styles.historyResumeTitleDark : null,
                    ]}
                  >
                    {t(resumeSuggestion.title)}
                  </Text>
                </View>
                <View style={styles.historyResumeEmphasisPill}>
                  <Text style={styles.historyResumeEmphasisText}>
                    {t(resumeSuggestion.emphasis)}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.historyResumeDetail,
                  darkMode ? styles.historyResumeDetailDark : null,
                ]}
              >
                {t(resumeSuggestion.detail)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.historySections}
        keyboardShouldPersistTaps="handled"
        testID={
          historicoAgrupadoFinal.length
            ? "history-results-loaded"
            : "history-results-empty"
        }
      >
        {historicoAgrupadoFinal.length ? (
          historicoAgrupadoFinal.map((section, sectionIndex) => (
            <View
              key={section.key}
              style={styles.historySection}
              testID={`history-section-${section.key}`}
            >
              <View style={styles.historySectionHeader}>
                <Text
                  style={[
                    styles.historySectionTitle,
                    darkMode ? styles.historySectionTitleDark : null,
                  ]}
                >
                  {t(section.title)}
                </Text>
                <View
                  style={[
                    styles.historySectionCountBadge,
                    darkMode ? styles.historySectionCountBadgeDark : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.historySectionCountText,
                      darkMode ? styles.historySectionCountTextDark : null,
                    ]}
                  >
                    {section.items.length}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.historySectionItems,
                  darkMode ? styles.historySectionItemsDark : null,
                ]}
              >
                {section.items.map((item, itemIndex) => {
                  const ativo = item.id === laudoSelecionadoId;
                  const isFirstHistoryItem =
                    sectionIndex === 0 && itemIndex === 0;
                  return (
                    <HistoryDrawerListItem
                      key={`history-${section.key}-${item.id}`}
                      ativo={ativo}
                      containerTestID={
                        isFirstHistoryItem
                          ? "history-first-item-button"
                          : undefined
                      }
                      isLastItem={itemIndex === section.items.length - 1}
                      item={item}
                      darkMode={darkMode}
                      onExcluir={() => onExcluirConversaHistorico(item)}
                      onSelecionar={() => onSelecionarHistorico(item)}
                      testID={`history-item-${item.id}`}
                    />
                  );
                })}
                <View
                  collapsable={false}
                  pointerEvents="none"
                  style={{ height: 0, opacity: 0, width: 0 }}
                >
                  {section.items.map((item) => {
                    const ativo = item.id === laudoSelecionadoId;
                    return (
                      <View
                        key={`history-marker-${section.key}-${item.id}`}
                        collapsable={false}
                      >
                        <View
                          collapsable={false}
                          testID={`history-target-visible-${item.id}`}
                        />
                        {ativo ? (
                          <View
                            collapsable={false}
                            testID={`history-item-selected-${item.id}`}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.historyEmptyState} testID="history-empty-state">
            <EmptyState
              compact
              darkMode={darkMode}
              description={t(historicoVazioTexto)}
              icon="history"
              title={t(historicoVazioTitulo)}
            />
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
