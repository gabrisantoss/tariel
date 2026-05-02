import type { ComponentProps } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { SettingsSupportSection } from "./SettingsSystemSupportSections";
import { SettingsExperienceNotificationsSection } from "./SettingsExperienceSections";
import {
  SettingsSecurityDataConversationsSection,
  SettingsSecurityPermissionsSection,
} from "./SettingsSecurityDataPrivacySections";
import { SettingsPlanSheetContent } from "./SettingsSheetAccountContent";
import {
  SettingsFeedbackSheetContent,
  SettingsHelpSheetContent,
} from "./SettingsSheetSupportContent";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    MaterialCommunityIcons: ({
      name,
      ...props
    }: {
      name: string;
      [key: string]: unknown;
    }) => React.createElement("Text", props, name),
  };
});

function renderNotificationsSection(
  overrides: Partial<
    ComponentProps<typeof SettingsExperienceNotificationsSection>
  > = {},
) {
  const props: ComponentProps<typeof SettingsExperienceNotificationsSection> = {
    chatCategoryEnabled: true,
    criticalAlertsEnabled: true,
    emailsAtivos: true,
    mesaCategoryEnabled: true,
    notificaPush: true,
    notificaRespostas: true,
    notificacoesPermitidas: true,
    onAbrirPermissaoNotificacoes: jest.fn(),
    onSetChatCategoryEnabled: jest.fn(),
    onSetCriticalAlertsEnabled: jest.fn(),
    onSetEmailsAtivos: jest.fn(),
    onSetMesaCategoryEnabled: jest.fn(),
    onSetNotificaRespostas: jest.fn(),
    onSetSomNotificacao: jest.fn(),
    onSetSystemCategoryEnabled: jest.fn(),
    onToggleNotificaPush: jest.fn(),
    onToggleVibracao: jest.fn(),
    showMesaCategory: true,
    somNotificacao: "Ping",
    systemCategoryEnabled: true,
    vibracaoAtiva: true,
    ...overrides,
  };

  return render(<SettingsExperienceNotificationsSection {...props} />);
}

function renderDataControlsSection(
  overrides: Partial<
    ComponentProps<typeof SettingsSecurityDataConversationsSection>
  > = {},
) {
  const props: ComponentProps<typeof SettingsSecurityDataConversationsSection> =
    {
      analyticsOptIn: true,
      autoUploadAttachments: true,
      backupAutomatico: true,
      cacheStatusLabel: "32 MB",
      compartilharMelhoriaIa: true,
      conversasOcultasTotal: 0,
      crashReportsOptIn: true,
      limpandoCache: false,
      mediaCompression: "equilibrada",
      onAbrirMenuRetencaoDados: jest.fn(),
      onAbrirMenuSincronizacaoWifi: jest.fn(),
      onApagarHistoricoConfiguracoes: jest.fn(),
      onExportarDados: jest.fn(),
      onLimparCache: jest.fn(),
      onLimparTodasConversasConfig: jest.fn(),
      onSetAnalyticsOptIn: jest.fn(),
      onSetCompartilharMelhoriaIa: jest.fn(),
      onSetCrashReportsOptIn: jest.fn(),
      onSetMediaCompression: jest.fn(),
      onSetRetencaoDados: jest.fn(),
      onSetSalvarHistoricoConversas: jest.fn(),
      onSetWifiOnlySync: jest.fn(),
      onToggleAutoUploadAttachments: jest.fn(),
      onToggleBackupAutomatico: jest.fn(),
      onToggleSincronizacaoDispositivos: jest.fn(),
      retencaoDados: "90 dias",
      resumoDadosConversas: "Histórico ativo",
      salvarHistoricoConversas: true,
      sincronizacaoDispositivos: true,
      wifiOnlySync: false,
      ...overrides,
    };

  return render(<SettingsSecurityDataConversationsSection {...props} />);
}

