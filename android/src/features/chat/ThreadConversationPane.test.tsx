import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

import {
  carregarDocumentoEditavelChatLivreMobile,
  reavaliarEvidenciaDocumentoEditavelChatLivreMobile,
  salvarDocumentoEditavelChatLivreMobile,
} from "../../config/api";
import { styles } from "../InspectorMobileApp.styles";
import { ThreadConversationPane } from "./ThreadConversationPane";

jest.mock("../../config/api", () => ({
  carregarDocumentoEditavelChatLivreMobile: jest.fn(),
  reavaliarEvidenciaDocumentoEditavelChatLivreMobile: jest.fn(),
  salvarDocumentoEditavelChatLivreMobile: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    MaterialCommunityIcons: ({
      name,
      ...props
    }: {
      name: string;
      [key: string]: unknown;
    }) => React.createElement("Text", props, name),
  };
});

const baseProps = {
  accentColor: "#0f172a",
  anexoAbrindoChave: "",
  brandMarkSource: { uri: "test://brand" },
  carregandoConversa: false,
  carregandoMesa: false,
  conversaPermiteEdicao: false,
  conversaVazia: false,
  dynamicMessageBubbleStyle: null,
  dynamicMessageTextStyle: null,
  enviandoMensagem: false,
  keyboardVisible: false,
  mesaAcessoPermitido: true,
  mesaDisponivel: true,
  mesaIndisponivelDescricao:
    "Envie o primeiro registro no chat para liberar este espaço.",
  mesaIndisponivelTitulo: "Mesa disponível após o primeiro laudo",
  mensagemChatDestacadaId: null,
  mensagensMesa: [],
  mensagensVisiveis: [],
  nomeUsuarioExibicao: "Inspetor Demo",
  obterResumoReferenciaMensagem: () => "",
  onAbrirAnexo: jest.fn(),
  onAbrirReferenciaNoChat: jest.fn(),
  onDefinirReferenciaMesaAtiva: jest.fn(),
  onRegistrarLayoutMensagemChat: jest.fn(),
  reportPackDraft: null,
  reviewPackage: null,
  scrollRef: { current: null },
  sessionAccessToken: null,
  threadKeyboardPaddingBottom: 0,
  toAttachmentKey: () => "",
  vendoMesa: true,
};

function coletarTextosRenderizados(node: unknown): string[] {
  if (typeof node === "string") {
    return [node];
  }
  if (Array.isArray(node)) {
    return node.flatMap(coletarTextosRenderizados);
  }
  if (!node || typeof node !== "object") {
    return [];
  }
  const children = (node as { children?: unknown }).children;
  return coletarTextosRenderizados(children);
}

