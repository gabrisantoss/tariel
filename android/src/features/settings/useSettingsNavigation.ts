import { useRef, useState, type Dispatch, type SetStateAction } from "react";

import type {
  ConfirmSheetState,
  SettingsSheetState,
} from "./settingsSheetTypes";
import type {
  SettingsDrawerPage,
  SettingsSectionKey,
} from "./settingsNavigationMeta";

type SettingsDrawerSection = SettingsSectionKey | "all";

interface SettingsNavigationState {
  page: SettingsDrawerPage;
  section: SettingsDrawerSection;
}

const INITIAL_SETTINGS_NAVIGATION_STATE: SettingsNavigationState = {
  page: "overview",
  section: "all",
};

function normalizeSettingsNavigationState(
  page: SettingsDrawerPage,
  section: SettingsDrawerSection = "all",
): SettingsNavigationState {
  return {
    page,
    section: page === "overview" ? "all" : section,
  };
}

function areSettingsNavigationStatesEqual(
  first: SettingsNavigationState,
  second: SettingsNavigationState,
): boolean {
  return first.page === second.page && first.section === second.section;
}

function pushSettingsNavigationState(
  historyRef: { current: SettingsNavigationState[] },
  state: SettingsNavigationState,
): void {
  const history = historyRef.current;
  const last = history[history.length - 1];
  if (last && areSettingsNavigationStatesEqual(last, state)) {
    return;
  }
  history.push(state);
}

interface UseSettingsNavigationState {
  settingsDrawerPage: SettingsDrawerPage;
  settingsDrawerSection: SettingsDrawerSection;
  settingsSheet: SettingsSheetState | null;
  settingsSheetLoading: boolean;
  settingsSheetNotice: string;
  confirmSheet: ConfirmSheetState | null;
  confirmTextDraft: string;
}

interface UseSettingsNavigationActions {
  setConfirmTextDraft: Dispatch<SetStateAction<string>>;
  setSettingsSheetLoading: Dispatch<SetStateAction<boolean>>;
  setSettingsSheetNotice: Dispatch<SetStateAction<string>>;
  handleAbrirPaginaConfiguracoes: (
    page: SettingsDrawerPage,
    section?: SettingsDrawerSection,
  ) => void;
  handleAbrirSecaoConfiguracoes: (section: SettingsSectionKey) => void;
  handleVoltarResumoConfiguracoes: () => void;
  abrirSheetConfiguracao: (config: SettingsSheetState) => void;
  fecharSheetConfiguracao: () => void;
  abrirConfirmacaoConfiguracao: (config: ConfirmSheetState) => void;
  fecharConfirmacaoConfiguracao: () => void;
  notificarConfiguracaoConcluida: (mensagem: string) => void;
  resetSettingsNavigation: () => void;
  resetSettingsUi: () => void;
  clearTransientSettingsUiPreservingReauth: () => void;
}

