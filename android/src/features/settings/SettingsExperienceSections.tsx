import {
  ACCENT_OPTIONS,
  BATTERY_OPTIONS,
  DENSITY_OPTIONS,
  FONT_SIZE_OPTIONS,
  NOTIFICATION_SOUND_OPTIONS,
  THEME_OPTIONS,
} from "../InspectorMobileApp.constants";
import { colors } from "../../theme/tokens";
import {
  SettingsPressRow,
  SettingsSection,
  SettingsSegmentedRow,
  SettingsSwitchRow,
} from "./SettingsPrimitives";

type TemaApp = (typeof THEME_OPTIONS)[number];
type TamanhoFonte = (typeof FONT_SIZE_OPTIONS)[number];
type DensidadeInterface = (typeof DENSITY_OPTIONS)[number];
type CorDestaque = (typeof ACCENT_OPTIONS)[number];
type SomNotificacao = (typeof NOTIFICATION_SOUND_OPTIONS)[number];
type UsoBateria = (typeof BATTERY_OPTIONS)[number];

interface SettingsExperienceAppearanceSectionProps {
  temaApp: TemaApp;
  tamanhoFonte: TamanhoFonte;
  densidadeInterface: DensidadeInterface;
  corDestaque: CorDestaque;
  animacoesAtivas: boolean;
  economiaDados: boolean;
  usoBateria: UsoBateria;
  onSetTemaApp: (value: TemaApp) => void;
  onSetTamanhoFonte: (value: TamanhoFonte) => void;
  onSetDensidadeInterface: (value: DensidadeInterface) => void;
  onSetCorDestaque: (value: CorDestaque) => void;
  onSetAnimacoesAtivas: (value: boolean) => void;
  onSetEconomiaDados: (value: boolean) => void;
  onSetUsoBateria: (value: UsoBateria) => void;
}

interface SettingsExperienceNotificationsSectionProps {
  notificaRespostas: boolean;
  notificaPush: boolean;
  notificacoesPermitidas: boolean;
  somNotificacao: SomNotificacao;
  vibracaoAtiva: boolean;
  emailsAtivos: boolean;
  chatCategoryEnabled: boolean;
  mesaCategoryEnabled: boolean;
  showMesaCategory?: boolean;
  systemCategoryEnabled: boolean;
  criticalAlertsEnabled: boolean;
  onSetNotificaRespostas: (value: boolean) => void;
  onToggleNotificaPush: (value: boolean) => void;
  onSetSomNotificacao: (value: SomNotificacao) => void;
  onToggleVibracao: (value: boolean) => void;
  onSetEmailsAtivos: (value: boolean) => void;
  onSetChatCategoryEnabled: (value: boolean) => void;
  onSetMesaCategoryEnabled: (value: boolean) => void;
  onSetSystemCategoryEnabled: (value: boolean) => void;
  onSetCriticalAlertsEnabled: (value: boolean) => void;
  onAbrirPermissaoNotificacoes: () => void;
}

function accentOptionLabel(option: CorDestaque): string {
  return option === "padrão" ? "Padrão" : option;
}

function accentOptionColor(option: CorDestaque): string {
  if (option === "azul") {
    return "#3366FF";
  }
  if (option === "laranja") {
    return colors.accent;
  }
  if (option === "roxo") {
    return "#7C4DFF";
  }
  return colors.ink900;
}

function nextOptionValue<T extends string>(
  current: T,
  options: readonly T[],
): T {
  const currentIndex = options.indexOf(current);
  if (currentIndex === -1) {
    return options[0];
  }
  return options[(currentIndex + 1) % options.length];
}

