import { Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import { styles } from "../InspectorMobileApp.styles";
import { SettingsStatusPill } from "./SettingsPrimitives";

interface SettingsOverviewNowCardProps {
  contaEmailLabel: string;
  contaTelefoneLabel: string;
  detalheGovernancaConfiguracao: string;
  planoResumoConfiguracao: string;
  reemissoesRecomendadasTotal: number;
  resumoGovernancaConfiguracao: string;
  temaResumoConfiguracao: string;
  workspaceResumoConfiguracao: string;
}

export function SettingsOverviewNowCard({
  contaEmailLabel,
  contaTelefoneLabel,
  detalheGovernancaConfiguracao,
  planoResumoConfiguracao,
  reemissoesRecomendadasTotal,
  resumoGovernancaConfiguracao,
  temaResumoConfiguracao,
  workspaceResumoConfiguracao,
}: SettingsOverviewNowCardProps) {
  const { t } = useAppTranslation();
  return (
    <View
      style={styles.settingsInfoCard}
      testID="settings-overview-contact-card"
    >
      <Text style={styles.settingsInfoTitle}>{t("Agora no app")}</Text>
      <Text style={styles.settingsInfoText}>
        {t(
          "Resumo do workspace, do plano ativo e dos canais principais desta conta.",
        )}
      </Text>
      <View style={styles.settingsSummaryChips}>
        <SettingsStatusPill label="Conta ativa" />
        <SettingsStatusPill
          label={planoResumoConfiguracao || "Plano não informado"}
          tone="accent"
        />
        <SettingsStatusPill label={`Tema ${temaResumoConfiguracao}`} />
        <SettingsStatusPill
          label={
            reemissoesRecomendadasTotal
              ? resumoGovernancaConfiguracao
              : "Governança em dia"
          }
          tone={reemissoesRecomendadasTotal ? "danger" : "success"}
        />
      </View>
      <View style={styles.settingsInfoGrid}>
        <View
          style={[styles.settingsInfoCard, styles.settingsInfoGridItem]}
          testID="settings-overview-workspace"
        >
          <Text style={styles.settingsInfoSubtle}>{t("Workspace")}</Text>
          <Text style={styles.settingsInfoValue}>
            {workspaceResumoConfiguracao}
          </Text>
        </View>
        <View
          style={[styles.settingsInfoCard, styles.settingsInfoGridItem]}
          testID="settings-overview-plan"
        >
          <Text style={styles.settingsInfoSubtle}>{t("Plano")}</Text>
          <Text style={styles.settingsInfoValue}>
            {planoResumoConfiguracao || "Plano não informado"}
          </Text>
        </View>
        <View
          style={[styles.settingsInfoCard, styles.settingsInfoGridItem]}
          testID="settings-overview-contact-email"
        >
          <Text style={styles.settingsInfoSubtle}>{t("E-mail")}</Text>
          <Text style={styles.settingsInfoValue}>{contaEmailLabel}</Text>
        </View>
        <View
          style={[styles.settingsInfoCard, styles.settingsInfoGridItem]}
          testID="settings-overview-contact-phone"
        >
          <Text style={styles.settingsInfoSubtle}>{t("Telefone")}</Text>
          <Text style={styles.settingsInfoValue}>{contaTelefoneLabel}</Text>
        </View>
        <View
          style={[styles.settingsInfoCard, styles.settingsInfoGridItem]}
          testID="settings-overview-governance"
        >
          <Text style={styles.settingsInfoSubtle}>{t("Governança")}</Text>
          <Text style={styles.settingsInfoValue}>
            {detalheGovernancaConfiguracao}
          </Text>
        </View>
      </View>
    </View>
  );
}
