import { fireEvent, render } from "@testing-library/react-native";

import { ThreadFinalizationCard } from "./ThreadFinalizationCard";

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

describe("ThreadFinalizationCard", () => {
  it("expõe plano operacional com próximo passo, bloqueios e entrega", () => {
    const onAction = jest.fn();
    const { getByText, getByTestId } = render(
      <ThreadFinalizationCard
        actions={[
          {
            key: "finalize",
            label: "Validar e finalizar",
            tone: "accent",
            icon: "check-circle-outline",
            onPress: onAction,
            testID: "finalization-action",
          },
        ]}
        chips={[
          {
            key: "review-mode",
            label: "Mesa obrigatória",
            tone: "danger",
            icon: "clipboard-alert-outline",
          },
        ]}
        description="Revise o gate antes de fechar."
        eyebrow="Finalizar"
        insights={[
          {
            key: "current-owner",
            label: "Responsável atual",
            value: "Mesa avaliadora",
            detail: "A Mesa domina o próximo movimento do caso neste momento.",
            tone: "danger",
            icon: "clipboard-alert-outline",
          },
          {
            key: "next-step",
            label: "Próximo passo",
            value: "Corrigir no chat",
            detail: "Resolva as pendências antes de validar.",
            tone: "danger",
            icon: "message-processing-outline",
          },
          {
            key: "expected-decision",
            label: "Decisão esperada",
            value: "Parecer da mesa",
            detail:
              "A empresa exige parecer humano da Mesa antes do PDF final.",
            tone: "danger",
            icon: "clipboard-alert-outline",
          },
          {
            key: "suggested-route",
            label: "Rota sugerida",
            value: "Abrir mesa",
            detail: "A próxima superfície dominante do caso é a Mesa.",
            tone: "danger",
            icon: "clipboard-alert-outline",
          },
          {
            key: "blockers",
            label: "Bloqueios",
            value: "2 pendências",
            detail: "Foco atual: registros fotográficos e checklist.",
            tone: "danger",
            icon: "alert-circle-outline",
          },
          {
            key: "blocking-reason",
            label: "Motivo do bloqueio",
            value: "Registros fotográficos",
            detail: "Falta foto obrigatória e conferência final do checklist.",
            tone: "danger",
            icon: "alert-circle-outline",
          },
          {
            key: "delivery",
            label: "Entrega final",
            value: "Laudo formal",
            detail: "PDF final governado como artefato oficial.",
            tone: "accent",
            icon: "file-document-outline",
          },
          {
            key: "governance",
            label: "Assinatura",
            value: "2 signatários",
            detail: "Governança ativa do tenant.",
            tone: "success",
            icon: "shield-check-outline",
          },
        ]}
        spotlight={{
          label: "Bloqueado para emissão",
          tone: "danger",
          icon: "alert-circle-outline",
        }}
        title="Validação final do caso"
      />,
    );

    expect(getByText("Próxima ação")).toBeTruthy();
    expect(getByText("Status e pendências")).toBeTruthy();
    expect(getByText("Documento e auditoria")).toBeTruthy();
    expect(getByTestId("thread-finalization-plan-current-owner")).toBeTruthy();
    expect(
      getByTestId("thread-finalization-plan-expected-decision"),
    ).toBeTruthy();
    expect(getByTestId("thread-finalization-plan-blockers")).toBeTruthy();
    expect(
      getByTestId("thread-finalization-plan-blocking-reason"),
    ).toBeTruthy();
    expect(getByTestId("thread-finalization-plan-delivery")).toBeTruthy();
    expect(getByTestId("thread-finalization-plan-governance")).toBeTruthy();
    fireEvent.press(getByTestId("finalization-action"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
