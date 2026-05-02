import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "../theme/tokens";
import { AssistantMessageContent } from "./AssistantRichMessage";

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

describe("AssistantMessageContent", () => {
  it("mantém títulos longos dentro do balão da conversa", () => {
    const heading = "POR FAVOR, FORNEÇA AS SEGUINTES INFORMAÇÕES";
    const { getByText } = render(
      <AssistantMessageContent
        text={`### ${heading}`}
        textStyle={{ fontSize: 22, lineHeight: 30 }}
      />,
    );

    const style = StyleSheet.flatten(getByText(heading).props.style);

    expect(style.flex).toBe(1);
    expect(style.flexShrink).toBe(1);
    expect(style.color).toBe(colors.textPrimary);
    expect(style.letterSpacing).toBe(0);
  });

  it("usa tons neutros na numeração das listas", () => {
    const { getByText } = render(
      <AssistantMessageContent
        text={"1. Tipo de equipamento\n2. Localização"}
      />,
    );

    const markerStyle = StyleSheet.flatten(getByText("1.").props.style);

    expect(markerStyle.color).toBe(colors.textSecondary);
    expect(markerStyle.color).not.toBe(colors.accent);
  });
});
