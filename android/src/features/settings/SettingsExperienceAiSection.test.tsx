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
        estiloResposta="padrão"
        idiomaResposta="Português"
        memoriaIa
        modeloIa="equilibrado"
        onAbrirMenuEstiloResposta={jest.fn()}
        onAbrirMenuIdiomaResposta={jest.fn()}
        onAbrirMenuModeloIa={jest.fn()}
        onSetMemoriaIa={jest.fn()}
        onSetTomConversa={jest.fn()}
        tomConversa="profissional"
        {...overrides}
      />,
    );
  }

  it("mostra os menus principais de IA sem controles de criação do caso", () => {
    const { getByText, queryByText } = renderSection();

    expect(getByText("Modelo de IA")).toBeTruthy();
    expect(getByText("Estilo de resposta")).toBeTruthy();
    expect(getByText("Idioma do app e da IA")).toBeTruthy();
    expect(queryByText("Modo inicial do caso")).toBeNull();
    expect(queryByText("Criação do caso")).toBeNull();
    expect(queryByText("Lembrar modo do último caso")).toBeNull();
    expect(queryByText("Permitir aprendizado da IA")).toBeNull();
    expect(queryByText("Permitir uso para melhoria da IA")).toBeNull();
    expect(queryByText("Compartilhar dados para melhoria da IA")).toBeNull();
    expect(queryByText("Temperatura da resposta")).toBeNull();
  });
});
