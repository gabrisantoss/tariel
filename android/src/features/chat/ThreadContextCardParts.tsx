import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import {
  colorWithAlpha,
  resolveAccentColorForMode,
} from "../../theme/colorUtils";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import type {
  IconName,
  ThreadAction,
  ThreadChip,
  ThreadInsight,
  ThreadSpotlight,
  ThreadTone,
} from "./ThreadContextCard";

function colorForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return colors.accent;
  }
  if (tone === "success") {
    return colors.success;
  }
  if (tone === "danger") {
    return colors.danger;
  }
  return colors.textSecondary;
}

function colorForToneWithAccent(
  tone: ThreadTone,
  accentColor: string,
  darkMode = false,
) {
  if (tone === "accent") {
    return resolveAccentColorForMode(accentColor, darkMode);
  }

  return colorForTone(tone);
}

function accentToneSurfaceStyle(
  tone: ThreadTone,
  accentColor: string,
  darkMode = false,
) {
  if (tone !== "accent") {
    return null;
  }

  const color = resolveAccentColorForMode(accentColor, darkMode);

  return {
    backgroundColor: colorWithAlpha(color, darkMode ? "24" : "18"),
    borderColor: colorWithAlpha(color, darkMode ? "66" : "4D"),
  };
}

function accentToneSolidSurfaceStyle(
  tone: ThreadTone,
  accentColor: string,
  darkMode = false,
) {
  if (tone !== "accent") {
    return null;
  }

  return {
    backgroundColor: colorWithAlpha(
      resolveAccentColorForMode(accentColor, darkMode),
      darkMode ? "30" : "2E",
    ),
  };
}

function chooserIconSurfaceStyle(
  tone: ThreadTone,
  accentColor: string,
  darkMode = false,
) {
  if (tone !== "accent") {
    return null;
  }

  const color = resolveAccentColorForMode(accentColor, darkMode);

  return {
    backgroundColor: colorWithAlpha(color, darkMode ? "18" : "10"),
    borderColor: colorWithAlpha(color, darkMode ? "40" : "24"),
  };
}

function chipContainerStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadContextChipAccent;
  }
  if (tone === "success") {
    return styles.threadContextChipSuccess;
  }
  if (tone === "danger") {
    return styles.threadContextChipDanger;
  }
  return null;
}

function chipTextStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadContextChipTextAccent;
  }
  if (tone === "success") {
    return styles.threadContextChipTextSuccess;
  }
  if (tone === "danger") {
    return styles.threadContextChipTextDanger;
  }
  return null;
}

function actionContainerStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadActionButtonAccent;
  }
  if (tone === "success") {
    return styles.threadActionButtonSuccess;
  }
  if (tone === "danger") {
    return styles.threadActionButtonDanger;
  }
  return null;
}

function actionTextStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadActionButtonTextAccent;
  }
  if (tone === "success") {
    return styles.threadActionButtonTextSuccess;
  }
  if (tone === "danger") {
    return styles.threadActionButtonTextDanger;
  }
  return null;
}

function insightCardStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadInsightCardAccent;
  }
  if (tone === "success") {
    return styles.threadInsightCardSuccess;
  }
  if (tone === "danger") {
    return styles.threadInsightCardDanger;
  }
  return null;
}

function insightIconStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadInsightIconAccent;
  }
  if (tone === "success") {
    return styles.threadInsightIconSuccess;
  }
  if (tone === "danger") {
    return styles.threadInsightIconDanger;
  }
  return null;
}

function chooserIconStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadChooserActionIconAccent;
  }
  if (tone === "success") {
    return styles.threadChooserActionIconSuccess;
  }
  return null;
}

function spotlightBadgeStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadSpotlightBadgeAccent;
  }
  if (tone === "success") {
    return styles.threadSpotlightBadgeSuccess;
  }
  if (tone === "danger") {
    return styles.threadSpotlightBadgeDanger;
  }
  return null;
}

function spotlightTextStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadSpotlightTextAccent;
  }
  if (tone === "success") {
    return styles.threadSpotlightTextSuccess;
  }
  if (tone === "danger") {
    return styles.threadSpotlightTextDanger;
  }
  return null;
}

