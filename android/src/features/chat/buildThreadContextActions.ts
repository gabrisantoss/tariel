import type {
  BuildThreadContextStateInput,
  ThreadContextStateResult,
} from "../common/inspectorDerivedStateTypes";
import {
  listGuidedInspectionTemplates,
  type GuidedInspectionProgress,
} from "../inspection/guidedInspection";
import { buildReportPackDraftSummary } from "./reportPackHelpers";
import { guidedInspectionIconForTemplate } from "./guidedInspectionPresentation";

function adicionarAcoesModoGuiado(
  threadActions: ThreadContextStateResult["threadActions"],
  params: {
    guidedInspectionDraft: BuildThreadContextStateInput["guidedInspectionDraft"];
    guidedProgress: GuidedInspectionProgress | null;
    mesaDisponivel: boolean;
    onAdvanceGuidedInspection: BuildThreadContextStateInput["onAdvanceGuidedInspection"];
    onOpenMesaTab: BuildThreadContextStateInput["onOpenMesaTab"];
    onStopGuidedInspection: BuildThreadContextStateInput["onStopGuidedInspection"];
    stopLabel: string;
    stopTone: ThreadContextStateResult["threadActions"][number]["tone"];
    stopIcon: ThreadContextStateResult["threadActions"][number]["icon"];
  },
) {
  if (!params.guidedProgress?.isComplete) {
    threadActions.push({
      key: "guided-advance",
      label: "Avancar etapa",
      tone: "accent" as const,
      icon: "check-circle-outline" as const,
      onPress: params.onAdvanceGuidedInspection,
      testID: "guided-inspection-advance-button",
    });
  }
  if (
    params.guidedProgress?.isComplete &&
    params.guidedInspectionDraft?.mesaHandoff?.required &&
    params.mesaDisponivel
  ) {
    threadActions.push({
      key: "guided-open-mesa",
      label: "Abrir Revisão",
      tone: "danger" as const,
      icon: "clipboard-alert-outline" as const,
      onPress: params.onOpenMesaTab,
      testID: "guided-inspection-open-mesa-button",
    });
  }
  threadActions.push({
    key: "guided-stop",
    label: params.stopLabel,
    tone: params.stopTone,
    icon: params.stopIcon,
    onPress: params.onStopGuidedInspection,
    testID: "guided-inspection-stop-button",
  });
}

