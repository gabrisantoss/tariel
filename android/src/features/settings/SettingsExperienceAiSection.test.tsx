import type { ComponentProps } from "react";
import { render } from "@testing-library/react-native";

import { SettingsExperienceAiSection } from "./SettingsExperienceAiSection";

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

jest.mock("./SettingsPrimitives", () => {
  const React = require("react");

  const renderTexts = (...values: Array<unknown>) =>
    values
      .filter((value) => typeof value === "string" && value.length > 0)
      .map((value, index) =>
        React.createElement(
          "Text",
          { key: `${String(value)}-${index}` },
          value,
        ),
      );

  return {
    SettingsSection: ({
      title,
      subtitle,
      children,
    }: {
      title?: string;
      subtitle?: string;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...renderTexts(title, subtitle),
        children,
      ),
    SettingsPressRow: ({
      title,
      value,
      description,
    }: {
      title?: string;
      value?: string;
      description?: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...renderTexts(title, value, description),
      ),
    SettingsSwitchRow: ({
      title,
      description,
    }: {
      title?: string;
      description?: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...renderTexts(title, description),
      ),
    SettingsSegmentedRow: ({
      title,
      description,
      value,
    }: {
      title?: string;
      description?: string;
      value?: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...renderTexts(title, description, value),
      ),
    SettingsScaleRow: ({
      title,
      description,
    }: {
      title?: string;
      description?: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...renderTexts(title, description),
      ),
  };
});

describe("SettingsExperienceAiSection", () => {
  function renderSection(
    overrides: Partial<ComponentProps<typeof SettingsExperienceAiSection>> = {},
  ) {
    return render(
      <SettingsExperienceAiSection
        aprendizadoIa
        entryModePreference="chat_first"
        estiloResposta="padrão"
        idiomaResposta="Português"
        memoriaIa
        modeloIa="equilibrado"
        onAbrirMenuModeloIa={jest.fn()}
        onSetAprendizadoIa={jest.fn()}
        onSetEntryModePreference={jest.fn()}
        onSetEstiloResposta={jest.fn()}
        onSetIdiomaResposta={jest.fn()}
        onSetMemoriaIa={jest.fn()}
        onSetRememberLastCaseMode={jest.fn()}
        onSetTemperaturaIa={jest.fn()}
        onSetTomConversa={jest.fn()}
        rememberLastCaseMode={false}
        temperaturaIa={0.3}
        tomConversa="profissional"
        {...overrides}
      />,
    );
  }

  it("resume a criação lazy do caso na seção de IA", () => {
    const { getByText } = renderSection();

    expect(getByText("Criação do caso")).toBeTruthy();
    expect(getByText("Chat no 1º envio")).toBeTruthy();
  });

  it("resume quando o modo automático reaproveita o último caso", () => {
    const { getByText } = renderSection({
      entryModePreference: "auto_recommended",
      rememberLastCaseMode: true,
    });

    expect(getByText("Auto recomendado")).toBeTruthy();
    expect(getByText("Auto + último modo")).toBeTruthy();
  });
});
