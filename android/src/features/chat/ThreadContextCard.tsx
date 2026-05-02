import { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import { resolveAccentColorForMode } from "../../theme/colorUtils";
import { colors } from "../../theme/tokens";
import { TARIEL_APP_MARK } from "../InspectorMobileApp.constants";
import { styles } from "../InspectorMobileApp.styles";
import { ThreadFinalizationCard } from "./ThreadFinalizationCard";
import {
  ThreadContextActionButton,
  ThreadContextChipView,
  ThreadContextChooserActionCard,
  ThreadContextInsightsGrid,
  ThreadContextSpotlightBadge,
} from "./ThreadContextCardParts";

export type ThreadTone = "accent" | "success" | "danger" | "muted";
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface ThreadSpotlight {
  label: string;
  tone: ThreadTone;
  icon: IconName;
}

export interface ThreadChip {
  key: string;
  label: string;
  tone: ThreadTone;
  icon: IconName;
}

export interface ThreadInsight {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: ThreadTone;
  icon: IconName;
}

export interface ThreadAction {
  key: string;
  label: string;
  tone: ThreadTone;
  icon: IconName;
  onPress: () => void;
  testID?: string;
}

export interface ThreadContextCardProps {
  visible: boolean;
  accentColor?: string;
  defaultExpanded?: boolean;
  darkMode?: boolean;
  densityScale?: number;
  fontScale?: number;
  layout?: "default" | "entry_chooser" | "finalization";
  guidedTemplatesVisible?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  spotlight: ThreadSpotlight;
  chips: ThreadChip[];
  onGuidedTemplatesVisibleChange?: (value: boolean) => void;
  actions?: ThreadAction[];
  insights: ThreadInsight[];
}

function compactGuidedTemplateLabel(label: string) {
  const normalized = label.trim();
  const match = normalized.match(/\bNR\d+[A-Z]?\b/i);

  return match ? match[0].toUpperCase() : normalized;
}

function guidedTemplateMetaItems(actions: ThreadAction[]) {
  const nrItems = actions
    .map((item) => item.label.match(/\bNR\d+[A-Z]?\b/i)?.[0].toUpperCase())
    .filter((item): item is string => Boolean(item));

  if (nrItems.length) {
    return Array.from(new Set(nrItems)).slice(0, 3);
  }

  const items = actions.map((item) => compactGuidedTemplateLabel(item.label));

  return Array.from(new Set(items)).slice(0, 3);
}

export function ThreadContextCard({
  visible,
  accentColor = colors.accent,
  defaultExpanded = false,
  darkMode = false,
  densityScale = 1,
  fontScale = 1,
  layout = "default",
  guidedTemplatesVisible,
  eyebrow,
  title,
  description,
  spotlight,
  chips,
  onGuidedTemplatesVisibleChange,
  actions = [],
  insights,
}: ThreadContextCardProps) {
  const { t } = useAppTranslation();
  const visibleAccentColor = resolveAccentColorForMode(accentColor, darkMode);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [guidedTemplatesVisibleState, setGuidedTemplatesVisibleState] =
    useState(false);
  const guidedTemplatesExpanded =
    guidedTemplatesVisible ?? guidedTemplatesVisibleState;

  function setGuidedTemplatesVisibility(
    value: boolean | ((current: boolean) => boolean),
  ) {
    const nextValue =
      typeof value === "function" ? value(guidedTemplatesExpanded) : value;

    if (onGuidedTemplatesVisibleChange) {
      onGuidedTemplatesVisibleChange(nextValue);
      return;
    }

    setGuidedTemplatesVisibleState(nextValue);
  }

  useEffect(() => {
    if (!visible) {
      return;
    }
    setExpanded(defaultExpanded);
    setDismissed(false);
  }, [
    actions.length,
    defaultExpanded,
    eyebrow,
    layout,
    spotlight.label,
    title,
    visible,
  ]);

  if (!visible || dismissed) {
    return null;
  }

  const primaryChip = chips[0] ?? null;
  const primaryAction = actions[0] ?? null;
  const visibleChips = expanded ? chips : chips.slice(0, 1);
  const visibleActions = expanded ? actions : actions.slice(0, 1);
  const visibleInsights = expanded ? insights.slice(0, 3) : [];
  const primaryExpandedAction = visibleActions[0] ?? null;
  const secondaryExpandedActions = visibleActions.slice(1);
  const hiddenInsightsCount = Math.max(
    0,
    insights.length - visibleInsights.length,
  );
  const hasMoreContent =
    chips.length > visibleChips.length ||
    actions.length > visibleActions.length ||
    insights.length > visibleInsights.length;

  if (layout === "entry_chooser") {
    const freeChatAction =
      actions.find((item) => item.key === "chat-free-start") || null;
    const guidedTemplateActions = actions.filter((item) =>
      item.key.startsWith("guided-template-"),
    );
    const fallbackActions = actions.filter(
      (item) =>
        item.key !== "chat-free-start" &&
        !item.key.startsWith("guided-template-"),
    );
    const guidedMetaItems = guidedTemplateMetaItems(guidedTemplateActions);
    const guidedTemplateMenuVisible = Boolean(
      guidedTemplateActions.length && guidedTemplatesExpanded,
    );

    return (
      <View
        style={[
          styles.threadHeaderCard,
          darkMode ? styles.threadHeaderCardDark : null,
          styles.threadHeaderChooserCard,
        ]}
      >
        <View style={[styles.threadHeaderCopy, styles.threadHeaderChooserCopy]}>
          <View style={styles.threadChooserBrandSignature}>
            <Image
              resizeMode="cover"
              source={TARIEL_APP_MARK}
              style={styles.threadChooserBrandLogo}
            />
          </View>
          {eyebrow ? (
            <Text
              style={[
                styles.threadEyebrow,
                darkMode ? styles.threadEyebrowDark : null,
                { fontSize: 11 * fontScale, lineHeight: 15 * fontScale },
              ]}
            >
              {t(eyebrow)}
            </Text>
          ) : null}
          <Text
            numberOfLines={2}
            style={[
              styles.threadTitle,
              styles.threadChooserTitle,
              darkMode ? styles.threadChooserTitleDark : null,
              { fontSize: 30 * fontScale, lineHeight: 36 * fontScale },
            ]}
          >
            {t(title)}
          </Text>
          {description ? (
            <Text
              style={[
                styles.threadChooserDescription,
                darkMode ? styles.threadChooserDescriptionDark : null,
                { fontSize: 18 * fontScale, lineHeight: 28 * fontScale },
              ]}
            >
              {t(description)}
            </Text>
          ) : null}
        </View>

        {chips.length ? (
          <View style={styles.threadContextChips}>
            {chips.map((item) => (
              <ThreadContextChipView
                accentColor={accentColor}
                darkMode={darkMode}
                fontScale={fontScale}
                key={item.key}
                item={item}
              />
            ))}
          </View>
        ) : null}

        {insights.length ? (
          <ThreadContextInsightsGrid
            accentColor={accentColor}
            darkMode={darkMode}
            fontScale={fontScale}
            items={insights}
          />
        ) : null}

        <View style={styles.threadChooserActionStack}>
          {guidedTemplateActions.length ? (
            <ThreadContextChooserActionCard
              accentColor={accentColor}
              badgeLabel={t("Recomendado")}
              darkMode={darkMode}
              densityScale={densityScale}
              detail={t("Escolha uma NR para seguir passo a passo.")}
              emphasis="primary"
              fontScale={fontScale}
              icon="clipboard-text-outline"
              key="guided-entry"
              label={t("Iniciar inspeção guiada")}
              metaItems={guidedMetaItems}
              onPress={() => {
                setGuidedTemplatesVisibility((current) => !current);
              }}
              testID="guided-entry-open-button"
              tone="accent"
              trailingIcon="chevron-right"
            />
          ) : null}

          {freeChatAction ? (
            <ThreadContextChooserActionCard
              accentColor={accentColor}
              darkMode={darkMode}
              densityScale={densityScale}
              detail={t("Envie fotos, dúvidas ou contexto sem modelo fixo.")}
              fontScale={fontScale}
              icon={freeChatAction.icon}
              key={freeChatAction.key}
              label={freeChatAction.label}
              onPress={() => {
                setGuidedTemplatesVisibility(false);
                freeChatAction.onPress();
                setDismissed(true);
              }}
              testID={freeChatAction.testID}
              tone="accent"
            />
          ) : null}

          {fallbackActions.map((item) => (
            <ThreadContextChooserActionCard
              accentColor={accentColor}
              darkMode={darkMode}
              densityScale={densityScale}
              detail={t(
                "Siga o fluxo sugerido para iniciar a coleta com o contexto certo.",
              )}
              fontScale={fontScale}
              icon={item.icon}
              key={item.key}
              label={t(item.label)}
              onPress={item.onPress}
              testID={item.testID}
              tone={item.tone}
            />
          ))}
        </View>

        {guidedTemplateMenuVisible ? (
          <Modal
            animationType="fade"
            onRequestClose={() => setGuidedTemplatesVisibility(false)}
            transparent
            visible
          >
            <View style={styles.threadGuidedMenuBackdrop}>
              <Pressable
                accessibilityLabel={t("Fechar")}
                accessibilityRole="button"
                onPress={() => setGuidedTemplatesVisibility(false)}
                style={styles.threadGuidedMenuDismissLayer}
                testID="guided-template-menu-backdrop"
              />
              <View
                style={[
                  styles.threadGuidedMenuSheet,
                  darkMode ? styles.threadGuidedMenuSheetDark : null,
                ]}
                testID="guided-template-menu"
              >
                <View style={styles.threadGuidedMenuHeader}>
                  <View style={styles.threadGuidedMenuHeaderCopy}>
                    <Text
                      style={[
                        styles.threadGuidedMenuEyebrow,
                        darkMode ? styles.threadGuidedMenuEyebrowDark : null,
                        {
                          fontSize: 11 * fontScale,
                          lineHeight: 15 * fontScale,
                        },
                      ]}
                    >
                      {t("Família normativa")}
                    </Text>
                    <Text
                      style={[
                        styles.threadGuidedMenuTitle,
                        darkMode ? styles.threadGuidedMenuTitleDark : null,
                        {
                          fontSize: 20 * fontScale,
                          lineHeight: 26 * fontScale,
                        },
                      ]}
                    >
                      {t("Escolha uma NR para iniciar.")}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={t("Fechar")}
                    accessibilityRole="button"
                    onPress={() => setGuidedTemplatesVisibility(false)}
                    style={[
                      styles.threadGuidedMenuClose,
                      darkMode ? styles.threadGuidedMenuCloseDark : null,
                    ]}
                    testID="guided-template-menu-close"
                  >
                    <MaterialCommunityIcons
                      color={darkMode ? "#F0F4F8" : colors.textPrimary}
                      name="close"
                      size={20 * fontScale}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  contentContainerStyle={styles.threadGuidedMenuListContent}
                  showsVerticalScrollIndicator={false}
                  style={styles.threadGuidedMenuList}
                >
                  {guidedTemplateActions.map((item) => (
                    <Pressable
                      accessibilityLabel={t(item.label)}
                      accessibilityRole="button"
                      key={item.key}
                      onPress={() => {
                        setGuidedTemplatesVisibility(false);
                        item.onPress();
                        setDismissed(true);
                      }}
                      style={[
                        styles.threadGuidedMenuRow,
                        darkMode ? styles.threadGuidedMenuRowDark : null,
                        {
                          paddingHorizontal: 14 * densityScale,
                          paddingVertical: 12 * densityScale,
                        },
                      ]}
                      testID={item.testID}
                    >
                      <View
                        style={[
                          styles.threadGuidedMenuRowIcon,
                          darkMode ? styles.threadGuidedMenuRowIconDark : null,
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={visibleAccentColor}
                          name={item.icon}
                          size={18 * fontScale}
                        />
                      </View>
                      <View style={styles.threadGuidedMenuRowCopy}>
                        <Text
                          style={[
                            styles.threadGuidedMenuRowTitle,
                            darkMode
                              ? styles.threadGuidedMenuRowTitleDark
                              : null,
                            {
                              fontSize: 14 * fontScale,
                              lineHeight: 18 * fontScale,
                            },
                          ]}
                        >
                          {t(item.label)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        color={darkMode ? "#AFC0D2" : colors.textSecondary}
                        name="chevron-right"
                        size={20 * fontScale}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
    );
  }

  if (layout === "finalization") {
    return (
      <ThreadFinalizationCard
        actions={actions}
        chips={chips}
        description={t(description)}
        eyebrow={t(eyebrow)}
        insights={insights}
        spotlight={spotlight}
        title={t(title)}
      />
    );
  }

  return (
    <View
      style={[
        styles.threadHeaderCard,
        darkMode ? styles.threadHeaderCardDark : null,
      ]}
    >
      <View style={styles.threadHeaderTop}>
        <View style={styles.threadHeaderCopy}>
          {eyebrow ? (
            <Text
              style={[
                styles.threadEyebrow,
                darkMode ? styles.threadEyebrowDark : null,
                { fontSize: 11 * fontScale, lineHeight: 15 * fontScale },
              ]}
            >
              {t(eyebrow)}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.threadTitle,
              darkMode ? styles.threadTitleDark : null,
              { fontSize: 17 * fontScale, lineHeight: 22 * fontScale },
            ]}
          >
            {t(title)}
          </Text>
          <Text
            numberOfLines={expanded ? 2 : 1}
            style={[
              styles.threadDescription,
              darkMode ? styles.threadDescriptionDark : null,
              { fontSize: 13 * fontScale, lineHeight: 18 * fontScale },
            ]}
          >
            {t(description)}
          </Text>
        </View>
        <ThreadContextSpotlightBadge
          accentColor={accentColor}
          compact
          darkMode={darkMode}
          fontScale={fontScale}
          spotlight={spotlight}
        />
      </View>

      {!expanded ? (
        primaryChip || primaryAction || hasMoreContent ? (
          <View style={styles.threadCollapsedSummaryRow}>
            {primaryChip ? (
              <ThreadContextChipView
                accentColor={accentColor}
                compact
                darkMode={darkMode}
                fontScale={fontScale}
                item={primaryChip}
              />
            ) : null}
            {primaryAction ? (
              <ThreadContextActionButton
                accentColor={accentColor}
                compact
                darkMode={darkMode}
                fontScale={fontScale}
                item={primaryAction}
              />
            ) : null}
            {hasMoreContent ? (
              <Pressable
                onPress={() => setExpanded(true)}
                style={[
                  styles.threadToggleButton,
                  styles.threadToggleButtonCompact,
                ]}
                testID="thread-context-toggle"
              >
                <Text
                  style={[
                    styles.threadToggleButtonText,
                    darkMode ? styles.threadToggleButtonTextDark : null,
                    { fontSize: 12 * fontScale, lineHeight: 16 * fontScale },
                  ]}
                >
                  {t("Detalhes")}
                </Text>
                <MaterialCommunityIcons
                  color={darkMode ? "#AFC0D2" : colors.textSecondary}
                  name="chevron-down"
                  size={16}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null
      ) : null}

      {expanded && visibleChips.length ? (
        <View style={styles.threadContextChips}>
          {visibleChips.map((item) => (
            <ThreadContextChipView
              accentColor={accentColor}
              darkMode={darkMode}
              fontScale={fontScale}
              key={item.key}
              item={item}
            />
          ))}
        </View>
      ) : null}

      {expanded && visibleActions.length ? (
        <View style={styles.threadSection}>
          <Text
            style={[
              styles.threadSectionLabel,
              darkMode ? styles.threadSectionLabelDark : null,
            ]}
          >
            {t("Próxima ação")}
          </Text>
          {primaryExpandedAction ? (
            <View style={styles.threadActionRow}>
              <ThreadContextActionButton
                accentColor={accentColor}
                darkMode={darkMode}
                fontScale={fontScale}
                item={primaryExpandedAction}
              />
            </View>
          ) : null}
          {secondaryExpandedActions.length ? (
            <View style={styles.threadSecondaryActionRow}>
              {secondaryExpandedActions.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={item.onPress}
                  style={[
                    styles.threadSecondaryActionButton,
                    darkMode ? styles.threadSecondaryActionButtonDark : null,
                  ]}
                  testID={item.testID}
                >
                  <MaterialCommunityIcons
                    color={darkMode ? "#AFC0D2" : colors.textSecondary}
                    name={item.icon}
                    size={14}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.threadSecondaryActionText,
                      darkMode ? styles.threadSecondaryActionTextDark : null,
                      { fontSize: 12 * fontScale, lineHeight: 16 * fontScale },
                    ]}
                  >
                    {t(item.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {expanded && visibleInsights.length ? (
        <View style={styles.threadSection}>
          <Text
            style={[
              styles.threadSectionLabel,
              darkMode ? styles.threadSectionLabelDark : null,
            ]}
          >
            {t("Status do caso")}
          </Text>
          <ThreadContextInsightsGrid
            accentColor={accentColor}
            darkMode={darkMode}
            fontScale={fontScale}
            items={visibleInsights}
          />
          {hiddenInsightsCount > 0 ? (
            <Text
              style={[
                styles.threadMoreSignalsHint,
                darkMode ? styles.threadMoreSignalsHintDark : null,
                { fontSize: 11 * fontScale, lineHeight: 16 * fontScale },
              ]}
            >
              {hiddenInsightsCount === 1
                ? t("+1 sinal disponível na central de atividade.")
                : t(
                    `+${hiddenInsightsCount} sinais disponíveis na central de atividade.`,
                  )}
            </Text>
          ) : null}
        </View>
      ) : null}

      {expanded ? (
        <Pressable
          onPress={() => setExpanded((current) => !current)}
          style={styles.threadToggleButton}
          testID="thread-context-toggle"
        >
          <Text
            style={[
              styles.threadToggleButtonText,
              darkMode ? styles.threadToggleButtonTextDark : null,
              { fontSize: 12 * fontScale, lineHeight: 16 * fontScale },
            ]}
          >
            {t("Ocultar detalhes")}
          </Text>
          <MaterialCommunityIcons
            color={darkMode ? "#AFC0D2" : colors.textSecondary}
            name="chevron-up"
            size={16}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
