import { LOCAL_LANGUAGE_PACKS } from "./languagePacks";
import { resolveAppLocale, translateText } from "./appTranslation";

describe("appTranslation", () => {
  it("resolve o idioma salvo para o pacote local correto", () => {
    expect(resolveAppLocale("Português")).toBe("pt");
    expect(resolveAppLocale("Inglês")).toBe("en");
    expect(resolveAppLocale("Espanhol")).toBe("es");
  });

  it("usa pacotes locais sem download para textos estáticos", () => {
    expect(LOCAL_LANGUAGE_PACKS.en.translations.Configurações).toBe("Settings");
    expect(LOCAL_LANGUAGE_PACKS.es.translations.Configurações).toBe(
      "Configuración",
    );
    expect(translateText("Configurações", "en")).toBe("Settings");
    expect(translateText("Configurações", "es")).toBe("Configuración");
  });

  it("mantem portugues como idioma base e traduz textos dinamicos", () => {
    expect(translateText("Configurações", "pt")).toBe("Configurações");
    expect(translateText("2 pendências na fila offline.", "en")).toBe(
      "2 pending items in offline queue.",
    );
    expect(translateText("3 retornos novos da mesa.", "es")).toBe(
      "3 retornos nuevos de la mesa.",
    );
  });
});
