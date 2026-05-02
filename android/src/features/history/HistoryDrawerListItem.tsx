import { useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";

import { useAppTranslation, type AppLocale } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import {
  resolverAllowedSurfaceActions,
  resolverAllowedLifecycleTransitions,
  resolverCaseLifecycleStatus,
  resolverCaseOwnerRole,
  resumirCaseSurfaceActions,
  targetThreadCaseLifecycle,
  rotuloCaseLifecycle,
  rotuloCaseOwnerRole,
} from "../chat/caseLifecycle";
import { buildReportPackDraftSummary } from "../chat/reportPackHelpers";
import { reasonLabelForInspectionEntryMode } from "../inspection/inspectionEntryMode";
import type { HistoryDrawerPanelItem } from "./historyDrawerTypes";

const HISTORY_DELETE_SWIPE_TRIGGER = 112;
const HISTORY_DELETE_SWIPE_DISMISS = 420;

type HistoryBadgeTone = "neutral" | "accent" | "success" | "danger";

function historyDateLocale(locale: AppLocale): string {
  if (locale === "en") {
    return "en-US";
  }
  if (locale === "es") {
    return "es-ES";
  }
  return "pt-BR";
}

function formatarResumoDataHistorico(dataIso: string, locale: AppLocale) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) {
    return "Sem data";
  }

  try {
    return new Intl.DateTimeFormat(historyDateLocale(locale), {
      day: "2-digit",
      month: "short",
    }).format(data);
  } catch {
    return data.toLocaleDateString(historyDateLocale(locale));
  }
}

function formatHistoryEntryModeLabel(value?: string): string {
  switch (value) {
    case "evidence_first":
      return "Coleta guiada";
    case "chat_first":
      return "Chat livre";
    default:
      return "";
  }
}

function resolverTomBadgeHistorico(lifecycleStatus: string): HistoryBadgeTone {
  if (lifecycleStatus === "emitido" || lifecycleStatus === "aprovado") {
    return "success";
  }

  if (lifecycleStatus === "devolvido_para_correcao") {
    return "danger";
  }

  if (
    lifecycleStatus === "pre_laudo" ||
    lifecycleStatus === "laudo_em_coleta" ||
    lifecycleStatus === "aguardando_mesa" ||
    lifecycleStatus === "em_revisao_mesa"
  ) {
    return "accent";
  }

  return "neutral";
}

function formatReportPackMeta(
  reportPackSummary: ReturnType<typeof buildReportPackDraftSummary>,
): string {
  if (!reportPackSummary) {
    return "";
  }

  const statusSummary =
    reportPackSummary.pendingBlocks > 0
      ? `${reportPackSummary.pendingBlocks} bloqueio${reportPackSummary.pendingBlocks === 1 ? "" : "s"}`
      : reportPackSummary.attentionBlocks > 0
        ? `${reportPackSummary.attentionBlocks} em revisão`
        : reportPackSummary.totalBlocks > 0
          ? `${reportPackSummary.readyBlocks}/${reportPackSummary.totalBlocks} blocos`
          : "";

  return [reportPackSummary.readinessLabel, statusSummary]
    .filter(Boolean)
    .join(" · ");
}

function resumirRotaSugeridaHistorico(params: {
  lifecycleStatus: string;
  ownerRole: string;
  transitions: ReturnType<typeof resolverAllowedLifecycleTransitions>;
  allowedSurfaceActions: ReturnType<typeof resolverAllowedSurfaceActions>;
}): string {
  if (
    params.allowedSurfaceActions.includes("mesa_approve") ||
    params.allowedSurfaceActions.includes("mesa_return")
  ) {
    return "Tratar na mesa";
  }
  const preferredTransition = params.transitions[0] || null;
  if (preferredTransition?.preferred_surface === "mesa") {
    return "Abrir mesa";
  }
  if (preferredTransition?.preferred_surface === "chat") {
    return "Retomar chat";
  }
  if (preferredTransition?.preferred_surface === "mobile") {
    return "Abrir finalizar";
  }
  if (params.allowedSurfaceActions.includes("chat_finalize")) {
    return "Validar em finalizar";
  }
  if (params.allowedSurfaceActions.includes("chat_reopen")) {
    return "Reabrir no chat";
  }
  if (params.allowedSurfaceActions.includes("system_issue")) {
    return "Emitir documento";
  }
  return targetThreadCaseLifecycle(params.lifecycleStatus as any) === "mesa"
    ? "Acompanhar mesa"
    : params.ownerRole === "none"
      ? "Acompanhar emissão"
      : "Retomar coleta";
}

