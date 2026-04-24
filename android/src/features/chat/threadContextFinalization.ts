import type { BuildThreadContextStateInput } from "../common/inspectorDerivedStateTypes";
import { buildReportPackDraftSummary } from "./reportPackHelpers";

import {
  resolverAllowedLifecycleTransitions,
  resolverCaseOwnerRole,
  rotuloCaseOwnerRole,
  targetThreadCaseLifecycle,
} from "./caseLifecycle";

export function rotuloModoHandoffMesa(
  reviewMode: string | null | undefined,
): string {
  const value = String(reviewMode || "")
    .trim()
    .toLowerCase();
  if (value === "mesa_required") {
    return "Mesa obrigatória";
  }
  if (value === "mobile_review_allowed") {
    return "Revisão mobile";
  }
  if (value === "mobile_autonomous") {
    return "Fluxo autônomo";
  }
  return value ? value.replace(/_/g, " ") : "Revisão governada";
}

export function detalheMotivoHandoffMesa(
  reasonCode: string | null | undefined,
): string {
  const value = String(reasonCode || "")
    .trim()
    .toLowerCase();
  if (value === "policy_review_mode") {
    return "A política ativa do tenant exige revisão humana antes da emissão.";
  }
  if (value === "coverage_return_request") {
    return "A cobertura deste caso exige validação extra antes do fechamento.";
  }
  if (!value) {
    return "A revisão humana foi marcada no fluxo guiado deste caso.";
  }
  return `Motivo registrado: ${value.replace(/_/g, " ")}.`;
}

export function rotuloUltimaEvidenciaGuiada(
  attachmentKind: string | null | undefined,
): string {
  const value = String(attachmentKind || "")
    .trim()
    .toLowerCase();
  if (value === "image") {
    return "Imagem vinculada a etapa guiada.";
  }
  if (value === "document") {
    return "Documento vinculado a etapa guiada.";
  }
  if (value === "mixed") {
    return "Mensagem e anexo vinculados a etapa guiada.";
  }
  return "Mensagem vinculada a etapa guiada.";
}

export function tomResumoReportPack(
  pendingBlocks: number,
  attentionBlocks: number,
): "accent" | "success" | "danger" {
  if (pendingBlocks > 0) {
    return "accent";
  }
  if (attentionBlocks > 0) {
    return "danger";
  }
  return "success";
}

