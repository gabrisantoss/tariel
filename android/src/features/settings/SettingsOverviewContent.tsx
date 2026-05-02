import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { ProfileAvatarPicker } from "../../settings/components";
import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import { SettingsPrintRow, SettingsStatusPill } from "./SettingsPrimitives";
import { SettingsOverviewSystemSupportSection } from "./SettingsOverviewSystemSupportSection";
import type {
  SettingsDrawerPage,
  SettingsSectionKey,
} from "./settingsNavigationMeta";

interface SettingsOverviewContentProps {
  settingsPrintDarkMode: boolean;
  perfilFotoUri: string;
  iniciaisPerfilConfiguracao: string;
  nomeUsuarioExibicao: string;
  detalheGovernancaConfiguracao: string;
  workspaceResumoConfiguracao: string;
  planoResumoConfiguracao: string;
  contaEmailLabel: string;
  contaTelefoneLabel: string;
  reemissoesRecomendadasTotal: number;
  resumoGovernancaConfiguracao: string;
  temaResumoConfiguracao: string;
  corDestaqueResumoConfiguracao: string;
  estiloRespostaResumoConfiguracao: string;
  onUploadFotoPerfil: () => void;
  onAbrirPaginaConfiguracoes: (
    page: SettingsDrawerPage,
    section?: SettingsSectionKey | "all",
  ) => void;
  onReportarProblema: () => void;
  onAbrirCentralAtividade?: () => void;
  onFecharConfiguracoes: () => void;
  onLogout: () => void | Promise<void>;
}

export function SettingsOverviewContent({
  settingsPrintDarkMode,
  perfilFotoUri,
  iniciaisPerfilConfiguracao,
  nomeUsuarioExibicao,
  workspaceResumoConfiguracao,
  planoResumoConfiguracao,
  reemissoesRecomendadasTotal,
  resumoGovernancaConfiguracao,
  estiloRespostaResumoConfiguracao,
  onUploadFotoPerfil,
  onAbrirPaginaConfiguracoes,
  onAbrirCentralAtividade = () => undefined,
  onFecharConfiguracoes,
  onLogout,
}: SettingsOverviewContentProps) {
  const { t } = useAppTranslation();
  return (
    <View style={styles.settingsPrintOverview}>
      <View
        style={[
          styles.settingsSummaryCard,
          settingsPrintDarkMode ? styles.settingsSummaryCardDark : null,
        ]}
        testID="settings-overview-summary-card"
      >
        <Pressable
          accessibilityLabel={t("Central de atividade")}
          hitSlop={8}
          onPress={() => {
            onFecharConfiguracoes();
            onAbrirCentralAtividade();
          }}
          style={[
            styles.settingsSummaryActivityButton,
            settingsPrintDarkMode
              ? styles.settingsSummaryActivityButtonDark
              : null,
          ]}
          testID="settings-overview-activity-button"
        >
          <MaterialCommunityIcons
            color={settingsPrintDarkMode ? "#D8E3EE" : colors.ink700}
            name="bell-outline"
            size={15}
          />
        </Pressable>
        <View style={styles.settingsSummaryTop}>
          <ProfileAvatarPicker
            darkMode={settingsPrintDarkMode}
            fallbackLabel={iniciaisPerfilConfiguracao}
            onPress={onUploadFotoPerfil}
            photoUri={perfilFotoUri}
            testID="settings-overview-profile-photo"
          />
          <View style={styles.settingsSummaryCopy}>
            <Text
              style={[
                styles.settingsSummaryEyebrow,
                settingsPrintDarkMode
                  ? styles.settingsSummaryEyebrowDark
                  : null,
              ]}
            >
              {t("Perfil")}
            </Text>
            <Text
              style={[
                styles.settingsSummaryName,
                settingsPrintDarkMode ? styles.settingsSummaryNameDark : null,
              ]}
            >
              {nomeUsuarioExibicao}
            </Text>
            <Text
              style={[
                styles.settingsSummaryMeta,
                settingsPrintDarkMode ? styles.settingsSummaryMetaDark : null,
              ]}
            >
              {workspaceResumoConfiguracao}
            </Text>
          </View>
        </View>
        <View style={styles.settingsSummaryChips}>
          <SettingsStatusPill
            label={planoResumoConfiguracao || "Plano não informado"}
            tone="accent"
          />
          <SettingsStatusPill
            label={`Estilo da resposta: ${estiloRespostaResumoConfiguracao}`}
          />
          <SettingsStatusPill
            label={
              reemissoesRecomendadasTotal
                ? resumoGovernancaConfiguracao
                : "Sem pendências"
            }
            icon={
              reemissoesRecomendadasTotal
                ? "alert-outline"
                : "check-circle-outline"
            }
            iconOnly
            tone={reemissoesRecomendadasTotal ? "danger" : "success"}
          />
        </View>
      </View>

      <View style={styles.settingsPrintSectionBlock}>
        <Text
          style={[
            styles.settingsPrintSectionTitle,
            settingsPrintDarkMode ? styles.settingsPrintSectionTitleDark : null,
          ]}
        >
          {t("Configurações principais")}
        </Text>
        <View
          style={[
            styles.settingsPrintGroupCard,
            settingsPrintDarkMode ? styles.settingsPrintGroupCardDark : null,
          ]}
        >
          <SettingsPrintRow
            darkMode={settingsPrintDarkMode}
            icon="account-circle-outline"
            infoText="Nome, telefone, e-mail, senha e dados principais da conta."
            onPress={() => onAbrirPaginaConfiguracoes("contaAcesso")}
            subtitle="Nome, contato e acesso principal."
            testID="settings-overview-account-card"
            title="Conta e acesso"
          />
          <SettingsPrintRow
            darkMode={settingsPrintDarkMode}
            icon="tune-variant"
            infoText="Modelo da IA, voz, aparência, internet, bateria e notificações."
            onPress={() => onAbrirPaginaConfiguracoes("experiencia")}
            subtitle="IA, voz, aparência e avisos."
            testID="settings-overview-experience-card"
            title="Preferências"
          />
          <SettingsPrintRow
            darkMode={settingsPrintDarkMode}
            icon="shield-outline"
            infoText="Permissões, histórico, proteção local e controles de privacidade."
            last
            onPress={() => onAbrirPaginaConfiguracoes("seguranca")}
            subtitle={
              reemissoesRecomendadasTotal
                ? resumoGovernancaConfiguracao
                : "Permissões, histórico e proteção local."
            }
            testID="settings-overview-security-card"
            title="Segurança e privacidade"
          />
        </View>
      </View>

      <SettingsOverviewSystemSupportSection
        onAbrirPaginaConfiguracoes={onAbrirPaginaConfiguracoes}
        settingsPrintDarkMode={settingsPrintDarkMode}
      />

      <View style={styles.settingsPrintSectionBlock}>
        <View
          style={[
            styles.settingsPrintGroupCard,
            settingsPrintDarkMode ? styles.settingsPrintGroupCardDark : null,
          ]}
        >
          <SettingsPrintRow
            danger
            darkMode={settingsPrintDarkMode}
            icon="logout-variant"
            last
            onPress={() => {
              onFecharConfiguracoes();
              void onLogout();
            }}
            testID="settings-print-sair-row"
            title="Sair"
            trailingIcon={null}
          />
        </View>
      </View>
    </View>
  );
}
