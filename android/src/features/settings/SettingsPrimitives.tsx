import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createContext, useContext, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "../../theme/tokens";
import { useAppTranslation } from "../../i18n/appTranslation";
import { styles } from "../InspectorMobileApp.styles";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
export type SettingsStatusTone = "success" | "muted" | "danger" | "accent";
const SETTINGS_ICON_COLOR = colors.ink700;
const SETTINGS_DARK_ICON_COLOR = "#D8E3EE";

interface SettingsSectionLayoutContextValue {
  hideHeader: boolean;
  darkMode: boolean;
}

const SettingsSectionLayoutContext =
  createContext<SettingsSectionLayoutContextValue>({
    hideHeader: false,
    darkMode: false,
  });

function settingsIconColor(darkMode: boolean, danger = false) {
  if (danger) {
    return colors.danger;
  }
  return darkMode ? SETTINGS_DARK_ICON_COLOR : SETTINGS_ICON_COLOR;
}

export function SettingsSectionLayoutProvider({
  children,
  hideHeader,
  darkMode = false,
}: {
  children: ReactNode;
  hideHeader: boolean;
  darkMode?: boolean;
}) {
  return (
    <SettingsSectionLayoutContext.Provider value={{ hideHeader, darkMode }}>
      {children}
    </SettingsSectionLayoutContext.Provider>
  );
}

export function useSettingsSectionLayout() {
  return useContext(SettingsSectionLayoutContext);
}

