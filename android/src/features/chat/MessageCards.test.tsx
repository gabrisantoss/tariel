import { Image } from "react-native";
import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import { MessageAttachmentCard } from "./MessageCards";

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

describe("MessageAttachmentCard", () => {
  it("renderiza imagem com preview maior e resize contain", () => {
    const { UNSAFE_getByType } = render(
      <MessageAttachmentCard
        accessToken="token-123"
        attachment={{
          id: 8,
          nome: "painel.png",
          mime_type: "image/png",
          categoria: "imagem",
          eh_imagem: true,
          url: "/app/api/laudo/80/mesa/anexos/8",
        }}
        onPress={jest.fn()}
        opening={false}
      />,
    );

    const preview = UNSAFE_getByType(Image);
    expect(preview.props.resizeMode).toBe("contain");
    expect(styles.messageAttachmentImageFrame.height).toBeGreaterThanOrEqual(
      200,
    );
    expect(preview.props.source).toMatchObject({
      uri: expect.stringContaining("/app/api/laudo/80/mesa/anexos/8"),
      headers: {
        Authorization: "Bearer token-123",
      },
    });
  });

  it("renderiza preview local da imagem antes da URL do servidor", () => {
    const { UNSAFE_getByType, getByText } = render(
      <MessageAttachmentCard
        accessToken={null}
        attachment={{
          nome: "evidencia.jpg",
          mime_type: "image/jpeg",
          categoria: "imagem",
          eh_imagem: true,
          local_preview_uri: "file:///tmp/evidencia.jpg",
          local_uri: "file:///tmp/evidencia-original.jpg",
        }}
        onPress={jest.fn()}
        opening={false}
      />,
    );

    const preview = UNSAFE_getByType(Image);
    expect(preview.props.source).toEqual({
      uri: "file:///tmp/evidencia.jpg",
    });
    expect(getByText("image-search-outline")).toBeTruthy();
  });

  it("mantém ícones de anexos em tons neutros", () => {
    const { getByText } = render(
      <MessageAttachmentCard
        accessToken="token-123"
        accentColor={colors.accent}
        attachment={{
          id: 9,
          nome: "relatorio.pdf",
          mime_type: "application/pdf",
          categoria: "documento",
          url: "/app/api/laudo/80/mesa/anexos/9",
        }}
        onPress={jest.fn()}
        opening={false}
      />,
    );

    expect(getByText("file-document-outline").props.color).toBe(
      colors.textSecondary,
    );
    expect(getByText("download-outline").props.color).toBe(
      colors.textSecondary,
    );
    expect(styles.messageAttachmentIconCircle.backgroundColor).toBe(
      colors.surfaceMuted,
    );
  });
});
