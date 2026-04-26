import type { MobileUser } from "../../types/mobile";
import {
  buildMobileAccessSummary,
  buildMobileHelpTopicsSummary,
  buildMobileIdentityRuntimeNote,
  buildMobileOperationalFootprintSummary,
  buildMobilePortalSwitchSummary,
  buildMobileSupportAccessLabel,
  buildMobileWorkspaceSummary,
  filterHelpArticlesByMobileAccess,
  filterNotificationsByMobileAccess,
  filterOfflineQueueByMobileAccess,
  hasMobileUserCapability,
  hasMobileUserPortal,
  resolveMobileChatFirstGovernance,
  resolveMobilePortalSwitchLinks,
  resolveMobileUserPortalLabels,
  resolveMobileUserPortals,
  sanitizeReadCacheByMobileAccess,
} from "./mobileUserAccess";

function criarUsuario(overrides: Partial<MobileUser> = {}): MobileUser {
  return {
    id: 7,
    nome_completo: "Inspetor Tariel",
    email: "inspetor@tariel.test",
    telefone: "(11) 99999-0000",
    foto_perfil_url: "",
    empresa_nome: "Empresa A",
    empresa_id: 33,
    nivel_acesso: 1,
    ...overrides,
  };
}

describe("mobileUserAccess", () => {
  it("prioriza os grants efetivos e o modelo operacional do tenant", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor", "revisor", "cliente"],
      commercial_operating_model: "mobile_single_operator",
      commercial_operating_model_label: "Mobile principal com operador único",
      commercial_service_package: "inspector_chat_mesa_reviewer_services",
      commercial_service_package_label:
        "Chat Inspetor + Mesa + serviços no Inspetor",
      identity_runtime_note:
        "A conta principal do tenant pode receber multiplas superficies conforme o cadastro definido no Admin-CEO.",
      portal_switch_links: [
        {
          portal: "inspetor",
          label: "Inspetor web/mobile",
          url: "/app/",
        },
        {
          portal: "revisor",
          label: "Mesa Avaliadora",
          url: "/revisao/painel",
        },
      ],
    });

    expect(resolveMobileUserPortals(user)).toEqual([
      "inspetor",
      "revisor",
      "cliente",
    ]);
    expect(resolveMobileUserPortalLabels(user)).toEqual([
      "Inspetor web/mobile",
      "Mesa Avaliadora",
      "Admin-Cliente",
    ]);
    expect(buildMobileWorkspaceSummary(user)).toBe(
      "Empresa A • Chat Inspetor + Mesa + serviços no Inspetor",
    );
    expect(buildMobileAccessSummary(user)).toBe(
      "Empresa #33 • Inspetor web/mobile + Mesa Avaliadora + Admin-Cliente • Chat Inspetor + Mesa + serviços no Inspetor • Mobile principal com operador único",
    );
    expect(buildMobileSupportAccessLabel(user)).toBe(
      "Inspetor web/mobile + Mesa Avaliadora + Admin-Cliente",
    );
    expect(buildMobileOperationalFootprintSummary(user)).toBe(
      "Admin-Cliente da empresa, chat do inspetor, mesa avaliadora, histórico, fila offline e configurações do app.",
    );
    expect(buildMobileHelpTopicsSummary(user)).toBe(
      "acesso, inspeção, mesa e offline",
    );
    expect(buildMobileIdentityRuntimeNote(user)).toBe(
      "A conta principal do tenant pode receber multiplas superficies conforme o cadastro definido no Admin-CEO.",
    );
    expect(resolveMobilePortalSwitchLinks(user)).toEqual([
      {
        portal: "inspetor",
        label: "Inspetor web/mobile",
        url: "http://127.0.0.1:8000/app/",
        destinationPath: "/app/",
      },
      {
        portal: "revisor",
        label: "Mesa Avaliadora",
        url: "http://127.0.0.1:8000/revisao/painel",
        destinationPath: "/revisao/painel",
      },
    ]);
    expect(buildMobilePortalSwitchSummary(user)).toBe(
      "Inspetor web/mobile (/app/) • Mesa Avaliadora (/revisao/painel)",
    );
  });

  it("cai para o papel base quando o bootstrap ainda não traz grants explícitos", () => {
    const user = criarUsuario({
      allowed_portals: undefined,
      allowed_portal_labels: undefined,
      commercial_operating_model: undefined,
      commercial_operating_model_label: undefined,
      nivel_acesso: 50,
    });

    expect(resolveMobileUserPortals(user)).toEqual(["revisor"]);
    expect(resolveMobileUserPortalLabels(user)).toEqual(["Mesa Avaliadora"]);
    expect(buildMobileWorkspaceSummary(user)).toBe("Empresa A");
    expect(buildMobileAccessSummary(user)).toBe(
      "Empresa #33 • Mesa Avaliadora • Nível 50",
    );
    expect(buildMobileSupportAccessLabel(user)).toBe("Mesa Avaliadora");
    expect(buildMobileOperationalFootprintSummary(user)).toBe(
      "mesa avaliadora, histórico, fila offline e configurações do app.",
    );
    expect(buildMobileHelpTopicsSummary(user)).toBe(
      "mesa, offline e segurança",
    );
  });

  it("usa tenant_access_policy como fallback canonico para grants, labels e links", () => {
    const user = criarUsuario({
      allowed_portals: undefined,
      allowed_portal_labels: undefined,
      portal_switch_links: undefined,
      tenant_access_policy: {
        governed_by_admin_ceo: true,
        commercial_service_package_effective: "inspector_chat",
        commercial_service_package_label: "Chat Inspetor sem Mesa",
        allowed_portals: ["inspetor", "revisor", "cliente"],
        allowed_portal_labels: [
          "Area de campo",
          "Area de analise",
          "Portal da empresa",
        ],
        portal_entitlements: {
          inspetor: true,
          revisor: true,
          cliente: true,
        },
        capability_entitlements: {},
        user_capability_entitlements: {},
      },
    });

    expect(resolveMobileUserPortals(user)).toEqual([
      "inspetor",
      "revisor",
      "cliente",
    ]);
    expect(resolveMobileUserPortalLabels(user)).toEqual([
      "Area de campo",
      "Area de analise",
      "Portal da empresa",
    ]);
    expect(buildMobileWorkspaceSummary(user)).toBe(
      "Empresa A • Chat Inspetor sem Mesa",
    );
    expect(resolveMobilePortalSwitchLinks(user)).toEqual([
      {
        portal: "inspetor",
        label: "Area de campo",
        url: "http://127.0.0.1:8000/app/",
        destinationPath: "/app/",
      },
      {
        portal: "revisor",
        label: "Area de analise",
        url: "http://127.0.0.1:8000/revisao/painel",
        destinationPath: "/revisao/painel",
      },
      {
        portal: "cliente",
        label: "Portal da empresa",
        url: "http://127.0.0.1:8000/cliente/painel",
        destinationPath: "/cliente/painel",
      },
    ]);
    expect(buildMobilePortalSwitchSummary(user)).toBe(
      "Area de campo (/app/) • Area de analise (/revisao/painel) • Portal da empresa (/cliente/painel)",
    );
  });

  it("expõe a checagem de portal efetivo por usuário", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor", "cliente"],
    });

    expect(hasMobileUserPortal(user, "inspetor")).toBe(true);
    expect(hasMobileUserPortal(user, "revisor")).toBe(false);
  });

  it("expõe capabilities efetivas do usuário via tenant_access_policy", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
      tenant_access_policy: {
        governed_by_admin_ceo: true,
        portal_entitlements: {
          inspetor: true,
          revisor: true,
        },
        capability_entitlements: {
          inspector_send_to_mesa: true,
        },
        user_capability_entitlements: {
          inspector_send_to_mesa: true,
          reviewer_issue: false,
        },
      },
    });

    expect(hasMobileUserCapability(user, "inspector_send_to_mesa")).toBe(true);
    expect(hasMobileUserCapability(user, "reviewer_issue")).toBe(false);
    expect(hasMobileUserPortal(user, "revisor")).toBe(false);
  });

  it("resolve aliases neutros de capabilities sem remover os nomes legados", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
      tenant_access_policy: {
        governed_by_admin_ceo: true,
        portal_entitlements: {
          inspetor: true,
          revisor: false,
        },
        capability_entitlements: {
          mobile_case_approve: true,
          reviewer_issue: false,
        },
        user_capability_entitlements: {
          mobile_case_approve: true,
          reviewer_issue: false,
        },
      },
    });

    expect(hasMobileUserCapability(user, "mobile_case_approve")).toBe(true);
    expect(hasMobileUserCapability(user, "case_self_review")).toBe(true);
    expect(hasMobileUserCapability(user, "official_issue_create")).toBe(false);
    expect(hasMobileUserCapability(user, "official_issue_download")).toBe(
      false,
    );
  });

  it("prioriza aliases efetivos do usuário sobre fallback legado do tenant", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
      tenant_access_policy: {
        governed_by_admin_ceo: true,
        portal_entitlements: {
          inspetor: true,
        },
        capability_entitlements: {
          mobile_case_approve: true,
        },
        user_capability_aliases: {
          case_self_review: false,
        },
      },
    });

    expect(hasMobileUserCapability(user, "case_self_review")).toBe(false);
    expect(hasMobileUserCapability(user, "mobile_case_approve")).toBe(true);
  });

  it("expõe read model mobile/chat-first para revisão interna sem Mesa", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
      tenant_access_policy: {
        governed_by_admin_ceo: true,
        portal_entitlements: {
          inspetor: true,
          revisor: false,
        },
        user_capability_aliases: {
          case_self_review: true,
          official_issue_create: false,
        },
        user_mobile_chat_first_governance: {
          review_governance_mode: "self_review_allowed",
          approval_actor_scope: "inspector_self",
          issue_governance_mode: "none",
          separate_mesa_required: false,
          self_review_allowed: true,
          official_issue_allowed: false,
          signatory_required: false,
          available_case_actions: ["case_self_review"],
        },
      },
    });

    expect(resolveMobileChatFirstGovernance(user)).toMatchObject({
      review_governance_mode: "self_review_allowed",
      approval_actor_scope: "inspector_self",
      separate_mesa_required: false,
      self_review_allowed: true,
      official_issue_allowed: false,
    });
  });

  it("remove itens de mesa das superfícies offline quando o usuário não tem grant de revisor", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
    });

    expect(
      filterOfflineQueueByMobileAccess(
        [
          {
            id: "chat-1",
            channel: "chat",
            operation: "message",
            laudoId: 10,
            text: "Mensagem",
            createdAt: "2026-04-13T10:00:00.000Z",
            title: "Chat",
            attachment: null,
            referenceMessageId: null,
            qualityGateDecision: null,
            attempts: 0,
            lastAttemptAt: "",
            lastError: "",
            nextRetryAt: "",
            aiMode: "detalhado",
            aiSummary: "",
            aiMessagePrefix: "",
          },
          {
            id: "mesa-1",
            channel: "mesa",
            operation: "message",
            laudoId: 11,
            text: "Mesa",
            createdAt: "2026-04-13T10:01:00.000Z",
            title: "Mesa",
            attachment: null,
            referenceMessageId: null,
            qualityGateDecision: null,
            attempts: 0,
            lastAttemptAt: "",
            lastError: "",
            nextRetryAt: "",
            aiMode: "detalhado",
            aiSummary: "",
            aiMessagePrefix: "",
          },
        ],
        user,
      ),
    ).toEqual([
      expect.objectContaining({
        id: "chat-1",
        channel: "chat",
      }),
    ]);

    expect(
      filterNotificationsByMobileAccess(
        [
          {
            id: "notif-chat",
            kind: "status",
            laudoId: 10,
            title: "Chat",
            body: "Atualização",
            createdAt: "2026-04-13T10:00:00.000Z",
            unread: true,
            targetThread: "chat",
          },
          {
            id: "notif-mesa",
            kind: "mesa_nova",
            laudoId: 11,
            title: "Mesa",
            body: "Retorno",
            createdAt: "2026-04-13T10:01:00.000Z",
            unread: true,
            targetThread: "mesa",
          },
        ],
        user,
      ),
    ).toEqual([
      expect.objectContaining({
        id: "notif-chat",
        targetThread: "chat",
      }),
    ]);
  });

  it("limpa dados locais de mesa do cache quando o grant de revisor não existe", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
    });

    expect(
      sanitizeReadCacheByMobileAccess(
        {
          bootstrap: null,
          laudos: [],
          conversaAtual: null,
          conversasPorLaudo: {},
          mesaPorLaudo: {
            "laudo:10": [],
          },
          guidedInspectionDrafts: {},
          chatDrafts: {},
          mesaDrafts: {
            "mesa:10": "Rascunho",
          },
          chatAttachmentDrafts: {},
          mesaAttachmentDrafts: {
            "mesa:10": {
              kind: "document",
              label: "doc",
              resumo: "resumo",
              textoDocumento: "",
              nomeDocumento: "doc.pdf",
              chars: 0,
              truncado: false,
              fileUri: "file://doc.pdf",
              mimeType: "application/pdf",
            },
          },
          updatedAt: "2026-04-13T10:00:00.000Z",
        },
        user,
      ),
    ).toEqual(
      expect.objectContaining({
        mesaPorLaudo: {},
        mesaDrafts: {},
        mesaAttachmentDrafts: {},
      }),
    );
  });

  it("filtra artigos de ajuda que exigem grant específico", () => {
    const user = criarUsuario({
      allowed_portals: ["inspetor"],
    });

    expect(
      filterHelpArticlesByMobileAccess(
        [
          { id: "help-1", title: "Geral" },
          {
            id: "help-2",
            title: "Mesa",
            requiredPortals: ["revisor"] as const,
          },
        ],
        user,
      ).map((item) => item.id),
    ).toEqual(["help-1"]);
  });
});