function SettingsInfoIcon({
  title,
  description,
  icon,
  iconColor,
  iconSize = 18,
  style,
  testID,
}: {
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  iconSize?: number;
  style: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { t } = useAppTranslation();
  const translatedTitle = t(title);
  const translatedDescription = t(description);

  return (
    <Pressable
      accessibilityLabel={`${t("Informações sobre")} ${translatedTitle}`}
      hitSlop={8}
      onPress={(event) => {
        event.stopPropagation();
        Alert.alert(translatedTitle, translatedDescription);
      }}
      style={style}
      testID={testID}
    >
      <MaterialCommunityIcons color={iconColor} name={icon} size={iconSize} />
    </Pressable>
  );
}

export function SettingsSection({
  icon,
  title,
  subtitle,
  children,
  testID,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  children: ReactNode;
  testID?: string;
}) {
  const { hideHeader, darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const translatedTitle = t(title);
  const translatedSubtitle = subtitle ? t(subtitle) : undefined;
  return (
    <View style={styles.settingsSection} testID={testID}>
      {!hideHeader ? (
        <View style={styles.settingsSectionHeader}>
          {subtitle ? (
            <SettingsInfoIcon
              description={translatedSubtitle || subtitle}
              icon={icon}
              iconColor={settingsIconColor(darkMode)}
              iconSize={18}
              style={[
                styles.settingsSectionIcon,
                darkMode ? styles.settingsSectionIconDark : null,
              ]}
              title={translatedTitle}
            />
          ) : (
            <View
              style={[
                styles.settingsSectionIcon,
                darkMode ? styles.settingsSectionIconDark : null,
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={18}
                color={settingsIconColor(darkMode)}
              />
            </View>
          )}
          <View style={styles.settingsSectionCopy}>
            <Text
              style={[
                styles.settingsSectionTitle,
                darkMode ? styles.settingsSectionTitleDark : null,
              ]}
            >
              {translatedTitle}
            </Text>
          </View>
        </View>
      ) : null}
      <View
        style={[styles.settingsCard, darkMode ? styles.settingsCardDark : null]}
      >
        {children}
      </View>
    </View>
  );
}

export function SettingsGroupLabel({
  title,
  description: _description,
}: {
  title: string;
  description?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  return (
    <View style={styles.settingsGroupLabel}>
      <Text
        style={[
          styles.settingsGroupEyebrow,
          darkMode ? styles.settingsGroupEyebrowDark : null,
        ]}
      >
        {t(title)}
      </Text>
    </View>
  );
}

export function SettingsPressRow({
  icon,
  title,
  value,
  description,
  onPress,
  danger = false,
  testID,
}: {
  icon: IconName;
  title: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
  testID?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const iconColor = settingsIconColor(darkMode, danger);
  const translatedTitle = t(title);
  const translatedDescription = description ? t(description) : undefined;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.settingsRow,
        darkMode ? styles.settingsRowDark : null,
        danger ? styles.settingsRowDanger : null,
        danger && darkMode ? styles.settingsRowDangerDark : null,
      ]}
      testID={testID}
    >
      {description ? (
        <SettingsInfoIcon
          description={translatedDescription || description}
          icon={icon}
          iconColor={iconColor}
          iconSize={18}
          style={[
            styles.settingsRowIcon,
            darkMode ? styles.settingsRowIconDark : null,
            danger ? styles.settingsRowIconDanger : null,
            danger && darkMode ? styles.settingsRowIconDangerDark : null,
          ]}
          title={translatedTitle}
        />
      ) : (
        <View
          style={[
            styles.settingsRowIcon,
            darkMode ? styles.settingsRowIconDark : null,
            danger ? styles.settingsRowIconDanger : null,
            danger && darkMode ? styles.settingsRowIconDangerDark : null,
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View style={styles.settingsRowCopy}>
        <Text
          style={[
            styles.settingsRowTitle,
            darkMode ? styles.settingsRowTitleDark : null,
            danger ? styles.settingsRowTitleDanger : null,
          ]}
        >
          {translatedTitle}
        </Text>
      </View>
      <View style={styles.settingsRowMeta}>
        {value ? (
          <Text
            style={[
              styles.settingsRowValue,
              darkMode ? styles.settingsRowValueDark : null,
              danger ? { color: colors.danger } : null,
            ]}
          >
            {t(value)}
          </Text>
        ) : null}
        {onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={
              danger
                ? colors.danger
                : darkMode
                  ? "#AFC0D2"
                  : colors.textSecondary
            }
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export function SettingsSwitchRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  testID,
}: {
  icon: IconName;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const iconColor = settingsIconColor(darkMode);
  const translatedTitle = t(title);
  const translatedDescription = description ? t(description) : undefined;
  return (
    <View
      style={[styles.settingsRow, darkMode ? styles.settingsRowDark : null]}
      testID={testID}
    >
      {description ? (
        <SettingsInfoIcon
          description={translatedDescription || description}
          icon={icon}
          iconColor={iconColor}
          iconSize={18}
          style={[
            styles.settingsRowIcon,
            darkMode ? styles.settingsRowIconDark : null,
          ]}
          title={translatedTitle}
        />
      ) : (
        <View
          style={[
            styles.settingsRowIcon,
            darkMode ? styles.settingsRowIconDark : null,
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View style={styles.settingsRowCopy}>
        <Text
          style={[
            styles.settingsRowTitle,
            darkMode ? styles.settingsRowTitleDark : null,
          ]}
        >
          {translatedTitle}
        </Text>
      </View>
      <Switch
        ios_backgroundColor="#E8DDD1"
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: "#DDD1C4", true: colors.ink700 }}
        value={value}
      />
    </View>
  );
}

export function SettingsSegmentedRow<T extends string>({
  icon,
  title,
  description,
  options,
  value,
  onChange,
  testID,
}: {
  icon: IconName;
  title: string;
  description?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const iconColor = settingsIconColor(darkMode);
  const translatedTitle = t(title);
  const translatedDescription = description ? t(description) : undefined;
  return (
    <View
      style={[
        styles.settingsBlockRow,
        darkMode ? styles.settingsBlockRowDark : null,
      ]}
      testID={testID}
    >
      <View style={styles.settingsBlockHeader}>
        {description ? (
          <SettingsInfoIcon
            description={translatedDescription || description}
            icon={icon}
            iconColor={iconColor}
            iconSize={18}
            style={[
              styles.settingsRowIcon,
              darkMode ? styles.settingsRowIconDark : null,
            ]}
            title={translatedTitle}
          />
        ) : (
          <View
            style={[
              styles.settingsRowIcon,
              darkMode ? styles.settingsRowIconDark : null,
            ]}
          >
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          </View>
        )}
        <View style={styles.settingsRowCopy}>
          <Text
            style={[
              styles.settingsRowTitle,
              darkMode ? styles.settingsRowTitleDark : null,
            ]}
          >
            {translatedTitle}
          </Text>
        </View>
      </View>
      <View style={styles.settingsSegmentedControl}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={`${title}-${option}`}
              onPress={() => onChange(option)}
              style={[
                styles.settingsSegmentPill,
                darkMode ? styles.settingsSegmentPillDark : null,
                active ? styles.settingsSegmentPillActive : null,
              ]}
            >
              <Text
                style={[
                  styles.settingsSegmentText,
                  darkMode ? styles.settingsSegmentTextDark : null,
                  active ? styles.settingsSegmentTextActive : null,
                ]}
              >
                {t(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsScaleRow({
  title,
  icon,
  description,
  value,
  values,
  onChange,
  minLabel,
  maxLabel,
  testID,
}: {
  title: string;
  icon: IconName;
  description?: string;
  value: number;
  values: readonly number[];
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  testID?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const iconColor = settingsIconColor(darkMode);
  const translatedTitle = t(title);
  const translatedDescription = description ? t(description) : undefined;
  return (
    <View
      style={[
        styles.settingsBlockRow,
        darkMode ? styles.settingsBlockRowDark : null,
      ]}
      testID={testID}
    >
      <View style={styles.settingsBlockHeader}>
        {description ? (
          <SettingsInfoIcon
            description={translatedDescription || description}
            icon={icon}
            iconColor={iconColor}
            iconSize={18}
            style={[
              styles.settingsRowIcon,
              darkMode ? styles.settingsRowIconDark : null,
            ]}
            title={translatedTitle}
          />
        ) : (
          <View
            style={[
              styles.settingsRowIcon,
              darkMode ? styles.settingsRowIconDark : null,
            ]}
          >
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          </View>
        )}
        <View style={styles.settingsRowCopy}>
          <Text
            style={[
              styles.settingsRowTitle,
              darkMode ? styles.settingsRowTitleDark : null,
            ]}
          >
            {translatedTitle}
          </Text>
        </View>
        <Text
          style={[
            styles.settingsScaleValue,
            darkMode ? styles.settingsScaleValueDark : null,
          ]}
        >
          {value.toFixed(1)}
        </Text>
      </View>
      <View style={styles.settingsScaleTrack}>
        {values.map((step) => {
          const active = step <= value;
          const selected = step === value;
          return (
            <Pressable
              key={`${title}-${step}`}
              onPress={() => onChange(step)}
              style={[
                styles.settingsScaleStep,
                darkMode ? styles.settingsScaleStepDark : null,
                active ? styles.settingsScaleStepActive : null,
              ]}
            >
              <View
                style={[
                  styles.settingsScaleDot,
                  darkMode ? styles.settingsScaleDotDark : null,
                  selected ? styles.settingsScaleDotActive : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.settingsScaleLabels}>
        <Text
          style={[
            styles.settingsScaleLabel,
            darkMode ? styles.settingsScaleLabelDark : null,
          ]}
        >
          {t(minLabel)}
        </Text>
        <Text
          style={[
            styles.settingsScaleLabel,
            darkMode ? styles.settingsScaleLabelDark : null,
          ]}
        >
          {t(maxLabel)}
        </Text>
      </View>
    </View>
  );
}

export function SettingsTextField({
  icon,
  title,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
  autoCorrect = false,
  secureTextEntry = false,
  testID,
}: {
  icon: IconName;
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  testID?: string;
}) {
  const { darkMode } = useContext(SettingsSectionLayoutContext);
  const { t } = useAppTranslation();
  const iconColor = settingsIconColor(darkMode);
  return (
    <View
      style={[
        styles.settingsFieldBlock,
        darkMode ? styles.settingsFieldBlockDark : null,
      ]}
      testID={testID}
    >
      <View style={styles.settingsFieldLabelRow}>
        <View
          style={[
            styles.settingsRowIcon,
            darkMode ? styles.settingsRowIconDark : null,
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <Text
          style={[
            styles.settingsRowTitle,
            darkMode ? styles.settingsRowTitleDark : null,
          ]}
        >
          {t(title)}
        </Text>
      </View>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={t(placeholder)}
        placeholderTextColor={darkMode ? "#8999AB" : colors.textSecondary}
        secureTextEntry={secureTextEntry}
        style={[
          styles.settingsTextField,
          darkMode ? styles.settingsTextFieldDark : null,
        ]}
        testID={testID ? `${testID}-input` : undefined}
        value={value}
      />
    </View>
  );
}

export function SettingsStatusPill({
  label,
  icon,
  iconOnly = false,
  tone = "muted",
}: {
  label: string;
  icon?: IconName;
  iconOnly?: boolean;
  tone?: SettingsStatusTone;
}) {
  const { t } = useAppTranslation();
  const { darkMode } = useSettingsSectionLayout();
  const translatedLabel = t(label);
  const contentColor =
    tone === "success"
      ? darkMode
        ? "#8DE0B5"
        : colors.success
      : tone === "danger"
        ? darkMode
          ? "#F5A3A3"
          : colors.danger
        : tone === "accent"
          ? darkMode
            ? "#D8E3EE"
            : colors.ink700
          : darkMode
            ? "#AFC0D2"
            : colors.textSecondary;

  return (
    <View
      accessibilityLabel={iconOnly ? translatedLabel : undefined}
      accessible={iconOnly || undefined}
      style={[
        styles.settingsStatusPill,
        darkMode ? styles.settingsStatusPillDark : null,
        tone === "success"
          ? styles.settingsStatusPillSuccess
          : tone === "danger"
            ? styles.settingsStatusPillDanger
            : tone === "accent"
              ? styles.settingsStatusPillAccent
              : null,
        darkMode && tone === "success"
          ? styles.settingsStatusPillSuccessDark
          : darkMode && tone === "danger"
            ? styles.settingsStatusPillDangerDark
            : darkMode && tone === "accent"
              ? styles.settingsStatusPillAccentDark
              : null,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons color={contentColor} name={icon} size={14} />
      ) : null}
      {iconOnly ? null : (
        <Text
          style={[
            styles.settingsStatusPillText,
            darkMode ? styles.settingsStatusPillTextDark : null,
            tone === "success"
              ? styles.settingsStatusPillTextSuccess
              : tone === "danger"
                ? styles.settingsStatusPillTextDanger
                : tone === "accent"
                  ? styles.settingsStatusPillTextAccent
                  : null,
            darkMode && tone === "success"
              ? styles.settingsStatusPillTextSuccessDark
              : darkMode && tone === "danger"
                ? styles.settingsStatusPillTextDangerDark
                : darkMode && tone === "accent"
                  ? styles.settingsStatusPillTextAccentDark
                  : null,
          ]}
        >
          {translatedLabel}
        </Text>
      )}
    </View>
  );
}

export function SettingsOverviewCard({
  icon,
  title,
  description,
  badge,
  onPress,
  tone = "muted",
  darkMode = false,
  testID,
}: {
  icon: IconName;
  title: string;
  description: string;
  badge: string;
  onPress: () => void;
  tone?: "muted" | "accent" | "success" | "danger";
  darkMode?: boolean;
  testID?: string;
}) {
  const { t } = useAppTranslation();
  const translatedTitle = t(title);
  const translatedDescription = t(description);
  const overviewIconColor = darkMode
    ? tone === "success"
      ? "#8DE0B5"
      : tone === "danger"
        ? "#F5A3A3"
        : tone === "accent"
          ? "#D8E3EE"
          : "#AFC0D2"
    : tone === "accent"
      ? colors.ink700
      : tone === "success"
        ? colors.success
        : tone === "danger"
          ? colors.danger
          : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingsOverviewCard,
        darkMode ? styles.settingsOverviewCardDark : null,
        tone === "accent"
          ? styles.settingsOverviewCardAccent
          : tone === "success"
            ? styles.settingsOverviewCardSuccess
            : tone === "danger"
              ? styles.settingsOverviewCardDanger
              : null,
        darkMode && tone === "accent"
          ? styles.settingsOverviewCardAccentDark
          : darkMode && tone === "success"
            ? styles.settingsOverviewCardSuccessDark
            : darkMode && tone === "danger"
              ? styles.settingsOverviewCardDangerDark
              : null,
      ]}
      testID={testID}
    >
      <SettingsInfoIcon
        description={translatedDescription}
        icon={icon}
        iconColor={overviewIconColor}
        iconSize={20}
        style={[
          styles.settingsOverviewIcon,
          darkMode ? styles.settingsOverviewIconDark : null,
          tone === "accent"
            ? styles.settingsOverviewIconAccent
            : tone === "success"
              ? styles.settingsOverviewIconSuccess
              : tone === "danger"
                ? styles.settingsOverviewIconDanger
                : null,
          darkMode && tone === "accent"
            ? styles.settingsOverviewIconAccentDark
            : darkMode && tone === "success"
              ? styles.settingsOverviewIconSuccessDark
              : darkMode && tone === "danger"
                ? styles.settingsOverviewIconDangerDark
                : null,
        ]}
        title={translatedTitle}
      />
      <View style={styles.settingsOverviewCopy}>
        <View style={styles.settingsOverviewHeading}>
          <Text
            style={[
              styles.settingsOverviewTitle,
              darkMode ? styles.settingsOverviewTitleDark : null,
            ]}
          >
            {translatedTitle}
          </Text>
          <SettingsStatusPill
            label={t(badge)}
            tone={tone === "muted" ? "accent" : tone}
          />
        </View>
        <Text
          style={[
            styles.settingsOverviewDescription,
            darkMode ? styles.settingsOverviewDescriptionDark : null,
          ]}
        >
          {translatedDescription}
        </Text>
      </View>
      <MaterialCommunityIcons
        color={darkMode ? "#AFC0D2" : colors.textSecondary}
        name="chevron-right"
        size={18}
      />
    </Pressable>
  );
}

export function SettingsPrintRow({
  icon,
  title,
  subtitle,
  infoText,
  onPress,
  trailingIcon = "chevron-right",
  danger = false,
  darkMode = false,
  last = false,
  testID,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  infoText?: string;
  onPress?: () => void;
  trailingIcon?: IconName | null;
  danger?: boolean;
  darkMode?: boolean;
  last?: boolean;
  testID?: string;
}) {
  const { t } = useAppTranslation();
  const translatedTitle = t(title);
  const translatedInfoText = infoText ? t(infoText) : undefined;
  const iconColor = danger
    ? darkMode
      ? "#F5A3A3"
      : colors.danger
    : darkMode
      ? SETTINGS_DARK_ICON_COLOR
      : SETTINGS_ICON_COLOR;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.settingsPrintRow,
        darkMode ? styles.settingsPrintRowDark : null,
        danger ? styles.settingsPrintRowDanger : null,
        danger && darkMode ? styles.settingsPrintRowDangerDark : null,
        last ? styles.settingsPrintRowLast : null,
      ]}
      testID={testID}
    >
      {infoText ? (
        <SettingsInfoIcon
          description={translatedInfoText || infoText}
          icon={icon}
          iconColor={iconColor}
          iconSize={20}
          style={[
            styles.settingsPrintRowIconShell,
            darkMode ? styles.settingsPrintRowIconShellDark : null,
            danger ? styles.settingsPrintRowIconShellDanger : null,
            danger && darkMode
              ? styles.settingsPrintRowIconShellDangerDark
              : null,
          ]}
          title={translatedTitle}
        />
      ) : (
        <View
          style={[
            styles.settingsPrintRowIconShell,
            darkMode ? styles.settingsPrintRowIconShellDark : null,
            danger ? styles.settingsPrintRowIconShellDanger : null,
            danger && darkMode
              ? styles.settingsPrintRowIconShellDangerDark
              : null,
          ]}
        >
          <MaterialCommunityIcons
            color={iconColor}
            name={icon}
            size={20}
          />
        </View>
      )}
      <View style={styles.settingsPrintRowCopy}>
        <Text
          style={[
            styles.settingsPrintRowTitle,
            darkMode ? styles.settingsPrintRowTitleDark : null,
            danger ? styles.settingsPrintRowTitleDanger : null,
          ]}
        >
          {translatedTitle}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.settingsPrintRowSubtitle,
              darkMode ? styles.settingsPrintRowSubtitleDark : null,
            ]}
          >
            {t(subtitle)}
          </Text>
        ) : null}
      </View>
      {trailingIcon ? (
        <MaterialCommunityIcons
          color={
            danger ? colors.danger : darkMode ? "#AFC0D2" : colors.textSecondary
          }
          name={trailingIcon}
          size={20}
        />
      ) : null}
    </Pressable>
  );
}