export function HistoryDrawerListItem<TItem extends HistoryDrawerPanelItem>({
  ativo,
  containerTestID,
  darkMode = false,
  item,
  isLastItem = false,
  onExcluir,
  onSelecionar,
  testID,
}: {
  ativo: boolean;
  containerTestID?: string;
  darkMode?: boolean;
  item: TItem;
  isLastItem?: boolean;
  onExcluir: () => void;
  onSelecionar: () => void;
  testID: string;
}) {
  const { locale, t } = useAppTranslation();
  const translateX = useRef(new Animated.Value(0)).current;
  const animandoExclusaoRef = useRef(false);
  const swipeProgress = translateX.interpolate({
    inputRange: [0, 28, HISTORY_DELETE_SWIPE_TRIGGER],
    outputRange: [0, 0.3, 1],
    extrapolate: "clamp",
  });

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 12,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !animandoExclusaoRef.current &&
        gestureState.dx > 10 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(Math.max(0, gestureState.dx));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= HISTORY_DELETE_SWIPE_TRIGGER) {
          animandoExclusaoRef.current = true;
          Animated.timing(translateX, {
            toValue: HISTORY_DELETE_SWIPE_DISMISS,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onExcluir();
            animandoExclusaoRef.current = false;
            translateX.setValue(0);
          });
          return;
        }

        resetSwipe();
      },
      onPanResponderTerminate: resetSwipe,
    }),
  ).current;

  const cardAdapter = {
    ...item,
    tipo_template: item.tipo_template || undefined,
  };
  const lifecycleStatus = resolverCaseLifecycleStatus({ card: cardAdapter });
  const ownerRole = resolverCaseOwnerRole({
    card: cardAdapter,
    lifecycleStatus,
  });
  const allowedSurfaceActions = resolverAllowedSurfaceActions({
    card: cardAdapter,
    lifecycleStatus,
    ownerRole,
  });
  const allowedLifecycleTransitions = resolverAllowedLifecycleTransitions({
    card: cardAdapter,
    lifecycleStatus,
  });
  const metaResumo = [
    rotuloCaseOwnerRole(ownerRole),
    resumirCaseSurfaceActions(allowedSurfaceActions, 1),
  ]
    .filter(Boolean)
    .join(" · ");
  const reportPackSummary = buildReportPackDraftSummary(item.report_pack_draft);
  const reportPackMeta = formatReportPackMeta(reportPackSummary);
  const prontoParaValidar =
    Boolean(reportPackSummary?.autonomyReady) ||
    Boolean(reportPackSummary?.readyForStructuredForm);
  const officialIssueSummary = item.official_issue_summary;
  const governanceMeta = officialIssueSummary
    ? [officialIssueSummary.label, officialIssueSummary.detail]
        .filter(Boolean)
        .join(" · ")
    : "";
  const inspectionContextMeta = reportPackSummary?.inspectionContextLabel || "";
  const entryModeLabel = formatHistoryEntryModeLabel(item.entry_mode_effective);
  const entryModeReason = item.entry_mode_reason?.trim()
    ? reasonLabelForInspectionEntryMode(item.entry_mode_reason)
    : "";
  const entryModeMeta = [entryModeLabel, entryModeReason]
    .filter(Boolean)
    .join(" · ");
  const ownerLabel = rotuloCaseOwnerRole(ownerRole);
  const routeSuggestion = resumirRotaSugeridaHistorico({
    lifecycleStatus,
    ownerRole,
    transitions: allowedLifecycleTransitions,
    allowedSurfaceActions,
  });
  const detailPills = [
    ownerLabel
      ? {
          key: "owner",
          label: `Responsável · ${ownerLabel}`,
          testID: `history-item-owner-${item.id}`,
        }
      : null,
    routeSuggestion
      ? {
          key: "route",
          label: `Rota · ${routeSuggestion}`,
          testID: `history-item-route-${item.id}`,
        }
      : null,
    metaResumo
      ? {
          key: "operation",
          label: `Operacao · ${metaResumo}`,
          testID: `history-item-meta-${item.id}`,
        }
      : null,
    entryModeMeta
      ? {
          key: "entry-mode",
          label: `Entrada · ${entryModeMeta}`,
          testID: `history-item-entry-mode-${item.id}`,
        }
      : null,
    reportPackMeta
      ? {
          key: "report-pack",
          label: `Pacote · ${reportPackMeta}`,
          testID: `history-item-report-pack-${item.id}`,
        }
      : null,
    governanceMeta
      ? {
          key: "governance",
          label: `Governanca · ${governanceMeta}`,
          testID: `history-item-governance-${item.id}`,
        }
      : null,
    inspectionContextMeta
      ? {
          key: "context",
          label: `Contexto · ${inspectionContextMeta}`,
          testID: `history-item-context-${item.id}`,
        }
      : null,
  ].filter((value): value is { key: string; label: string; testID: string } =>
    Boolean(value),
  );
  const badgeStatusLabel =
    item.status_card_label?.trim() || rotuloCaseLifecycle(lifecycleStatus);
  const badgeStatusTone = resolverTomBadgeHistorico(lifecycleStatus);
  const badgeTemplateLabel = item.tipo_template
    ? `Template ${item.tipo_template}`
    : lifecycleStatus === "analise_livre"
      ? "Chat livre"
      : "Sem template";
  const badgeDateLabel = formatarResumoDataHistorico(item.data_iso, locale);
  const accentBarStyle =
    badgeStatusTone === "accent"
      ? styles.historyItemAccentBarAccent
      : badgeStatusTone === "success"
        ? styles.historyItemAccentBarSuccess
        : badgeStatusTone === "danger"
          ? styles.historyItemAccentBarDanger
          : null;

  return (
    <View style={styles.historyItemShell} testID={containerTestID}>
      <Animated.View
        pointerEvents="none"
        style={[styles.historyItemDeleteRail, { opacity: swipeProgress }]}
      >
        <Animated.View
          style={[
            styles.historyItemDeleteRailBadge,
            {
              transform: [
                {
                  scale: swipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color={colors.danger}
          />
          <Text style={styles.historyItemDeleteRailText}>{t("Excluir")}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        <Pressable
          accessibilityHint={t("Abrir laudo do histórico")}
          accessibilityLabel={`${t("Histórico do laudo")} ${item.id}`}
          accessibilityState={{ selected: ativo }}
          onPress={onSelecionar}
          style={[
            styles.historyItem,
            styles.historyItemPrimary,
            darkMode ? styles.historyItemDark : null,
            isLastItem ? styles.historyItemLast : null,
            ativo ? styles.historyItemActive : null,
            ativo && darkMode ? styles.historyItemActiveDark : null,
          ]}
          testID={testID}
        >
          <View style={styles.historyItemLead}>
            <View
              style={[
                styles.historyItemAccentBar,
                accentBarStyle,
                ativo ? styles.historyItemAccentBarActive : null,
              ]}
            />
            <View style={styles.historyItemCopy}>
              <View style={styles.historyItemTitleRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.historyItemTitle,
                    darkMode ? styles.historyItemTitleDark : null,
                    ativo ? styles.historyItemTitleActive : null,
                    ativo && darkMode ? styles.historyItemTitleActiveDark : null,
                  ]}
                >
                  {item.titulo}
                </Text>
                {item.pinado ? (
                  <MaterialCommunityIcons
                    name="pin"
                    size={14}
                    color={ativo ? "rgba(255,255,255,0.78)" : colors.accent}
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                style={[
                  styles.historyItemPreview,
                  darkMode ? styles.historyItemPreviewDark : null,
                  ativo ? styles.historyItemPreviewActive : null,
                ]}
              >
                {t(item.preview || "Sem atualização recente")}
              </Text>
              <View style={styles.historyItemBadgeRow}>
                <View
                  style={[
                    styles.historyItemBadge,
                    badgeStatusTone === "accent"
                      ? styles.historyItemBadgeAccent
                      : badgeStatusTone === "success"
                        ? styles.historyItemBadgeSuccess
                        : badgeStatusTone === "danger"
                          ? styles.historyItemBadgeDanger
                          : null,
                    darkMode ? styles.historyItemBadgeDark : null,
                    ativo ? styles.historyItemBadgeActive : null,
                    ativo && darkMode ? styles.historyItemBadgeActiveDark : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.historyItemBadgeText,
                      darkMode ? styles.historyItemBadgeTextDark : null,
                      badgeStatusTone === "accent"
                        ? styles.historyItemBadgeTextAccent
                        : badgeStatusTone === "success"
                          ? styles.historyItemBadgeTextSuccess
                          : badgeStatusTone === "danger"
                            ? styles.historyItemBadgeTextDanger
                            : null,
                      ativo ? styles.historyItemBadgeTextActive : null,
                    ]}
                  >
                    {t(badgeStatusLabel)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.historyItemBadge,
                    prontoParaValidar ? styles.historyItemBadgeSuccess : null,
                    darkMode ? styles.historyItemBadgeDark : null,
                    ativo && prontoParaValidar
                      ? styles.historyItemBadgeMutedActive
                      : null,
                    ativo ? styles.historyItemBadgeMutedActive : null,
                    ativo && darkMode
                      ? styles.historyItemBadgeMutedActiveDark
                      : null,
                  ]}
                  testID={
                    prontoParaValidar
                      ? `history-item-validation-badge-${item.id}`
                      : undefined
                  }
                >
                  <Text
                    style={[
                      styles.historyItemBadgeText,
                      darkMode ? styles.historyItemBadgeTextDark : null,
                      prontoParaValidar
                        ? styles.historyItemBadgeTextSuccess
                        : null,
                      ativo ? styles.historyItemBadgeTextActive : null,
                    ]}
                  >
                    {prontoParaValidar
                      ? t("Pronto para validar")
                      : t(badgeTemplateLabel)}
                  </Text>
                </View>
                {!prontoParaValidar ? null : (
                  <View
                    style={[
                      styles.historyItemBadge,
                      darkMode ? styles.historyItemBadgeDark : null,
                      ativo ? styles.historyItemBadgeMutedActive : null,
                      ativo && darkMode
                        ? styles.historyItemBadgeMutedActiveDark
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyItemBadgeText,
                        darkMode ? styles.historyItemBadgeTextDark : null,
                        ativo ? styles.historyItemBadgeTextActive : null,
                      ]}
                    >
                      {t(badgeTemplateLabel)}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.historyItemBadge,
                    darkMode ? styles.historyItemBadgeDark : null,
                    ativo ? styles.historyItemBadgeMutedActive : null,
                    ativo && darkMode
                      ? styles.historyItemBadgeMutedActiveDark
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.historyItemBadgeText,
                      darkMode ? styles.historyItemBadgeTextDark : null,
                      ativo ? styles.historyItemBadgeTextActive : null,
                    ]}
                  >
                    {t(badgeDateLabel)}
                  </Text>
                </View>
              </View>
              {detailPills.length ? (
                <View style={styles.historyItemDetailRail}>
                  {detailPills.map((detail) => (
                    <View
                      key={detail.key}
                      style={[
                        styles.historyItemDetailPill,
                        darkMode ? styles.historyItemDetailPillDark : null,
                        ativo ? styles.historyItemDetailPillActive : null,
                        ativo && darkMode
                          ? styles.historyItemDetailPillActiveDark
                          : null,
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.historyItemDetailPillText,
                          darkMode ? styles.historyItemDetailPillTextDark : null,
                          ativo ? styles.historyItemDetailPillTextActive : null,
                        ]}
                        testID={detail.testID}
                      >
                        {t(detail.label)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
          <View
            style={[
              styles.historyItemChevronBadge,
              darkMode ? styles.historyItemChevronBadgeDark : null,
              ativo ? styles.historyItemChevronBadgeActive : null,
              ativo && darkMode ? styles.historyItemChevronBadgeActiveDark : null,
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={
                ativo || darkMode ? "rgba(255,255,255,0.78)" : colors.textSecondary
              }
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