export function buildThreadContextActions(params: {
  activeCaseEntryModeIsEvidence: boolean;
  activeCaseFormalWorkflow: boolean;
  activeOwnerRole: string;
  blankCaseCreationInProgress: boolean;
  blankCaseCreationQueuedOffline: boolean;
  canChatFinalize: boolean;
  conversaAtiva: BuildThreadContextStateInput["conversaAtiva"];
  guidedInspectionDraft: BuildThreadContextStateInput["guidedInspectionDraft"];
  guidedProgress: GuidedInspectionProgress | null;
  mesaDisponivel: boolean;
  modoGuiadoAtivo: boolean;
  onAdvanceGuidedInspection: BuildThreadContextStateInput["onAdvanceGuidedInspection"];
  onOpenMesaTab: BuildThreadContextStateInput["onOpenMesaTab"];
  onOpenQualityGate: BuildThreadContextStateInput["onOpenQualityGate"];
  onResumeGuidedInspection: BuildThreadContextStateInput["onResumeGuidedInspection"];
  onStartFreeChat: BuildThreadContextStateInput["onStartFreeChat"];
  onStartGuidedInspection: BuildThreadContextStateInput["onStartGuidedInspection"];
  onStopGuidedInspection: BuildThreadContextStateInput["onStopGuidedInspection"];
  reportPackSummary: ReturnType<typeof buildReportPackDraftSummary>;
  vendoFinalizacao: boolean;
  vendoMesa: boolean;
}) {
  const threadActions: ThreadContextStateResult["threadActions"] = [];
  const qualityGateAction =
    !params.vendoMesa &&
    params.conversaAtiva?.laudoId &&
    params.activeCaseFormalWorkflow &&
    params.canChatFinalize
      ? {
          key: "chat-quality-gate",
          label: "Finalizar caso",
          tone: "success" as const,
          icon: "check-decagram-outline" as const,
          onPress: () => {
            void params.onOpenQualityGate();
          },
          testID: "chat-quality-gate-button",
        }
      : null;
  const openMesaFromFinalizationAction =
    params.vendoFinalizacao &&
    params.mesaDisponivel &&
    (params.activeOwnerRole === "mesa" ||
      params.reportPackSummary?.finalValidationMode === "mesa_required")
      ? {
          key: "finalization-open-mesa",
          label: "Abrir Revisão",
          tone: "danger" as const,
          icon: "clipboard-alert-outline" as const,
          onPress: params.onOpenMesaTab,
          testID: "finalization-open-mesa-button",
        }
      : null;

  if (!params.vendoMesa && !params.conversaAtiva?.laudoId) {
    if (params.modoGuiadoAtivo) {
      adicionarAcoesModoGuiado(threadActions, {
        guidedInspectionDraft: params.guidedInspectionDraft,
        guidedProgress: params.guidedProgress,
        mesaDisponivel: params.mesaDisponivel,
        onAdvanceGuidedInspection: params.onAdvanceGuidedInspection,
        onOpenMesaTab: params.onOpenMesaTab,
        onStopGuidedInspection: params.onStopGuidedInspection,
        stopIcon: "close-circle-outline",
        stopLabel: "Encerrar modo guiado",
        stopTone: "muted",
      });
    } else if (
      !params.blankCaseCreationInProgress &&
      !params.blankCaseCreationQueuedOffline
    ) {
      threadActions.push({
        key: "chat-free-start",
        label: "Chat livre",
        tone: "accent" as const,
        icon: "message-processing-outline" as const,
        onPress: params.onStartFreeChat,
        testID: "free-chat-start-button",
      });
      listGuidedInspectionTemplates()
        .filter(
          (template) =>
            template.key !== "padrao" &&
            /\bNR\d+[A-Z]?\b/i.test(template.label),
        )
        .forEach((template) => {
          threadActions.push({
            key: `guided-template-${template.key}`,
            label: template.label,
            tone: "accent" as const,
            icon: guidedInspectionIconForTemplate(template.key),
            onPress: () => {
              params.onStartGuidedInspection(template.key);
            },
            testID: `guided-inspection-template-${template.key}-button`,
          });
        });
    }
  } else if (
    !params.vendoMesa &&
    params.conversaAtiva?.laudoId &&
    params.conversaAtiva.permiteEdicao &&
    params.canChatFinalize
  ) {
    if (openMesaFromFinalizationAction) {
      threadActions.push(openMesaFromFinalizationAction);
    }
    if (params.modoGuiadoAtivo) {
      adicionarAcoesModoGuiado(threadActions, {
        guidedInspectionDraft: params.guidedInspectionDraft,
        guidedProgress: params.guidedProgress,
        mesaDisponivel: params.mesaDisponivel,
        onAdvanceGuidedInspection: params.onAdvanceGuidedInspection,
        onOpenMesaTab: params.onOpenMesaTab,
        onStopGuidedInspection: params.onStopGuidedInspection,
        stopIcon: "message-processing-outline",
        stopLabel: "Voltar ao chat",
        stopTone: "muted",
      });
    } else {
      if (qualityGateAction) {
        threadActions.push(qualityGateAction);
      }
      if (!params.vendoFinalizacao) {
        threadActions.push({
          key: "guided-resume",
          label: params.activeCaseEntryModeIsEvidence
            ? "Retomar coleta guiada"
            : "Abrir coleta guiada",
          tone: params.activeCaseEntryModeIsEvidence
            ? ("success" as const)
            : ("accent" as const),
          icon: "robot-outline" as const,
          onPress: params.onResumeGuidedInspection,
          testID: "guided-inspection-resume-button",
        });
      }
    }
  }

  if (
    openMesaFromFinalizationAction &&
    !threadActions.some(
      (item) => item.key === openMesaFromFinalizationAction.key,
    )
  ) {
    threadActions.push(openMesaFromFinalizationAction);
  }

  if (qualityGateAction && params.modoGuiadoAtivo) {
    const hasActionAlready = threadActions.some(
      (item) => item.key === qualityGateAction.key,
    );
    if (!hasActionAlready) {
      threadActions.push(qualityGateAction);
    }
  }

  return threadActions;
}
