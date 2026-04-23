import { render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

import {
  ActivityCenterModal,
  AttachmentPickerModal,
  OfflineQueueModal,
} from "./OperationalModals";

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  monitorandoAtividade: false,
  notificacoes: [],
  onAbrirNotificacao: jest.fn(),
  formatarHorarioAtividade: jest.fn().mockReturnValue("18:00"),
  automationDiagnosticsEnabled: true,
};

describe("ActivityCenterModal", () => {
  it("materializa um terminal no_request canonico dentro do modal", () => {
    const { getByTestId } = render(
      <ActivityCenterModal
        {...baseProps}
        activityCenterAutomationDiagnostics={{
          modalVisible: true,
          phase: "settled",
          requestDispatched: false,
          requestedTargetIds: [],
          notificationCount: 0,
          feedReadMetadata: null,
          requestTrace: null,
          skipReason: "no_target",
        }}
      />,
    );

    expect(getByTestId("activity-center-terminal-state")).toBeTruthy();
    expect(
      getByTestId("activity-center-terminal-state-no-request"),
    ).toBeTruthy();
    expect(getByTestId("activity-center-state-no-request")).toBeTruthy();
    expect(getByTestId("activity-center-request-not-started")).toBeTruthy();
    expect(getByTestId("activity-center-skip-no-target")).toBeTruthy();
    expect(
      getByTestId("activity-center-automation-probe").props.accessibilityLabel,
    ).toContain("terminal_state=no_request");
  });

  it("materializa request v2 vazio com markers terminais e de entrega", () => {
    const { getByTestId } = render(
      <ActivityCenterModal
        {...baseProps}
        activityCenterAutomationDiagnostics={{
          modalVisible: true,
          phase: "settled",
          requestDispatched: true,
          requestedTargetIds: [80, 80],
          notificationCount: 0,
          feedReadMetadata: {
            route: "feed",
            deliveryMode: "v2",
            capabilitiesVersion: "2026-03-26.09p",
            rolloutBucket: 12,
            usageMode: "organic_validation",
            validationSessionId: "orgv_09p",
            operatorRunId: "oprv_09p",
          },
          requestTrace: null,
          skipReason: null,
        }}
      />,
    );

    expect(getByTestId("activity-center-terminal-state-empty")).toBeTruthy();
    expect(getByTestId("activity-center-state-empty")).toBeTruthy();
    expect(getByTestId("activity-center-request-dispatched")).toBeTruthy();
    expect(getByTestId("activity-center-request-target-80")).toBeTruthy();
    expect(getByTestId("activity-center-feed-v2-served")).toBeTruthy();
    expect(getByTestId("activity-center-feed-v2-target-80")).toBeTruthy();
  });

  it("prioriza alertas críticos e exibe categoria operacional no item", () => {
    const { getAllByTestId, getByText } = render(
      <ActivityCenterModal
        {...baseProps}
        automationDiagnosticsEnabled={false}
        activityCenterAutomationDiagnostics={{
          modalVisible: true,
          phase: "settled",
          requestDispatched: true,
          requestedTargetIds: [80],
          notificationCount: 3,
          feedReadMetadata: null,
          requestTrace: null,
          skipReason: null,
        }}
        notificacoes={[
          {
            id: "status-1",
            kind: "status",
            title: "Status atualizado",
            body: "Caso 80 atualizado",
            createdAt: "2026-03-30T10:00:00.000Z",
            unread: true,
            targetThread: "chat",
            laudoId: 80,
          },
          {
            id: "critical-1",
            kind: "alerta_critico",
            title: "Reemissão recomendada",
            body: "Laudo 80 divergente",
            createdAt: "2026-03-30T08:00:00.000Z",
            unread: true,
            targetThread: "finalizar",
            laudoId: 80,
          },
          {
            id: "mesa-1",
            kind: "mesa_reaberta",
            title: "Pendência reaberta",
            body: "Mesa reabriu o caso",
            createdAt: "2026-03-30T09:00:00.000Z",
            unread: true,
            targetThread: "mesa",
            laudoId: 80,
          },
        ]}
      />,
    );

    expect(
      getAllByTestId(/activity-center-item-/).map((item) => item.props.testID),
    ).toEqual([
      "activity-center-item-critical-1",
      "activity-center-item-mesa-1",
      "activity-center-item-status-1",
    ]);
    expect(getByText("Reemissão")).toBeTruthy();
    expect(getByText("Abrir em Finalizar")).toBeTruthy();
  });
});