export function SettingsExperienceAppearanceSection({
  temaApp,
  tamanhoFonte,
  densidadeInterface,
  corDestaque,
  animacoesAtivas,
  economiaDados,
  usoBateria,
  onSetTemaApp,
  onSetTamanhoFonte,
  onSetDensidadeInterface,
  onSetCorDestaque,
  onSetAnimacoesAtivas,
  onSetEconomiaDados,
  onSetUsoBateria,
}: SettingsExperienceAppearanceSectionProps) {
  return (
    <SettingsSection
      icon="palette-outline"
      subtitle="Visual, densidade, internet e bateria."
      testID="settings-section-aparencia"
      title="Aparência"
    >
      <SettingsSegmentedRow
        icon="theme-light-dark"
        onChange={onSetTemaApp}
        options={THEME_OPTIONS}
        testID="settings-appearance-theme-row"
        title="Tema"
        value={temaApp}
      />
      <SettingsSegmentedRow
        icon="format-size"
        onChange={onSetTamanhoFonte}
        options={FONT_SIZE_OPTIONS}
        testID="settings-appearance-font-row"
        title="Tamanho da fonte"
        value={tamanhoFonte}
      />
      <SettingsSegmentedRow
        icon="view-compact-outline"
        onChange={onSetDensidadeInterface}
        options={DENSITY_OPTIONS}
        testID="settings-appearance-density-row"
        title="Densidade da interface"
        value={densidadeInterface}
      />
      <SettingsSegmentedRow
        activeColor={accentOptionColor(corDestaque)}
        description="Padrão usa o neutro preto e branco atual; as outras cores são personalização visual do layout."
        getOptionLabel={accentOptionLabel}
        icon="eyedropper-variant"
        onChange={onSetCorDestaque}
        options={ACCENT_OPTIONS}
        testID="settings-appearance-accent-row"
        title="Cor de destaque"
        value={corDestaque}
      />
      <SettingsSwitchRow
        icon="motion-outline"
        onValueChange={onSetAnimacoesAtivas}
        testID="settings-appearance-animations-row"
        title="Animações"
        value={animacoesAtivas}
      />
      <SettingsSwitchRow
        description="Reduz uso de internet quando possível, principalmente fora do Wi-Fi."
        icon="signal-cellular-outline"
        onValueChange={onSetEconomiaDados}
        testID="settings-preferences-data-saver-row"
        title="Economia de dados"
        value={economiaDados}
      />
      <SettingsPressRow
        description="Ajusta como o app equilibra funcionamento em segundo plano e consumo de bateria."
        icon="battery-heart-variant"
        onPress={() =>
          onSetUsoBateria(nextOptionValue(usoBateria, BATTERY_OPTIONS))
        }
        testID="settings-preferences-battery-row"
        title="Uso de bateria"
        value={usoBateria}
      />
    </SettingsSection>
  );
}

export function SettingsExperienceNotificationsSection({
  notificaRespostas,
  notificaPush,
  notificacoesPermitidas: _notificacoesPermitidas,
  somNotificacao: _somNotificacao,
  vibracaoAtiva: _vibracaoAtiva,
  emailsAtivos: _emailsAtivos,
  chatCategoryEnabled,
  mesaCategoryEnabled,
  showMesaCategory = true,
  systemCategoryEnabled,
  criticalAlertsEnabled,
  onSetNotificaRespostas,
  onToggleNotificaPush,
  onSetSomNotificacao: _onSetSomNotificacao,
  onToggleVibracao: _onToggleVibracao,
  onSetEmailsAtivos: _onSetEmailsAtivos,
  onSetChatCategoryEnabled,
  onSetMesaCategoryEnabled,
  onSetSystemCategoryEnabled,
  onSetCriticalAlertsEnabled,
  onAbrirPermissaoNotificacoes: _onAbrirPermissaoNotificacoes,
}: SettingsExperienceNotificationsSectionProps) {
  return (
    <SettingsSection
      icon="bell-outline"
      subtitle="Como o usuário recebe alertas e avisos do app."
      title="Notificações"
    >
      <SettingsSwitchRow
        icon="message-badge-outline"
        onValueChange={onSetNotificaRespostas}
        title="Notificações de respostas"
        value={notificaRespostas}
      />
      <SettingsSwitchRow
        icon="bell-badge-outline"
        onValueChange={onToggleNotificaPush}
        title="Notificações push"
        value={notificaPush}
      />
      <SettingsSwitchRow
        icon="chat-processing-outline"
        onValueChange={onSetChatCategoryEnabled}
        title="Categoria Chat"
        value={chatCategoryEnabled}
      />
      {showMesaCategory ? (
        <SettingsSwitchRow
          icon="clipboard-text-outline"
          onValueChange={onSetMesaCategoryEnabled}
          title="Categoria Mesa"
          value={mesaCategoryEnabled}
        />
      ) : null}
      <SettingsSwitchRow
        icon="application-cog-outline"
        onValueChange={onSetSystemCategoryEnabled}
        title="Categoria Sistema"
        value={systemCategoryEnabled}
      />
      <SettingsSwitchRow
        icon="alert-decagram-outline"
        onValueChange={onSetCriticalAlertsEnabled}
        title="Alertas críticos"
        value={criticalAlertsEnabled}
      />
    </SettingsSection>
  );
}
