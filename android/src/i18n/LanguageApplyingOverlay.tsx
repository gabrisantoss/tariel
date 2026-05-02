import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme/tokens";
import { useSettingsStoreContext } from "../settings/store/SettingsStoreProvider";
import { useAppTranslation } from "./appTranslation";

export const LANGUAGE_APPLYING_DURATION_MS = 3000;

export function LanguageApplyingOverlay() {
  const { hydrated, state } = useSettingsStoreContext();
  const { t } = useAppTranslation();
  const [visible, setVisible] = useState(false);
  const previousLanguageRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const currentLanguage = state.system.language;
    const previousLanguage = previousLanguageRef.current;

    if (previousLanguage === null) {
      previousLanguageRef.current = currentLanguage;
      return;
    }

    if (previousLanguage === currentLanguage) {
      return;
    }

    previousLanguageRef.current = currentLanguage;
    setVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, LANGUAGE_APPLYING_DURATION_MS);
  }, [hydrated, state.system.language]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop} testID="language-applying-overlay">
        <View style={styles.card}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.title}>{t("Aplicando linguagem...")}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: colors.overlayOpaque,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surfacePanel,
    borderColor: colors.surfaceStroke,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 280,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    width: "100%",
  },
  title: {
    ...typography.itemTitle,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
