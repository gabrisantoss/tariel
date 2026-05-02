import { act, renderHook } from "@testing-library/react-native";

import { useSettingsNavigation } from "./useSettingsNavigation";

describe("useSettingsNavigation", () => {
  it("controla historico de navegacao entre paginas e secoes", () => {
    const { result } = renderHook(() => useSettingsNavigation());

    act(() => {
      result.current.actions.handleAbrirPaginaConfiguracoes(
        "seguranca",
        "permissoes",
      );
    });

    act(() => {
      result.current.actions.handleAbrirSecaoConfiguracoes("dadosConversas");
    });

    expect(result.current.state.settingsDrawerPage).toBe("seguranca");
    expect(result.current.state.settingsDrawerSection).toBe("dadosConversas");

    act(() => {
      result.current.actions.handleVoltarResumoConfiguracoes();
    });

    expect(result.current.state.settingsDrawerPage).toBe("seguranca");
    expect(result.current.state.settingsDrawerSection).toBe("permissoes");

    act(() => {
      result.current.actions.handleVoltarResumoConfiguracoes();
    });

    expect(result.current.state.settingsDrawerPage).toBe("overview");
    expect(result.current.state.settingsDrawerSection).toBe("all");
  });

  it("mantem a pilha mesmo com navegacoes encadeadas antes do rerender", () => {
    const { result } = renderHook(() => useSettingsNavigation());

    act(() => {
      result.current.actions.handleAbrirPaginaConfiguracoes("contaAcesso");
      result.current.actions.handleAbrirPaginaConfiguracoes(
        "seguranca",
        "permissoes",
      );
      result.current.actions.handleAbrirSecaoConfiguracoes("dadosConversas");
    });

    expect(result.current.state.settingsDrawerPage).toBe("seguranca");
    expect(result.current.state.settingsDrawerSection).toBe("dadosConversas");

    act(() => {
      result.current.actions.handleVoltarResumoConfiguracoes();
    });

    expect(result.current.state.settingsDrawerPage).toBe("seguranca");
    expect(result.current.state.settingsDrawerSection).toBe("permissoes");

    act(() => {
      result.current.actions.handleVoltarResumoConfiguracoes();
    });

    expect(result.current.state.settingsDrawerPage).toBe("contaAcesso");
    expect(result.current.state.settingsDrawerSection).toBe("all");

    act(() => {
      result.current.actions.handleVoltarResumoConfiguracoes();
    });

    expect(result.current.state.settingsDrawerPage).toBe("overview");
    expect(result.current.state.settingsDrawerSection).toBe("all");
  });

  it("reseta overlays e preserva somente a folha de reautenticacao quando bloqueado", () => {
    const { result } = renderHook(() => useSettingsNavigation());

    act(() => {
      result.current.actions.abrirSheetConfiguracao({
        kind: "reauth",
        title: "Confirmar identidade",
        subtitle: "Fluxo sensivel",
        actionLabel: "Confirmar",
      });
      result.current.actions.setSettingsSheetLoading(true);
      result.current.actions.setSettingsSheetNotice("Aviso temporario");
      result.current.actions.abrirConfirmacaoConfiguracao({
        kind: "security",
        title: "Confirmar",
        description: "Descricao",
        confirmLabel: "Continuar",
      });
      result.current.actions.setConfirmTextDraft("CONFIRMAR");
    });

    act(() => {
      result.current.actions.clearTransientSettingsUiPreservingReauth();
    });

    expect(result.current.state.settingsSheet?.kind).toBe("reauth");
    expect(result.current.state.settingsSheetLoading).toBe(false);
    expect(result.current.state.settingsSheetNotice).toBe("");
    expect(result.current.state.confirmSheet).toBeNull();
    expect(result.current.state.confirmTextDraft).toBe("");
  });

  it("volta pelas folhas de configuracao na ordem inversa da navegacao", () => {
    const { result } = renderHook(() => useSettingsNavigation());

    act(() => {
      result.current.actions.abrirSheetConfiguracao({
        kind: "about",
        title: "Sobre o app",
        subtitle: "Versao e documentos",
      });
      result.current.actions.abrirSheetConfiguracao({
        kind: "terms",
        title: "Termos de uso",
        subtitle: "Texto completo",
      });
      result.current.actions.abrirSheetConfiguracao({
        kind: "privacy",
        title: "Politica de privacidade",
        subtitle: "Texto completo",
      });
      result.current.actions.abrirSheetConfiguracao({
        kind: "licenses",
        title: "Licencas",
        subtitle: "Catalogo",
      });
    });

    expect(result.current.state.settingsSheet?.kind).toBe("licenses");
    expect(result.current.state.settingsSheetCanGoBack).toBe(true);

    act(() => {
      result.current.actions.fecharSheetConfiguracao();
    });

    expect(result.current.state.settingsSheet?.kind).toBe("privacy");
    expect(result.current.state.settingsSheetCanGoBack).toBe(true);

    act(() => {
      result.current.actions.fecharSheetConfiguracao();
    });

    expect(result.current.state.settingsSheet?.kind).toBe("terms");

    act(() => {
      result.current.actions.fecharSheetConfiguracao();
    });

    expect(result.current.state.settingsSheet?.kind).toBe("about");
    expect(result.current.state.settingsSheetCanGoBack).toBe(false);

    act(() => {
      result.current.actions.fecharSheetConfiguracao();
    });

    expect(result.current.state.settingsSheet).toBeNull();
  });

  it("limpa navegacao e modais ao resetar a UI de configuracoes", () => {
    const { result } = renderHook(() => useSettingsNavigation());

    act(() => {
      result.current.actions.handleAbrirPaginaConfiguracoes(
        "sistemaSuporte",
        "suporte",
      );
      result.current.actions.abrirSheetConfiguracao({
        kind: "feedback",
        title: "Feedback",
        subtitle: "Envie uma sugestao",
        actionLabel: "Enviar",
      });
      result.current.actions.notificarConfiguracaoConcluida("Enviado");
      result.current.actions.abrirConfirmacaoConfiguracao({
        kind: "clearHistory",
        title: "Limpar historico",
        description: "Descricao",
        confirmLabel: "Limpar",
      });
      result.current.actions.setConfirmTextDraft("LIMPAR");
    });

    act(() => {
      result.current.actions.resetSettingsUi();
    });

    expect(result.current.state.settingsDrawerPage).toBe("overview");
    expect(result.current.state.settingsDrawerSection).toBe("all");
    expect(result.current.state.settingsSheet).toBeNull();
    expect(result.current.state.settingsSheetNotice).toBe("");
    expect(result.current.state.confirmSheet).toBeNull();
    expect(result.current.state.confirmTextDraft).toBe("");
  });
});
