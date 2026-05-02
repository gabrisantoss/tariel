import { fireEvent, render } from "@testing-library/react-native";
import { Animated, ScrollView } from "react-native";

import {
  HistoryDrawerPanel,
  type HistoryDrawerPanelItem,
  type HistoryDrawerPanelProps,
  type HistoryDrawerSection,
} from "./HistoryDrawerPanel";
import type {
  MobileActiveOwnerRole,
  MobileCaseLifecycleStatus,
  MobileOfficialIssueSummary,
  MobileSurfaceAction,
} from "../../types/mobile";

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

type TestItem = HistoryDrawerPanelItem & {
  case_lifecycle_status?: MobileCaseLifecycleStatus;
  active_owner_role?: MobileActiveOwnerRole;
  allowed_surface_actions?: MobileSurfaceAction[];
  official_issue_summary?: MobileOfficialIssueSummary | null;
  report_pack_draft?: Record<string, unknown> | null;
};

function createItem(id: number): TestItem {
  return {
    id,
    titulo: `Laudo ${id}`,
    preview: "Resumo operacional",
    data_iso: "2026-03-26T10:00:00.000Z",
    status_card: "aguardando",
    status_card_label: "Aguardando",
    pinado: false,
    tipo_template: "TC",
    permite_edicao: true,
    permite_reabrir: false,
  };
}

function createProps(
  overrides: Partial<HistoryDrawerPanelProps<TestItem>> = {},
): HistoryDrawerPanelProps<TestItem> {
  const sections: HistoryDrawerSection<TestItem>[] = [
    {
      key: "hoje",
      title: "Hoje",
      items: [createItem(80), createItem(81)],
    },
  ];
  return {
    brandMarkSource: { uri: "test://brand" },
    buscaHistorico: "",
    conversasOcultasTotal: 0,
    historicoAgrupadoFinal: sections,
    historicoDrawerX: new Animated.Value(0),
    historicoVazioTexto: "Nada aqui",
    historicoVazioTitulo: "Vazio",
    historyDrawerPanResponder: { panHandlers: {} } as never,
    laudoSelecionadoId: null,
    onBuscaHistoricoChange: jest.fn(),
    onCloseHistory: jest.fn(),
    onHistorySearchFocusChange: jest.fn(),
    onExcluirConversaHistorico: jest.fn(),
    onSelecionarHistorico: jest.fn(),
    ...overrides,
  };
}