export function useSettingsNavigation(): {
  state: UseSettingsNavigationState;
  actions: UseSettingsNavigationActions;
} {
  const [settingsDrawerPage, setSettingsDrawerPage] =
    useState<SettingsDrawerPage>("overview");
  const [settingsDrawerSection, setSettingsDrawerSection] =
    useState<SettingsDrawerSection>("all");
  const [settingsSheet, setSettingsSheet] = useState<SettingsSheetState | null>(
    null,
  );
  const [settingsSheetLoading, setSettingsSheetLoading] = useState(false);
  const [settingsSheetNotice, setSettingsSheetNotice] = useState("");
  const [confirmSheet, setConfirmSheet] = useState<ConfirmSheetState | null>(
    null,
  );
  const [confirmTextDraft, setConfirmTextDraft] = useState("");
  const settingsNavigationHistoryRef = useRef<SettingsNavigationState[]>([]);
  const currentSettingsNavigationStateRef = useRef<SettingsNavigationState>(
    INITIAL_SETTINGS_NAVIGATION_STATE,
  );

  function applySettingsNavigationState(state: SettingsNavigationState) {
    currentSettingsNavigationStateRef.current = state;
    setSettingsDrawerPage(state.page);
    setSettingsDrawerSection(state.section);
  }

  function resetSettingsNavigation() {
    applySettingsNavigationState(INITIAL_SETTINGS_NAVIGATION_STATE);
    settingsNavigationHistoryRef.current = [];
  }

  function resetSettingsUi() {
    resetSettingsNavigation();
    setSettingsSheet(null);
    setSettingsSheetLoading(false);
    setSettingsSheetNotice("");
    setConfirmSheet(null);
    setConfirmTextDraft("");
  }

  function clearTransientSettingsUiPreservingReauth() {
    setConfirmSheet(null);
    setConfirmTextDraft("");
    setSettingsSheet((estadoAtual) =>
      estadoAtual?.kind === "reauth" ? estadoAtual : null,
    );
    setSettingsSheetLoading(false);
    setSettingsSheetNotice("");
  }

  function handleAbrirPaginaConfiguracoes(
    page: SettingsDrawerPage,
    section: SettingsDrawerSection = "all",
  ) {
    const currentState = currentSettingsNavigationStateRef.current;
    const nextState = normalizeSettingsNavigationState(page, section);

    if (areSettingsNavigationStatesEqual(currentState, nextState)) {
      return;
    }

    pushSettingsNavigationState(settingsNavigationHistoryRef, currentState);
    applySettingsNavigationState(nextState);
  }

  function handleAbrirSecaoConfiguracoes(section: SettingsSectionKey) {
    const currentState = currentSettingsNavigationStateRef.current;
    if (currentState.section === section) {
      return;
    }

    pushSettingsNavigationState(settingsNavigationHistoryRef, currentState);
    applySettingsNavigationState({
      page: currentState.page,
      section,
    });
  }

  function handleVoltarResumoConfiguracoes() {
    const anterior = settingsNavigationHistoryRef.current.pop();
    if (anterior) {
      applySettingsNavigationState(anterior);
      return;
    }

    const currentState = currentSettingsNavigationStateRef.current;
    if (currentState.section !== "all") {
      applySettingsNavigationState({
        page: currentState.page,
        section: "all",
      });
      return;
    }

    resetSettingsNavigation();
  }

  function abrirSheetConfiguracao(config: SettingsSheetState) {
    setSettingsSheetNotice("");
    setSettingsSheetLoading(false);
    setSettingsSheet(config);
  }

  function fecharSheetConfiguracao() {
    setSettingsSheet(null);
    setSettingsSheetLoading(false);
    setSettingsSheetNotice("");
  }

  function abrirConfirmacaoConfiguracao(config: ConfirmSheetState) {
    setConfirmTextDraft("");
    setConfirmSheet(config);
  }

  function fecharConfirmacaoConfiguracao() {
    setConfirmTextDraft("");
    setConfirmSheet(null);
  }

  function notificarConfiguracaoConcluida(mensagem: string) {
    setSettingsSheetNotice(mensagem);
  }

  return {
    state: {
      settingsDrawerPage,
      settingsDrawerSection,
      settingsSheet,
      settingsSheetLoading,
      settingsSheetNotice,
      confirmSheet,
      confirmTextDraft,
    },
    actions: {
      setConfirmTextDraft,
      setSettingsSheetLoading,
      setSettingsSheetNotice,
      handleAbrirPaginaConfiguracoes,
      handleAbrirSecaoConfiguracoes,
      handleVoltarResumoConfiguracoes,
      abrirSheetConfiguracao,
      fecharSheetConfiguracao,
      abrirConfirmacaoConfiguracao,
      fecharConfirmacaoConfiguracao,
      notificarConfiguracaoConcluida,
      resetSettingsNavigation,
      resetSettingsUi,
      clearTransientSettingsUiPreservingReauth,
    },
  };
}
