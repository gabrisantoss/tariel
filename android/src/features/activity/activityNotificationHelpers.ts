import type { MobileLaudoCard, MobileMesaMessage } from "../../types/mobile";
import {
  descricaoCaseLifecycle,
  mapearLifecycleVisual,
  resolverAllowedLifecycleTransitions,
  resolverAllowedSurfaceActions,
  resolverCaseLifecycleStatus,
  resolverCaseOwnerRole,
  rotuloCaseLifecycle,
  targetThreadCaseLifecycle,
} from "../chat/caseLifecycle";
import { buildReportPackDraftSummary } from "../chat/reportPackHelpers";
import type { ActiveThread, MobileActivityNotification } from "../chat/types";
import { resumoMensagemAtividade } from "../common/messagePreviewHelpers";
import {
  getOfficialIssueReissueDetail,
  isOfficialIssueReissueRecommended,
} from "../common/officialIssueSummary";

const MAX_LAUDOS_MONITORADOS_MESA = 6;
const INTERNAL_ACTIVITY_LABELS: Array<[RegExp, string]> = [
  [/\bmobile_autonomous\b/gi, "Revisão interna governada"],
  [/\bmobile_review_allowed\b/gi, "Revisão interna governada"],
  [/\bprimary_pdf_diverged\b/gi, "Reemissão recomendada"],
  [/\bissue_state_label\b/gi, "Estado da emissão"],
  [/\bissue_state\b/gi, "Estado da emissão"],
  [/\bsuperseded\b/gi, "Documento substituído"],
  [/\breviewer_issue\b/gi, "Emissão oficial"],
  [/\breviewer_decision\b/gi, "Revisão governada"],
  [/\btenant_without_mesa\b/gi, "Não incluído no pacote"],
  [/\bnr35_mesa_required_unavailable\b/gi, "Família exige Mesa"],
];

export function sanitizarTextoNotificacaoAtividade(value: string): string {
  return INTERNAL_ACTIVITY_LABELS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value || ""),
  );
}

function resumirStatusOperacionalLaudo(params: {
  item: MobileLaudoCard;
  lifecycleDetail: string;
  lifecycleStatus: string;
  ownerRole: string;
  reportPackSummary: ReturnType<typeof buildReportPackDraftSummary>;
}) {
  const {
    item,
    lifecycleDetail,
    lifecycleStatus,
    ownerRole,
    reportPackSummary,
  } = params;

  if (lifecycleStatus === "devolvido_para_correcao") {
    if (reportPackSummary?.pendingBlocks) {
      return `${item.titulo} voltou para correção com ${reportPackSummary.pendingBlocks} bloqueio${reportPackSummary.pendingBlocks === 1 ? "" : "s"} no pré-laudo. Abra o chat para ajustar antes de reenviar.`;
    }
    return `${item.titulo} voltou para correção. Abra o chat para ajustar o caso antes da próxima decisão.`;
  }

  if (lifecycleStatus === "aguardando_mesa") {
    return `${item.titulo} já foi enviado para a Mesa Avaliadora. Abra a aba Mesa para acompanhar a entrada da revisão humana.`;
  }

  if (lifecycleStatus === "em_revisao_mesa") {
    return `${item.titulo} está em revisão humana. Abra a Mesa Avaliadora para acompanhar pendências e respostas.`;
  }

  if (
    lifecycleStatus === "laudo_em_coleta" ||
    lifecycleStatus === "pre_laudo"
  ) {
    if (reportPackSummary?.pendingBlocks) {
      return `${item.titulo} segue em coleta com ${reportPackSummary.pendingBlocks} bloqueio${reportPackSummary.pendingBlocks === 1 ? "" : "s"} no pré-laudo. Abra o chat para completar evidências e destravar a validação.`;
    }
    if (reportPackSummary?.attentionBlocks) {
      return `${item.titulo} segue em consolidação com ${reportPackSummary.attentionBlocks} ponto${reportPackSummary.attentionBlocks === 1 ? "" : "s"} em revisão. Abra o chat para fechar o pré-laudo antes da validação final.`;
    }
  }

  return `${item.titulo} agora está em ${rotuloCaseLifecycle(lifecycleStatus as any).toLowerCase()}. ${lifecycleDetail}${ownerRole === "mesa" ? " Acompanhe a Mesa Avaliadora no app." : ""}`;
}

