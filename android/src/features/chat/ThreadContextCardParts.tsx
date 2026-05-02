import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
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

function chooserCardStyleForTone(tone: ThreadTone) {
  if (tone === "accent") {
    return styles.threadChooserActionCardAccent;
  }
  if (tone === "success") {
    return styles.threadChooserActionCardSuccess;
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
  compact?: boolean;
  darkMode?: boolean;
  item: ThreadChip;
}) {
  const { compact = false, darkMode = false, item } = props;
  const { t } = useAppTranslation();

  return (
    <View
      style={[
        styles.threadContextChip,
        compact ? styles.threadContextChipCompact : null,
        chipContainerStyleForTone(item.tone),
        darkMode ? styles.threadContextChipDark : null,
      ]}
    >
      <MaterialCommunityIcons
        color={colorForTone(item.tone)}
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
        ]}
      >
        {t(item.label)}
      </Text>
    </View>
  );
}

export function ThreadContextActionButton(props: {
  compact?: boolean;
  darkMode?: boolean;
  item: ThreadAction;
}) {
  const { compact = false, darkMode = false, item } = props;
  const { t } = useAppTranslation();

  return (
    <Pressable
      onPress={item.onPress}
      style={[
        styles.threadActionButton,
        compact ? styles.threadActionButtonCompact : null,
        actionContainerStyleForTone(item.tone),
        darkMode ? styles.threadActionButtonDark : null,
      ]}
      testID={item.testID}
    >
      <MaterialCommunityIcons
        color={colorForTone(item.tone)}
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
        ]}
      >
        {t(item.label)}
      </Text>
    </Pressable>
  );
}

export function ThreadContextInsightsGrid(props: {
  darkMode?: boolean;
  items: ThreadInsight[];
}) {
  const { t } = useAppTranslation();
  const { darkMode = false } = props;

  return (
    <View style={styles.threadInsightGrid}>
      {props.items.map((item) => (
        <View
          key={item.key}
          style={[
            styles.threadInsightCard,
            insightCardStyleForTone(item.tone),
            darkMode ? styles.threadInsightCardDark : null,
          ]}
        >
          <View
            style={[
              styles.threadInsightIcon,
              insightIconStyleForTone(item.tone),
              darkMode ? styles.threadInsightIconDark : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colorForTone(item.tone)}
              name={item.icon}
              size={18}
            />
          </View>
          <View style={styles.threadInsightCopy}>
            <Text
              style={[
                styles.threadInsightLabel,
                darkMode ? styles.threadInsightLabelDark : null,
              ]}
            >
              {t(item.label)}
            </Text>
            <Text
              style={[
                styles.threadInsightValue,
                darkMode ? styles.threadInsightValueDark : null,
              ]}
            >
              {t(item.value)}
            </Text>
            <Text
              style={[
                styles.threadInsightDetail,
                darkMode ? styles.threadInsightDetailDark : null,
              ]}
            >
              {t(item.detail)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ThreadContextChooserActionCard(props: {
  badgeLabel?: string;
  darkMode?: boolean;
  detail: string;
  emphasis?: "primary" | "secondary";
  icon: IconName;
  label: string;
  metaItems?: string[];
  onPress: () => void;
  testID?: string;
  tone: ThreadTone;
  trailingIcon?: IconName;
}) {
  const {
    badgeLabel,
    darkMode = false,
    detail,
    emphasis = "secondary",
    icon,
    label,
    metaItems = [],
    onPress,
    testID,
    tone,
    trailingIcon,
  } = props;
  const { t } = useAppTranslation();

  return (
    <Pressable
      accessibilityLabel={t(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.threadChooserActionCard,
        emphasis === "primary" ? styles.threadChooserActionCardPrimary : null,
        chooserCardStyleForTone(tone),
        darkMode ? styles.threadChooserActionCardDark : null,
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.threadChooserActionIcon,
          chooserIconStyleForTone(tone),
          darkMode ? styles.threadChooserActionIconDark : null,
        ]}
      >
        <MaterialCommunityIcons
          color={colorForTone(tone)}
          name={icon}
          size={18}
        />
      </View>
      <View style={styles.threadChooserActionCopy}>
        <View style={styles.threadChooserActionTitleRow}>
          <Text
            style={[
              styles.threadChooserActionTitle,
              darkMode ? styles.threadChooserActionTitleDark : null,
            ]}
          >
            {t(label)}
          </Text>
          {badgeLabel ? (
            <Text style={styles.threadChooserActionBadge}>
              {t(badgeLabel)}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.threadChooserActionDetail,
            darkMode ? styles.threadChooserActionDetailDark : null,
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
        size={18}
      />
    </Pressable>
  );
}

export function ThreadContextSpotlightBadge(props: {
  compact?: boolean;
  darkMode?: boolean;
  spotlight: ThreadSpotlight;
}) {
  const { compact = false, darkMode = false, spotlight } = props;
  const { t } = useAppTranslation();

  return (
    <View
      style={[
        styles.threadSpotlightBadge,
        compact ? styles.threadSpotlightBadgeCompact : null,
        spotlightBadgeStyleForTone(spotlight.tone),
        darkMode ? styles.threadSpotlightBadgeDark : null,
      ]}
    >
      <MaterialCommunityIcons
        color={colorForTone(spotlight.tone)}
        name={spotlight.icon}
        size={14}
      />
      <Text
        style={[
          styles.threadSpotlightText,
          darkMode ? styles.threadSpotlightTextDark : null,
          compact ? styles.threadSpotlightTextCompact : null,
          spotlightTextStyleForTone(spotlight.tone),
        ]}
      >
        {t(spotlight.label)}
      </Text>
    </View>
  );
}
