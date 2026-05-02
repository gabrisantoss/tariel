import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { useAppTranslation } from "../../i18n/appTranslation";
import { styles } from "../InspectorMobileApp.styles";

interface SettingsDrawerHeaderProps {
  settingsDrawerInOverview: boolean;
  settingsPrintDarkMode: boolean;
  settingsDrawerTitle: string;
  settingsDrawerSubtitle: string;
  onCloseOrBackPress: () => void;
}

export function SettingsDrawerHeader({
  settingsDrawerInOverview,
  settingsPrintDarkMode,
  settingsDrawerTitle,
  settingsDrawerSubtitle,
  onCloseOrBackPress,
}: SettingsDrawerHeaderProps) {
  const { t } = useAppTranslation();
  const headerTitle = settingsDrawerInOverview
    ? "Configurações"
    : settingsDrawerTitle;
  const headerSubtitle = settingsDrawerInOverview
    ? ""
    : settingsDrawerSubtitle;
  const darkHeader = settingsPrintDarkMode;

  return (
    <View style={styles.sidePanelHeader}>
      <View style={styles.sidePanelCopy}>
        <Text
          style={[
            styles.sidePanelTitle,
            settingsDrawerInOverview ? styles.sidePanelTitlePrint : null,
            darkHeader ? styles.sidePanelTitlePrintDark : null,
          ]}
        >
          {t(headerTitle)}
        </Text>
        {headerSubtitle ? (
          <Text
            style={[
              styles.sidePanelDescription,
              settingsDrawerInOverview
                ? styles.sidePanelDescriptionPrint
                : null,
              darkHeader ? styles.sidePanelDescriptionPrintDark : null,
            ]}
          >
            {t(headerSubtitle)}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onCloseOrBackPress}
        style={[
          styles.sidePanelCloseButton,
          settingsDrawerInOverview ? styles.sidePanelCloseButtonPrint : null,
          darkHeader ? styles.sidePanelCloseButtonPrintDark : null,
        ]}
        testID={
          settingsDrawerInOverview
            ? "close-settings-drawer-button"
            : "settings-drawer-back-button"
        }
      >
        <MaterialCommunityIcons
          name={settingsDrawerInOverview ? "close" : "chevron-left"}
          size={22}
          color={darkHeader ? "#F0F4F8" : colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}
