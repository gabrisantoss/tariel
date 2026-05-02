import { fireEvent, render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import {
  ThreadComposerPanel,
  type ThreadComposerPanelProps,
} from "./ThreadComposerPanel";

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

function createProps(
  overrides: Partial<ThreadComposerPanelProps> = {},
): ThreadComposerPanelProps {
  return {
    visible: true,
    keyboardVisible: false,
    canReopen: false,
    onReopen: jest.fn(),
    qualityGateVisible: false,
    qualityGateLoading: false,
    qualityGateSubmitting: false,
    qualityGatePayload: null,
    qualityGateReason: "",
    qualityGateNotice: "",
    statusApi: "online",
    onCloseQualityGate: jest.fn(),
    onConfirmQualityGate: jest.fn(),
    onSetQualityGateReason: jest.fn(),
    vendoMesa: false,
    erroMesa: "",
    mensagemMesaReferenciaAtiva: null,
    onLimparReferenciaMesaAtiva: jest.fn(),
    anexoMesaRascunho: null,
    onClearAnexoMesaRascunho: jest.fn(),
    podeAbrirAnexosMesa: false,
    podeUsarComposerMesa: false,
    mensagemMesa: "",
    onSetMensagemMesa: jest.fn(),
    placeholderMesa: "Responder para a mesa",
    podeEnviarMesa: false,
    onEnviarMensagemMesa: jest.fn(),
    enviandoMesa: false,
    showVoiceInputAction: false,
    onVoiceInputPress: jest.fn(),
    voiceInputEnabled: false,
    composerNotice: "",
    anexoRascunho: null,
    onClearAnexoRascunho: jest.fn(),
    podeAbrirAnexosChat: true,
    podeAcionarComposer: true,
    mensagem: "",
    onSetMensagem: jest.fn(),
    placeholderComposer: "Escreva sua mensagem",
    podeEnviarComposer: false,
    onEnviarMensagem: jest.fn(),
    enviandoMensagem: false,
    onAbrirSeletorAnexo: jest.fn(),
    dynamicComposerInputStyle: undefined,
    accentColor: "#0f766e",
    ...overrides,
  };
}

describe("ThreadComposerPanel", () => {
  it("remove o placeholder do composer de chat", () => {
    const { getByTestId } = render(
      <ThreadComposerPanel
        {...createProps({
          placeholderComposer: "Escreva sua mensagem",
        })}
      />,
    );

    expect(getByTestId("chat-composer-input").props.placeholder).toBe("");
  });

  it("usa a cor ativa no botão de enviar do chat", () => {
    const { getByTestId } = render(
      <ThreadComposerPanel
        {...createProps({
          accentColor: "#2F76D2",
          mensagem: "teste",
          podeEnviarComposer: true,
        })}
      />,
    );

    expect(getByTestId("chat-send-button").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: "#2F76D2" }),
      ]),
    );
  });

  it("expõe markers estáveis para rascunho de imagem no chat", () => {
    const { getByTestId } = render(
      <ThreadComposerPanel
        {...createProps({
          anexoRascunho: {
            kind: "image",
            label: "evidencia.png",
            resumo: "Imagem pronta para a conversa.",
            previewUri: "file:///tmp/evidencia.png",
          },
        })}
      />,
    );

    expect(getByTestId("chat-attachment-draft-card")).toBeTruthy();
    expect(getByTestId("chat-attachment-draft-kind-image")).toBeTruthy();
    expect(getByTestId("chat-attachment-draft-title").props.children).toBe(
      "evidencia.png",
    );
    expect(
      getByTestId("chat-attachment-draft-description").props.children,
    ).toBe("Imagem pronta para a conversa.");
  });

  it("mostra carrossel de fotos selecionadas na ordem no chat", () => {
    const { getByTestId } = render(
      <ThreadComposerPanel
        {...createProps({
          anexoRascunho: {
            kind: "image_set",
            label: "3 fotos selecionadas",
            resumo: "Imagens prontas para a conversa.",
            imagens: [
              { previewUri: "file:///tmp/foto-01.jpg" },
              { previewUri: "file:///tmp/foto-02.jpg" },
              { previewUri: "file:///tmp/foto-03.jpg" },
            ],
          },
        })}
      />,
    );

    expect(getByTestId("chat-attachment-draft-image-carousel")).toBeTruthy();
    expect(
      getByTestId("chat-attachment-draft-carousel-image-0").props.source.uri,
    ).toBe("file:///tmp/foto-01.jpg");
    expect(
      getByTestId("chat-attachment-draft-carousel-image-1").props.source.uri,
    ).toBe("file:///tmp/foto-02.jpg");
    expect(
      getByTestId("chat-attachment-draft-carousel-image-2").props.source.uri,
    ).toBe("file:///tmp/foto-03.jpg");
    expect(getByTestId("chat-attachment-draft-title").props.children).toBe(
      "3 fotos selecionadas",
    );
  });

  it("mantém ids estáveis para documento na mesa e permite limpar o rascunho", () => {
    const onClearAnexoMesaRascunho = jest.fn();
    const { getByTestId, getByText } = render(
      <ThreadComposerPanel
        {...createProps({
          vendoMesa: true,
          anexoMesaRascunho: {
            kind: "document",
            label: "laudo.pdf",
            resumo: "Documento pronto para a mesa.",
          },
          onClearAnexoMesaRascunho,
          podeAbrirAnexosMesa: true,
          podeUsarComposerMesa: true,
        })}
      />,
    );

    expect(getByTestId("mesa-attachment-draft-card")).toBeTruthy();
    const documentIcon = getByTestId("mesa-attachment-draft-kind-document");
    expect(documentIcon).toBeTruthy();
    expect(documentIcon.props.style).toEqual(
      expect.arrayContaining([styles.attachmentDraftIcon]),
    );
    expect(styles.attachmentDraftIcon.backgroundColor).toBe(
      colors.surfaceMuted,
    );
    expect(getByText("file-document-outline").props.color).toBe(
      colors.textSecondary,
    );

    fireEvent.press(getByTestId("mesa-attachment-draft-remove"));

    expect(onClearAnexoMesaRascunho).toHaveBeenCalledTimes(1);
  });
});
