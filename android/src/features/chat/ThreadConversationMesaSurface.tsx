import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { RefObject } from "react";

import { EmptyState } from "../../components/EmptyState";
import { useAppTranslation } from "../../i18n/appTranslation";
import { resolveAccentColorForMode } from "../../theme/colorUtils";
import type {
  MobileAttachment,
  MobileChatMessage,
  MobileLifecycleTransition,
  MobileMesaMessage,
  MobileMesaReviewCommandPayload,
  MobileReportPackDraft,
  MobileReviewPackage,
  MobileSurfaceAction,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import { hasFreeChatDocumentReviewFlow } from "./caseLifecycle";
import {
  buildFreeChatDocumentReviewItems,
  renderizarDocumentosChatLivreRevisao,
} from "./ThreadConversationFreeChatDocumentsCard";
import { ThreadConversationMesaMessageList } from "./ThreadConversationMesaMessageList";
import { renderizarReportPackDraftCard } from "./ThreadConversationReportPackDraftCard";
import { renderizarReviewPackageMesa } from "./ThreadConversationReviewPackageCard";

interface ThreadConversationMesaSurfaceProps {
  carregandoMesa: boolean;
  darkMode?: boolean;
  mensagensMesa: MobileMesaMessage[];
  reportPackDraft?: MobileReportPackDraft | null;
  reviewPackage?: MobileReviewPackage | null;
  caseLifecycleStatus?: string;
  caseWorkflowMode?: string;
  entryModeEffective?: string;
  activeOwnerRole?: string;
  allowedNextLifecycleStatuses?: string[];
  allowedLifecycleTransitions?: MobileLifecycleTransition[];
  allowedSurfaceActions?: MobileSurfaceAction[];
  mesaAcessoPermitido: boolean;
  mesaDisponivel: boolean;
  mesaIndisponivelDescricao: string;
  mesaIndisponivelTitulo: string;
  scrollRef: RefObject<ScrollView | null>;
  keyboardVisible: boolean;
  threadKeyboardPaddingBottom: number;
  nomeUsuarioExibicao: string;
  mensagensVisiveis: MobileChatMessage[];
  obterResumoReferenciaMensagem: (
    referenciaId: number | null,
    mensagensVisiveis: MobileChatMessage[],
    mensagensMesa: MobileMesaMessage[],
  ) => string;
  onAbrirReferenciaNoChat: (id: number) => void;
  sessionAccessToken: string | null;
  onAbrirAnexo: (attachment: MobileAttachment) => void;
  anexoAbrindoChave: string;
  toAttachmentKey: (attachment: MobileAttachment, fallback: string) => string;
  conversaPermiteEdicao: boolean;
  onDefinirReferenciaMesaAtiva: (item: MobileMesaMessage) => void;
  accentColor: string;
  dynamicMessageBubbleStyle: StyleProp<ViewStyle>;
  dynamicMessageTextStyle: StyleProp<TextStyle>;
  onExecutarComandoRevisaoMobile?: (
    payload: MobileMesaReviewCommandPayload,
  ) => Promise<void>;
  onCorrigirDocumentoChatLivre?: (
    attachment: MobileAttachment,
    versionLabel: string,
  ) => void;
  reviewCommandBusy?: boolean;
}

function buildReviewStage(params: {
  activeOwnerRole?: string;
  caseLifecycleStatus?: string;
  freeChatDocumentReviewFlow?: boolean;
  hasReviewSummary: boolean;
  messagesCount: number;
}): { label: string; title: string; description: string } {
  const {
    activeOwnerRole,
    caseLifecycleStatus,
    freeChatDocumentReviewFlow = false,
    hasReviewSummary,
    messagesCount,
  } = params;

  if (freeChatDocumentReviewFlow) {
    return hasReviewSummary
      ? {
          label: "Revisar PDF",
          title: "PDFs gerados",
          description: "Baixe ou corrija versões do relatório.",
        }
      : {
          label: "Revisar PDF",
          title: "Sem PDF gerado",
          description: "Peça o relatório no chat livre.",
        };
  }

  if (caseLifecycleStatus === "aprovado" || caseLifecycleStatus === "emitido") {
    return {
      label: "Status da revisão",
      title: "Caso aprovado",
      description:
        "A revisão não tem pendências abertas. Siga para a finalização quando o documento estiver pronto.",
    };
  }

  if (caseLifecycleStatus === "devolvido_para_correcao") {
    return {
      label: "Status da revisão",
      title: "Correção solicitada",
      description:
        "Revise os pedidos abaixo, ajuste pelo chat e responda a pendência quando precisar avisar que corrigiu.",
    };
  }

  if (
    activeOwnerRole === "mesa" ||
    caseLifecycleStatus === "aguardando_mesa" ||
    caseLifecycleStatus === "em_revisao_mesa"
  ) {
    return {
      label: "Status da revisão",
      title: messagesCount ? "Revisão em andamento" : "Aguardando revisão",
      description:
        "Esta etapa reúne comentários humanos, pedidos de correção e aprovação do caso.",
    };
  }

  if (hasReviewSummary) {
    return {
      label: "Status da revisão",
      title: "Caso preparado para revisão",
      description:
        "Confira a prévia do caso. Quando ele for enviado para revisão, os retornos aparecem aqui.",
    };
  }

  return {
    label: "Status da revisão",
    title: "Revisão ainda não iniciada",
    description:
      "Monte o caso no chat primeiro. Depois, esta tela mostra pedidos de ajuste, aprovação e retorno humano.",
  };
}

export function ThreadConversationMesaSurface({
  carregandoMesa,
  darkMode = false,
  mensagensMesa,
  reportPackDraft,
  reviewPackage,
  caseLifecycleStatus,
  caseWorkflowMode,
  entryModeEffective,
  activeOwnerRole,
  allowedNextLifecycleStatuses,
  allowedLifecycleTransitions,
  allowedSurfaceActions,
  mesaAcessoPermitido,
  mesaDisponivel,
  mesaIndisponivelDescricao,
  mesaIndisponivelTitulo,
  scrollRef,
  keyboardVisible,
  threadKeyboardPaddingBottom,
  nomeUsuarioExibicao,
  mensagensVisiveis,
  obterResumoReferenciaMensagem,
  onAbrirReferenciaNoChat,
  sessionAccessToken,
  onAbrirAnexo,
  anexoAbrindoChave,
  toAttachmentKey,
  conversaPermiteEdicao,
  onDefinirReferenciaMesaAtiva,
  accentColor,
  dynamicMessageBubbleStyle,
  dynamicMessageTextStyle,
  onExecutarComandoRevisaoMobile,
  onCorrigirDocumentoChatLivre,
  reviewCommandBusy = false,
}: ThreadConversationMesaSurfaceProps) {
  const { t } = useAppTranslation();
  const visibleAccentColor = resolveAccentColorForMode(accentColor, darkMode);
  const freeChatDocumentReviewFlow = hasFreeChatDocumentReviewFlow({
    entryModeEffective,
    workflowMode: caseWorkflowMode,
  });
  const documentosChatLivre = freeChatDocumentReviewFlow
    ? buildFreeChatDocumentReviewItems(mensagensVisiveis)
    : [];
  const reviewSummary = freeChatDocumentReviewFlow
    ? renderizarDocumentosChatLivreRevisao({
        mensagens: mensagensVisiveis,
        onAbrirAnexo,
        onCorrigirDocumento: onCorrigirDocumentoChatLivre,
      })
    : renderizarReviewPackageMesa(
        reviewPackage,
        {
          caseLifecycleStatus,
          activeOwnerRole,
          allowedNextLifecycleStatuses,
          allowedLifecycleTransitions,
          allowedSurfaceActions,
        },
        onExecutarComandoRevisaoMobile,
        reviewCommandBusy,
        onAbrirAnexo,
      ) ||
      renderizarReportPackDraftCard(reportPackDraft, {
        mode: "mesa",
        testID: "mesa-report-pack-card",
      });
  const reviewStage = buildReviewStage({
    activeOwnerRole,
    caseLifecycleStatus,
    freeChatDocumentReviewFlow,
    hasReviewSummary: freeChatDocumentReviewFlow
      ? documentosChatLivre.length > 0
      : Boolean(reviewSummary),
    messagesCount: mensagensMesa.length,
  });

  if (!mesaAcessoPermitido) {
    return (
      <View
        testID="mesa-thread-surface"
        style={[
          styles.threadEmptyState,
          keyboardVisible ? styles.threadEmptyStateKeyboardVisible : null,
        ]}
      >
        <View testID="mesa-thread-blocked">
          <EmptyState
            compact
            darkMode={darkMode}
            description={t(mesaIndisponivelDescricao)}
            eyebrow={t("Revisão")}
            icon="shield-lock-outline"
            tone="default"
            title={t(mesaIndisponivelTitulo)}
          />
        </View>
      </View>
    );
  }

  if (carregandoMesa && !mensagensMesa.length) {
    return (
      <View testID="mesa-thread-surface" style={styles.loadingState}>
        <View testID="mesa-thread-loading">
          <ActivityIndicator color={visibleAccentColor} size="large" />
          <Text
            style={[
              styles.loadingText,
              darkMode ? styles.loadingTextDark : null,
            ]}
          >
            {t("Abrindo a revisão do caso...")}
          </Text>
        </View>
      </View>
    );
  }

  if (!mesaDisponivel) {
    return (
      <View
        testID="mesa-thread-surface"
        style={[
          styles.threadEmptyState,
          keyboardVisible ? styles.threadEmptyStateKeyboardVisible : null,
        ]}
      >
        <View testID="mesa-thread-unavailable">
          <EmptyState
            compact
            darkMode={darkMode}
            description={t(mesaIndisponivelDescricao)}
            eyebrow={t("Revisão")}
            icon="clipboard-clock-outline"
            tone="accent"
            title={t(mesaIndisponivelTitulo)}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.threadScroll}
      contentContainerStyle={[
        styles.threadContent,
        keyboardVisible ? styles.threadContentKeyboard : null,
        keyboardVisible ? { paddingBottom: threadKeyboardPaddingBottom } : null,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID="mesa-thread-surface"
    >
      <View style={styles.threadSection} testID="review-state-summary">
        <Text
          style={[
            styles.threadSectionLabel,
            darkMode ? styles.threadSectionLabelDark : null,
          ]}
        >
          {t(reviewStage.label)}
        </Text>
        <Text
          style={[
            styles.messageOperationalTitle,
            darkMode ? styles.messageTextDark : null,
          ]}
        >
          {t(reviewStage.title)}
        </Text>
        <Text
          style={[
            styles.messageOperationalText,
            darkMode ? styles.messageTextDark : null,
          ]}
        >
          {t(reviewStage.description)}
        </Text>
      </View>
      {reviewSummary}
      <ThreadConversationMesaMessageList
        accentColor={visibleAccentColor}
        activeOwnerRole={activeOwnerRole}
        anexoAbrindoChave={anexoAbrindoChave}
        caseLifecycleStatus={caseLifecycleStatus}
        conversaPermiteEdicao={conversaPermiteEdicao}
        dynamicMessageBubbleStyle={dynamicMessageBubbleStyle}
        dynamicMessageTextStyle={dynamicMessageTextStyle}
        freeChatDocumentReviewFlow={freeChatDocumentReviewFlow}
        hasReviewSummary={Boolean(reviewSummary)}
        keyboardVisible={keyboardVisible}
        mensagensMesa={mensagensMesa}
        mensagensVisiveis={mensagensVisiveis}
        nomeUsuarioExibicao={nomeUsuarioExibicao}
        obterResumoReferenciaMensagem={obterResumoReferenciaMensagem}
        onAbrirAnexo={onAbrirAnexo}
        onAbrirReferenciaNoChat={onAbrirReferenciaNoChat}
        onDefinirReferenciaMesaAtiva={onDefinirReferenciaMesaAtiva}
        sessionAccessToken={sessionAccessToken}
        toAttachmentKey={toAttachmentKey}
      />
    </ScrollView>
  );
}
