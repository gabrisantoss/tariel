import {
  hasFormalCaseWorkflow,
  hasFreeChatDocumentReviewFlow,
} from "./caseLifecycle";

describe("hasFormalCaseWorkflow", () => {
  it("mantém o fluxo formal quando o report pack já foi materializado", () => {
    expect(
      hasFormalCaseWorkflow({
        entryModeEffective: "chat_first",
        lifecycleStatus: "laudo_em_coleta",
        workflowMode: "laudo_guiado",
        allowedSurfaceActions: ["chat_finalize"],
        reportPackDraft: {
          template_key: "nr35_linha_vida",
          quality_gates: {
            final_validation_mode: "mesa_required",
          },
        },
      }),
    ).toBe(true);
  });

  it("continua tratando chat-first vazio como fluxo livre", () => {
    expect(
      hasFormalCaseWorkflow({
        entryModeEffective: "chat_first",
        lifecycleStatus: "laudo_em_coleta",
        workflowMode: "laudo_guiado",
        reportPackDraft: {},
      }),
    ).toBe(false);
  });
});

describe("hasFreeChatDocumentReviewFlow", () => {
  it("identifica análise livre como revisão de documento do chat livre", () => {
    expect(
      hasFreeChatDocumentReviewFlow({
        entryModeEffective: "chat_first",
        workflowMode: "analise_livre",
      }),
    ).toBe(true);
  });

  it("mantém o chat guiado fora da regra do chat livre", () => {
    expect(
      hasFreeChatDocumentReviewFlow({
        entryModeEffective: "chat_first",
        workflowMode: "laudo_guiado",
      }),
    ).toBe(false);
  });

  it("usa chat-first como fallback apenas quando o workflow não veio explícito", () => {
    expect(
      hasFreeChatDocumentReviewFlow({
        entryModeEffective: "chat_first",
      }),
    ).toBe(true);
  });
});