function resolverResumoReemissaoPdfOficial(item: MobileLaudoCard): {
  title: string;
  body: string;
} | null {
  const summary = item.official_issue_summary;
  if (!isOfficialIssueReissueRecommended(summary)) {
    return null;
  }

  const detail = getOfficialIssueReissueDetail(summary).replace(/[.。]+$/u, "");
  return {
    title: String(summary?.label || "").trim() || "Reemissão recomendada",
    body: `${item.titulo}: ${detail}. Abra a finalização para reemitir.`,
  };
}

function obterEstadoPendenciaMesa(item: MobileMesaMessage): string {
  if (
    item.pendency_state === "open" ||
    item.pendency_state === "resolved" ||
    item.pendency_state === "not_applicable"
  ) {
    return item.pendency_state;
  }
  const mensagemEhPendencia =
    item.item_kind === "pendency" ||
    item.message_kind === "mesa_pendency" ||
    item.tipo === "humano_eng";
  if (!mensagemEhPendencia) {
    if (item.resolvida_em) {
      return "resolved";
    }
    return "not_applicable";
  }
  return item.resolvida_em ? "resolved" : "open";
}

export function assinaturaStatusLaudo(item: MobileLaudoCard): string {
  const base = [
    item.status_card,
    item.status_revisao,
    item.status_card_label,
    item.permite_reabrir ? "1" : "0",
    item.permite_edicao ? "1" : "0",
  ];
  const lifecycleStatus = resolverCaseLifecycleStatus({ card: item });
  const ownerRole = resolverCaseOwnerRole({
    card: item,
    lifecycleStatus,
  });
  const transitions = resolverAllowedLifecycleTransitions({
    card: item,
    lifecycleStatus,
  }).map((transition) => transition.target_status);
  const surfaceActions = resolverAllowedSurfaceActions({
    card: item,
    lifecycleStatus,
    ownerRole,
  });
  base.push(
    lifecycleStatus,
    ownerRole,
    transitions.join(","),
    surfaceActions.join(","),
  );
  const reissueSummary = item.official_issue_summary;
  if (isOfficialIssueReissueRecommended(reissueSummary)) {
    base.push(
      "reissue",
      String(reissueSummary?.issue_number || ""),
      String(reissueSummary?.primary_pdf_storage_version || ""),
      String(reissueSummary?.current_primary_pdf_storage_version || ""),
    );
  }
  return base.join("|");
}

export function assinaturaMensagemMesa(item: MobileMesaMessage): string {
  return [
    item.id,
    item.lida ? "1" : "0",
    obterEstadoPendenciaMesa(item),
    item.texto || "",
  ].join("|");
}

export function formatarTipoTemplateLaudo(
  value: string | null | undefined,
): string {
  const texto = String(value || "").trim();
  if (!texto) {
    return "Laudo padrão";
  }

  return texto
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase(),
    )
    .join(" ");
}