export function ThreadContextChipView(props: {
  accentColor?: string;
  compact?: boolean;
  darkMode?: boolean;
  fontScale?: number;
  item: ThreadChip;
}) {
  const {
    accentColor = colors.accent,
    compact = false,
    darkMode = false,
    fontScale = 1,
    item,
  } = props;
  const { t } = useAppTranslation();
  const toneColor = colorForToneWithAccent(item.tone, accentColor, darkMode);

  return (
    <View
      style={[
        styles.threadContextChip,
        compact ? styles.threadContextChipCompact : null,
        chipContainerStyleForTone(item.tone),
        darkMode ? styles.threadContextChipDark : null,
        accentToneSurfaceStyle(item.tone, accentColor, darkMode),
      ]}
    >
      <MaterialCommunityIcons
        color={toneColor}
        name={item.icon}
        size={compact ? 13 : 14}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.threadContextChipText,
          darkMode ? styles.threadContextChipTextDark : null,
          compact ? styles.threadContextChipTextCompact : null,
          chipTextStyleForTone(item.tone),
          item.tone === "accent" ? { color: toneColor } : null,
          { fontSize: (compact ? 11 : 12) * fontScale },
        ]}
      >
        {t(item.label)}
      </Text>
    </View>
  );
}

export function ThreadContextActionButton(props: {
  accentColor?: string;
  compact?: boolean;
  darkMode?: boolean;
  fontScale?: number;
  item: ThreadAction;
}) {
  const {
    accentColor = colors.accent,
    compact = false,
    darkMode = false,
    fontScale = 1,
    item,
  } = props;
  const { t } = useAppTranslation();
  const toneColor = colorForToneWithAccent(item.tone, accentColor, darkMode);

  return (
    <Pressable
      onPress={item.onPress}
      style={[
        styles.threadActionButton,
        compact ? styles.threadActionButtonCompact : null,
        actionContainerStyleForTone(item.tone),
        darkMode ? styles.threadActionButtonDark : null,
        accentToneSurfaceStyle(item.tone, accentColor, darkMode),
      ]}
      testID={item.testID}
    >
      <MaterialCommunityIcons
        color={toneColor}
        name={item.icon}
        size={compact ? 14 : 15}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.threadActionButtonText,
          darkMode ? styles.threadActionButtonTextDark : null,
          compact ? styles.threadActionButtonTextCompact : null,
          actionTextStyleForTone(item.tone),
          item.tone === "accent" ? { color: toneColor } : null,
          { fontSize: (compact ? 11 : 12) * fontScale },
        ]}
      >
        {t(item.label)}
      </Text>
    </Pressable>
  );
}

