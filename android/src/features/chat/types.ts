import type {
  MobileActiveOwnerRole,
  MobileAttachmentPolicy,
  MobileChatMessage,
  MobileChatMode,
  MobileCaseLifecycleStatus,
  MobileCaseWorkflowMode,
  MobileEstadoLaudo,
  MobileGuidedInspectionDraftPayload,
  MobileInspectionEntryModeEffective,
  MobileInspectionEntryModePreference,
  MobileLaudoCard,
  MobileLifecycleTransition,
  MobileQualityGateResponse,
  MobileReportPackDraft,
  MobileReviewPackage,
  MobileSurfaceAction,
} from "../../types/mobile";
import type { AppSettings } from "../../settings";

export type ActiveThread = "chat" | "mesa" | "finalizar";
export type ActivityNotificationKind =
  | "status"
  | "mesa_nova"
  | "mesa_resolvida"
  | "mesa_reaberta"
  | "system"
  | "alerta_critico";
export type ActivityNotificationCategory =
  | "chat"
  | "mesa"
  | "system"
  | "critical";
export type OfflinePendingOperation = "message" | "quality_gate_finalize";
export type ChatCaseCreationState =
  | "idle"
  | "creating"
  | "created"
  | "queued_offline"
  | "error";

export interface ComposerImageAttachment {
  kind: "image";
  label: string;
  resumo: string;
  dadosImagem: string;
  previewUri: string;
  fileUri: string;
  mimeType: string;
}

export type ComposerAttachment =
  | ComposerImageAttachment
  | {
      kind: "image_set";
      label: string;
      resumo: string;
      imagens: ComposerImageAttachment[];
    }
  | {
      kind: "document";
      label: string;
      resumo: string;
      textoDocumento: string;
      nomeDocumento: string;
      chars: number;
      truncado: boolean;
      fileUri: string;
      mimeType: string;
    };

export interface MessageReferenceState {
  id: number;
  texto: string;
}

export interface ChatState {
  laudoId: number | null;
  estado: MobileEstadoLaudo | string;
  statusCard: string;
  permiteEdicao: boolean;
  permiteReabrir: boolean;
  laudoCard: MobileLaudoCard | null;
  caseLifecycleStatus?: MobileCaseLifecycleStatus;
  caseWorkflowMode?: MobileCaseWorkflowMode;
  activeOwnerRole?: MobileActiveOwnerRole;
  allowedNextLifecycleStatuses?: string[];
  allowedLifecycleTransitions?: MobileLifecycleTransition[];
  allowedSurfaceActions?: MobileSurfaceAction[];
  entryModePreference?: MobileInspectionEntryModePreference;
  entryModeEffective?: MobileInspectionEntryModeEffective;
  entryModeReason?: string;
  attachmentPolicy?: MobileAttachmentPolicy | null;
  reportPackDraft?: MobileReportPackDraft | null;
  reviewPackage?: MobileReviewPackage | null;
  modo: MobileChatMode | string;
  mensagens: MobileChatMessage[];
}

export interface OfflinePendingQualityGateDecision {
  reason: string;
  requestedCases: string[];
  responsibilityNotice: string;
  gateSnapshot: MobileQualityGateResponse | null;
}

export interface OfflinePendingMessage {
  id: string;
  channel: ActiveThread;
  operation: OfflinePendingOperation;
  laudoId: number | null;
  text: string;
  createdAt: string;
  title: string;
  attachment: ComposerAttachment | null;
  referenceMessageId: number | null;
  clientMessageId?: string | null;
  qualityGateDecision?: OfflinePendingQualityGateDecision | null;
  guidedInspectionDraft?: MobileGuidedInspectionDraftPayload | null;
  attempts: number;
  lastAttemptAt: string;
  lastError: string;
  nextRetryAt: string;
  aiMode: MobileChatMode;
  aiSummary: string;
  aiMessagePrefix: string;
  aiLearningOptIn?: boolean;
  aiTone?: AppSettings["ai"]["tone"];
}

export interface MobileActivityNotification {
  id: string;
  kind: ActivityNotificationKind;
  laudoId: number | null;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  targetThread: ActiveThread;
}

export function duplicarComposerAttachment(
  anexo: ComposerAttachment | null,
): ComposerAttachment | null {
  if (!anexo) {
    return null;
  }
  if (anexo.kind === "image_set") {
    return {
      ...anexo,
      imagens: anexo.imagens.map((imagem) => ({ ...imagem })),
    };
  }
  return { ...anexo };
}

export function categoriaNotificacaoPorKind(
  kind: ActivityNotificationKind,
): ActivityNotificationCategory {
  if (
    kind === "mesa_nova" ||
    kind === "mesa_resolvida" ||
    kind === "mesa_reaberta"
  ) {
    return "mesa";
  }
  if (kind === "system") {
    return "system";
  }
  if (kind === "alerta_critico") {
    return "critical";
  }
  return "chat";
}