describe("HistoryDrawerPanel", () => {
  it("expõe markers estáveis para resultados e alvo do histórico", () => {
    const props = createProps({ laudoSelecionadoId: 80 });
    const { getByTestId, queryByText } = render(
      <HistoryDrawerPanel {...props} />,
    );

    expect(getByTestId("history-summary-card")).toBeTruthy();
    expect(queryByText("Retomada rapida")).toBeNull();
    expect(queryByText("Radar da operação")).toBeNull();
    expect(getByTestId("history-results-loaded")).toBeTruthy();
    expect(getByTestId("history-section-hoje")).toBeTruthy();
    expect(getByTestId("history-first-item-button")).toBeTruthy();
    expect(getByTestId("history-item-80")).toBeTruthy();
    expect(getByTestId("history-item-81")).toBeTruthy();
    expect(getByTestId("history-target-visible-80")).toBeTruthy();
    expect(getByTestId("history-item-selected-80")).toBeTruthy();
  });

  it("nao exibe mais o bloco de retomada rapida no historico", () => {
    const props = createProps({
      historicoAgrupadoFinal: [
        {
          key: "hoje",
          title: "Hoje",
          items: [
            {
              ...createItem(80),
              entry_mode_effective: "evidence_first",
              report_pack_draft: {
                quality_gates: {
                  autonomy_ready: true,
                  final_validation_mode: "mesa_required",
                },
              },
              official_issue_summary: {
                label: "Reemissão recomendada",
                detail: "Reemissão motivada por nova aprovação governada.",
                reissue_recommended: true,
                primary_pdf_diverged: false,
                reissue_reason_codes: ["approval_snapshot_updated"],
              },
            },
            {
              ...createItem(81),
              entry_mode_effective: "chat_first",
            },
          ],
        },
      ],
    });
    const { queryByText, queryByTestId } = render(
      <HistoryDrawerPanel {...props} />,
    );

    expect(queryByText("Retomada rapida")).toBeNull();
    expect(queryByText("Radar da operação")).toBeNull();
    expect(queryByText("Retomada sugerida")).toBeNull();
    expect(queryByText("Reemitir documento")).toBeNull();
    expect(queryByTestId("history-resume-suggestion-card")).toBeNull();
    expect(queryByTestId("history-summary-guided-pill")).toBeNull();
    expect(queryByTestId("history-summary-reissue-pill")).toBeNull();
    expect(queryByTestId("history-summary-validation-pill")).toBeNull();
  });

  it("enriquece a busca com sinais operacionais quando houver match guiado ou com reemissão", () => {
    const props = createProps({
      buscaHistorico: "linha de vida",
      historicoAgrupadoFinal: [
        {
          key: "hoje",
          title: "Hoje",
          items: [
            {
              ...createItem(80),
              entry_mode_effective: "evidence_first",
              report_pack_draft: {
                quality_gates: {
                  autonomy_ready: true,
                  final_validation_mode: "mesa_required",
                },
              },
              official_issue_summary: {
                label: "Reemissão recomendada",
                detail: "PDF emitido divergente",
                primary_pdf_diverged: true,
              },
            },
          ],
        },
      ],
    });
    const { queryByText } = render(<HistoryDrawerPanel {...props} />);

    expect(
      queryByText(
        "1 caso encontrado. 1 guiados · 1 prontos para validar · 1 com reemissao.",
      ),
    ).toBeNull();
  });

  it("propaga foco da busca do histórico para o controlador lateral", () => {
    const props = createProps();
    const { getByTestId } = render(<HistoryDrawerPanel {...props} />);

    fireEvent(getByTestId("history-search-input"), "focus");
    fireEvent(getByTestId("history-search-input"), "blur");

    expect(props.onHistorySearchFocusChange).toHaveBeenNthCalledWith(1, true);
    expect(props.onHistorySearchFocusChange).toHaveBeenNthCalledWith(2, false);
  });

  it("expõe marker estável de estado vazio quando não há resultados", () => {
    const props = createProps({
      historicoAgrupadoFinal: [],
    });
    const { getByTestId } = render(<HistoryDrawerPanel {...props} />);

    expect(getByTestId("history-results-empty")).toBeTruthy();
    expect(getByTestId("history-empty-state")).toBeTruthy();
  });

  it("mantém o tap do resultado mesmo com teclado aberto", () => {
    const props = createProps();
    const { UNSAFE_getByType } = render(<HistoryDrawerPanel {...props} />);

    expect(UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe(
      "handled",
    );
  });

  it("exibe resumo canônico do caso no item do histórico", () => {
    const props = createProps({
      historicoAgrupadoFinal: [
        {
          key: "hoje",
          title: "Hoje",
          items: [
            {
              ...createItem(80),
              case_lifecycle_status: "em_revisao_mesa",
              active_owner_role: "mesa",
              allowed_surface_actions: ["mesa_approve"],
              report_pack_draft: {
                modeled: true,
                template_label: "NR35 Linha de Vida",
                guided_context: {
                  asset_label: "Linha de vida cobertura A",
                  location_label: "Bloco 2",
                  checklist_ids: ["identificacao", "ancoragem"],
                  completed_step_ids: ["identificacao"],
                },
                image_slots: [{ slot: "vista_geral", status: "resolved" }],
                items: [
                  {
                    item_codigo: "fixacao",
                    veredito_ia_normativo: "pendente",
                    approved_for_emission: false,
                    missing_evidence: ["status_normativo_nao_confirmado"],
                  },
                ],
                structured_data_candidate: null,
                quality_gates: {
                  checklist_complete: false,
                  required_image_slots_complete: true,
                  critical_items_complete: false,
                  autonomy_ready: true,
                  requires_normative_curation: false,
                  final_validation_mode: "mesa_required",
                },
              },
              official_issue_summary: {
                label: "Reemissão recomendada",
                detail: "PDF emitido divergente · Emitido v0003 · Atual v0004",
                primary_pdf_diverged: true,
                issue_number: "EO-35-1",
                issue_state_label: "Emitido",
                primary_pdf_storage_version: "v0003",
                current_primary_pdf_storage_version: "v0004",
              },
              entry_mode_effective: "evidence_first",
              entry_mode_reason: "user_preference",
            },
          ],
        },
      ],
    });
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <HistoryDrawerPanel {...props} />,
    );

    expect(getByTestId("history-item-80")).toBeTruthy();
    expect(getByText("Laudo 80")).toBeTruthy();
    expect(queryByTestId("history-item-meta-80")).toBeNull();
    expect(queryByTestId("history-item-owner-80")).toBeNull();
    expect(queryByTestId("history-item-route-80")).toBeNull();
    expect(queryByTestId("history-item-validation-badge-80")).toBeNull();
    expect(queryByTestId("history-item-entry-mode-80")).toBeNull();
    expect(queryByTestId("history-item-report-pack-80")).toBeNull();
    expect(queryByTestId("history-item-governance-80")).toBeNull();
    expect(queryByTestId("history-item-context-80")).toBeNull();
    expect(queryByText(/PDF emitido divergente/)).toBeNull();
    expect(queryByText(/Linha de vida cobertura A/)).toBeNull();
  });
});