export function ThreadContextInsightsGrid(props: {
  accentColor?: string;
  darkMode?: boolean;
  fontScale?: number;
  items: ThreadInsight[];
}) {
  const { t } = useAppTranslation();
  const {
    accentColor = colors.accent,
    darkMode = false,
    fontScale = 1,
  } = props;

  return (
    <View style={styles.threadInsightGrid}>
      {props.items.map((item) => {
        const toneColor = colorForToneWithAccent(
          item.tone,
          accentColor,
          darkMode,
        );

        return (
          <View
            key={item.key}
            style={[
              styles.threadInsightCard,
              insightCardStyleForTone(item.tone),
              darkMode ? styles.threadInsightCardDark : null,
              accentToneSurfaceStyle(item.tone, accentColor, darkMode),
            ]}
          >
            <View
              style={[
                styles.threadInsightIcon,
                insightIconStyleForTone(item.tone),
                darkMode ? styles.threadInsightIconDark : null,
                accentToneSolidSurfaceStyle(item.tone, accentColor, darkMode),
              ]}
            >
              <MaterialCommunityIcons
                color={toneColor}
                name={item.icon}
                size={18}
              />
            </View>
            <View style={styles.threadInsightCopy}>
              <Text
                style={[
                  styles.threadInsightLabel,
                  darkMode ? styles.threadInsightLabelDark : null,
                  { fontSize: 11 * fontScale, lineHeight: 15 * fontScale },
                ]}
              >
                {t(item.label)}
              </Text>
              <Text
                style={[
                  styles.threadInsightValue,
                  darkMode ? styles.threadInsightValueDark : null,
                  { fontSize: 15 * fontScale, lineHeight: 20 * fontScale },
                ]}
              >
                {t(item.value)}
              </Text>
              <Text
                style={[
                  styles.threadInsightDetail,
                  darkMode ? styles.threadInsightDetailDark : null,
                  { fontSize: 11 * fontScale, lineHeight: 16 * fontScale },
                ]}
              >
                {t(item.detail)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ThreadContextChooserActionCard(props: {
  accentColor?: string;
  badgeLabel?: string;
  darkMode?: boolean;
  densityScale?: number;
  detail: string;
  emphasis?: "primary" | "secondary";
  fontScale?: number;
  icon: IconName;
  label: string;
  metaItems?: string[];
  onPress: () => void;
  testID?: string;
  tone: ThreadTone;
  trailingIcon?: IconName;
}) {
  const {
    accentColor = colors.accent,
    badgeLabel,
    darkMode = false,
    densityScale = 1,
    detail,
    emphasis = "secondary",
    fontScale = 1,
    icon,
    label,
    metaItems = [],
    onPress,
    testID,
    tone,
    trailingIcon,
  } = props;
  const { t } = useAppTranslation();
  const toneColor = colorForToneWithAccent(tone, accentColor, darkMode);

  return (
    <Pressable
      accessibilityLabel={t(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.threadChooserActionCard,
        emphasis === "primary" ? styles.threadChooserActionCardPrimary : null,
        darkMode ? styles.threadChooserActionCardDark : null,
        {
          minHeight: (emphasis === "primary" ? 104 : 96) * densityScale,
          paddingHorizontal: 16 * densityScale,
          paddingVertical: 16 * densityScale,
        },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.threadChooserActionIcon,
          chooserIconStyleForTone(tone),
          darkMode ? styles.threadChooserActionIconDark : null,
          chooserIconSurfaceStyle(tone, accentColor, darkMode),
          {
            height: 44 * densityScale,
            width: 44 * densityScale,
          },
        ]}
      >
        <MaterialCommunityIcons
          color={toneColor}
          name={icon}
          size={18 * fontScale}
        />
      </View>
      <View style={styles.threadChooserActionCopy}>
        <View style={styles.threadChooserActionTitleRow}>
          <Text
            style={[
              styles.threadChooserActionTitle,
              darkMode ? styles.threadChooserActionTitleDark : null,
              { fontSize: 15 * fontScale, lineHeight: 20 * fontScale },
            ]}
          >
            {t(label)}
          </Text>
          {badgeLabel ? (
            <Text
              style={[
                styles.threadChooserActionBadge,
                darkMode ? styles.threadChooserActionBadgeDark : null,
                { color: toneColor },
                { fontSize: 10 * fontScale, lineHeight: 13 * fontScale },
              ]}
            >
              {t(badgeLabel)}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.threadChooserActionDetail,
            darkMode ? styles.threadChooserActionDetailDark : null,
            { fontSize: 13 * fontScale, lineHeight: 18 * fontScale },
          ]}
        >
          {t(detail)}
        </Text>
        {metaItems.length ? (
          <View style={styles.threadChooserActionMetaRow}>
            {metaItems.map((item) => (
              <Text
                key={item}
                style={[
                  styles.threadChooserActionMetaChip,
                  darkMode ? styles.threadChooserActionMetaChipDark : null,
                  {
                    fontSize: 11 * fontScale,
                    lineHeight: 14 * fontScale,
                    paddingHorizontal: 8 * densityScale,
                    paddingVertical: 4 * densityScale,
                  },
                ]}
              >
                {t(item)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <MaterialCommunityIcons
        color={darkMode ? "#AFC0D2" : colors.textSecondary}
        name={trailingIcon || "chevron-right"}
        size={18 * fontScale}
      />
    </Pressable>
  );
}

export function ThreadContextSpotlightBadge(props: {
  accentColor?: string;
  compact?: boolean;
  darkMode?: boolean;
  fontScale?: number;
  spotlight: ThreadSpotlight;
}) {
  const {
    accentColor = colors.accent,
    compact = false,
    darkMode = false,
    fontScale = 1,
    spotlight,
  } = props;
  const { t } = useAppTranslation();
  const toneColor = colorForToneWithAccent(
    spotlight.tone,
    accentColor,
    darkMode,
  );

  return (
    <View
      style={[
        styles.threadSpotlightBadge,
        compact ? styles.threadSpotlightBadgeCompact : null,
        spotlightBadgeStyleForTone(spotlight.tone),
        darkMode ? styles.threadSpotlightBadgeDark : null,
        accentToneSurfaceStyle(spotlight.tone, accentColor, darkMode),
      ]}
    >
      <MaterialCommunityIcons
        color={toneColor}
        name={spotlight.icon}
        size={14}
      />
      <Text
        style={[
          styles.threadSpotlightText,
          darkMode ? styles.threadSpotlightTextDark : null,
          compact ? styles.threadSpotlightTextCompact : null,
          spotlightTextStyleForTone(spotlight.tone),
          spotlight.tone === "accent" ? { color: toneColor } : null,
          { fontSize: 10 * fontScale, lineHeight: 13 * fontScale },
        ]}
      >
        {t(spotlight.label)}
      </Text>
    </View>
  );
}
