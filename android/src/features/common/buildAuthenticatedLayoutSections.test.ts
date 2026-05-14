import type { AuthenticatedLayoutInput } from "./inspectorUiBuilderTypes";
import {
  buildThreadConversationPaneProps,
  buildThreadHeaderControlsProps,
} from "./buildAuthenticatedLayoutSections";

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
    expect("finalizacaoDisponivel" in props).toBe(false);
    expect("onOpenFinalizarTab" in props).toBe(false);
  });

  it("não expõe Finalizar mesmo no chat guiado formal", () => {
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

    expect(props.chatHasActiveCase).toBe(true);
    expect("finalizacaoDisponivel" in props).toBe(false);
    expect("onOpenFinalizarTab" in props).toBe(false);
  });

  it("não usa composer para corrigir PDF do chat livre", async () => {
    const setAbaAtiva = jest.fn();
    const setMensagem = jest.fn();
    const handleRecarregarConversaAtiva = jest
      .fn()
      .mockResolvedValue(undefined);
    const props = buildThreadConversationPaneProps({
      ...buildHeaderInput({
        laudoId: 44,
        estado: "relatorio_ativo",
        statusCard: "aberto",
        permiteEdicao: true,
        permiteReabrir: false,
        laudoCard: {
          case_workflow_mode: "analise_livre",
          entry_mode_effective: "chat_first",
        } as never,
        caseWorkflowMode: "analise_livre",
        entryModeEffective: "chat_first",
        modo: "detalhado",
        mensagens: [],
      }),
      abrirReferenciaNoChat: jest.fn(),
      anexoAbrindoChave: "",
      carregandoConversa: false,
      carregandoMesa: false,
      chaveAnexo: jest.fn(),
      conversaVazia: false,
      definirReferenciaMesaAtiva: jest.fn(),
      dynamicMessageBubbleStyle: null,
      dynamicMessageTextStyle: null,
      enviandoMensagem: false,
      enviandoMesa: false,
      handleAbrirAnexo: jest.fn(),
      handleAbrirQualityGate: jest.fn(),
      handleExecutarComandoRevisaoMobile: jest.fn(),
      handleRecarregarConversaAtiva,
      handleUsarPerguntaPreLaudo: jest.fn(),
      mensagensMesa: [],
      mensagensVisiveis: [],
      nomeUsuarioExibicao: "Inspetor",
      obterResumoReferenciaMensagem: jest.fn(),
      registrarLayoutMensagemChat: jest.fn(),
      scrollRef: { current: null },
      sessionAccessToken: "token",
      setAbaAtiva,
      setMensagem,
      threadKeyboardPaddingBottom: 0,
    } as unknown as AuthenticatedLayoutInput);

    props.onCorrigirDocumentoChatLivre?.(
      {
        nome_original: "relatorio_chat_livre_v2.pdf",
        mime_type: "application/pdf",
      },
      "Versão 2",
    );

    expect(setAbaAtiva).not.toHaveBeenCalled();
    expect(setMensagem).not.toHaveBeenCalled();

    await props.onDocumentoChatLivreGerado?.();
    expect(handleRecarregarConversaAtiva).toHaveBeenCalledTimes(1);
  });
});
