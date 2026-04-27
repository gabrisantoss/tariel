export type JsonRecord = Record<string, unknown>;

export function lerRegistro(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

export function lerArrayRegistros(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function lerTexto(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function lerNumero(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function lerBooleanOuNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

const THREAD_INTERNAL_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmobile_autonomous\b/gi, "Revisão interna governada"],
  [/\bmobile_review_allowed\b/gi, "Revisão interna + Mesa"],
  [/\bprimary_pdf_diverged\b/gi, "Reemissão recomendada"],
  [/\bissue_state_label\b/gi, "Estado da emissão"],
  [/\bissue_state\b/gi, "Estado da emissão"],
  [/\bsuperseded\b/gi, "Documento substituído"],
  [/\breviewer_issue\b/gi, "Emissão oficial"],
  [/\breviewer_decision\b/gi, "Revisão governada"],
  [/\boverride\b/gi, "ajuste humano"],
  [/\bdiff\b/gi, "histórico de alterações"],
  [/\bred flag\b/gi, "alerta crítico"],
];

export function sanitizarTextoThread(value: string): string {
  return THREAD_INTERNAL_TERM_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

export function textoThreadContemTermoInterno(value: string): boolean {
  return THREAD_INTERNAL_TERM_REPLACEMENTS.some(([pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function resumirIntegridadePdfOficial(
  officialIssue: JsonRecord | null,
  currentIssue: JsonRecord | null,
) {
  const comparisonStatus = lerTexto(currentIssue?.primary_pdf_comparison_status)
    .trim()
    .toLowerCase();
  const diverged =
    Boolean(currentIssue?.primary_pdf_diverged) ||
    comparisonStatus === "diverged";
  const reissueRecommended = Boolean(officialIssue?.reissue_recommended);
  const frozenVersion = lerTexto(currentIssue?.primary_pdf_storage_version);
  const currentVersion = lerTexto(
    currentIssue?.current_primary_pdf_storage_version,
  );
  const versionDetail = [
    frozenVersion ? `Emitido ${frozenVersion}` : "",
    currentVersion && currentVersion !== frozenVersion
      ? `Atual ${currentVersion}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const title = diverged
    ? "Reemissão recomendada"
    : reissueRecommended
      ? "Reemissão recomendada"
      : "";
  const summary = diverged
    ? "O PDF operacional atual divergiu do documento congelado na emissão oficial."
    : reissueRecommended
      ? "A emissão segue registrada, mas a governança recomenda gerar um novo pacote antes da próxima entrega pública."
      : "";

  return {
    diverged,
    title,
    summary,
    versionDetail,
  };
}
