import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";

export interface ThreadHeaderControlsProps {
  chatHasActiveCase: boolean;
  darkMode?: boolean;
  finalizacaoDisponivel: boolean;
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
  chatHasActiveCase,
  darkMode = false,
  finalizacaoDisponivel,
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
      ? t("Mesa avaliadora")
      : blankChatEntry
        ? t("Nova inspeção")
        : t("Inspeção ativa");
  const title = vendoFinalizacao
    ? t("Finalizar")
    : vendoMesa
      ? t("Mesa")
      : t("Chat");
  const compactHeader = keyboardVisible;
  const tabActiveIconColor = darkMode ? "#F0F4F8" : colors.textPrimary;
  const tabIdleIconColor = darkMode ? "#AFC0D2" : colors.textSecondary;
  const showNewChatShortcut = !vendoMesa && !vendoFinalizacao;
  const subtitle = vendoFinalizacao
    ? t("Revise tudo do caso antes da conclusão.")
    : vendoMesa
      ? notificacoesMesaLaudoAtual
        ? t(
            `${notificacoesMesaLaudoAtual} retorno${notificacoesMesaLaudoAtual === 1 ? "" : "s"} novo${notificacoesMesaLaudoAtual === 1 ? "" : "s"} da mesa.`,
          )
        : ""
      : blankChatEntry
        ? t("Envie fotos, documentos ou contexto para iniciar a inspeção.")
        : filaOfflineTotal
          ? t(
              `${filaOfflineTotal} pendência${filaOfflineTotal === 1 ? "" : "s"} na fila offline.`,
            )
          : chatHasActiveCase
            ? t(
                "Fotos, contexto e anexos entram direto na análise e no laudo.",
              )
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
              {!compactHeader ? (
                <Text
                  style={[
                    styles.cleanHeaderEyebrow,
                    darkMode ? styles.cleanHeaderEyebrowDark : null,
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
                ]}
              >
                {title}
              </Text>
              {subtitle && !compactHeader ? (
                <Text
                  style={[
                    styles.cleanHeaderSubtitle,
                    darkMode ? styles.cleanHeaderSubtitleDark : null,
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
              ]}
              testID="open-settings-button"
            >
              <MaterialCommunityIcons
                color={darkMode ? "#E8EEF5" : colors.textPrimary}
                name="cog-outline"
                size={20}
              />
              {totalBadge ? (
                <View style={styles.cleanNavBadge}>
                  <Text style={styles.cleanNavBadgeText}>
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
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      item.accent
                        ? colors.accent
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
                !vendoMesa && !vendoFinalizacao ? styles.threadTabActive : null,
                !vendoMesa && !vendoFinalizacao && darkMode
                  ? styles.threadTabActiveDark
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
                ]}
              >
                Chat
              </Text>
            </Pressable>
            {mesaAcessoPermitido ? (
              <Pressable
                accessibilityLabel={
                  notificacoesMesaLaudoAtual
                    ? `${t("Abrir aba Mesa")}, ${t(
                        `${notificacoesMesaLaudoAtual} retorno${notificacoesMesaLaudoAtual === 1 ? "" : "s"} novo${notificacoesMesaLaudoAtual === 1 ? "" : "s"}`,
                      )}`
                    : t("Abrir aba Mesa")
                }
                accessibilityRole="tab"
                accessibilityState={{ selected: vendoMesa }}
                onPress={onOpenMesaTab}
                style={[
                  styles.threadTab,
                  darkMode ? styles.threadTabDark : null,
                  compactHeader ? styles.threadTabCompact : null,
                  vendoMesa ? styles.threadTabActive : null,
                  vendoMesa && darkMode ? styles.threadTabActiveDark : null,
                ]}
                testID="mesa-tab-button"
              >
                <MaterialCommunityIcons
                  color={
                    vendoMesa ? tabActiveIconColor : tabIdleIconColor
                  }
                  name="clipboard-text-outline"
                  size={16}
                />
                <Text
                  style={[
                    styles.threadTabText,
                    darkMode ? styles.threadTabTextDark : null,
                    compactHeader ? styles.threadTabTextCompact : null,
                    vendoMesa ? styles.threadTabTextActive : null,
                    vendoMesa && darkMode ? styles.threadTabTextActiveDark : null,
                  ]}
                >
                  {t("Mesa")}
                </Text>
                {notificacoesMesaLaudoAtual ? (
                  <View
                    style={[
                      styles.threadTabBadge,
                      vendoMesa ? styles.threadTabBadgeActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.threadTabBadgeText,
                        vendoMesa ? styles.threadTabBadgeTextActive : null,
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
                  vendoFinalizacao ? styles.threadTabActive : null,
                  vendoFinalizacao && darkMode
                    ? styles.threadTabActiveDark
                    : null,
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
