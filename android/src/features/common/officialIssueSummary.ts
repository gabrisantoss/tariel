import type { MobileOfficialIssueSummary } from "../../types/mobile";

export function isOfficialIssueReissueRecommended(
  summary: MobileOfficialIssueSummary | null | undefined,
): boolean {
  return Boolean(summary?.reissue_recommended || summary?.primary_pdf_diverged);
}

export function getOfficialIssueReissueDetail(
  summary: MobileOfficialIssueSummary | null | undefined,
  fallback = "Reemissão oficial recomendada pela governança do caso",
): string {
  return (
    summary?.detail?.trim() ||
    summary?.reissue_reason_summary?.trim() ||
    fallback
  );
}