describe("AttachmentPickerModal", () => {
  it("renderiza documento bloqueado com contexto de politica", () => {
    const { getByTestId, getByText } = render(
      <AttachmentPickerModal
        visible
        onClose={jest.fn()}
        onChoose={jest.fn()}
        options={[
          {
            key: "camera",
            title: "Camera",
            detail: "Capture a evidencia na hora.",
            icon: "camera-outline",
            enabled: true,
          },
          {
            key: "documento",
            title: "Documento",
            detail:
              "Documentos liberam quando o caso ja estiver em coleta ou laudo.",
            icon: "file-document-outline",
            enabled: false,
          },
        ]}
      />,
    );

    expect(getByTestId("attachment-picker-option-documento")).toBeTruthy();
    expect(
      getByText(
        "Documentos liberam quando o caso ja estiver em coleta ou laudo.",
      ),
    ).toBeTruthy();
  });
});

describe("OfflineQueueModal", () => {
  const offlineBaseProps = {
    visible: true,
    onClose: jest.fn(),
    resumoFilaOfflineFiltrada:
      "1 criação de caso · 1 item local · aguardando conexão",
    sincronizandoFilaOffline: false,
    podeSincronizarFilaOffline: false,
    sincronizacaoDispositivos: true,
    statusApi: "offline" as const,
    onSincronizarFilaOffline: jest.fn(),
    filtrosFilaOffline: [
      { key: "all", label: "Tudo", count: 1 },
      { key: "chat", label: "Chat", count: 1 },
      { key: "mesa", label: "Mesa", count: 0 },
    ] as const,
    filtroFilaOffline: "all" as const,
    onSetFiltroFilaOffline: jest.fn(),
    filaOfflineFiltrada: [],
    filaOfflineOrdenadaTotal: 1,
    sincronizandoItemFilaId: "",
    onSincronizarItemFilaOffline: jest.fn(),
    onRetomarItemFilaOffline: jest.fn(),
    onRemoverItemFilaOffline: jest.fn(),
    formatarHorarioAtividade: jest.fn().mockReturnValue("18:00"),
    iconePendenciaOffline: jest.fn().mockReturnValue("cloud-upload-outline"),
    resumoPendenciaOffline: jest.fn().mockReturnValue("Resumo"),
    legendaPendenciaOffline: jest.fn().mockReturnValue("Legenda"),
    rotuloStatusPendenciaOffline: jest.fn().mockReturnValue("Pendente"),
    detalheStatusPendenciaOffline: jest.fn().mockReturnValue("Aguardando"),
    pendenciaFilaProntaParaReenvio: jest.fn().mockReturnValue(false),
  };

  it("explica quando a fila não pode sincronizar por falta de conexão", () => {
    const { getByText } = render(<OfflineQueueModal {...offlineBaseProps} />);

    expect(getByText("Conecte-se para reenviar a fila offline.")).toBeTruthy();
  });

  it("explica quando ainda não há itens prontos para sincronizar", () => {
    const { getByText } = render(
      <OfflineQueueModal
        {...offlineBaseProps}
        resumoFilaOfflineFiltrada="1 finalização · 1 item local · em backoff"
        statusApi="online"
      />,
    );

    expect(
      getByText(
        "Nenhum item está pronto para sincronizar agora. Retome uma pendência ou aguarde o backoff.",
      ),
    ).toBeTruthy();
  });

  it("deixa explícito quando a ação do item quebra a espera do backoff", () => {
    const { getByText } = render(
      <OfflineQueueModal
        {...offlineBaseProps}
        filaOfflineFiltrada={[
          {
            id: "chat-1",
            channel: "chat",
            operation: "message",
            laudoId: 91,
            title: "Laudo 91",
            text: "Mensagem pendente",
            createdAt: "2026-03-30T10:00:00.000Z",
            attachment: null,
            referenceMessageId: null,
            qualityGateDecision: null,
            attempts: 1,
            lastAttemptAt: "2026-03-30T10:05:00.000Z",
            lastError: "",
            nextRetryAt: "2026-03-30T10:30:00.000Z",
            aiMode: "detalhado",
            aiSummary: "",
            aiMessagePrefix: "",
          },
        ]}
        pendenciaFilaProntaParaReenvio={jest.fn().mockReturnValue(false)}
      />,
    );

    expect(getByText("Enviar sem esperar")).toBeTruthy();
  });
});
