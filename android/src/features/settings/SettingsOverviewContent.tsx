import { Text, View } from "react-native";

import { ProfileAvatarPicker } from "../../settings/components";
import { useAppTranslation } from "../../i18n/appTranslation";
import { styles } from "../InspectorMobileApp.styles";
import {
  SettingsOverviewCard,
  SettingsPrintRow,
  SettingsStatusPill,
} from "./SettingsPrimitives";
import { SettingsOverviewQuickActionsSection } from "./SettingsOverviewQuickActionsSection";
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
  onFecharConfiguracoes: () => void;
  onLogout: () => void | Promise<void>;
}

export function SettingsOverviewContent({
  settingsPrintDarkMode,
  perfilFotoUri,
  iniciaisPerfilConfiguracao,
  nomeUsuarioExibicao,
  detalheGovernancaConfiguracao,
  workspaceResumoConfiguracao,
  planoResumoConfiguracao,
  reemissoesRecomendadasTotal,
  resumoGovernancaConfiguracao,
  temaResumoConfiguracao,
  corDestaqueResumoConfiguracao,
  estiloRespostaResumoConfiguracao,
  onUploadFotoPerfil,
  onAbrirPaginaConfiguracoes,
  onReportarProblema,
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

      <View style={styles.settingsOverviewGrid}>
        <SettingsOverviewCard
          badge="Conta"
          darkMode={settingsPrintDarkMode}
          description="Nome, contato e acesso principal."
          icon="account-circle-outline"
          onPress={() => onAbrirPaginaConfiguracoes("contaAcesso")}
          testID="settings-overview-account-card"
          title="Conta e acesso"
          tone="accent"
        />
        <SettingsOverviewCard
          badge="App"
          darkMode={settingsPrintDarkMode}
          description="IA, aparência e notificações."
          icon="tune-variant"
          onPress={() => onAbrirPaginaConfiguracoes("experiencia")}
          testID="settings-overview-experience-card"
          title="Preferências"
        />
        <SettingsOverviewCard
          badge="Revisar"
          darkMode={settingsPrintDarkMode}
          description={
            reemissoesRecomendadasTotal
              ? detalheGovernancaConfiguracao
              : "Permissões, histórico e proteção local."
          }
          icon="shield-outline"
          onPress={() => onAbrirPaginaConfiguracoes("seguranca")}
          testID="settings-overview-security-card"
          title="Segurança e privacidade"
          tone="danger"
        />
      </View>

      <SettingsOverviewQuickActionsSection
        corDestaqueResumoConfiguracao={corDestaqueResumoConfiguracao}
        reemissoesRecomendadasTotal={reemissoesRecomendadasTotal}
        resumoGovernancaConfiguracao={resumoGovernancaConfiguracao}
        onAbrirPaginaConfiguracoes={onAbrirPaginaConfiguracoes}
        settingsPrintDarkMode={settingsPrintDarkMode}
        temaResumoConfiguracao={temaResumoConfiguracao}
        workspaceResumoConfiguracao={workspaceResumoConfiguracao}
      />

      <SettingsOverviewSystemSupportSection
        onAbrirPaginaConfiguracoes={onAbrirPaginaConfiguracoes}
        onReportarProblema={onReportarProblema}
        planoResumoConfiguracao={planoResumoConfiguracao}
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
