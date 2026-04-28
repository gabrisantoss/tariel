import { Image, Pressable, Text, View } from "react-native";

import type {
  MobileAttachment,
  MobileMesaReviewCommandPayload,
} from "../../types/mobile";
import { styles } from "../InspectorMobileApp.styles";
import {
  sanitizarTextoThread,
  textoThreadContemTermoInterno,
} from "./ThreadConversationReviewCardUtils";
import {
  obterTomStatusBloco,
  rotuloStatusBloco,
  rotuloTipoDiffHistorico,
  type ThreadConversationReviewDecisionContext,
  type ThreadConversationReviewPackageSummary,
} from "./ThreadConversationReviewPackageSummary";

type ReviewCommandHandler =
  | ((payload: MobileMesaReviewCommandPayload) => Promise<void>)
  | undefined;

function formatarSinalizacaoVisivel(value: string): string {
  const sanitized = sanitizarTextoThread(value);
  if (textoThreadContemTermoInterno(sanitized) || sanitized.includes("_")) {
    return "";
  }
  return sanitized;
}

function ReviewPackageActionButton(props: {
  disabled: boolean;
  onPress: () => void;
  testID: string;
  tone: "success" | "accent" | "danger";
  label: string;
  primary?: boolean;
}) {
  const toneStyle =
    props.tone === "danger"
      ? styles.threadReviewActionButtonDanger
      : props.tone === "accent"
        ? styles.threadReviewActionButtonAccent
        : styles.threadReviewActionButtonSuccess;
  const toneTextStyle =
    props.tone === "danger"
      ? styles.threadReviewActionButtonTextDanger
      : props.tone === "accent"
        ? styles.threadReviewActionButtonTextAccent
        : styles.threadReviewActionButtonTextSuccess;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.threadReviewActionButton,
        toneStyle,
        props.primary ? styles.threadReviewActionButtonPrimary : null,
        props.disabled ? styles.threadReviewActionButtonDisabled : null,
      ]}
      testID={props.testID}
    >
      <Text style={[styles.threadReviewActionButtonText, toneTextStyle]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

type ReviewDecisionButtonConfig = {
  command: "aprovar_no_mobile" | "devolver_no_mobile" | "enviar_para_mesa";
  label: string;
  testID: string;
  tone: "success" | "accent" | "danger";
};

function ReviewPackageStatusBadge(props: {
  label: string;
  tone: "success" | "accent" | "danger";
}) {
  const toneStyle =
    props.tone === "danger"
      ? styles.threadReviewStatusBadgeDanger
      : props.tone === "accent"
        ? styles.threadReviewStatusBadgeAccent
        : styles.threadReviewStatusBadgeSuccess;
  const toneTextStyle =
    props.tone === "danger"
      ? styles.threadReviewStatusBadgeTextDanger
      : props.tone === "accent"
        ? styles.threadReviewStatusBadgeTextAccent
        : styles.threadReviewStatusBadgeTextSuccess;

  return (
    <View style={[styles.threadReviewStatusBadge, toneStyle]}>
      <Text style={[styles.threadReviewStatusBadgeText, toneTextStyle]}>
        {props.label}
      </Text>
    </View>
  );
}

export function ThreadConversationReviewVerificationSection(props: {
  summary: ThreadConversationReviewPackageSummary;
}) {
  const { summary } = props;

  if (!summary.verificationLabel) {
    return null;
  }

  return (
    <View style={styles.threadReviewVerificationShell}>
      {summary.verificationQrUri ? (
        <Image
          source={{ uri: summary.verificationQrUri }}
          style={styles.threadReviewVerificationQr}
          testID="mesa-review-verification-qr"
        />
      ) : null}
      <View style={styles.threadReviewVerificationCopy}>
        <Text style={styles.threadReviewEntitlement}>Verificação pública</Text>
        <Text style={styles.threadReviewFootnote}>
          {summary.verificationLabel}
        </Text>
      </View>
    </View>
  );
}

export function ThreadConversationReviewOfficialIssueSection(props: {
  summary: ThreadConversationReviewPackageSummary;
  onAbrirAnexoOficial?: (attachment: MobileAttachment) => void;
}) {
  const { onAbrirAnexoOficial, summary } = props;
  const officialDownloadAttachment = summary.officialIssueDownloadAttachment;

  if (!summary.officialIssueLabel && !summary.annexSummary) {
    return null;
  }

  return (
    <View style={styles.threadReviewList}>
      <Text style={styles.threadReviewSectionTitle}>
        {summary.currentOfficialIssueIsHistorical
          ? "Histórico de emissões"
          : "Emissão oficial"}
      </Text>
      <View style={styles.threadReviewListItem}>
        {summary.currentOfficialIssueIsHistorical ? (
          <ReviewPackageStatusBadge
            label="Documento substituído"
            tone="danger"
          />
        ) : summary.currentOfficialIssueHasRecord ? (
          <ReviewPackageStatusBadge label="Documento emitido" tone="success" />
        ) : (
          <ReviewPackageStatusBadge label="Emissão oficial" tone="accent" />
        )}
        <View style={styles.threadReviewListCopy}>
          <Text style={styles.threadReviewListTitle}>
            {summary.currentOfficialIssueTitle || summary.officialIssueLabel}
          </Text>
          {summary.currentOfficialIssueNumber ? (
            <Text style={styles.threadReviewListText}>
              {`${summary.currentOfficialIssueNumber} · ${summary.currentOfficialIssueStateLabel}${
                summary.currentOfficialIssueIssuedAt
                  ? ` · ${summary.currentOfficialIssueIssuedAt}`
                  : ""
              }`}
            </Text>
          ) : null}
          {summary.annexSummary ? (
            <Text style={styles.threadReviewListText}>
              {summary.annexSummary}
            </Text>
          ) : null}
          <Text style={styles.threadReviewListText}>
            {summary.currentOfficialIssueIsHistorical
              ? "Emissão anterior preservada para auditoria; não é a versão principal do caso."
              : summary.eligibleSignatoryCount > 0
                ? `${summary.eligibleSignatoryCount} signatário(s) elegível(is). ${summary.signatoryStatusLabel}`
                : summary.signatoryStatusLabel}
          </Text>
        </View>
      </View>
      {summary.primaryPdfIntegritySummary ? (
        <View style={styles.threadReviewWarningItem}>
          <Text style={styles.threadReviewWarningTitle}>
            {summary.primaryPdfIntegrityTitle}
          </Text>
          <Text style={styles.threadReviewWarningText}>
            {sanitizarTextoThread(summary.primaryPdfIntegritySummary)}
            {summary.primaryPdfIntegrityVersionDetail
              ? ` ${sanitizarTextoThread(summary.primaryPdfIntegrityVersionDetail)}.`
              : ""}
          </Text>
        </View>
      ) : null}
      {officialDownloadAttachment ? (
        <ReviewPackageActionButton
          disabled={!onAbrirAnexoOficial}
          label="Baixar pacote oficial"
          onPress={() => onAbrirAnexoOficial?.(officialDownloadAttachment)}
          primary
          testID="mesa-review-official-issue-download"
          tone="accent"
        />
      ) : null}
      {summary.currentOfficialIssueIsHistorical ? (
        <Text style={styles.threadReviewFootnote}>
          Documento substituído aparece apenas no histórico; o download
          principal fica reservado para a emissão oficial ativa.
        </Text>
      ) : officialDownloadAttachment ? (
        <Text style={styles.threadReviewFootnote}>
          Ação principal: baixar o pacote oficial ativo deste caso.
        </Text>
      ) : null}
      {summary.officialIssueBlockers.slice(0, 3).map((item) => (
        <View key={item} style={styles.threadReviewWarningItem}>
          <Text style={styles.threadReviewWarningTitle}>{item}</Text>
        </View>
      ))}
      {summary.annexMissingItems.slice(0, 3).map((item) => (
        <Text key={item} style={styles.threadReviewFootnote}>
          Anexo pendente: {item}
        </Text>
      ))}
      {summary.currentIssueAuditRows.length ||
      summary.officialIssueTrail.length ? (
        <View style={styles.threadReviewList}>
          <Text style={styles.threadReviewSectionTitle}>Auditoria</Text>
          {summary.currentIssueAuditRows.map((item) => (
            <View
              key={`${item.title}-${item.value}`}
              style={styles.threadReviewListItem}
            >
              <View style={styles.threadReviewListCopy}>
                <Text style={styles.threadReviewListTitle}>{item.title}</Text>
                <Text style={styles.threadReviewListText}>{item.value}</Text>
              </View>
            </View>
          ))}
          {summary.officialIssueTrail.map((item) => (
            <View
              key={`${item.title}-${item.statusLabel}`}
              style={styles.threadReviewListItem}
            >
              <View style={styles.threadReviewListCopy}>
                <Text style={styles.threadReviewListTitle}>{item.title}</Text>
                <Text style={styles.threadReviewListText}>
                  {item.statusLabel}
                </Text>
                {item.summary ? (
                  <Text style={styles.threadReviewListText}>
                    {item.summary}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ThreadConversationReviewDiffSection(props: {
  summary: ThreadConversationReviewPackageSummary;
}) {
  const { summary } = props;

  if (!summary.diffHighlights.length) {
    return null;
  }

  return (
    <View style={styles.threadReviewList}>
      <Text style={styles.threadReviewSectionTitle}>Histórico/Auditoria</Text>
      {summary.diffBlockHighlights.map((item) => (
        <View
          key={`${item.title}-${item.totalChanges}`}
          style={styles.threadReviewListItem}
        >
          <View style={styles.threadReviewListCopy}>
            <Text style={styles.threadReviewListTitle}>{item.title}</Text>
            <Text style={styles.threadReviewListText}>
              {item.totalChanges > 0
                ? item.totalChanges === 1
                  ? "1 alteração estável neste bloco."
                  : `${item.totalChanges} alterações estáveis neste bloco.`
                : "Sem alteração consolidada neste bloco."}
            </Text>
            {item.summary ? (
              <Text style={styles.threadReviewListText}>
                {sanitizarTextoThread(item.summary)}
              </Text>
            ) : null}
            {item.fields.map((field) => (
              <Text
                key={`${item.title}-${field.label}-${field.changeType}`}
                style={styles.threadReviewFootnote}
              >
                {sanitizarTextoThread(field.label)}:{" "}
                {sanitizarTextoThread(field.previousValue)} →{" "}
                {sanitizarTextoThread(field.currentValue)}
              </Text>
            ))}
          </View>
        </View>
      ))}
      {summary.diffHighlights.map((item) => (
        <View
          key={`${item.label}-${item.changeType}`}
          style={styles.threadReviewListItem}
        >
          <ReviewPackageStatusBadge
            label={rotuloTipoDiffHistorico(item.changeType)}
            tone={
              item.changeType === "removed"
                ? "danger"
                : item.changeType === "added"
                  ? "success"
                  : "accent"
            }
          />
          <View style={styles.threadReviewListCopy}>
            <Text style={styles.threadReviewListTitle}>
              {sanitizarTextoThread(item.label)}
            </Text>
            <Text style={styles.threadReviewListText}>
              Antes: {sanitizarTextoThread(item.previousValue)}
            </Text>
            <Text style={styles.threadReviewListText}>
              Agora: {sanitizarTextoThread(item.currentValue)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ThreadConversationReviewRedFlagsSection(props: {
  summary: ThreadConversationReviewPackageSummary;
}) {
  const { summary } = props;

  if (!summary.topRedFlags.length) {
    return null;
  }

  return (
    <View style={styles.threadReviewWarnings}>
      {summary.topRedFlags.map((item) => (
        <View
          key={item.code || item.title}
          style={styles.threadReviewWarningItem}
        >
          <Text style={styles.threadReviewWarningTitle}>{item.title}</Text>
          {item.message ? (
            <Text style={styles.threadReviewWarningText}>
              {sanitizarTextoThread(item.message)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function ThreadConversationReviewDecisionFocusSection(props: {
  decisionContext: ThreadConversationReviewDecisionContext;
  summary: ThreadConversationReviewPackageSummary;
}) {
  const { decisionContext, summary } = props;

  if (
    !decisionContext.requiredAction ||
    (!summary.highlightedBlocks.length && !summary.topRedFlags.length)
  ) {
    return null;
  }

  return (
    <View style={styles.threadReviewList}>
      <Text style={styles.threadReviewSectionTitle}>Foco da decisão</Text>
      <View style={styles.threadReviewListItem}>
        <View style={styles.threadReviewListCopy}>
          <Text style={styles.threadReviewListTitle}>
            {decisionContext.title}
          </Text>
          <Text style={styles.threadReviewListText}>
            {decisionContext.requiredAction}
          </Text>
          {decisionContext.failureReasons
            .map(formatarSinalizacaoVisivel)
            .filter(Boolean)
            .map((item) => (
              <Text key={item} style={styles.threadReviewFootnote}>
                Sinalização: {item}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
}

export function ThreadConversationReviewActionsSection(props: {
  decisionContext: ThreadConversationReviewDecisionContext;
  onExecutarComandoRevisaoMobile: ReviewCommandHandler;
  reviewCommandBusy: boolean;
  summary: ThreadConversationReviewPackageSummary;
}) {
  const {
    decisionContext,
    onExecutarComandoRevisaoMobile,
    reviewCommandBusy,
    summary,
  } = props;
  const actionDisabled = reviewCommandBusy || !onExecutarComandoRevisaoMobile;

  if (!summary.allowedDecisions.length && !summary.nextAction) {
    return null;
  }

  const canApprove =
    summary.allowedDecisions.includes("aprovar_no_mobile") &&
    (!summary.surfaceActionsKnown ||
      summary.allowedSurfaceActions.includes("mesa_approve"));
  const canSendMesa = summary.allowedDecisions.includes("enviar_para_mesa");
  const canReturn =
    summary.allowedDecisions.includes("devolver_no_mobile") &&
    (!summary.surfaceActionsKnown ||
      summary.allowedSurfaceActions.includes("mesa_return"));
  const actionConfigs: ReviewDecisionButtonConfig[] = [
    canApprove
      ? {
          command: "aprovar_no_mobile",
          label: "Aprovar internamente",
          testID: "mesa-review-action-approve",
          tone: "success" as const,
        }
      : null,
    canSendMesa
      ? {
          command: "enviar_para_mesa",
          label: "Enviar para Mesa Avaliadora",
          testID: "mesa-review-action-send",
          tone: "accent" as const,
        }
      : null,
    canReturn
      ? {
          command: "devolver_no_mobile",
          label: "Devolver para ajuste",
          testID: "mesa-review-action-return",
          tone: "danger" as const,
        }
      : null,
  ].filter((item): item is ReviewDecisionButtonConfig => item !== null);
  const primaryCommand = summary.nextAction?.command || null;
  const primaryAction =
    actionConfigs.find((item) => item.command === primaryCommand) || null;
  const secondaryActions = actionConfigs.filter(
    (item) => item.command !== primaryAction?.command,
  );

  const renderActionButton = (
    item: ReviewDecisionButtonConfig,
    primary = false,
  ) => {
    const onPress = () => {
      if (item.command === "aprovar_no_mobile") {
        void onExecutarComandoRevisaoMobile?.({
          command: "aprovar_no_mobile",
        });
        return;
      }
      if (item.command === "enviar_para_mesa") {
        void onExecutarComandoRevisaoMobile?.({
          command: "enviar_para_mesa",
        });
        return;
      }
      void onExecutarComandoRevisaoMobile?.({
        command: "devolver_no_mobile",
        block_key: decisionContext.blockKey,
        title: decisionContext.title,
        reason: decisionContext.reason,
        summary: decisionContext.summary,
        required_action: decisionContext.requiredAction,
        failure_reasons: decisionContext.failureReasons,
      });
    };

    return (
      <ReviewPackageActionButton
        key={item.command}
        disabled={actionDisabled}
        label={item.label}
        onPress={onPress}
        primary={primary}
        testID={item.testID}
        tone={item.tone}
      />
    );
  };

  return (
    <View style={styles.threadReviewActionStack}>
      <Text style={styles.threadReviewSectionTitle}>Próxima ação</Text>
      {summary.nextAction ? (
        <Text style={styles.threadReviewFootnote}>
          {`${summary.nextAction.label}: ${summary.nextAction.value}. ${summary.nextAction.detail}`}
        </Text>
      ) : null}
      {primaryAction ? (
        <View style={styles.threadReviewPrimaryActionRail}>
          {renderActionButton(primaryAction, true)}
        </View>
      ) : null}
      {secondaryActions.length ? (
        <View style={styles.threadReviewSecondaryActionGroup}>
          <Text style={styles.threadReviewActionGroupTitle}>
            Ações secundárias
          </Text>
          <View style={styles.threadReviewActionsRail}>
            {secondaryActions.map((item) => renderActionButton(item))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ThreadConversationReviewHighlightedBlocksSection(props: {
  onExecutarComandoRevisaoMobile: ReviewCommandHandler;
  reviewCommandBusy: boolean;
  summary: ThreadConversationReviewPackageSummary;
}) {
  const { onExecutarComandoRevisaoMobile, reviewCommandBusy, summary } = props;
  const actionDisabled = reviewCommandBusy || !onExecutarComandoRevisaoMobile;

  if (!summary.highlightedBlocks.length) {
    return null;
  }

  return (
    <View style={styles.threadReviewList}>
      <Text style={styles.threadReviewSectionTitle}>Pendências do caso</Text>
      {summary.highlightedBlocks.map((item) => {
        const tone = obterTomStatusBloco(item.reviewStatus);

        return (
          <View
            key={item.blockKey || item.title}
            style={styles.threadReviewListItem}
          >
            <ReviewPackageStatusBadge
              label={rotuloStatusBloco(item.reviewStatus)}
              tone={tone}
            />
            <View style={styles.threadReviewListCopy}>
              <Text style={styles.threadReviewListTitle}>{item.title}</Text>
              {item.recommendedAction ? (
                <Text style={styles.threadReviewListText}>
                  {item.recommendedAction}
                </Text>
              ) : null}
              {summary.supportsBlockReopen ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={actionDisabled}
                  onPress={() => {
                    void onExecutarComandoRevisaoMobile?.({
                      command: "reabrir_bloco",
                      block_key: item.blockKey,
                      title: item.title,
                      reason:
                        item.recommendedAction ||
                        `Reabrir bloco ${item.title} para revalidacao.`,
                      summary:
                        item.recommendedAction ||
                        `Bloco ${item.title} reaberto na revisão mobile.`,
                    });
                  }}
                  style={[
                    styles.threadReviewInlineAction,
                    actionDisabled
                      ? styles.threadReviewInlineActionDisabled
                      : null,
                  ]}
                  testID={`mesa-review-reopen-block-${item.blockKey || item.title}`}
                >
                  <Text style={styles.threadReviewInlineActionText}>
                    Reabrir bloco
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
