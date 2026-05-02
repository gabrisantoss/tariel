import * as ImagePicker from "expo-image-picker";

import { LIMITE_FOTOS_SELECAO_CHAT } from "./attachmentFileHelpers";
import { selecionarImagemRascunhoFlow } from "./attachmentDraftFlows";

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

describe("attachmentDraftFlows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      granted: true,
    });
  });

  it("abre a galeria do chat com selecao multipla limitada a 10 fotos", async () => {
    const assets = Array.from({ length: 12 }, (_, index) => ({
      uri: `file://foto-${index}.jpg`,
      base64: `base64-${index}`,
      mimeType: "image/jpeg",
      fileName: `foto-${index}.jpg`,
    }));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets,
    });
    const montarAnexoImagens = jest.fn(() => ({
      kind: "image_set" as const,
      label: "10 fotos selecionadas",
      resumo: "Fotos prontas",
      imagens: [],
    }));
    const onSetAnexoRascunho = jest.fn();

    await selecionarImagemRascunhoFlow({
      abaAtiva: "chat",
      preparandoAnexo: false,
      uploadArquivosAtivo: true,
      imageQuality: 0.7,
      arquivosPermitidos: true,
      montarAnexoImagens,
      onSetAnexoMesaRascunho: jest.fn(),
      onSetAnexoRascunho,
      onSetErroConversa: jest.fn(),
      onSetPreparandoAnexo: jest.fn(),
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: true,
        selectionLimit: LIMITE_FOTOS_SELECAO_CHAT,
      }),
    );
    expect(montarAnexoImagens).toHaveBeenCalledWith(
      assets.slice(0, LIMITE_FOTOS_SELECAO_CHAT),
      "Imagem pronta para seguir com a mensagem do inspetor.",
    );
    expect(onSetAnexoRascunho).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "image_set" }),
    );
  });

  it("mantem a mesa com selecao unica de imagem", async () => {
    const asset = {
      uri: "file://foto.jpg",
      base64: "base64",
      mimeType: "image/jpeg",
      fileName: "foto.jpg",
    };
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [asset],
    });
    const montarAnexoImagens = jest.fn(() => ({
      kind: "image" as const,
      label: "foto.jpg",
      resumo: "Foto pronta",
      dadosImagem: "base64",
      previewUri: "file://foto.jpg",
      fileUri: "file://foto.jpg",
      mimeType: "image/jpeg",
    }));
    const onSetAnexoMesaRascunho = jest.fn();

    await selecionarImagemRascunhoFlow({
      abaAtiva: "mesa",
      preparandoAnexo: false,
      uploadArquivosAtivo: true,
      imageQuality: 0.7,
      arquivosPermitidos: true,
      montarAnexoImagens,
      onSetAnexoMesaRascunho,
      onSetAnexoRascunho: jest.fn(),
      onSetErroConversa: jest.fn(),
      onSetPreparandoAnexo: jest.fn(),
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: false,
        selectionLimit: 1,
      }),
    );
    expect(montarAnexoImagens).toHaveBeenCalledWith(
      [asset],
      "Imagem pronta para seguir direto para a mesa avaliadora.",
    );
    expect(onSetAnexoMesaRascunho).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "image" }),
    );
  });
});
