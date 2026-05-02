import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { useAppTranslation } from "../i18n/appTranslation";
import { colors, iconSizes, radii, spacing, typography } from "../theme/tokens";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type EmptyStateTone = "default" | "accent" | "success" | "danger";

interface EmptyStateProps {
  icon: IconName;
  imageAccessibilityLabel?: string;
  imageSource?: ImageSourcePropType | null;
  title?: string;
  description?: string;
  eyebrow?: string;
  tone?: EmptyStateTone;
  compact?: boolean;
  darkMode?: boolean;
}

export function EmptyState({
  icon,
  imageAccessibilityLabel,
  imageSource,
  title,
  description,
  eyebrow,
  tone = "default",
  compact = false,
  darkMode = false,
}: EmptyStateProps) {
  const { t } = useAppTranslation();
  const iconColor =
    tone === "accent"
      ? colors.accent
      : tone === "success"
        ? colors.success
        : tone === "danger"
          ? colors.danger
          : darkMode
            ? "#D8E3EE"
            : colors.ink700;
  const iconShellStyle =
    tone === "accent"
      ? styles.iconShellAccent
      : tone === "success"
        ? styles.iconShellSuccess
        : tone === "danger"
          ? styles.iconShellDanger
          : styles.iconShellDefault;

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <View
        style={[
          styles.iconShell,
          imageSource ? styles.iconShellImage : iconShellStyle,
          darkMode && imageSource ? styles.iconShellImageDark : null,
          darkMode && !imageSource && tone === "default"
            ? styles.iconShellDefaultDark
            : null,
        ]}
      >
        {imageSource ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={imageAccessibilityLabel}
            source={imageSource}
            style={styles.iconImage}
            testID="empty-state-image"
          />
        ) : (
          <MaterialCommunityIcons
            color={iconColor}
            name={icon}
            size={iconSizes.lg}
          />
        )}
      </View>
      {eyebrow ? (
        <Text style={[styles.eyebrow, darkMode ? styles.eyebrowDark : null]}>
          {t(eyebrow)}
        </Text>
      ) : null}
      {title ? (
        <Text style={[styles.title, darkMode ? styles.titleDark : null]}>
          {t(title)}
        </Text>
      ) : null}
      {description ? (
        <Text
          style={[styles.description, darkMode ? styles.descriptionDark : null]}
        >
          {t(description)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  containerCompact: {
    minHeight: 180,
    paddingHorizontal: spacing.lg,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconShellImage: {
    width: 86,
    height: 86,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  iconShellImageDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  iconImage: {
    width: 78,
    height: 78,
    resizeMode: "contain",
  },
  iconShellDefault: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  iconShellDefaultDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  iconShellAccent: {
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  iconShellSuccess: {
    backgroundColor: colors.successWash,
    borderWidth: 1,
    borderColor: colors.successSoft,
  },
  iconShellDanger: {
    backgroundColor: colors.dangerWash,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  eyebrow: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  eyebrowDark: {
    color: "#AFC0D2",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 300,
  },
  titleDark: {
    color: "#F0F4F8",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  descriptionDark: {
    color: "#AFC0D2",
  },
});
