export type TranslationTable = Record<string, string>;

export interface LocalLanguagePack {
  locale: "pt" | "en" | "es";
  nativeLabel: string;
  label: string;
  translations: TranslationTable;
}
