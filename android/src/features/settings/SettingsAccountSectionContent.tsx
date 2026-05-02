import { SettingsPressRow, SettingsSection } from "./SettingsPrimitives";

interface SettingsAccountSectionContentProps {
  perfilNomeCompleto: string;
  perfilExibicaoLabel: string;
  provedorPrimario: string;
  contaEmailLabel: string;
  contaTelefoneLabel: string;
  onEditarPerfil: () => void;
  onAlterarEmail: () => void;
  onAlterarSenha: () => void;
}

export function SettingsAccountSectionContent({
  perfilNomeCompleto,
  perfilExibicaoLabel,
  provedorPrimario,
  contaEmailLabel,
  contaTelefoneLabel,
  onEditarPerfil,
  onAlterarEmail,
  onAlterarSenha,
}: SettingsAccountSectionContentProps) {
  const personalInfoValue =
    perfilExibicaoLabel || perfilNomeCompleto || contaTelefoneLabel || "Editar";

  return (
    <SettingsSection
      icon="account-circle-outline"
      subtitle="Perfil autenticado, email, telefone e senha do inspetor."
      testID="settings-section-conta"
      title="Conta"
    >
      <SettingsPressRow
        description="Edite nome completo, nome de exibição e telefone em um único fluxo."
        icon="account-outline"
        onPress={onEditarPerfil}
        testID="settings-account-personal-info-row"
        title="Informações pessoais"
        value={personalInfoValue}
      />
      <SettingsPressRow
        description="Email principal usado no acesso e no retorno de suporte."
        icon="email-outline"
        onPress={onAlterarEmail}
        testID="settings-account-email-row"
        title="Alterar e-mail"
        value={contaEmailLabel}
      />
      <SettingsPressRow
        description="Método principal de autenticação e alteração de senha no mesmo fluxo."
        icon="shield-key-outline"
        onPress={onAlterarSenha}
        testID="settings-account-access-password-row"
        title="Alterar Senha"
        value={provedorPrimario}
      />
    </SettingsSection>
  );
}
