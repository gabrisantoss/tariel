import { enLanguagePack } from "./en";
import { esLanguagePack } from "./es";
import { ptLanguagePack } from "./pt";
import type { LocalLanguagePack, TranslationTable } from "./types";

export type { LocalLanguagePack, TranslationTable };

export const EN = enLanguagePack;
export const ES = esLanguagePack;
export const PT = ptLanguagePack;

export const LOCAL_LANGUAGE_PACKS: Record<
  "pt" | "en" | "es",
  LocalLanguagePack
> = {
  pt: {
    locale: "pt",
    nativeLabel: "Português",
    label: "Portuguese",
    translations: PT,
  },
  en: {
    locale: "en",
    nativeLabel: "English",
    label: "English",
    translations: EN,
  },
  es: {
    locale: "es",
    nativeLabel: "Español",
    label: "Spanish",
    translations: ES,
  },
};

export const TABLES: Record<"en" | "es", TranslationTable> = {
  en: EN,
  es: ES,
};