export function criarNotificacaoStatusLaudo(
  item: MobileLaudoCard,
): MobileActivityNotification {
  const reissueSummary = resolverResumoReemissaoPdfOficial(item);
  if (reissueSummary) {
    return {
      id: `status:${item.id}:${assinaturaStatusLaudo(item)}`,
      kind: "alerta_critico",
      laudoId: item.id,
      title: sanitizarTextoNotificacaoAtividade(reissueSummary.title),
      body: sanitizarTextoNotificacaoAtividade(reissueSummary.body),
      createdAt: new Date().toISOString(),
      unread: true,
      targetThread: "finalizar",
    };
  }

  const lifecycleStatus = resolverCaseLifecycleStatus({ card: item });
  const ownerRole = resolverCaseOwnerRole({
    card: item,
    lifecycleStatus,
  });
  const reportPackSummary = buildReportPackDraftSummary(item.report_pack_draft);
  const prontoParaValidar =
    Boolean(reportPackSummary?.autonomyReady) ||
    Boolean(reportPackSummary?.readyForStructuredForm);
  const exigeMesaNaValidacao =
    reportPackSummary?.finalValidationMode === "mesa_required";
  const lifecycleDetail = descricaoCaseLifecycle(lifecycleStatus);
  const mapaTitulo: Record<string, string> = {
    analise_livre: "Caso em análise livre",
    pre_laudo: "Caso em pré-laudo",
    laudo_em_coleta: "Laudo em coleta",
    aguardando_mesa: "Caso enviado para a Mesa Avaliadora",
    em_revisao_mesa: "Mesa revisando o caso",
    devolvido_para_correcao: "Caso devolvido para correção",
    aprovado: "Caso aprovado",
    emitido: "Documento final emitido",
  };

  if (prontoParaValidar && exigeMesaNaValidacao) {
    return {
      id: `status:${item.id}:${assinaturaStatusLaudo(item)}`,
      kind: "status",
      laudoId: item.id,
      title: "Caso pronto para Mesa Avaliadora",
      body: sanitizarTextoNotificacaoAtividade(
        `${item.titulo} já pode seguir para a Mesa Avaliadora. Abra a aba Mesa para concluir a decisão humana rastreável.`,
      ),
      createdAt: new Date().toISOString(),
      unread: true,
      targetThread: "mesa",
    };
  }

  if (prontoParaValidar) {
    return {
      id: `status:${item.id}:${assinaturaStatusLaudo(item)}`,
      kind: "status",
      laudoId: item.id,
      title: "Caso pronto para validar",
      body: sanitizarTextoNotificacaoAtividade(
        `${item.titulo} já está pronto para validação final. Abra Finalizar para revisar o quality gate do caso.`,
      ),
      createdAt: new Date().toISOString(),
      unread: true,
      targetThread: "finalizar",
    };
  }

  return {
    id: `status:${item.id}:${assinaturaStatusLaudo(item)}`,
    kind: "status",
    laudoId: item.id,
    title: mapaTitulo[lifecycleStatus] || "Status do laudo atualizado",
    body: sanitizarTextoNotificacaoAtividade(
      resumirStatusOperacionalLaudo({
        item,
        lifecycleDetail,
        lifecycleStatus,
        ownerRole,
        reportPackSummary,
      }),
    ),
    createdAt: new Date().toISOString(),
    unread: true,
    targetThread: targetThreadCaseLifecycle(lifecycleStatus),
  };
}

export function criarNotificacaoMesa(
  kind: "status" | "mesa_nova" | "mesa_resolvida" | "mesa_reaberta",
  mensagemMesa: MobileMesaMessage,
  tituloLaudo: string,
): MobileActivityNotification {
  const mapaTitulo: Record<
    "status" | "mesa_nova" | "mesa_resolvida" | "mesa_reaberta",
    string
  > = {
    status: "Atividade da Mesa Avaliadora",
    mesa_nova: "Nova mensagem da Mesa Avaliadora",
    mesa_resolvida: "Pendência marcada como resolvida",
    mesa_reaberta: "Pendência reaberta pela Mesa Avaliadora",
  };
  const fallback =
    kind === "mesa_resolvida"
      ? "A Mesa Avaliadora marcou uma pendência como resolvida."
      : kind === "mesa_reaberta"
        ? "A Mesa Avaliadora reabriu uma pendência para novo ajuste."
        : "A Mesa Avaliadora enviou uma nova atualização.";

  return {
    id:
      kind === "mesa_nova"
        ? `mesa:${mensagemMesa.id}`
        : `mesa:${mensagemMesa.id}:${kind}:${obterEstadoPendenciaMesa(mensagemMesa)}`,
    kind,
    laudoId: mensagemMesa.laudo_id,
    title: mapaTitulo[kind],
    body: sanitizarTextoNotificacaoAtividade(
      `${tituloLaudo}: ${resumoMensagemAtividade(mensagemMesa.texto, fallback)}`,
    ),
    createdAt: new Date().toISOString(),
    unread: true,
    targetThread: "mesa",
  };
}

