import type { AuthenticatedLayoutInput } from "./inspectorUiBuilderTypes";
import { buildThreadHeaderControlsProps } from "./buildAuthenticatedLayoutSections";

function buildHeaderInput(
  conversaAtiva: AuthenticatedLayoutInput["conversaAtiva"],
): AuthenticatedLayoutInput {
  return {
    accentColor: "#0f172a",
    conversaAtiva,
    densityScale: 1,
    filaOfflineOrdenada: [],
    fontScale: 1,
    handleAbrirConfiguracoes: jest.fn(),
    handleAbrirHistorico: jest.fn(),
    handleAbrirNovoChat: jest.fn(),
    headerSafeTopInset: 0,
    keyboardVisible: false,
    mesaAcessoPermitido: true,
    notificacoesMesaLaudoAtual: 0,
    notificacoesNaoLidas: 0,
    setAbaAtiva: jest.fn(),
    settingsPrintDarkMode: false,
    vendoFinalizacao: false,
    vendoMesa: false,
  } as unknown as AuthenticatedLayoutInput;
}

describe("buildThreadHeaderControlsProps", () => {
  it("não mostra Finalizar para relatório criado no chat livre", () => {
    const props = buildThreadHeaderControlsProps(
      buildHeaderInput({
        laudoId: 44,
        estado: "relatorio_ativo",
        statusCard: "aberto",
        permiteEdicao: true,
        permiteReabrir: false,
        laudoCard: {
          case_workflow_mode: "analise_livre",
          entry_mode_effective: "chat_first",
        } as never,
        caseLifecycleStatus: "emitido",
        caseWorkflowMode: "analise_livre",
        entryModeEffective: "chat_first",
        allowedSurfaceActions: ["chat_finalize"],
        modo: "detalhado",
        mensagens: [],
      }),
    );

    expect(props.chatHasActiveCase).toBe(true);
    expect(props.finalizacaoDisponivel).toBe(false);
  });

  it("mantém Finalizar disponível no chat guiado formal", () => {
    const props = buildThreadHeaderControlsProps(
      buildHeaderInput({
        laudoId: 45,
        estado: "relatorio_ativo",
        statusCard: "aberto",
        permiteEdicao: true,
        permiteReabrir: false,
        laudoCard: {
          case_workflow_mode: "laudo_guiado",
          entry_mode_effective: "chat_first",
        } as never,
        caseLifecycleStatus: "emitido",
        caseWorkflowMode: "laudo_guiado",
        entryModeEffective: "chat_first",
        allowedSurfaceActions: ["chat_finalize"],
        modo: "detalhado",
        mensagens: [],
      }),
    );

    expect(props.finalizacaoDisponivel).toBe(true);
  });
});
