import { useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";

import { useAppTranslation, type AppLocale } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import {
  resolverCaseLifecycleStatus,
  rotuloCaseLifecycle,
} from "../chat/caseLifecycle";
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

function resolverTomBadgeHistorico(lifecycleStatus: string): HistoryBadgeTone {
  if (lifecycleStatus === "emitido" || lifecycleStatus === "aprovado") {
    return "success";
  }

  if (lifecycleStatus === "devolvido_para_correcao") {
    return "danger";
  }

  return "neutral";
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
  const badgeStatusLabel =
    item.status_card_label?.trim() || rotuloCaseLifecycle(lifecycleStatus);
  const badgeStatusTone = resolverTomBadgeHistorico(lifecycleStatus);
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
                    ativo && darkMode
                      ? styles.historyItemTitleActiveDark
                      : null,
                  ]}
                >
                  {item.titulo}
                </Text>
                {item.pinado ? (
                  <MaterialCommunityIcons
                    name="pin"
                    size={14}
                    color={
                      ativo || darkMode
                        ? "rgba(255,255,255,0.78)"
                        : colors.textSecondary
                    }
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={1}
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
                    ativo && darkMode
                      ? styles.historyItemBadgeActiveDark
                      : null,
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
            </View>
          </View>
          <View
            style={[
              styles.historyItemChevronBadge,
              darkMode ? styles.historyItemChevronBadgeDark : null,
              ativo ? styles.historyItemChevronBadgeActive : null,
              ativo && darkMode
                ? styles.historyItemChevronBadgeActiveDark
                : null,
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={
                ativo || darkMode
                  ? "rgba(255,255,255,0.78)"
                  : colors.textSecondary
              }
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
