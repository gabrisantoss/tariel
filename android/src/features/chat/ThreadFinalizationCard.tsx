import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import type {
  ThreadAction,
  ThreadChip,
  ThreadInsight,
  ThreadSpotlight,
} from "./ThreadContextCard";

interface ThreadFinalizationCardProps {
  eyebrow: string;
  title: string;
  description: string;
  spotlight: ThreadSpotlight;
  chips: ThreadChip[];
  actions: ThreadAction[];
  insights: ThreadInsight[];
}

export function ThreadFinalizationCard({
  eyebrow,
  title,
  description,
  spotlight,
  chips,
  actions,
  insights,
}: ThreadFinalizationCardProps) {
  const { t } = useAppTranslation();
  const primaryAction = actions[0] ?? null;
  const secondaryActions = actions.slice(1);
  const statusInsights = [
    insights.find((item) => item.key === "current-owner"),
    insights.find((item) => item.key === "expected-decision"),
    insights.find((item) => item.key === "blockers"),
    insights.find((item) => item.key === "blocking-reason"),
    insights.find((item) => item.key === "suggested-route"),
  ]
    .filter((item): item is ThreadInsight => Boolean(item))
    .slice(0, 4);
  const documentAuditInsights = [
    insights.find((item) => item.key === "delivery"),
    insights.find((item) => item.key === "verification"),
    insights.find((item) => item.key === "governance"),
    insights.find((item) => item.key === "final-output"),
  ]
    .filter((item): item is ThreadInsight => Boolean(item))
    .slice(0, 4);
  const fallbackStatusInsights = statusInsights.length
    ? statusInsights
    : insights.slice(0, 3);

  const renderChip = (item: ThreadChip) => (
    <View
      key={item.key}
      style={[
        styles.threadContextChip,
        item.tone === "accent"
          ? styles.threadContextChipAccent
          : item.tone === "success"
            ? styles.threadContextChipSuccess
            : item.tone === "danger"
              ? styles.threadContextChipDanger
              : null,
      ]}
    >
      <MaterialCommunityIcons
        color={
          item.tone === "accent"
            ? colors.accent
            : item.tone === "success"
              ? colors.success
              : item.tone === "danger"
                ? colors.danger
                : colors.textSecondary
        }
        name={item.icon}
        size={14}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.threadContextChipText,
          item.tone === "accent"
            ? styles.threadContextChipTextAccent
            : item.tone === "success"
              ? styles.threadContextChipTextSuccess
              : item.tone === "danger"
                ? styles.threadContextChipTextDanger
                : null,
        ]}
      >
        {t(item.label)}
      </Text>
    </View>
  );

  const renderAction = (item: ThreadAction) => (
    <Pressable
      key={item.key}
      accessibilityRole="button"
      onPress={item.onPress}
      style={[
        styles.threadActionButton,
        item.tone === "accent"
          ? styles.threadActionButtonAccent
          : item.tone === "success"
            ? styles.threadActionButtonSuccess
            : item.tone === "danger"
              ? styles.threadActionButtonDanger
              : null,
      ]}
      testID={item.testID}
    >
      <MaterialCommunityIcons
        color={
          item.tone === "accent"
            ? colors.accent
            : item.tone === "success"
              ? colors.success
              : item.tone === "danger"
                ? colors.danger
                : colors.textSecondary
        }
        name={item.icon}
        size={15}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.threadActionButtonText,
          item.tone === "accent"
            ? styles.threadActionButtonTextAccent
            : item.tone === "success"
              ? styles.threadActionButtonTextSuccess
              : item.tone === "danger"
                ? styles.threadActionButtonTextDanger
                : null,
        ]}
      >
        {t(item.label)}
      </Text>
    </Pressable>
  );

  const renderOperationalPlan = (items: ThreadInsight[]) => (
    <View style={styles.threadOperationalPlanGrid}>
      {items.map((item) => (
        <View
          key={item.key}
          style={[
            styles.threadOperationalPlanCard,
            item.tone === "accent"
              ? styles.threadOperationalPlanCardAccent
              : item.tone === "success"
                ? styles.threadOperationalPlanCardSuccess
                : item.tone === "danger"
                  ? styles.threadOperationalPlanCardDanger
                  : null,
          ]}
          testID={`thread-finalization-plan-${item.key}`}
        >
          <View style={styles.threadOperationalPlanHeader}>
            <MaterialCommunityIcons
              color={
                item.tone === "accent"
                  ? colors.accent
                  : item.tone === "success"
                    ? colors.success
                    : item.tone === "danger"
                      ? colors.danger
                      : colors.textSecondary
              }
              name={item.icon}
              size={16}
            />
            <Text style={styles.threadOperationalPlanLabel}>
              {t(item.label)}
            </Text>
          </View>
          <Text style={styles.threadOperationalPlanValue}>{t(item.value)}</Text>
          <Text style={styles.threadOperationalPlanDetail}>
            {t(item.detail)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      style={[styles.threadHeaderCard, styles.threadHeaderFinalizationCard]}
    >
      <View
        style={[
          styles.threadFinalizationHero,
          spotlight.tone === "accent"
            ? styles.threadFinalizationHeroAccent
            : spotlight.tone === "success"
              ? styles.threadFinalizationHeroSuccess
              : spotlight.tone === "danger"
                ? styles.threadFinalizationHeroDanger
                : null,
        ]}
      >
        <View style={styles.threadFinalizationHeroTop}>
          <View style={styles.threadHeaderCopy}>
            {eyebrow ? (
              <Text style={styles.threadEyebrow}>{t(eyebrow)}</Text>
            ) : null}
            <Text style={styles.threadFinalizationTitle}>{t(title)}</Text>
            <Text style={styles.threadFinalizationDescription}>
              {t(description)}
            </Text>
          </View>
          <View
            style={[
              styles.threadSpotlightBadge,
              spotlight.tone === "accent"
                ? styles.threadSpotlightBadgeAccent
                : spotlight.tone === "success"
                  ? styles.threadSpotlightBadgeSuccess
                  : spotlight.tone === "danger"
                    ? styles.threadSpotlightBadgeDanger
                    : null,
            ]}
          >
            <MaterialCommunityIcons
              color={
                spotlight.tone === "accent"
                  ? colors.accent
                  : spotlight.tone === "success"
                    ? colors.success
                    : spotlight.tone === "danger"
                      ? colors.danger
                      : colors.textSecondary
              }
              name={spotlight.icon}
              size={15}
            />
            <Text
              style={[
                styles.threadSpotlightText,
                spotlight.tone === "accent"
                  ? styles.threadSpotlightTextAccent
                  : spotlight.tone === "success"
                    ? styles.threadSpotlightTextSuccess
                    : spotlight.tone === "danger"
                      ? styles.threadSpotlightTextDanger
                      : null,
              ]}
            >
              {t(spotlight.label)}
            </Text>
          </View>
        </View>

        {chips.length ? (
          <View style={styles.threadContextChips}>
            {chips.map((item) => renderChip(item))}
          </View>
        ) : null}
      </View>

      {actions.length ? (
        <View style={styles.threadFinalizationSection}>
          <Text style={styles.threadFinalizationSectionLabel}>
            {t("Próxima ação")}
          </Text>
          {primaryAction ? (
            <View style={styles.threadActionRow}>
              {renderAction(primaryAction)}
            </View>
          ) : null}
          {secondaryActions.length ? (
            <View style={styles.threadSecondaryActionRow}>
              {secondaryActions.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={item.onPress}
                  style={styles.threadSecondaryActionButton}
                  testID={item.testID}
                >
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name={item.icon}
                    size={14}
                  />
                  <Text
                    numberOfLines={1}
                    style={styles.threadSecondaryActionText}
                  >
                    {t(item.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {fallbackStatusInsights.length ? (
        <View style={styles.threadFinalizationSection}>
          <Text style={styles.threadFinalizationSectionLabel}>
            {t("Status e pendências")}
          </Text>
          {renderOperationalPlan(fallbackStatusInsights)}
        </View>
      ) : null}

      {documentAuditInsights.length ? (
        <View style={styles.threadFinalizationSection}>
          <Text style={styles.threadFinalizationSectionLabel}>
            {t("Documento e auditoria")}
          </Text>
          {renderOperationalPlan(documentAuditInsights)}
        </View>
      ) : null}
    </View>
  );
}
