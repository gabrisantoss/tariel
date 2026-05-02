import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Switch, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { useAppTranslation } from "../../i18n/appTranslation";
import { DATA_RETENTION_OPTIONS } from "../InspectorMobileApp.constants";
import { styles } from "../InspectorMobileApp.styles";
import { SettingsInfoButton } from "./SettingsPrimitives";

type DataRetention = (typeof DATA_RETENTION_OPTIONS)[number];

const DATA_RETENTION_DETAILS: Record<DataRetention, { subtitle: string }> = {
  "30 dias": {
    subtitle: "Mantém apenas histórico recente no dispositivo.",
  },
  "90 dias": {
    subtitle: "Equilibra contexto de trabalho e limpeza periódica.",
  },
  "1 ano": {
    subtitle: "Preserva conversas por mais tempo para auditoria.",
  },
  "Até excluir": {
    subtitle: "Mantém o histórico salvo até uma limpeza manual.",
  },
};

function optionTestId(prefix: string, value: string): string {
  return `${prefix}-${value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export function SettingsDataRetentionSheetContent({
  retencaoDados,
  onSelecionarRetencaoDados,
}: {
  retencaoDados: DataRetention;
  onSelecionarRetencaoDados: (value: DataRetention) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View style={styles.settingsMiniList}>
      {DATA_RETENTION_OPTIONS.map((option) => {
        const ativo = option === retencaoDados;
        const itemTestId = optionTestId(
          "settings-data-retention-option",
          option,
        );
        return (
          <Pressable
            key={option}
            onPress={() => onSelecionarRetencaoDados(option)}
            style={[
              styles.settingsMiniListItem,
              styles.settingsMiniListItemPressable,
              ativo ? styles.settingsMiniListItemActive : null,
            ]}
            testID={itemTestId}
          >
            <View style={styles.settingsMiniListItemHeader}>
              <Text
                style={[
                  styles.settingsMiniListTitle,
                  ativo ? styles.settingsMiniListTitleActive : null,
                ]}
              >
                {t(option)}
              </Text>
              <View style={styles.settingsMiniListActions}>
                <SettingsInfoButton
                  description={DATA_RETENTION_DETAILS[option].subtitle}
                  style={styles.settingsMiniListInfoButton}
                  testID={`${itemTestId}-info`}
                  title={option}
                />
                <View
                  style={[
                    styles.settingsMiniListSelectionBadge,
                    ativo ? styles.settingsMiniListSelectionBadgeActive : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={ativo ? colors.white : colors.textSecondary}
                    name={ativo ? "check" : "circle-outline"}
                    size={14}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.settingsMiniListMeta}>
              {t(DATA_RETENTION_DETAILS[option].subtitle)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsSyncSwitchItem({
  title,
  subtitle,
  value,
  onValueChange,
  testID,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID: string;
}) {
  const { t } = useAppTranslation();

  return (
    <View style={styles.settingsMiniListItem} testID={testID}>
      <View style={styles.settingsMiniListItemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsMiniListTitle}>{t(title)}</Text>
          <Text style={styles.settingsMiniListMeta}>{t(subtitle)}</Text>
        </View>
        <SettingsInfoButton
          description={subtitle}
          style={styles.settingsMiniListInfoButton}
          testID={`${testID}-info`}
          title={title}
        />
        <Switch
          ios_backgroundColor="#E8DDD1"
          onValueChange={onValueChange}
          thumbColor={colors.white}
          trackColor={{ false: "#DDD1C4", true: colors.ink700 }}
          value={value}
        />
      </View>
    </View>
  );
}

export function SettingsSyncWifiSheetContent({
  autoUploadAttachments,
  backupAutomatico,
  sincronizacaoDispositivos,
  wifiOnlySync,
  onSetWifiOnlySync,
  onToggleAutoUploadAttachments,
  onToggleBackupAutomatico,
  onToggleSincronizacaoDispositivos,
}: {
  autoUploadAttachments: boolean;
  backupAutomatico: boolean;
  sincronizacaoDispositivos: boolean;
  wifiOnlySync: boolean;
  onSetWifiOnlySync: (value: boolean) => void;
  onToggleAutoUploadAttachments: (value: boolean) => void;
  onToggleBackupAutomatico: (value: boolean) => void;
  onToggleSincronizacaoDispositivos: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingsMiniList}>
      <SettingsSyncSwitchItem
        onValueChange={onSetWifiOnlySync}
        subtitle="Restringe sincronizações de fila e atividade a conexões Wi-Fi."
        testID="settings-sync-wifi-only-option"
        title="Sincronizar só no Wi-Fi"
        value={wifiOnlySync}
      />
      <SettingsSyncSwitchItem
        onValueChange={onToggleBackupAutomatico}
        subtitle="Mantém cópias locais e cache operacional atualizados."
        testID="settings-sync-backup-option"
        title="Backup automático"
        value={backupAutomatico}
      />
      <SettingsSyncSwitchItem
        onValueChange={onToggleSincronizacaoDispositivos}
        subtitle="Sincroniza estado e pendências entre dispositivos da conta."
        testID="settings-sync-devices-option"
        title="Sincronização entre dispositivos"
        value={sincronizacaoDispositivos}
      />
      <SettingsSyncSwitchItem
        onValueChange={onToggleAutoUploadAttachments}
        subtitle="Envia anexos automaticamente quando a fila estiver pronta."
        testID="settings-sync-attachments-option"
        title="Upload automático de anexos"
        value={autoUploadAttachments}
      />
    </View>
  );
}