export function criarNotificacaoSistema(params: {
  title: string;
  body: string;
  kind?: "system" | "alerta_critico";
  laudoId?: number | null;
  targetThread?: ActiveThread;
}): MobileActivityNotification {
  const kind = params.kind || "system";
  return {
    id: `${kind}:${Date.now()}:${Math.random().toString(16).slice(2, 7)}`,
    kind,
    laudoId: params.laudoId ?? null,
    title: sanitizarTextoNotificacaoAtividade(params.title),
    body: sanitizarTextoNotificacaoAtividade(params.body),
    createdAt: new Date().toISOString(),
    unread: true,
    targetThread: params.targetThread || "chat",
  };
}

export function prioridadeNotificacaoAtividade(
  item: MobileActivityNotification,
): number {
  if (item.unread && item.kind === "alerta_critico") {
    return 0;
  }
  if (item.unread && item.kind === "mesa_reaberta") {
    return 1;
  }
  if (item.unread && item.kind === "mesa_nova") {
    return 2;
  }
  if (item.unread && item.kind === "status") {
    return 3;
  }
  if (item.unread && item.kind === "mesa_resolvida") {
    return 4;
  }
  if (item.unread) {
    return 5;
  }
  if (item.kind === "alerta_critico") {
    return 6;
  }
  return 7;
}

export function rotuloCategoriaNotificacaoAtividade(
  item: MobileActivityNotification,
): string {
  if (item.kind === "alerta_critico") {
    return "Reemissão recomendada";
  }
  if (
    item.kind === "mesa_nova" ||
    item.kind === "mesa_resolvida" ||
    item.kind === "mesa_reaberta"
  ) {
    return "Mesa Avaliadora";
  }
  if (item.kind === "status") {
    return "Status do caso";
  }
  return "Sistema";
}

export function hintDestinoNotificacaoAtividade(
  item: MobileActivityNotification,
): string {
  if (item.targetThread === "finalizar") {
    return "Ver emissão oficial";
  }
  if (item.targetThread === "mesa") {
    return "Abrir Mesa Avaliadora";
  }
  return "Abrir caso";
}

export function ordenarNotificacoesAtividade(
  items: readonly MobileActivityNotification[],
): MobileActivityNotification[] {
  return [...items].sort((a, b) => {
    const priorityDiff =
      prioridadeNotificacaoAtividade(a) - prioridadeNotificacaoAtividade(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function selecionarLaudosParaMonitoramentoMesa(params: {
  laudos: MobileLaudoCard[];
  laudoAtivoId: number | null;
}): number[] {
  const ids: number[] = [];

  if (params.laudoAtivoId) {
    ids.push(params.laudoAtivoId);
  }

  for (const item of params.laudos) {
    if (ids.length >= MAX_LAUDOS_MONITORADOS_MESA) {
      break;
    }
    if (ids.includes(item.id)) {
      continue;
    }
    const lifecycleStatus = resolverCaseLifecycleStatus({ card: item });
    const ownerRole = resolverCaseOwnerRole({
      card: item,
      lifecycleStatus,
    });
    if (ownerRole === "mesa" || lifecycleStatus === "devolvido_para_correcao") {
      ids.push(item.id);
    }
  }

  return ids;
}

export function mapearStatusLaudoVisual(statusCard: string) {
  return mapearLifecycleVisual(statusCard);
}
