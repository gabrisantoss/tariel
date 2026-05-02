import { Text, View } from "react-native";

import { styles } from "../InspectorMobileApp.styles";
import { SettingsPrintRow } from "./SettingsPrimitives";
import type {
  SettingsDrawerPage,
  SettingsSectionKey,
} from "./settingsNavigationMeta";

interface SettingsOverviewSystemSupportSectionProps {
  onAbrirPaginaConfiguracoes: (
    page: SettingsDrawerPage,
    section?: SettingsSectionKey | "all",
  ) => void;
  settingsPrintDarkMode: boolean;
}

export function SettingsOverviewSystemSupportSection({
  onAbrirPaginaConfiguracoes,
  settingsPrintDarkMode,
}: SettingsOverviewSystemSupportSectionProps) {
  return (
    <View style={styles.settingsPrintSectionBlock}>
      <Text
        style={[
          styles.settingsPrintSectionTitle,
          settingsPrintDarkMode ? styles.settingsPrintSectionTitleDark : null,
        ]}
      >
        Ajuda e informações
      </Text>
      <View
        style={[
          styles.settingsPrintGroupCard,
          settingsPrintDarkMode ? styles.settingsPrintGroupCardDark : null,
        ]}
      >
        <SettingsPrintRow
          darkMode={settingsPrintDarkMode}
          icon="apps"
          infoText="Permissões, suporte e documentos do app."
          onPress={() => onAbrirPaginaConfiguracoes("sistemaSuporte")}
          testID="settings-print-aplicativos-row"
          title="Ajuda e informações"
        />
        <SettingsPrintRow
          darkMode={settingsPrintDarkMode}
          icon="database-cog-outline"
          infoText="Histórico, retenção, exportação e privacidade."
          onPress={() =>
            onAbrirPaginaConfiguracoes("seguranca", "dadosConversas")
          }
          testID="settings-print-data-controls-row"
          title="Controles de dados"
        />
        <SettingsPrintRow
          darkMode={settingsPrintDarkMode}
          icon="lifebuoy"
          infoText="Informar bug, falar com suporte, enviar feedback e exportar diagnóstico."
          onPress={() =>
            onAbrirPaginaConfiguracoes("sistemaSuporte", "suporte")
          }
          testID="settings-print-support-contact-row"
          title="Falar com o suporte"
        />
        <SettingsPrintRow
          darkMode={settingsPrintDarkMode}
          icon="information-outline"
          infoText="Versão, termos, privacidade e licenças."
          last
          onPress={() =>
            onAbrirPaginaConfiguracoes("sistemaSuporte", "sistema")
          }
          testID="settings-print-sobre-row"
          title="Sobre"
        />
      </View>
    </View>
  );
}