describe("settings governance surfaces", () => {
  it("oculta a categoria Mesa quando o grant não existe", () => {
    const { getByText, queryByText } = renderNotificationsSection({
      showMesaCategory: false,
    });

    expect(getByText("Categoria Chat")).toBeTruthy();
    expect(getByText("Categoria Sistema")).toBeTruthy();
    expect(getByText("Alertas críticos")).toBeTruthy();
    expect(queryByText("Categoria Mesa")).toBeNull();
    expect(queryByText("Emails")).toBeNull();
    expect(queryByText("Permissão do sistema")).toBeNull();
    expect(queryByText("Som de notificação")).toBeNull();
    expect(queryByText("Vibração")).toBeNull();
  });

  it("mantém Permissões sem notificações nem revisão crítica", () => {
    const { getByText, queryByText } = render(
      <SettingsSecurityPermissionsSection
        arquivosPermitidos
        biometriaPermitida
        cameraPermitida
        microfonePermitido
        notificacoesPermitidas
        onAbrirAjustesDoSistema={jest.fn()}
        onGerenciarPermissao={jest.fn()}
        onRevisarPermissoesCriticas={jest.fn()}
        permissoesNegadasTotal={0}
        resumoPermissoes="Tudo liberado"
        resumoPermissoesCriticas="Tudo liberado"
      />,
    );

    expect(getByText("Abrir ajustes do sistema")).toBeTruthy();
    expect(queryByText("Revisar permissões críticas")).toBeNull();
    expect(queryByText("Notificações")).toBeNull();
  });

  it("organiza controles de dados em menus e remove fixar conversas", () => {
    const onAbrirMenuRetencaoDados = jest.fn();
    const onAbrirMenuSincronizacaoWifi = jest.fn();
    const { getByText, queryByText } = renderDataControlsSection({
      onAbrirMenuRetencaoDados,
      onAbrirMenuSincronizacaoWifi,
    });

    expect(getByText("Retenção de dados")).toBeTruthy();
    expect(getByText("Sincronização e Wi-Fi")).toBeTruthy();
    expect(getByText("Compressão de mídia")).toBeTruthy();
    expect(getByText("Apagar histórico")).toBeTruthy();
    expect(getByText("Excluir conversas")).toBeTruthy();
    expect(queryByText("Fixar conversas")).toBeNull();
    expect(queryByText("Gerenciar conversas individualmente")).toBeNull();
    expect(queryByText("Backup automático")).toBeNull();
    expect(queryByText("Nível de compressão")).toBeNull();

    fireEvent.press(getByText("Retenção de dados"));
    expect(onAbrirMenuRetencaoDados).toHaveBeenCalledTimes(1);
    expect(queryByText("Prazo de retenção")).toBeNull();

    fireEvent.press(getByText("Sincronização e Wi-Fi"));
    expect(onAbrirMenuSincronizacaoWifi).toHaveBeenCalledTimes(1);
    expect(queryByText("Backup automático")).toBeNull();

    fireEvent.press(getByText("Compressão de mídia"));
    expect(getByText("Nível de compressão")).toBeTruthy();
    expect(getByText("Equilibrada")).toBeTruthy();
    expect(getByText("Leve")).toBeTruthy();
    expect(getByText("Original")).toBeTruthy();
    expect(getByText("Forte")).toBeTruthy();
  });

  it("mostra acesso governado e operação ativa no sheet de plano", () => {
    const onAbrirPortalContinuation = jest.fn();
    const { getByText } = render(
      <SettingsPlanSheetContent
        identityRuntimeNote="A conta principal do tenant pode receber multiplas superficies conforme o cadastro definido no Admin-CEO."
        onAbrirPortalContinuation={onAbrirPortalContinuation}
        planoAtual="Plus"
        portalContinuationLinks={[
          {
            label: "Mesa Avaliadora",
            url: "https://tariel-web-free.onrender.com/revisao/painel",
            destinationPath: "/revisao/painel",
          },
        ]}
        resumoContaAcesso="Empresa #7 • Inspetor web/mobile + Admin-Cliente"
        resumoOperacaoApp="Admin-Cliente da empresa, chat do inspetor, histórico, fila offline e configurações do app."
      />,
    );

    expect(getByText("Acesso governado")).toBeTruthy();
    expect(
      getByText("Empresa #7 • Inspetor web/mobile + Admin-Cliente"),
    ).toBeTruthy();
    expect(
      getByText(
        "Admin-Cliente da empresa, chat do inspetor, histórico, fila offline e configurações do app.",
      ),
    ).toBeTruthy();
    expect(getByText("Runtime de identidade")).toBeTruthy();
    expect(
      getByText("Continuidade web disponível em /revisao/painel."),
    ).toBeTruthy();
  });

  it("usa o contexto real de grants nas folhas de ajuda e feedback", () => {
    const help = render(
      <SettingsHelpSheetContent
        artigoAjudaExpandidoId=""
        artigosAjudaFiltrados={[]}
        buscaAjuda=""
        emailAtualConta="conta@tariel.test"
        emailLogin="inspetor@tariel.test"
        formatarHorarioAtividade={() => "agora"}
        onAlternarArtigoAjuda={jest.fn()}
        onBuscaAjudaChange={jest.fn()}
        resumoAtualizacaoApp="Atualizado"
        resumoContaAcesso="Empresa #7 • Inspetor web/mobile + Mesa Avaliadora"
        resumoFilaSuporteLocal="Sem pendências"
        resumoOperacaoApp="chat do inspetor, mesa avaliadora, histórico, fila offline e configurações do app."
        resumoSuporteApp="Preview"
        topicosAjudaResumo="inspeção, mesa, offline e segurança"
        ultimoTicketSuporte={null}
      />,
    );

    expect(
      help.getByPlaceholderText(
        "Buscar por inspeção, mesa, offline e segurança...",
      ),
    ).toBeTruthy();
    expect(help.getByText("Escopo do acesso")).toBeTruthy();
    expect(
      help.getByText("Empresa #7 • Inspetor web/mobile + Mesa Avaliadora"),
    ).toBeTruthy();

    const feedback = render(
      <SettingsFeedbackSheetContent
        feedbackDraft=""
        formatarHorarioAtividade={() => "agora"}
        onFeedbackDraftChange={jest.fn()}
        resumoContaAcesso="Empresa #7 • Inspetor web/mobile + Mesa Avaliadora"
        resumoFilaSuporteLocal="Sem pendências"
        resumoOperacaoApp="chat do inspetor, mesa avaliadora, histórico, fila offline e configurações do app."
        ultimoTicketSuporte={null}
      />,
    );

    expect(
      feedback.getByText(
        "chat do inspetor, mesa avaliadora, histórico, fila offline e configurações do app.",
      ),
    ).toBeTruthy();
    expect(
      feedback.getByText("Empresa #7 • Inspetor web/mobile + Mesa Avaliadora"),
    ).toBeTruthy();
  });

  it("usa chamadas de acao mais diretas na secao de suporte quando a fila ainda esta vazia", () => {
    const support = render(
      <SettingsSupportSection
        artigosAjudaCount={4}
        emailRetorno="inspetor@tariel.test"
        filaSuporteCount={0}
        onCanalSuporte={jest.fn()}
        onCentralAjuda={jest.fn()}
        onEnviarFeedback={jest.fn()}
        onExportarDiagnosticoApp={jest.fn()}
        onLicencas={jest.fn()}
        onLimparFilaSuporteLocal={jest.fn()}
        onPoliticaPrivacidade={jest.fn()}
        onReportarProblema={jest.fn()}
        onSobreApp={jest.fn()}
        onTermosUso={jest.fn()}
        planoResumoConfiguracao="Plano Pro"
        resumoFilaSuporteLocal="Nenhum relato local"
        resumoSuporteApp="Preview"
        supportChannelLabel="WhatsApp"
        ticketsBugTotal={0}
        ticketsFeedbackTotal={0}
        ultimoTicketSuporte={null}
      />,
    );

    expect(support.getByText("Abrir formulário")).toBeTruthy();
    expect(support.getByText("Enviar ideia")).toBeTruthy();
    expect(support.queryByText("Documentos do app")).toBeNull();
    expect(support.queryByText("Termos de uso")).toBeNull();
    expect(support.queryByText("Política de privacidade")).toBeNull();
    expect(support.queryByText("Licenças")).toBeNull();
  });
});