describe("ThreadConversationPane", () => {
  it("troca o ícone vazio do chat pelo emoji da inspeção guiada", () => {
    const imageSource = { uri: "test://nr13" };
    const { getByTestId, getByText, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        conversaVazia
        emptyStateImageAccessibilityLabel="Ícone NR13 Inspecoes e Integridade"
        emptyStateImageSource={imageSource}
        emptyStateTitle="NR13 Inspecoes e Integridade"
        vendoMesa={false}
      />,
    );

    expect(getByTestId("empty-state-image").props.source).toEqual(imageSource);
    expect(getByText("NR13 Inspecoes e Integridade")).toBeTruthy();
    expect(queryByText("message-processing-outline")).toBeNull();
  });

  it("expõe marker estável quando a conta não tem acesso à mesa", () => {
    const { getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        mesaAcessoPermitido={false}
        mesaIndisponivelDescricao="O pacote atual não inclui a mesa no app."
        mesaIndisponivelTitulo="Mesa indisponível para esta conta"
      />,
    );

    expect(getByTestId("mesa-thread-surface")).toBeTruthy();
    expect(getByTestId("mesa-thread-blocked")).toBeTruthy();
    expect(getByText("Mesa indisponível para esta conta")).toBeTruthy();
  });

  it("expõe marker estável da superfície Mesa vazia", () => {
    const { getByTestId } = render(<ThreadConversationPane {...baseProps} />);

    expect(getByTestId("mesa-thread-surface")).toBeTruthy();
    expect(getByTestId("mesa-thread-empty-state")).toBeTruthy();
  });

  it("expõe marker estável da superfície Mesa carregada", () => {
    const { getByTestId } = render(
      <ThreadConversationPane
        {...baseProps}
        conversaPermiteEdicao
        mensagensMesa={[
          {
            anexos: [],
            data: "agora",
            id: 1,
            laudo_id: 80,
            lida: true,
            referencia_mensagem_id: null,
            remetente_id: 7,
            resolvida_em: "",
            resolvida_em_label: "",
            resolvida_por_nome: "",
            texto: "Retorno técnico",
            tipo: "humano_eng",
          },
        ]}
      />,
    );

    expect(getByTestId("mesa-thread-surface")).toBeTruthy();
    expect(getByTestId("mesa-thread-loaded")).toBeTruthy();
  });

  it("mostra a imagem enviada usando o preview local", () => {
    const { UNSAFE_getAllByType, getByTestId, getByText, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        mensagensVisiveis={[
          {
            id: 22,
            papel: "usuario",
            texto: "Imagem enviada",
            tipo: "user",
            anexos: [
              {
                label: "foto-enviada.jpg",
                mime_type: "image/jpeg",
                categoria: "imagem",
                eh_imagem: true,
                local_preview_uri: "file:///tmp/foto-enviada.jpg",
              },
            ],
          },
        ]}
      />,
    );

    const imagens = UNSAFE_getAllByType(Image);
    expect(getByTestId("chat-message-bubble-22").props.style).toEqual(
      expect.arrayContaining([styles.messageBubbleImageOnly]),
    );
    expect(
      imagens.some(
        (imagem) => imagem.props.source?.uri === "file:///tmp/foto-enviada.jpg",
      ),
    ).toBe(true);
    expect(getByText("foto-enviada.jpg")).toBeTruthy();
    expect(queryByText("Imagem enviada")).toBeNull();
  });

  it("renderiza fallback visual quando a mensagem de imagem não traz anexo", () => {
    const { getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        mensagensVisiveis={[
          {
            id: 23,
            papel: "usuario",
            texto: "Imagem enviada",
            tipo: "user",
            citacoes: [],
          },
        ]}
      />,
    );

    expect(getByTestId("chat-message-bubble-23").props.style).toEqual(
      expect.arrayContaining([styles.messageBubbleImageOnly]),
    );
    expect(getByTestId("chat-image-fallback-23")).toBeTruthy();
    expect(getByText("Evidência fotográfica")).toBeTruthy();
  });

  it("renderiza o card de revisão operacional quando o pacote está disponível", () => {
    const onAbrirAnexo = jest.fn();
    const { getAllByText, getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="mesa"
        allowedNextLifecycleStatuses={["devolvido_para_correcao", "aprovado"]}
        allowedLifecycleTransitions={[
          {
            target_status: "devolvido_para_correcao",
            transition_kind: "correction",
            label: "Devolvido para correção",
            owner_role: "inspetor",
            preferred_surface: "chat",
          },
          {
            target_status: "aprovado",
            transition_kind: "approval",
            label: "Aprovado",
            owner_role: "none",
            preferred_surface: "mobile",
          },
        ]}
        allowedSurfaceActions={["mesa_approve", "mesa_return"]}
        caseLifecycleStatus="em_revisao_mesa"
        onAbrirAnexo={onAbrirAnexo}
        reviewPackage={{
          review_mode: "mesa_required",
          review_required: true,
          document_blockers: [{ code: "pending_review" }],
          coverage_map: {
            total_required: 5,
            total_accepted: 3,
            total_missing: 1,
            total_irregular: 1,
          },
          revisao_por_bloco: {
            attention_blocks: 1,
            returned_blocks: 1,
            items: [
              {
                block_key: "identificacao",
                title: "Identificação",
                review_status: "returned",
                recommended_action: "Revisar a foto da placa.",
              },
            ],
          },
          historico_refazer_inspetor: [{ id: 1 }],
          memoria_operacional_familia: {
            approved_snapshot_count: 12,
          },
          red_flags: [
            {
              code: "missing_required_evidence",
              title: "Evidência obrigatória pendente",
              message: "Ainda existem evidências obrigatórias faltantes.",
            },
          ],
          tenant_entitlements: {
            mobile_review_allowed: false,
          },
          inspection_history: {
            source_codigo_hash: "prev001",
            matched_by: "asset_identity",
            diff: {
              summary: "2 mudancas",
              block_highlights: [
                {
                  title: "Identificação",
                  total_changes: 2,
                  summary: "2 alterado(s)",
                  fields: [
                    {
                      label: "Identificação / Tag",
                      change_type: "changed",
                      previous_value: "TAG-001",
                      current_value: "TAG-002",
                    },
                  ],
                },
              ],
              identity_highlights: [
                {
                  label: "Identificação / Tag",
                  change_type: "changed",
                  previous_value: "TAG-001",
                  current_value: "TAG-002",
                },
              ],
              highlights: [
                {
                  label: "Identificação / Tag",
                  change_type: "changed",
                  previous_value: "TAG-001",
                  current_value: "TAG-002",
                },
              ],
            },
          },
          human_override_summary: {
            count: 1,
            latest: {
              actor_name: "Inspetor Demo",
              applied_at: "2026-04-13T18:00:00+00:00",
              reason:
                "Inspeção seguiu com base na validação humana e nas evidências textuais rastreáveis.",
            },
          },
          public_verification: {
            verification_url: "/app/public/laudo/verificar/hash001",
            qr_image_data_uri: "data:image/png;base64,ZmFrZQ==",
          },
          anexo_pack: {
            total_items: 4,
            total_present: 4,
            missing_items: [],
          },
          emissao_oficial: {
            issue_status_label: "Pronto para emissão oficial",
            eligible_signatory_count: 1,
            signature_status_label: "Signatário governado pronto",
            reissue_recommended: true,
            current_issue: {
              issue_number: "TAR-20260410-000123",
              issue_state: "issued",
              issue_state_label: "Emitido",
              issued_at: "2026-04-10T13:40:00+00:00",
              package_sha256:
                "aaaaaaaaaaaabbbbbbbbbbbbccccccccccccddddddddddddeeeeeeeeeeeeffff",
              package_filename: "TAR-20260410-000123.zip",
              download_url: "/app/api/laudo/123/emissao-oficial/download",
              download_label: "Baixar pacote oficial",
              download_mime_type: "application/zip",
              approval_snapshot_id: 91,
              primary_pdf_diverged: true,
              primary_pdf_storage_version: "v0003",
              current_primary_pdf_storage_version: "v0004",
            },
            blockers: [],
            audit_trail: [
              {
                title: "Aprovação governada",
                status_label: "Pronto",
                summary: "A Mesa confirmou o laudo para emissão oficial.",
              },
            ],
          },
          allowed_decisions: ["enviar_para_mesa", "devolver_no_mobile"],
          supports_block_reopen: true,
        }}
      />,
    );

    expect(getByTestId("mesa-review-package-card")).toBeTruthy();
    expect(getByTestId("mesa-review-verification-qr")).toBeTruthy();
    expect(getAllByText("Família exige Mesa").length).toBeGreaterThan(0);
    expect(getByText("Mesa em revisão")).toBeTruthy();
    expect(getByText("Mesa avaliadora")).toBeTruthy();
    expect(
      getByText("Próximas transições: Devolvido para correção · Aprovado"),
    ).toBeTruthy();
    expect(
      getByText(
        "Ações disponíveis: Aprovar internamente · Devolver para ajuste",
      ),
    ).toBeTruthy();
    expect(getByText("1 alerta crítico")).toBeTruthy();
    expect(getByText("1 bloco para refazer")).toBeTruthy();
    expect(getAllByText("Revisar a foto da placa.").length).toBeGreaterThan(0);
    expect(getByText("Evidência obrigatória pendente")).toBeTruthy();
    expect(getByText("Foco da decisão")).toBeTruthy();
    expect(
      getByText(
        "Próxima ação: Devolver para ajuste. Há pendências antes da Mesa decidir. Devolva o caso para correção rastreável.",
      ),
    ).toBeTruthy();
    expect(
      getByText("Sinalização: Evidência obrigatória pendente"),
    ).toBeTruthy();
    expect(getByText("Emissão oficial")).toBeTruthy();
    expect(getAllByText("Documento emitido").length).toBeGreaterThan(0);
    expect(
      getByText("TAR-20260410-000123 · Emitido · 2026-04-10T13:40:00+00:00"),
    ).toBeTruthy();
    expect(getByText("Hash do pacote")).toBeTruthy();
    expect(getByText("Reemissão recomendada")).toBeTruthy();
    expect(
      getByText(
        "A versão atual divergiu do documento congelado na emissão oficial. Emitido v0003 · Atual v0004.",
      ),
    ).toBeTruthy();
    expect(getByText("Aprovação governada")).toBeTruthy();
    fireEvent.press(getByTestId("mesa-review-official-issue-download"));
    expect(onAbrirAnexo).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: "emissao_oficial",
        nome: "TAR-20260410-000123.zip",
        url: "/app/api/laudo/123/emissao-oficial/download",
      }),
    );
    expect(getByText("Histórico/Auditoria")).toBeTruthy();
    expect(getAllByText("Identificação").length).toBeGreaterThan(0);
    expect(getByText("Identificação / Tag")).toBeTruthy();
    expect(getByText("Antes: TAG-001")).toBeTruthy();
    expect(getByText("Agora: TAG-002")).toBeTruthy();
    expect(
      getByText(
        "Ajuste humano registrado por Inspetor Demo em 2026-04-13T18:00:00+00:00: Inspeção seguiu com base na validação humana e nas evidências textuais rastreáveis.",
      ),
    ).toBeTruthy();
  });

  it("oculta ação de aprovação quando a ação canônica não inclui mesa_approve", () => {
    const { queryByTestId } = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="mesa"
        allowedSurfaceActions={["mesa_return"]}
        caseLifecycleStatus="em_revisao_mesa"
        reviewPackage={{
          review_mode: "mesa_required",
          allowed_decisions: ["aprovar_no_mobile", "devolver_no_mobile"],
        }}
      />,
    );

    expect(queryByTestId("mesa-review-action-approve")).toBeNull();
    expect(queryByTestId("mesa-review-action-return")).toBeTruthy();
  });

  it("mostra pendências antes da aprovação e prioriza correção", () => {
    const rendered = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="mesa"
        allowedSurfaceActions={["mesa_approve", "mesa_return"]}
        caseLifecycleStatus="em_revisao_mesa"
        reviewPackage={{
          review_mode: "mesa_required",
          document_blockers: [{ code: "missing_required_evidence" }],
          revisao_por_bloco: {
            returned_blocks: 1,
            items: [
              {
                block_key: "evidencias",
                title: "Evidências",
                review_status: "returned",
                recommended_action: "Corrigir fotos obrigatórias.",
              },
            ],
          },
          allowed_decisions: ["aprovar_no_mobile", "devolver_no_mobile"],
          supports_block_reopen: true,
        }}
      />,
    );
    const renderedText = coletarTextosRenderizados(rendered.toJSON()).join("|");

    expect(rendered.getByText("Pendências do caso")).toBeTruthy();
    expect(rendered.getByText("Próxima ação")).toBeTruthy();
    expect(renderedText.indexOf("Pendências do caso")).toBeLessThan(
      renderedText.indexOf("Próxima ação"),
    );
    expect(
      rendered.getByText(
        "Próxima ação: Devolver para ajuste. Há pendências antes da Mesa decidir. Devolva o caso para correção rastreável.",
      ),
    ).toBeTruthy();
    expect(rendered.getByTestId("mesa-review-action-return")).toBeTruthy();
  });

  it("usa Enviar para Mesa Avaliadora como ação principal quando a família exige Mesa", () => {
    const { getAllByText, getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="inspetor"
        caseLifecycleStatus="laudo_em_coleta"
        reviewPackage={{
          review_mode: "mesa_required",
          document_blockers: [],
          allowed_decisions: ["enviar_para_mesa"],
        }}
      />,
    );

    expect(getAllByText("Família exige Mesa").length).toBeGreaterThan(0);
    expect(
      getByText(
        "Próxima ação: Enviar para Mesa Avaliadora. A revisão local já pode escalar o caso. Envie para a Mesa Avaliadora quando a decisão humana final precisar continuar fora do mobile.",
      ),
    ).toBeTruthy();
    expect(getByTestId("mesa-review-action-send")).toBeTruthy();
  });

  it("orienta aguardar a Mesa quando o caso já está com a Mesa Avaliadora", () => {
    const { getAllByText, getByText, queryByTestId } = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="mesa"
        caseLifecycleStatus="aguardando_mesa"
        reviewPackage={{
          review_mode: "mesa_required",
          document_blockers: [],
          allowed_decisions: [],
        }}
      />,
    );

    expect(getAllByText("Mesa Avaliadora").length).toBeGreaterThan(0);
    expect(
      getByText(
        "Próxima ação: Aguardar decisão da Mesa. A Mesa Avaliadora está conduzindo a decisão. Acompanhe pendências e respostas antes de tentar concluir o caso.",
      ),
    ).toBeTruthy();
    expect(queryByTestId("mesa-review-action-approve")).toBeNull();
    expect(queryByTestId("mesa-review-action-send")).toBeNull();
    expect(queryByTestId("mesa-review-action-return")).toBeNull();
  });

  it("não exibe termos internos nos cards da thread", () => {
    const { getAllByText, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        activeOwnerRole="inspetor"
        caseLifecycleStatus="em_revisao_mobile"
        reviewPackage={{
          review_mode: "mobile_autonomous",
          review_required: true,
          document_blockers: [],
          coverage_map: {
            total_required: 2,
            total_accepted: 2,
            total_missing: 0,
            total_irregular: 0,
          },
          revisao_por_bloco: {
            attention_blocks: 1,
            returned_blocks: 0,
            items: [
              {
                block_key: "documento",
                title: "Documento",
                review_status: "attention",
                recommended_action:
                  "Revisar primary_pdf_diverged antes da entrega.",
              },
            ],
          },
          red_flags: [
            {
              code: "primary_pdf_diverged",
              title: "red flag issue_state",
              message:
                "mobile_autonomous mobile_review_allowed reviewer_issue reviewer_decision superseded revoked issued package_sha256 approval_snapshot_id override diff tenant_without_mesa nr35_mesa_required_unavailable",
            },
          ],
          tenant_entitlements: {
            mobile_autonomous_allowed: true,
          },
          inspection_history: {
            diff: {
              summary: "diff com reviewer_decision e override",
              highlights: [
                {
                  label: "issue_state",
                  change_type: "changed",
                  previous_value: "superseded",
                  current_value: "primary_pdf_diverged",
                },
              ],
            },
          },
          human_override_summary: {
            count: 1,
            latest: {
              actor_name: "Inspetor Demo",
              reason:
                "override mobile_review_allowed diff reissue_reason_codes approval_snapshot_updated",
            },
          },
          emissao_oficial: {
            reissue_recommended: true,
            current_issue: {
              issue_number: "TAR-20260414-000777",
              issue_state: "superseded",
              issue_state_label: "superseded",
              primary_pdf_diverged: true,
              primary_pdf_storage_version: "v0001",
              current_primary_pdf_storage_version: "v0002",
              package_sha256: "abc123",
              approval_snapshot_id: 77,
            },
            audit_trail: [
              {
                title: "reviewer_issue",
                status_label: "issue_state",
                summary: "reviewer_decision diff override",
              },
            ],
          },
          allowed_decisions: ["devolver_no_mobile"],
        }}
      />,
    );

    expect(getAllByText("Revisão interna governada").length).toBeGreaterThan(0);
    expect(getAllByText("Reemissão recomendada").length).toBeGreaterThan(0);
    expect(getAllByText(/Documento substituído/).length).toBeGreaterThan(0);
    expect(
      queryByText(
        /mobile_autonomous|mobile_review_allowed|primary_pdf_diverged|reissue_reason_codes|approval_snapshot_updated|issue_state|superseded|revoked|issued|package_sha256|approval_snapshot_id|reviewer_issue|reviewer_decision|override|diff|red flag|tenant_without_mesa|nr35_mesa_required_unavailable/i,
      ),
    ).toBeNull();
  });

  it("aciona comandos de revisão mobile a partir do card operacional", () => {
    const onExecutarComandoRevisaoMobile = jest
      .fn()
      .mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        onExecutarComandoRevisaoMobile={onExecutarComandoRevisaoMobile}
        reviewPackage={{
          review_mode: "mobile_review_allowed",
          review_required: false,
          document_blockers: [],
          coverage_map: {
            total_required: 3,
            total_accepted: 2,
            total_missing: 1,
            total_irregular: 0,
          },
          revisao_por_bloco: {
            attention_blocks: 1,
            returned_blocks: 0,
            items: [
              {
                block_key: "identificacao",
                title: "Identificação",
                review_status: "attention",
                recommended_action: "Revalidar a identificação técnica.",
              },
            ],
          },
          historico_refazer_inspetor: [],
          memoria_operacional_familia: {
            approved_snapshot_count: 8,
          },
          red_flags: [],
          tenant_entitlements: {
            mobile_review_allowed: true,
            mobile_autonomous_allowed: false,
          },
          allowed_decisions: [
            "aprovar_no_mobile",
            "enviar_para_mesa",
            "devolver_no_mobile",
          ],
          supports_block_reopen: true,
        }}
      />,
    );

    expect(
      getByText(
        "Próxima ação: Aprovar internamente. O pacote já permite decisão interna no app. Aprove quando a revisão estiver coerente com a evidência consolidada.",
      ),
    ).toBeTruthy();
    expect(getByText("Sem bloqueios documentais")).toBeTruthy();
    expect(getByText("1 bloco em revisão")).toBeTruthy();

    fireEvent.press(getByTestId("mesa-review-action-approve"));
    fireEvent.press(getByTestId("mesa-review-action-send"));
    fireEvent.press(getByTestId("mesa-review-action-return"));
    fireEvent.press(getByTestId("mesa-review-reopen-block-identificacao"));

    expect(onExecutarComandoRevisaoMobile).toHaveBeenNthCalledWith(1, {
      command: "aprovar_no_mobile",
    });
    expect(onExecutarComandoRevisaoMobile).toHaveBeenNthCalledWith(2, {
      command: "enviar_para_mesa",
    });
    expect(onExecutarComandoRevisaoMobile).toHaveBeenNthCalledWith(3, {
      command: "devolver_no_mobile",
      block_key: "identificacao",
      title: "Identificação",
      reason: "Revalidar a identificação técnica.",
      summary:
        "A revisão mobile devolveu o bloco Identificação para ajuste antes da conclusão.",
      required_action: "Revalidar a identificação técnica.",
      failure_reasons: [],
    });
    expect(onExecutarComandoRevisaoMobile).toHaveBeenNthCalledWith(4, {
      command: "reabrir_bloco",
      block_key: "identificacao",
      title: "Identificação",
      reason: "Revalidar a identificação técnica.",
      summary: "Revalidar a identificação técnica.",
    });
  });

  it("inclui red flags no payload de devolução quando a revisão já sinaliza divergências", () => {
    const onExecutarComandoRevisaoMobile = jest
      .fn()
      .mockResolvedValue(undefined);
    const { getByTestId } = render(
      <ThreadConversationPane
        {...baseProps}
        onExecutarComandoRevisaoMobile={onExecutarComandoRevisaoMobile}
        reviewPackage={{
          review_mode: "mesa_required",
          allowed_decisions: ["devolver_no_mobile"],
          red_flags: [
            {
              code: "nr_divergence",
              title: "Divergência com NR",
              message: "O texto proposto não bate com a base normativa.",
            },
          ],
          revisao_por_bloco: {
            attention_blocks: 1,
            returned_blocks: 0,
            items: [
              {
                block_key: "normas",
                title: "Normas aplicáveis",
                review_status: "attention",
                recommended_action:
                  "Revisar a base normativa antes de concluir.",
              },
            ],
          },
        }}
      />,
    );

    fireEvent.press(getByTestId("mesa-review-action-return"));

    expect(onExecutarComandoRevisaoMobile).toHaveBeenCalledWith({
      command: "devolver_no_mobile",
      block_key: "normas",
      title: "Normas aplicáveis",
      reason: "Revisar a base normativa antes de concluir.",
      summary:
        "A revisão mobile devolveu o bloco Normas aplicáveis para ajuste antes da conclusão.",
      required_action: "Revisar a base normativa antes de concluir.",
      failure_reasons: ["nr_divergence", "Divergência com NR"],
    });
  });

  it("mantém o pre-laudo operacional fora da thread do chat", () => {
    const { getByText, queryByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        allowedSurfaceActions={["chat_finalize"]}
        caseLifecycleStatus="laudo_em_coleta"
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Pré-laudo em consolidação.",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reportPackDraft={{
          modeled: true,
          template_label: "NR35 Linha de Vida",
          guided_context: {
            asset_label: "Linha de vida cobertura A",
            location_label: "Bloco 2",
            inspection_objective:
              "Validar ancoragem principal antes da liberacao.",
            checklist_ids: ["identificacao", "ancoragem", "conclusao"],
            completed_step_ids: ["identificacao"],
          },
          image_slots: [
            { slot: "vista_geral", status: "resolved" },
            { slot: "ponto_superior", status: "pending" },
          ],
          items: [
            {
              item_codigo: "fixacao",
              veredito_ia_normativo: "C",
              approved_for_emission: true,
              missing_evidence: [],
            },
            {
              item_codigo: "cabo",
              veredito_ia_normativo: "pendente",
              approved_for_emission: false,
              missing_evidence: ["status_normativo_nao_confirmado"],
            },
          ],
          structured_data_candidate: null,
          quality_gates: {
            checklist_complete: false,
            required_image_slots_complete: false,
            critical_items_complete: false,
            autonomy_ready: false,
            requires_normative_curation: true,
            max_conflict_score: 82,
            final_validation_mode: "mesa_required",
            missing_evidence: [
              {
                message: "Ainda faltam evidencias visuais obrigatorias.",
              },
            ],
          },
          pre_laudo_outline: {
            ready_for_structured_form: true,
            ready_for_finalization: false,
            next_questions: [
              "Confirme a conclusão técnica da ancoragem principal.",
            ],
          },
          pre_laudo_document: {
            family_key: "nr35_inspecao_linha_de_vida",
            family_label: "NR35 Linha de Vida",
            template_key: "nr35",
            template_label: "NR35 Linha de Vida",
            minimum_evidence: {
              fotos: 2,
              documentos: 1,
              textos: 1,
            },
            document_flow: [
              {
                key: "family_schema",
                title: "Base da família",
                status: "ready",
                status_label: "Pronto",
                summary: "Base pronta no catálogo.",
              },
            ],
            executive_sections: [
              {
                key: "conclusao_e_emissao",
                title: "Conclusão e emissão",
                status: "attention",
                summary: "Ainda existem pendências antes da finalização.",
                bullets: [
                  "Conclusão técnica precisa estar fechada para emissão.",
                ],
              },
            ],
            document_sections: [
              {
                section_key: "conclusao",
                title: "Conclusão",
                status: "attention",
                status_label: "Em andamento",
                summary: "2/5 campos preenchidos; revisão parcial.",
                filled_field_count: 2,
                missing_field_count: 3,
                total_field_count: 5,
                highlights: [
                  {
                    path: "conclusao.resultado",
                    label: "Conclusão / Resultado",
                  },
                ],
              },
            ],
            highlighted_sections: [
              {
                section_key: "conclusao",
                title: "Conclusão",
                status: "attention",
                status_label: "Em andamento",
                summary: "2/5 campos preenchidos; revisão parcial.",
                filled_field_count: 2,
                missing_field_count: 3,
                total_field_count: 5,
                highlights: [
                  {
                    path: "conclusao.resultado",
                    label: "Conclusão / Resultado",
                  },
                ],
              },
            ],
            required_slots: [
              {
                slot_id: "foto_ponto_superior",
                label: "Foto do ponto superior",
                required: true,
                accepted_types: ["image/jpeg"],
                binding_path: "registros_fotograficos.ponto_superior",
                purpose: "Registrar o ponto superior com contexto técnico.",
              },
            ],
            review_required: ["Revisão humana obrigatória para emissão."],
            next_questions: [
              "Confirme a conclusão técnica da ancoragem principal.",
            ],
            analysis_basis_summary: {
              coverage_summary: "1 de 2 fotos obrigatórias vinculadas.",
              photo_summary:
                "Existe foto geral, falta close do ponto superior.",
              context_summary:
                "Ativo identificado como Linha de vida cobertura A.",
            },
            example_available: true,
          },
          evidence_summary: {
            evidence_count: 4,
            image_count: 1,
            text_count: 3,
          },
        }}
      />,
    );

    expect(getByText("Pré-laudo em consolidação.")).toBeTruthy();
    expect(queryByTestId("chat-report-pack-card")).toBeNull();
    expect(queryByText("PDF operacional")).toBeNull();
    expect(queryByText("Baixar pacote oficial")).toBeNull();
    expect(queryByText("Validar e finalizar")).toBeNull();
    expect(queryByText("Abrir Mesa Avaliadora")).toBeNull();
  });

  it("mantém o pre-laudo operacional disponível na Mesa", () => {
    const { getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        reportPackDraft={{
          modeled: true,
          template_label: "NR35 Linha de Vida",
          quality_gates: {
            autonomy_ready: false,
            final_validation_mode: "mesa_required",
            missing_evidence: [
              {
                message: "Ainda faltam evidências visuais obrigatórias.",
              },
            ],
          },
          pre_laudo_outline: {
            ready_for_structured_form: true,
            ready_for_finalization: false,
          },
        }}
      />,
    );

    expect(getByTestId("mesa-report-pack-card")).toBeTruthy();
    expect(getByText("PDF operacional")).toBeTruthy();
  });

  it("usa a revisão do chat livre para listar PDFs gerados", async () => {
    const onAbrirAnexo = jest.fn();
    const onCorrigirDocumentoChatLivre = jest.fn();
    const onDocumentoChatLivreGerado = jest.fn().mockResolvedValue(undefined);
    (
      carregarDocumentoEditavelChatLivreMobile as jest.Mock
    ).mockResolvedValueOnce({
      ok: true,
      laudo_id: 80,
      attachment_id: 202,
      documento: {
        title: "Laudo Técnico Consolidado",
        subtitle: "Resumo",
        evidences: [
          {
            key: "evidencia_1",
            index: 1,
            title: "Evidência 1",
            display_name: "foto-original.png",
            image_data_uri: "data:image/png;base64,b3JpZ2luYWw=",
            source: "original",
          },
        ],
        sections: [
          {
            key: "sintese_executiva",
            title: "Síntese Executiva",
            kind: "paragraph",
            editable: true,
            content: "Texto original",
          },
          {
            key: "evidencia_1_descricao",
            title: "Evidência 1 | Descrição Consolidada",
            kind: "paragraph",
            editable: true,
            content: "Descrição original da foto",
          },
          {
            key: "evidencia_1_avaliacao",
            title: "Evidência 1 | Avaliação Técnica",
            kind: "paragraph",
            editable: true,
            content: "Avaliação original da foto",
          },
        ],
      },
    });
    (
      reavaliarEvidenciaDocumentoEditavelChatLivreMobile as jest.Mock
    ).mockResolvedValueOnce({
      ok: true,
      laudo_id: 80,
      attachment_id: 202,
      evidence_key: "evidencia_1",
      sections: [
        {
          key: "evidencia_1_avaliacao",
          title: "Evidência 1 | Avaliação Técnica",
          kind: "paragraph",
          editable: true,
          content: "Avaliação reavaliada da foto substituída",
        },
      ],
      documento: {
        title: "Laudo Técnico Consolidado",
        subtitle: "Resumo",
        evidences: [
          {
            key: "evidencia_1",
            index: 1,
            title: "Evidência 1",
            display_name: "foto-nova.jpg",
            image_data_uri: "data:image/jpeg;base64,bm92YQ==",
            preview_uri: "file://foto-nova.jpg",
            source: "replacement",
            replacement: true,
          },
        ],
        sections: [
          {
            key: "sintese_executiva",
            title: "Síntese Executiva",
            kind: "paragraph",
            editable: true,
            content: "Texto revisado",
          },
          {
            key: "evidencia_1_descricao",
            title: "Evidência 1 | Descrição Consolidada",
            kind: "paragraph",
            editable: true,
            content: "Descrição original da foto",
          },
          {
            key: "evidencia_1_avaliacao",
            title: "Evidência 1 | Avaliação Técnica",
            kind: "paragraph",
            editable: true,
            content: "Avaliação reavaliada da foto substituída",
          },
        ],
      },
    });
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValueOnce({
      granted: true,
      accessPrivileges: "all",
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          base64: "bm92YQ==",
          fileName: "foto-nova.jpg",
          mimeType: "image/jpeg",
          uri: "file://foto-nova.jpg",
        },
      ],
    });
    (salvarDocumentoEditavelChatLivreMobile as jest.Mock).mockResolvedValueOnce(
      {
        tipo: "relatorio_chat_livre",
        texto: "Nova versão gerada.",
        mensagem_id: 12,
        laudo_id: 80,
        anexos: [{ id: 203, mime_type: "application/pdf" }],
        documento_editavel: {
          title: "Laudo Técnico Consolidado",
          evidences: [
            {
              key: "evidencia_1",
              index: 1,
              title: "Evidência 1",
              display_name: "foto-nova.jpg",
              image_data_uri: "data:image/jpeg;base64,bm92YQ==",
              source: "replacement",
              replacement: true,
            },
          ],
          sections: [
            {
              key: "sintese_executiva",
              title: "Síntese Executiva",
              kind: "paragraph",
              editable: true,
              content: "Texto revisado",
            },
          ],
        },
      },
    );
    const { getAllByText, getByText, getByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        caseWorkflowMode="analise_livre"
        entryModeEffective="chat_first"
        historyTitle="Inspeção sala de bombas"
        mensagensVisiveis={[
          {
            id: 10,
            papel: "assistente",
            texto: "Primeira versão.",
            tipo: "assistant",
            anexos: [
              {
                id: 201,
                nome_original: "relatorio_chat_livre_v1.pdf",
                mime_type: "application/pdf",
                categoria: "documento",
                url: "/app/api/laudo/80/mesa/anexos/201",
              },
            ],
          },
          {
            id: 11,
            papel: "assistente",
            texto: "Versão corrigida.",
            tipo: "assistant",
            anexos: [
              {
                id: 202,
                nome_original: "relatorio_chat_livre_v2.pdf",
                mime_type: "application/pdf",
                categoria: "documento",
                url: "/app/api/laudo/80/mesa/anexos/202",
              },
            ],
          },
        ]}
        onAbrirAnexo={onAbrirAnexo}
        onCorrigirDocumentoChatLivre={onCorrigirDocumentoChatLivre}
        onDocumentoChatLivreGerado={onDocumentoChatLivreGerado}
        sessionAccessToken="token-123"
      />,
    );

    expect(getByTestId("free-chat-review-documents-card")).toBeTruthy();
    expect(getByText("Baixe ou corrija versões dos relatórios")).toBeTruthy();
    expect(queryByText("Revisar PDF")).toBeNull();
    expect(queryByText("PDFs gerados")).toBeNull();
    expect(queryByText("Documento atual")).toBeNull();
    expect(queryByText("Documentos gerados")).toBeNull();
    expect(getByText("Relatório atual")).toBeTruthy();
    expect(getByText("Relatório anterior v1")).toBeTruthy();
    expect(getAllByText("Inspeção sala de bombas").length).toBeGreaterThan(0);

    fireEvent.press(getByTestId("free-chat-review-current-document-download"));
    expect(onAbrirAnexo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 202 }),
    );

    fireEvent.press(getByTestId("free-chat-review-current-document-correct"));
    await waitFor(() =>
      expect(getByTestId("free-chat-pdf-editor")).toBeTruthy(),
    );
    expect(carregarDocumentoEditavelChatLivreMobile).toHaveBeenCalledWith(
      "token-123",
      80,
      202,
    );
    fireEvent.changeText(
      getByTestId("free-chat-pdf-editor-section-sintese_executiva"),
      "Texto revisado",
    );
    expect(
      getByTestId("free-chat-pdf-editor-evidence-evidencia_1-image"),
    ).toBeTruthy();
    fireEvent.press(
      getByTestId("free-chat-pdf-editor-evidence-evidencia_1-replace"),
    );
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          allowsMultipleSelection: false,
          base64: true,
          selectionLimit: 1,
        }),
      );
    });
    fireEvent.press(
      getByTestId("free-chat-pdf-editor-evidence-evidencia_1-reanalyze"),
    );
    await waitFor(() => {
      expect(
        reavaliarEvidenciaDocumentoEditavelChatLivreMobile,
      ).toHaveBeenCalledWith(
        "token-123",
        80,
        202,
        "evidencia_1",
        expect.objectContaining({
          evidences: expect.arrayContaining([
            expect.objectContaining({
              image_data_uri: "data:image/jpeg;base64,bm92YQ==",
              source: "replacement",
            }),
          ]),
        }),
      );
    });
    await act(async () => {
      fireEvent.press(getByTestId("free-chat-pdf-editor-save"));
    });
    await waitFor(() => {
      expect(salvarDocumentoEditavelChatLivreMobile).toHaveBeenCalledWith(
        "token-123",
        80,
        202,
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({ content: "Texto revisado" }),
          ]),
          evidences: expect.arrayContaining([
            expect.objectContaining({
              image_data_uri: "data:image/jpeg;base64,bm92YQ==",
              source: "replacement",
            }),
          ]),
        }),
      );
      expect(onDocumentoChatLivreGerado).toHaveBeenCalledTimes(1);
      expect(onCorrigirDocumentoChatLivre).not.toHaveBeenCalled();
    });
  });

  it("não injeta CTA da Mesa do pre-laudo dentro do chat", () => {
    const { getByText, queryByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        caseLifecycleStatus="laudo_em_coleta"
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Mobile pilot V2 target",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reportPackDraft={{
          template_label: "Inspeção Geral (Padrão)",
          quality_gates: {
            autonomy_ready: false,
            missing_evidence: [
              {
                message:
                  "Esta familia ainda nao possui report pack incremental modelado.",
              },
            ],
          },
          pre_laudo_outline: {
            final_validation_mode: "mesa_required",
            next_questions: [
              "Esta familia ainda nao possui report pack incremental modelado.",
            ],
          },
        }}
      />,
    );

    expect(getByText("Mobile pilot V2 target")).toBeTruthy();
    expect(queryByTestId("chat-report-pack-card-open-mesa")).toBeNull();
    expect(queryByText("Abrir Mesa Avaliadora")).toBeNull();
  });

  it("mantém o fallback de família não modelada fora do chat", () => {
    const { getByText, queryByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        caseLifecycleStatus="laudo_em_coleta"
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Mobile pilot V2 target",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reportPackDraft={{
          template_label: "Inspeção Geral (Padrão)",
          quality_gates: {
            autonomy_ready: false,
            missing_evidence: [
              {
                message:
                  "Esta familia ainda nao possui report pack incremental modelado.",
              },
            ],
          },
          pre_laudo_outline: {
            next_questions: [
              "Esta familia ainda nao possui report pack incremental modelado.",
            ],
          },
        }}
      />,
    );

    expect(getByText("Mobile pilot V2 target")).toBeTruthy();
    expect(
      queryByText(
        /Esta familia ainda nao possui report pack incremental modelado/,
      ),
    ).toBeNull();
    expect(queryByTestId("chat-report-pack-card-open-mesa")).toBeNull();
  });

  it("não mostra estado operacional do pre-laudo dentro do chat", () => {
    const { getByText, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Pacote consolidado.",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reportPackDraft={{
          modeled: true,
          template_label: "CBMGO",
          structured_data_candidate: {
            identificacao: {
              ativo_nome: "Reservatório principal",
            },
          },
          quality_gates: {
            checklist_complete: true,
            required_image_slots_complete: true,
            critical_items_complete: true,
            autonomy_ready: true,
            max_conflict_score: 8,
            final_validation_mode: "mobile_autonomous",
            missing_evidence: [],
          },
          pre_laudo_outline: {
            ready_for_structured_form: true,
            ready_for_finalization: true,
          },
          guided_context: {
            checklist_ids: ["identificacao", "conclusao"],
            completed_step_ids: ["identificacao", "conclusao"],
          },
          image_slots: [{ slot: "fachada", status: "ready" }],
          items: [
            {
              item_codigo: "seguranca_estrutural.paredes",
              titulo: "Paredes",
              veredito_ia_normativo: "C",
              approved_for_emission: true,
              missing_evidence: [],
            },
          ],
          evidence_summary: {
            evidence_count: 6,
            image_count: 1,
            text_count: 5,
          },
        }}
      />,
    );

    expect(getByText("Pacote consolidado.")).toBeTruthy();
    expect(queryByText("Pronto para validar")).toBeNull();
    expect(queryByText("Sem pendências do caso")).toBeNull();
    expect(queryByText("Sem revisão pendente")).toBeNull();
  });

  it("destaca o documento emitido na thread quando o caso já tem emissão oficial", () => {
    const onAbrirAnexo = jest.fn();
    const { getAllByText, getByTestId, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        conversaVazia={false}
        caseLifecycleStatus="emitido"
        onAbrirAnexo={onAbrirAnexo}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Documento emitido.",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reviewPackage={{
          emissao_oficial: {
            reissue_recommended: true,
            current_issue: {
              issue_number: "TAR-20260413-000321",
              issue_state: "issued",
              issue_state_label: "Emitido",
              issued_at: "2026-04-13T18:45:00+00:00",
              package_sha256:
                "ffffffffeeeeeeeeddddddddccccccccbbbbbbbbaaaaaaaa9999999988888888",
              package_filename: "TAR-20260413-000321.zip",
              download_url: "/app/api/laudo/321/emissao-oficial/download",
              download_label: "Baixar pacote oficial",
              download_mime_type: "application/zip",
              approval_snapshot_id: 321,
              primary_pdf_diverged: true,
              primary_pdf_storage_version: "v0003",
              current_primary_pdf_storage_version: "v0004",
            },
          },
          public_verification: {
            verification_url: "/app/public/laudo/verificar/hash321",
          },
        }}
      />,
    );

    expect(getByTestId("chat-issued-document-card")).toBeTruthy();
    expect(getAllByText("Emissão oficial").length).toBeGreaterThan(0);
    expect(getAllByText("Documento emitido").length).toBeGreaterThan(0);
    expect(getByText("TAR-20260413-000321")).toBeTruthy();
    expect(getByText("Download oficial")).toBeTruthy();
    expect(getByText("Hash do pacote")).toBeTruthy();
    expect(getAllByText("Reemissão recomendada").length).toBeGreaterThan(0);
    expect(
      getByText(
        "A versão atual divergiu do documento congelado na emissão oficial. Emitido v0003 · Atual v0004.",
      ),
    ).toBeTruthy();
    expect(
      getByText(
        "Histórico/Auditoria: verificação pública disponível em /app/public/laudo/verificar/hash321",
      ),
    ).toBeTruthy();

    fireEvent.press(getByTestId("chat-issued-document-download"));
    expect(onAbrirAnexo).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: "emissao_oficial",
        mime_type: "application/zip",
        nome: "TAR-20260413-000321.zip",
        url: "/app/api/laudo/321/emissao-oficial/download",
      }),
    );
  });

  it("mantém documento substituído como histórico sem download principal", () => {
    const onAbrirAnexo = jest.fn();
    const { getAllByText, queryByTestId } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        conversaVazia={false}
        caseLifecycleStatus="emitido"
        onAbrirAnexo={onAbrirAnexo}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Documento substituído preservado.",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reviewPackage={{
          emissao_oficial: {
            current_issue: {
              issue_number: "TAR-20260413-000111",
              issue_state: "superseded",
              issue_state_label: "superseded",
              issued_at: "2026-04-13T18:45:00+00:00",
              package_filename: "TAR-20260413-000111.zip",
              download_url: "/app/api/laudo/111/emissao-oficial/download",
              download_label: "Baixar pacote oficial",
              download_mime_type: "application/zip",
              package_sha256: "hash-substituido",
            },
          },
        }}
      />,
    );

    expect(getAllByText("Histórico de emissões").length).toBeGreaterThan(0);
    expect(getAllByText("Documento substituído").length).toBeGreaterThan(0);
    expect(queryByTestId("chat-issued-document-download")).toBeNull();
    expect(onAbrirAnexo).not.toHaveBeenCalled();
  });

  it("não mostra cards formais quando o caso segue em análise livre", () => {
    const { queryByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        caseLifecycleStatus="pre_laudo"
        caseWorkflowMode="laudo_guiado"
        entryModeEffective="chat_first"
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Resposta livre da IA.",
            tipo: "assistant",
            citacoes: [],
          },
        ]}
        reportPackDraft={{} as never}
        reviewPackage={
          {
            emissao_oficial: {
              current_issue: {
                issue_number: "TAR-20260413-000999",
              },
            },
          } as never
        }
      />,
    );

    expect(queryByTestId("chat-report-pack-card")).toBeNull();
    expect(queryByTestId("chat-issued-document-card")).toBeNull();
    expect(queryByText("PDF operacional")).toBeNull();
    expect(queryByText("Emissão oficial")).toBeNull();
  });

  it("sanitiza preferencias internas vazadas na renderizacao do chat", () => {
    const { queryByText, getByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "usuario",
            texto:
              "[preferencias_ia_mobile]\nresponda em Português\n[/preferencias_ia_mobile]",
            tipo: "user",
            citacoes: [],
          },
        ]}
      />,
    );

    expect(getByText("Evidência enviada")).toBeTruthy();
    expect(queryByText("[preferencias_ia_mobile]")).toBeNull();
  });

  it("expõe a superfície principal do chat e marca o último PDF da assistente", () => {
    const { getByTestId, queryAllByTestId, queryByText } = render(
      <ThreadConversationPane
        {...baseProps}
        vendoMesa={false}
        conversaVazia={false}
        mensagensVisiveis={[
          {
            id: 1,
            papel: "assistente",
            texto: "Primeiro PDF.",
            tipo: "assistant",
            citacoes: [],
            anexos: [
              {
                id: 100,
                nome_original: "relatorio_antigo.pdf",
                mime_type: "application/pdf",
                categoria: "documento",
                url: "/app/api/laudo/80/mesa/anexos/100",
              },
            ],
          },
          {
            id: 2,
            papel: "assistente",
            texto: "PDF mais recente.",
            tipo: "assistant",
            citacoes: [],
            anexos: [
              {
                id: 101,
                nome_original: "relatorio_chat_livre_80.pdf",
                mime_type: "application/pdf",
                categoria: "documento",
                url: "/app/api/laudo/80/mesa/anexos/101",
              },
            ],
          },
        ]}
        sessionAccessToken="token-demo"
      />,
    );

    expect(getByTestId("chat-thread-surface")).toBeTruthy();
    expect(getByTestId("chat-last-assistant-document-attachment")).toBeTruthy();
    expect(
      queryAllByTestId("chat-last-assistant-document-attachment"),
    ).toHaveLength(1);
    expect(queryByText("PDF operacional")).toBeNull();
    expect(queryByText("Emissão oficial")).toBeNull();
  });
});
