import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import {
  colorWithAlpha,
  resolveAccentColorForMode,
} from "../../theme/colorUtils";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";

export interface ThreadHeaderControlsProps {
  accentColor?: string;
  chatHasActiveCase: boolean;
  darkMode?: boolean;
  densityScale?: number;
  finalizacaoDisponivel: boolean;
  fontScale?: number;
  headerSafeTopInset: number;
  keyboardVisible: boolean;
  mesaAcessoPermitido: boolean;
  onOpenNewChat: () => void;
  onOpenHistory: () => void;
  onOpenFinalizarTab: () => void;
  onOpenSettings: () => void;
  notificacoesNaoLidas: number;
  filaOfflineTotal: number;
  vendoFinalizacao: boolean;
  vendoMesa: boolean;
  onOpenChatTab: () => void;
  onOpenMesaTab: () => void;
  notificacoesMesaLaudoAtual: number;
}

export function ThreadHeaderControls({
  accentColor = colors.accent,
  chatHasActiveCase,
  darkMode = false,
  densityScale = 1,
  finalizacaoDisponivel,
  fontScale = 1,
  headerSafeTopInset,
  keyboardVisible,
  mesaAcessoPermitido,
  onOpenNewChat,
  onOpenHistory,
  onOpenFinalizarTab,
  onOpenSettings,
  notificacoesNaoLidas,
  filaOfflineTotal,
  vendoFinalizacao,
  vendoMesa,
  onOpenChatTab,
  onOpenMesaTab,
  notificacoesMesaLaudoAtual,
}: ThreadHeaderControlsProps) {
  const { t } = useAppTranslation();

  type HeaderChip = {
    key: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    accent: boolean;
  };

  const totalBadge = notificacoesNaoLidas + filaOfflineTotal;
  const settingsAccessibilityLabel = totalBadge
    ? `${t("Abrir configurações")}, ${t(
        `${totalBadge} aviso${totalBadge === 1 ? "" : "s"} pendente${totalBadge === 1 ? "" : "s"}`,
      )}`
    : t("Abrir configurações");
  const blankChatEntry = !vendoMesa && !vendoFinalizacao && !chatHasActiveCase;
  const eyebrow = vendoFinalizacao
    ? t("Entrega técnica")
    : vendoMesa
      ? t("Revisão do caso")
      : blankChatEntry
        ? t("Nova inspeção")
        : "";
  const title = vendoFinalizacao
    ? t("Finalizar")
    : vendoMesa
      ? t("Revisão")
      : t("Chat");
  const compactHeader = keyboardVisible;
  const visibleAccentColor = resolveAccentColorForMode(accentColor, darkMode);
  const accentForeground =
    darkMode && visibleAccentColor === colors.textInverse
      ? colors.ink900
      : colors.white;
  const accentWashColor = colorWithAlpha(
    visibleAccentColor,
    darkMode ? "24" : "18",
  );
  const accentBorderColor = colorWithAlpha(
    visibleAccentColor,
    darkMode ? "66" : "4D",
  );
  const scaledNavButtonSize = 48 * densityScale;
  const tabActiveIconColor = visibleAccentColor;
  const tabIdleIconColor = darkMode ? "#AFC0D2" : colors.textSecondary;
  const showNewChatShortcut = !vendoMesa && !vendoFinalizacao;
  const subtitle = vendoFinalizacao
    ? t("Revise tudo do caso antes da conclusão.")
    : vendoMesa
      ? notificacoesMesaLaudoAtual
        ? t(
            `${notificacoesMesaLaudoAtual} retorno${notificacoesMesaLaudoAtual === 1 ? "" : "s"} novo${notificacoesMesaLaudoAtual === 1 ? "" : "s"} da revisão.`,
          )
        : ""
      : blankChatEntry
        ? t("Envie fotos, documentos ou contexto para iniciar a inspeção.")
        : filaOfflineTotal
          ? t(
              `${filaOfflineTotal} pendência${filaOfflineTotal === 1 ? "" : "s"} na fila offline.`,
            )
          : chatHasActiveCase
            ? ""
            : "";
  const statusChips = (
    vendoFinalizacao
      ? []
      : vendoMesa
        ? [
            notificacoesMesaLaudoAtual
              ? {
                  key: "mesa-novas",
                  icon: "bell-ring-outline" as const,
                  label: t(
                    `${notificacoesMesaLaudoAtual} nova${notificacoesMesaLaudoAtual === 1 ? "" : "s"}`,
                  ),
                  accent: true,
                }
              : null,
          ].filter(Boolean)
        : [
            filaOfflineTotal
              ? {
                  key: "chat-offline",
                  icon: "cloud-upload-outline" as const,
                  label: t(`${filaOfflineTotal} offline`),
                  accent: true,
                }
              : null,
          ].filter(Boolean)
  ) as HeaderChip[];

  return (
    <>
      <View
        style={[
          styles.chatHeader,
          headerSafeTopInset ? { paddingTop: headerSafeTopInset + 12 } : null,
          compactHeader ? styles.chatHeaderCompact : null,
        ]}
      >
        <View style={styles.cleanHeaderTopRow}>
          <Pressable
            accessibilityLabel={t("Abrir histórico de inspeções")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onOpenHistory}
            style={[
              styles.cleanNavButton,
              darkMode ? styles.cleanNavButtonDark : null,
              compactHeader ? styles.cleanNavButtonCompact : null,
              {
                height: scaledNavButtonSize,
                width: scaledNavButtonSize,
              },
            ]}
            testID="open-history-button"
          >
            <MaterialCommunityIcons
              color={darkMode ? "#E8EEF5" : colors.textPrimary}
              name="menu"
              size={22}
            />
          </Pressable>

          {blankChatEntry ? (
            <View style={styles.cleanHeaderSpacer} />
          ) : (
            <View
              style={[
                styles.cleanHeaderCopy,
                compactHeader ? styles.cleanHeaderCopyCompact : null,
              ]}
            >
              {eyebrow && !compactHeader ? (
                <Text
                  style={[
                    styles.cleanHeaderEyebrow,
                    darkMode ? styles.cleanHeaderEyebrowDark : null,
                    { fontSize: 11 * fontScale, lineHeight: 15 * fontScale },
                  ]}
                >
                  {eyebrow}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.cleanHeaderTitle,
                  darkMode ? styles.cleanHeaderTitleDark : null,
                  compactHeader ? styles.cleanHeaderTitleCompact : null,
                  { fontSize: 28 * fontScale, lineHeight: 34 * fontScale },
                ]}
              >
                {title}
              </Text>
              {subtitle && !compactHeader ? (
                <Text
                  style={[
                    styles.cleanHeaderSubtitle,
                    darkMode ? styles.cleanHeaderSubtitleDark : null,
                    { fontSize: 13 * fontScale, lineHeight: 18 * fontScale },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}

          <View style={styles.cleanHeaderActions}>
            {showNewChatShortcut ? (
              <Pressable
                accessibilityLabel={t("Iniciar nova inspeção")}
                accessibilityRole="button"
                hitSlop={12}
                onPress={onOpenNewChat}
                style={[
                  styles.cleanNavButton,
                  darkMode ? styles.cleanNavButtonDark : null,
                  compactHeader ? styles.cleanNavButtonCompact : null,
                  {
                    height: scaledNavButtonSize,
                    width: scaledNavButtonSize,
                  },
                ]}
                testID="open-new-chat-button"
              >
                <MaterialCommunityIcons
                  color={darkMode ? "#E8EEF5" : colors.textPrimary}
                  name="square-edit-outline"
                  size={20}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={settingsAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={12}
              onPress={onOpenSettings}
              style={[
                styles.cleanNavButton,
                darkMode ? styles.cleanNavButtonDark : null,
                compactHeader ? styles.cleanNavButtonCompact : null,
                {
                  height: scaledNavButtonSize,
                  width: scaledNavButtonSize,
                },
              ]}
              testID="open-settings-button"
            >
              <MaterialCommunityIcons
                color={darkMode ? "#E8EEF5" : colors.textPrimary}
                name="cog-outline"
                size={20}
              />
              {totalBadge ? (
                <View
                  style={[
                    styles.cleanNavBadge,
                    { backgroundColor: visibleAccentColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.cleanNavBadgeText,
                      { color: accentForeground },
                    ]}
                  >
                    {Math.min(totalBadge, 9)}
                    {totalBadge > 9 ? "+" : ""}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {!!statusChips.length && !compactHeader ? (
          <View style={styles.cleanHeaderStatusRow}>
            <View style={styles.cleanHeaderChipRail}>
              {statusChips.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.cleanHeaderChip,
                    darkMode ? styles.cleanHeaderChipDark : null,
                    item.accent ? styles.cleanHeaderChipAccent : null,
                    item.accent && darkMode
                      ? styles.cleanHeaderChipAccentDark
                      : null,
                    item.accent
                      ? {
                          backgroundColor: accentWashColor,
                          borderColor: accentBorderColor,
                          paddingVertical: 6 * densityScale,
                        }
                      : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      item.accent
                        ? visibleAccentColor
                        : darkMode
                          ? "#AFC0D2"
                          : colors.textSecondary
                    }
                    name={item.icon}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.cleanHeaderChipText,
                      darkMode ? styles.cleanHeaderChipTextDark : null,
                      item.accent ? styles.cleanHeaderChipTextAccent : null,
                      item.accent ? { color: visibleAccentColor } : null,
                      { fontSize: 12 * fontScale, lineHeight: 16 * fontScale },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {blankChatEntry ? null : (
        <View
          style={[
            styles.cleanTabShell,
            darkMode ? styles.cleanTabShellDark : null,
            compactHeader ? styles.cleanTabShellCompact : null,
          ]}
        >
          <View
            style={[
              styles.threadTabs,
              darkMode ? styles.threadTabsDark : null,
              compactHeader ? styles.threadTabsCompact : null,
            ]}
          >
            <Pressable
              accessibilityLabel={t("Abrir aba Chat")}
              accessibilityRole="tab"
              accessibilityState={{
                selected: !vendoMesa && !vendoFinalizacao,
              }}
              onPress={onOpenChatTab}
              style={[
                styles.threadTab,
                darkMode ? styles.threadTabDark : null,
                compactHeader ? styles.threadTabCompact : null,
                {
                  minHeight: 40 * densityScale,
                  paddingVertical: 9 * densityScale,
                },
                !vendoMesa && !vendoFinalizacao ? styles.threadTabActive : null,
                !vendoMesa && !vendoFinalizacao && darkMode
                  ? styles.threadTabActiveDark
                  : null,
                !vendoMesa && !vendoFinalizacao
                  ? { borderColor: accentBorderColor }
                  : null,
              ]}
              testID="chat-tab-button"
            >
              <MaterialCommunityIcons
                color={
                  !vendoMesa && !vendoFinalizacao
                    ? tabActiveIconColor
                    : tabIdleIconColor
                }
                name="message-processing-outline"
                size={16}
              />
              <Text
                style={[
                  styles.threadTabText,
                  darkMode ? styles.threadTabTextDark : null,
                  compactHeader ? styles.threadTabTextCompact : null,
                  !vendoMesa && !vendoFinalizacao
                    ? styles.threadTabTextActive
                    : null,
                  !vendoMesa && !vendoFinalizacao && darkMode
                    ? styles.threadTabTextActiveDark
                    : null,
                  !vendoMesa && !vendoFinalizacao
                    ? { color: visibleAccentColor }
                    : null,
                  { fontSize: 13 * fontScale, lineHeight: 17 * fontScale },
                ]}
              >
                Chat
              </Text>
            </Pressable>
            {mesaAcessoPermitido ? (
              <Pressable
                accessibilityLabel={
                  notificacoesMesaLaudoAtual
                    ? `${t("Abrir aba Revisão")}, ${t(
                        `${notificacoesMesaLaudoAtual} retorno${notificacoesMesaLaudoAtual === 1 ? "" : "s"} novo${notificacoesMesaLaudoAtual === 1 ? "" : "s"}`,
                      )}`
                    : t("Abrir aba Revisão")
                }
                accessibilityRole="tab"
                accessibilityState={{ selected: vendoMesa }}
                onPress={onOpenMesaTab}
                style={[
                  styles.threadTab,
                  darkMode ? styles.threadTabDark : null,
                  compactHeader ? styles.threadTabCompact : null,
                  {
                    minHeight: 40 * densityScale,
                    paddingVertical: 9 * densityScale,
                  },
                  vendoMesa ? styles.threadTabActive : null,
                  vendoMesa && darkMode ? styles.threadTabActiveDark : null,
                  vendoMesa ? { borderColor: accentBorderColor } : null,
                ]}
                testID="mesa-tab-button"
              >
                <MaterialCommunityIcons
                  color={vendoMesa ? tabActiveIconColor : tabIdleIconColor}
                  name="clipboard-text-outline"
                  size={16}
                />
                <Text
                  style={[
                    styles.threadTabText,
                    darkMode ? styles.threadTabTextDark : null,
                    compactHeader ? styles.threadTabTextCompact : null,
                    vendoMesa ? styles.threadTabTextActive : null,
                    vendoMesa && darkMode
                      ? styles.threadTabTextActiveDark
                      : null,
                    vendoMesa ? { color: visibleAccentColor } : null,
                    { fontSize: 13 * fontScale, lineHeight: 17 * fontScale },
                  ]}
                >
                  {t("Revisão")}
                </Text>
                {notificacoesMesaLaudoAtual ? (
                  <View
                    style={[
                      styles.threadTabBadge,
                      vendoMesa ? styles.threadTabBadgeActive : null,
                      {
                        backgroundColor: accentWashColor,
                        borderColor: accentBorderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.threadTabBadgeText,
                        vendoMesa ? styles.threadTabBadgeTextActive : null,
                        { color: visibleAccentColor },
                        { fontSize: 10 * fontScale },
                      ]}
                    >
                      {notificacoesMesaLaudoAtual > 9
                        ? "9+"
                        : notificacoesMesaLaudoAtual}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
            {finalizacaoDisponivel ? (
              <Pressable
                accessibilityLabel={t("Abrir aba Finalizar")}
                accessibilityRole="tab"
                accessibilityState={{ selected: vendoFinalizacao }}
                onPress={onOpenFinalizarTab}
                style={[
                  styles.threadTab,
                  darkMode ? styles.threadTabDark : null,
                  compactHeader ? styles.threadTabCompact : null,
                  {
                    minHeight: 40 * densityScale,
                    paddingVertical: 9 * densityScale,
                  },
                  vendoFinalizacao ? styles.threadTabActive : null,
                  vendoFinalizacao && darkMode
                    ? styles.threadTabActiveDark
                    : null,
                  vendoFinalizacao ? { borderColor: accentBorderColor } : null,
                ]}
                testID="finalizar-tab-button"
              >
                <MaterialCommunityIcons
                  color={
                    vendoFinalizacao ? tabActiveIconColor : tabIdleIconColor
                  }
                  name="check-decagram-outline"
                  size={16}
                />
                <Text
                  style={[
                    styles.threadTabText,
                    darkMode ? styles.threadTabTextDark : null,
                    compactHeader ? styles.threadTabTextCompact : null,
                    vendoFinalizacao ? styles.threadTabTextActive : null,
                    vendoFinalizacao && darkMode
                      ? styles.threadTabTextActiveDark
                      : null,
                    vendoFinalizacao ? { color: visibleAccentColor } : null,
                    { fontSize: 13 * fontScale, lineHeight: 17 * fontScale },
                  ]}
                >
                  {t("Finalizar")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    </>
  );
}