function lerRegistro(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function lerTexto(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function lerNumero(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pluralizeFinalizationCount(
  value: number,
  singular: string,
  plural: string,
): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function resumirComposicaoBloqueios(params: {
  documentBlockers: number;
  pendingCount: number;
  attentionCount: number;
}) {
  const parts = [
    params.documentBlockers
      ? pluralizeFinalizationCount(
          params.documentBlockers,
          "bloqueio documental",
          "bloqueios documentais",
        )
      : "",
    params.pendingCount
      ? pluralizeFinalizationCount(
          params.pendingCount,
          "pendência do pré-laudo",
          "pendências do pré-laudo",
        )
      : "",
    !params.documentBlockers && !params.pendingCount && params.attentionCount
      ? pluralizeFinalizationCount(
          params.attentionCount,
          "ponto de atenção",
          "pontos de atenção",
        )
      : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function resumirIntegridadePdfOficial(params: {
  currentIssue: Record<string, unknown> | null;
}) {
  const currentIssue = params.currentIssue;
  const comparisonStatus = lerTexto(currentIssue?.primary_pdf_comparison_status)
    .trim()
    .toLowerCase();
  const diverged =
    Boolean(currentIssue?.primary_pdf_diverged) ||
    comparisonStatus === "diverged";
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

  return {
    diverged,
    versionDetail,
  };
}

export function resumirReemissaoRecomendada(total: number): string {
  return total === 1
    ? "1 reemissão recomendada"
    : `${total} reemissões recomendadas`;
}

export function detalharReemissaoRecomendada(total: number): string {
  return total === 1
    ? "Há 1 caso com PDF oficial divergente no mobile. Revise o histórico ou a central de atividade para reemitir o documento."
    : `Há ${total} casos com PDF oficial divergente no mobile. Revise o histórico ou a central de atividade para reemitir os documentos.`;
}

function resumirProximoPassoFinalizacao(params: {
  blockerCount: number;
  canChatFinalize: boolean;
  canChatReopen: boolean;
  caseLifecycleStatus: string;
  currentIssueNumber: string;
  issueInProgress: boolean;
  lifecycleDescription: string;
  primaryPdfDiverged: boolean;
  primaryPdfVersionDetail: string;
  reviewMode: string;
}) {
  const {
    blockerCount,
    canChatFinalize,
    canChatReopen,
    caseLifecycleStatus,
    currentIssueNumber,
    issueInProgress,
    lifecycleDescription,
    primaryPdfDiverged,
    primaryPdfVersionDetail,
    reviewMode,
  } = params;
  const emitted = caseLifecycleStatus === "emitido";

  if (primaryPdfDiverged) {
    return {
      detail: currentIssueNumber
        ? `O PDF atual divergiu da emissão ${currentIssueNumber}.${primaryPdfVersionDetail ? ` ${primaryPdfVersionDetail}.` : ""} Gere uma nova emissão antes de distribuir a versão atual.`
        : "O PDF atual divergiu do documento oficial congelado. Gere uma nova emissão antes de distribuir a versão atual.",
      icon: "alert-circle-outline" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "danger" as const,
      value: "Reemitir documento",
    };
  }

  if (emitted) {
    return {
      detail:
        "Documento oficial emitido. Reabra apenas se precisar iniciar um novo ciclo rastreável.",
      icon: "check-decagram-outline" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "success" as const,
      value: "Acompanhar emissão",
    };
  }

  if (issueInProgress) {
    return {
      detail: currentIssueNumber
        ? `A emissão governada já foi aberta como ${currentIssueNumber}. Acompanhe o status final do PDF e o rastro público deste documento.`
        : "A emissão governada já está em curso. Acompanhe o status final do PDF antes de reabrir ou duplicar a entrega.",
      icon: "file-certificate-outline" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "accent" as const,
      value: "Acompanhar emissão",
    };
  }

  if (canChatReopen) {
    return {
      detail: lifecycleDescription,
      icon: "history" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "danger" as const,
      value: "Reabrir no chat",
    };
  }

  if (blockerCount > 0) {
    return {
      detail:
        reviewMode === "mesa_required"
          ? "Resolva as pendências do pré-laudo no chat e então siga para a Mesa."
          : "Resolva as pendências do pré-laudo no chat antes de validar novamente.",
      icon:
        reviewMode === "mesa_required"
          ? ("clipboard-alert-outline" as const)
          : ("message-processing-outline" as const),
      key: "next-step",
      label: "Próximo passo",
      tone: "danger" as const,
      value:
        reviewMode === "mesa_required"
          ? "Corrigir e revisar"
          : "Corrigir no chat",
    };
  }

  if (reviewMode === "mesa_required") {
    return {
      detail:
        "O pacote está coerente, mas a política ativa ainda exige passagem pela Mesa antes da emissão.",
      icon: "clipboard-alert-outline" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "accent" as const,
      value: "Abrir Mesa",
    };
  }

  if (canChatFinalize) {
    return {
      detail:
        "O caso já está pronto para a decisão humana rastreável dentro do quality gate.",
      icon: "check-decagram-outline" as const,
      key: "next-step",
      label: "Próximo passo",
      tone: "success" as const,
      value: "Confirmar quality gate",
    };
  }

  return {
    detail: lifecycleDescription,
    icon: "arrow-right-circle-outline" as const,
    key: "next-step",
    label: "Próximo passo",
    tone: "accent" as const,
    value: "Continuar coleta",
  };
}

function resumirDecisaoEsperada(params: {
  reviewMode: string;
  emitted: boolean;
  issueInProgress: boolean;
  canChatFinalize: boolean;
}) {
  if (params.emitted) {
    return {
      detail:
        "O documento oficial já foi emitido. A decisão esperada agora é acompanhar distribuição ou reabrir só se iniciar um novo ciclo.",
      icon: "check-decagram-outline" as const,
      key: "expected-decision",
      label: "Decisão esperada",
      tone: "success" as const,
      value: "Acompanhar emissão",
    };
  }

  if (params.issueInProgress) {
    return {
      detail:
        "A trilha oficial já foi aberta. A decisão esperada agora é concluir a emissão e confirmar o PDF final congelado.",
      icon: "file-certificate-outline" as const,
      key: "expected-decision",
      label: "Decisão esperada",
      tone: "accent" as const,
      value: "Concluir emissão",
    };
  }

  if (params.reviewMode === "mesa_required") {
    return {
      detail:
        "A empresa exige parecer humano da Mesa antes do PDF final. O mobile deve preparar o caso para esse handoff.",
      icon: "clipboard-alert-outline" as const,
      key: "expected-decision",
      label: "Decisão esperada",
      tone: "danger" as const,
      value: "Parecer da mesa",
    };
  }

  if (params.reviewMode === "mobile_review_allowed") {
    return {
      detail:
        "A decisão humana pode acontecer no app ou escalar para a Mesa, conforme a governança ativa do caso.",
      icon: "account-check-outline" as const,
      key: "expected-decision",
      label: "Decisão esperada",
      tone: "accent" as const,
      value: "Validação humana",
    };
  }

  return {
    detail: params.canChatFinalize
      ? "O inspetor já pode concluir a validação humana no app mantendo o rastro formal do caso."
      : "O caso caminha para validação final do inspetor assim que o gate e a trilha documental estiverem coerentes.",
    icon: "check-circle-outline" as const,
    key: "expected-decision",
    label: "Decisão esperada",
    tone: params.canChatFinalize ? ("success" as const) : ("accent" as const),
    value: "Validação final no app",
  };
}

function resumirMotivoBloqueio(params: {
  blockerCount: number;
  attentionCount: number;
  blockedSections: string[];
  reportPackSummary:
    | {
        missingEvidenceMessages?: string[];
        readinessDetail?: string;
      }
    | null
    | undefined;
  issueIntegrityDiverged: boolean;
}) {
  if (params.issueIntegrityDiverged) {
    return {
      detail:
        "O PDF atual divergiu da emissão oficial congelada. A operação precisa reemitir antes de distribuir a versão vigente.",
      icon: "alert-circle-outline" as const,
      key: "blocking-reason",
      label: "Motivo do bloqueio",
      tone: "danger" as const,
      value: "PDF divergente",
    };
  }

  const missingEvidenceMessage =
    params.reportPackSummary?.missingEvidenceMessages?.find((item) =>
      String(item || "").trim(),
    );
  if (params.blockerCount > 0) {
    return {
      detail:
        missingEvidenceMessage ||
        (params.blockedSections.length
          ? `A etapa dominante ainda está em ${params.blockedSections.join(" · ")}.`
          : params.reportPackSummary?.readinessDetail ||
            "Ainda há pendências documentais ou do pré-laudo segurando o fechamento."),
      icon: "alert-circle-outline" as const,
      key: "blocking-reason",
      label: "Motivo do bloqueio",
      tone: "danger" as const,
      value: params.blockedSections[0] || "Pendências do caso",
    };
  }

  if (params.attentionCount > 0) {
    return {
      detail:
        params.reportPackSummary?.readinessDetail ||
        "A base fecha, mas ainda existem pontos de revisão fina antes da emissão.",
      icon: "progress-clock" as const,
      key: "blocking-reason",
      label: "Motivo do bloqueio",
      tone: "accent" as const,
      value: "Revisão fina pendente",
    };
  }

  return {
    detail:
      "O caso não tem bloqueio dominante neste momento. O restante do fluxo depende só da decisão humana prevista para esta política.",
    icon: "check-decagram-outline" as const,
    key: "blocking-reason",
    label: "Motivo do bloqueio",
    tone: "success" as const,
    value: "Sem bloqueio dominante",
  };
}

function resumirRotaSugeridaFinalizacao(params: {
  caseLifecycleStatus: string;
  reviewMode: string;
  canChatFinalize: boolean;
  canChatReopen: boolean;
  transitions: ReturnType<typeof resolverAllowedLifecycleTransitions>;
  ownerRole: string;
}) {
  const preferredTransition = params.transitions[0] || null;
  if (preferredTransition?.preferred_surface === "mesa") {
    return {
      detail:
        "A próxima superfície dominante do caso é a Mesa. Use esse handoff para concluir a decisão humana exigida.",
      icon: "clipboard-alert-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "danger" as const,
      value: "Abrir mesa",
    };
  }
  if (preferredTransition?.preferred_surface === "chat") {
    return {
      detail:
        "O caso ainda depende de coleta ou correção no chat antes de voltar ao fluxo final.",
      icon: "message-processing-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "accent" as const,
      value: "Voltar ao chat",
    };
  }
  if (preferredTransition?.preferred_surface === "mobile") {
    return {
      detail:
        "A próxima leitura principal continua sendo esta própria aba de Finalizar, sem troca de superfície.",
      icon: "check-circle-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "success" as const,
      value: "Seguir em finalizar",
    };
  }
  if (params.reviewMode === "mesa_required" || params.ownerRole === "mesa") {
    return {
      detail:
        "A política e o owner atual do caso apontam a Mesa como próxima etapa principal.",
      icon: "clipboard-alert-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "danger" as const,
      value: "Abrir mesa",
    };
  }
  if (params.canChatFinalize) {
    return {
      detail:
        "A base do caso já permite concluir a validação sem sair do fluxo atual do app.",
      icon: "check-circle-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "success" as const,
      value: "Seguir em finalizar",
    };
  }
  if (
    params.canChatReopen ||
    targetThreadCaseLifecycle(params.caseLifecycleStatus as any) === "chat"
  ) {
    return {
      detail:
        "Ainda existe trabalho operacional no chat antes da próxima decisão humana final.",
      icon: "message-processing-outline" as const,
      key: "suggested-route",
      label: "Rota sugerida",
      tone: "accent" as const,
      value: "Voltar ao chat",
    };
  }
  return {
    detail:
      "Acompanhe o status atual do caso e siga a próxima transição liberada pela governança ativa.",
    icon: "progress-clock" as const,
    key: "suggested-route",
    label: "Rota sugerida",
    tone: "accent" as const,
    value: "Acompanhar fluxo",
  };
}

export function resumirContextoFinalizacao(params: {
  canChatFinalize: boolean;
  canChatReopen: boolean;
  caseLifecycleStatus: string;
  conversaAtiva: BuildThreadContextStateInput["conversaAtiva"];
  lifecycleDescription: string;
  reportPackSummary: ReturnType<typeof buildReportPackDraftSummary>;
  tipoTemplateAtivoLabel: string;
}) {
  const { canChatFinalize, canChatReopen, caseLifecycleStatus } = params;
  const reviewPackage = lerRegistro(params.conversaAtiva?.reviewPackage);
  const reviewMode = lerTexto(
    reviewPackage?.review_mode,
    params.reportPackSummary?.finalValidationMode || "",
  );
  const reviewModeLabel = rotuloModoHandoffMesa(reviewMode);
  const documentBlockers = Array.isArray(reviewPackage?.document_blockers)
    ? reviewPackage.document_blockers.length
    : 0;
  const officialIssue = lerRegistro(reviewPackage?.emissao_oficial);
  const publicVerification = lerRegistro(reviewPackage?.public_verification);
  const currentIssue = lerRegistro(officialIssue?.current_issue);
  const issueIntegrity = resumirIntegridadePdfOficial({
    currentIssue,
  });
  const currentIssueNumber = lerTexto(currentIssue?.issue_number);
  const verificationUrl = lerTexto(publicVerification?.verification_url);
  const signatoryCount = lerNumero(officialIssue?.eligible_signatory_count);
  const signatoryStatus = lerTexto(
    officialIssue?.signature_status_label,
    currentIssueNumber ? "Documento rastreável em curso." : "",
  );
  const pendingCount =
    (params.reportPackSummary?.pendingBlocks || 0) +
    (params.reportPackSummary?.missingEvidenceCount || 0);
  const attentionCount = params.reportPackSummary?.attentionBlocks || 0;
  const blockerCount = documentBlockers + pendingCount;
  const blockedSections = (
    params.reportPackSummary?.highlightedDocumentSections || []
  )
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 3);
  const emitted = caseLifecycleStatus === "emitido";
  const issueInProgress = Boolean(currentIssueNumber) && !emitted;
  const ownerRole = resolverCaseOwnerRole({
    conversation: params.conversaAtiva,
    lifecycleStatus: caseLifecycleStatus as any,
  });
  const ownerRoleLabel = rotuloCaseOwnerRole(ownerRole);
  const allowedLifecycleTransitions = resolverAllowedLifecycleTransitions({
    conversation: params.conversaAtiva,
    lifecycleStatus: caseLifecycleStatus as any,
  });
  const blockerBreakdown = resumirComposicaoBloqueios({
    documentBlockers,
    pendingCount,
    attentionCount,
  });
  const deliveryLabel = currentIssueNumber
    ? currentIssueNumber
    : emitted
      ? "PDF final emitido"
      : params.reportPackSummary
        ? params.reportPackSummary.readinessLabel
        : "PDF final governado";
  const deliveryDetail = currentIssueNumber
    ? [
        lerTexto(currentIssue?.issue_state_label, "Emissão governada"),
        lerTexto(currentIssue?.issued_at),
        issueIntegrity.diverged ? "PDF atual divergiu do emitido" : "",
        issueIntegrity.versionDetail,
      ]
        .filter(Boolean)
        .join(" • ")
    : params.reportPackSummary
      ? `${params.reportPackSummary.readinessLabel}. ${params.reportPackSummary.readinessDetail}`
      : "A entrega estável deste fluxo é o PDF final revisado por humano.";

  const spotlight = issueIntegrity.diverged
    ? {
        label: "Reemissão recomendada",
        tone: "danger" as const,
        icon: "alert-circle-outline" as const,
      }
    : emitted
      ? {
          label: "PDF emitido",
          tone: "success" as const,
          icon: "check-decagram-outline" as const,
        }
      : issueInProgress
        ? {
            label: "Emissão em curso",
            tone: "accent" as const,
            icon: "file-certificate-outline" as const,
          }
        : blockerCount > 0
          ? {
              label: "Pendências antes do PDF",
              tone: "danger" as const,
              icon: "alert-circle-outline" as const,
            }
          : canChatFinalize
            ? {
                label: "Pronto para decisão humana",
                tone: "success" as const,
                icon: "file-document-check-outline" as const,
              }
            : {
                label: "Fechamento governado",
                tone: "accent" as const,
                icon: "clipboard-clock-outline" as const,
              };
  const nextStepInsight = resumirProximoPassoFinalizacao({
    blockerCount,
    canChatFinalize,
    canChatReopen,
    caseLifecycleStatus,
    currentIssueNumber,
    issueInProgress,
    lifecycleDescription: params.lifecycleDescription,
    primaryPdfDiverged: issueIntegrity.diverged,
    primaryPdfVersionDetail: issueIntegrity.versionDetail,
    reviewMode,
  });
  const expectedDecisionInsight = resumirDecisaoEsperada({
    reviewMode,
    emitted,
    issueInProgress,
    canChatFinalize,
  });
  const blockingReasonInsight = resumirMotivoBloqueio({
    blockerCount,
    attentionCount,
    blockedSections,
    reportPackSummary: params.reportPackSummary,
    issueIntegrityDiverged: issueIntegrity.diverged,
  });
  const suggestedRouteInsight = resumirRotaSugeridaFinalizacao({
    caseLifecycleStatus,
    reviewMode,
    canChatFinalize,
    canChatReopen,
    transitions: allowedLifecycleTransitions,
    ownerRole,
  });

  return {
    title:
      params.conversaAtiva?.laudoCard?.titulo ||
      (params.conversaAtiva?.laudoId
        ? `Caso #${params.conversaAtiva.laudoId}`
        : "Fechamento do caso"),
    description: emitted
      ? "O caso já saiu como documento oficial. Reabra apenas se precisar iniciar um novo ciclo."
      : issueInProgress
        ? "A emissão governada já foi aberta. Acompanhe o status do PDF final e a verificação pública antes de reabrir o caso."
        : canChatReopen
          ? params.lifecycleDescription
          : canChatFinalize
            ? "Revise a rota de aprovação, o pacote documental e a emissão antes de concluir."
            : "Este fluxo gera laudo formal com validação humana antes do PDF final.",
    spotlight,
    chips: [
      {
        key: "outcome",
        label: "Saída: laudo formal",
        tone: emitted ? ("success" as const) : ("accent" as const),
        icon: emitted
          ? ("file-document-check-outline" as const)
          : ("file-document-edit-outline" as const),
      },
      {
        key: "review-mode",
        label: reviewModeLabel,
        tone:
          reviewMode === "mesa_required"
            ? ("danger" as const)
            : reviewMode === "mobile_autonomous"
              ? ("success" as const)
              : ("accent" as const),
        icon:
          reviewMode === "mesa_required"
            ? ("clipboard-alert-outline" as const)
            : reviewMode === "mobile_autonomous"
              ? ("check-decagram-outline" as const)
              : ("account-check-outline" as const),
      },
      {
        key: "template",
        label: params.tipoTemplateAtivoLabel,
        tone: "muted" as const,
        icon: "shape-outline" as const,
      },
    ],
    insights: [
      {
        key: "final-output",
        label: "Saída",
        value: emitted ? "Laudo emitido" : "Laudo formal",
        detail:
          "Chat livre pode terminar só como histórico ou relatório genérico, mas este caso já está no trilho formal de emissão.",
        tone: emitted ? ("success" as const) : ("accent" as const),
        icon: emitted
          ? ("check-decagram-outline" as const)
          : ("file-document-outline" as const),
      },
      {
        key: "human-validation",
        label: "Validação humana",
        value: reviewModeLabel,
        detail:
          reviewMode === "mesa_required"
            ? "A política ativa da empresa exige passagem pela Mesa antes da emissão."
            : reviewMode === "mobile_review_allowed"
              ? "A empresa pode validar no mobile ou escalar para a Mesa conforme a governança do caso."
              : reviewMode === "mobile_autonomous"
                ? "O inspetor pode validar no mobile, mas a decisão final continua humana."
                : "Nenhum laudo é declarado pronto sem uma decisão humana rastreável.",
        tone:
          reviewMode === "mesa_required"
            ? ("danger" as const)
            : emitted || canChatFinalize
              ? ("success" as const)
              : ("accent" as const),
        icon:
          reviewMode === "mesa_required"
            ? ("clipboard-alert-outline" as const)
            : ("account-check-outline" as const),
      },
      {
        key: "current-owner",
        label: "Owner atual",
        value: ownerRoleLabel,
        detail:
          ownerRole === "mesa"
            ? "A Mesa domina o próximo movimento do caso neste momento."
            : ownerRole === "none"
              ? "O ciclo técnico principal já foi concluído e o restante é acompanhamento documental."
              : "O inspetor segue como dono do próximo avanço operacional.",
        tone:
          ownerRole === "mesa"
            ? ("danger" as const)
            : ownerRole === "none"
              ? ("success" as const)
              : ("accent" as const),
        icon:
          ownerRole === "mesa"
            ? ("clipboard-alert-outline" as const)
            : ownerRole === "none"
              ? ("check-decagram-outline" as const)
              : ("account-outline" as const),
      },
      {
        key: "delivery",
        label: "Entrega final",
        value: deliveryLabel,
        detail: deliveryDetail || "PDF final governado como artefato oficial.",
        tone: emitted
          ? ("success" as const)
          : blockerCount > 0
            ? ("danger" as const)
            : ("accent" as const),
        icon: emitted
          ? ("file-document-check-outline" as const)
          : ("file-document-outline" as const),
      },
      currentIssueNumber || verificationUrl
        ? {
            key: "verification",
            label: "Rastro público",
            value: verificationUrl ? "Link disponível" : "Emissão registrada",
            detail:
              verificationUrl ||
              currentIssueNumber ||
              "A emissão final deste caso já possui rastro oficial.",
            tone: emitted
              ? ("success" as const)
              : issueInProgress
                ? ("accent" as const)
                : ("muted" as const),
            icon: verificationUrl
              ? ("link-variant" as const)
              : ("file-certificate-outline" as const),
          }
        : null,
      {
        key: "blockers",
        label: "Bloqueios",
        value:
          blockerCount > 0
            ? blockerBreakdown ||
              `${blockerCount} pendência${blockerCount === 1 ? "" : "s"}`
            : attentionCount > 0
              ? blockerBreakdown || `${attentionCount} atenção`
              : "Sem bloqueios",
        detail:
          blockerCount > 0
            ? `${blockerBreakdown || `${blockerCount} pendências`} ainda seguram o fechamento.${blockedSections.length ? ` Foco atual: ${blockedSections.join(" · ")}.` : ""}`
            : attentionCount > 0
              ? "A base já fecha, mas ainda existem pontos para revisão fina antes da emissão."
              : "Pacote documental e pré-laudo coerentes para seguir no fluxo final.",
        tone:
          blockerCount > 0
            ? ("danger" as const)
            : attentionCount > 0
              ? ("accent" as const)
              : ("success" as const),
        icon:
          blockerCount > 0
            ? ("alert-circle-outline" as const)
            : ("check-decagram-outline" as const),
      },
      blockingReasonInsight,
      nextStepInsight,
      expectedDecisionInsight,
      suggestedRouteInsight,
      {
        key: "governance",
        label: "Assinatura",
        value:
          signatoryCount > 0
            ? `${signatoryCount} signatário${signatoryCount === 1 ? "" : "s"}`
            : "Governança ativa",
        detail:
          signatoryStatus ||
          "Admin Cliente acompanha a operação, mas a assinatura segue a política governada do tenant.",
        tone: signatoryCount > 0 ? ("success" as const) : ("muted" as const),
        icon: "shield-check-outline" as const,
      },
    ].filter((item): item is Exclude<typeof item, null> => item !== null),
  };
}

export type ThreadContextFinalizationSummary = ReturnType<
  typeof resumirContextoFinalizacao
>;
