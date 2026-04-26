import type {
  MobileChatFirstCapabilityAlias,
  MobileChatFirstGovernance,
  MobileCommercialOperatingModel,
  MobileCommercialServicePackage,
  MobilePortalSwitchLink,
  MobileTenantAccessPolicy,
  MobileUser,
  MobileUserPortal,
} from "../../types/mobile";
import {
  DEFAULT_API_BASE_URL,
  normalizarApiBaseUrl,
  readRuntimeEnv,
} from "../../config/apiCore";
import type {
  MobileActivityNotification,
  OfflinePendingMessage,
} from "../chat/types";
import type { MobileReadCache } from "./readCacheTypes";

const MOBILE_USER_PORTAL_LABELS: Record<MobileUserPortal, string> = {
  cliente: "Admin-Cliente",
  inspetor: "Inspetor web/mobile",
  revisor: "Mesa Avaliadora",
};

const MOBILE_OPERATING_MODEL_LABELS: Record<
  MobileCommercialOperatingModel,
  string
> = {
  standard: "Operação padrão",
  mobile_single_operator: "Mobile principal com operador único",
};

const MOBILE_COMMERCIAL_SERVICE_PACKAGE_LABELS: Record<
  MobileCommercialServicePackage,
  string
> = {
  inspector_chat: "Chat Inspetor sem Mesa",
  inspector_chat_mesa: "Chat Inspetor + Mesa Avaliadora",
  inspector_chat_mesa_reviewer_services:
    "Chat Inspetor + Mesa + serviços no Inspetor",
};

const MOBILE_CHAT_FIRST_CAPABILITY_ALIASES: Record<
  MobileChatFirstCapabilityAlias,
  string
> = {
  case_create: "inspector_case_create",
  case_collect: "inspector_case_create",
  case_finalize_request: "inspector_case_finalize",
  case_send_to_separate_review: "inspector_send_to_mesa",
  case_self_review: "mobile_case_approve",
  case_review_decide: "reviewer_decision",
  structured_review_edit: "reviewer_decision",
  official_issue_create: "reviewer_issue",
  official_issue_download: "reviewer_issue",
  governed_signatory_select: "reviewer_issue",
};

const ACCESS_LEVEL_BASE_PORTALS: Record<number, MobileUserPortal> = {
  1: "inspetor",
  50: "revisor",
  80: "cliente",
};

const MOBILE_PORTAL_DEFAULT_PATHS: Record<MobileUserPortal, string> = {
  cliente: "/cliente/painel",
  inspetor: "/app/",
  revisor: "/revisao/painel",
};

export interface MobileResolvedPortalSwitchLink {
  portal: MobileUserPortal;
  label: string;
  url: string;
  destinationPath: string;
}

function joinHumanReadableList(items: string[]): string {
  if (!items.length) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} e ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function isMobileUserPortal(value: unknown): value is MobileUserPortal {
  return value === "cliente" || value === "inspetor" || value === "revisor";
}

function isMobileOperatingModel(
  value: unknown,
): value is MobileCommercialOperatingModel {
  return value === "standard" || value === "mobile_single_operator";
}

function isMobileCommercialServicePackage(
  value: unknown,
): value is MobileCommercialServicePackage {
  return (
    value === "inspector_chat" ||
    value === "inspector_chat_mesa" ||
    value === "inspector_chat_mesa_reviewer_services"
  );
}

function resolveTenantAccessPolicy(
  user: MobileUser | null | undefined,
): MobileTenantAccessPolicy | null {
  const policy = user?.tenant_access_policy;
  if (!policy || typeof policy !== "object") {
    return null;
  }
  return policy;
}

function readCapabilityFlag(
  values: Record<string, boolean> | undefined,
  key: string,
): boolean | null {
  if (!values || !Object.prototype.hasOwnProperty.call(values, key)) {
    return null;
  }
  return Boolean(values[key]);
}

function readCapabilityFromPolicy(
  tenantPolicy: MobileTenantAccessPolicy | null,
  capabilityKey: string,
): boolean | null {
  const directUserCapability = readCapabilityFlag(
    tenantPolicy?.user_capability_entitlements,
    capabilityKey,
  );
  if (directUserCapability !== null) {
    return directUserCapability;
  }
  const directUserAlias = readCapabilityFlag(
    tenantPolicy?.user_capability_aliases,
    capabilityKey,
  );
  if (directUserAlias !== null) {
    return directUserAlias;
  }
  const directTenantCapability = readCapabilityFlag(
    tenantPolicy?.capability_entitlements,
    capabilityKey,
  );
  if (directTenantCapability !== null) {
    return directTenantCapability;
  }
  const directTenantAlias = readCapabilityFlag(
    tenantPolicy?.capability_aliases,
    capabilityKey,
  );
  if (directTenantAlias !== null) {
    return directTenantAlias;
  }

  const legacyCapability =
    MOBILE_CHAT_FIRST_CAPABILITY_ALIASES[
      capabilityKey as MobileChatFirstCapabilityAlias
    ];
  if (!legacyCapability) {
    return null;
  }

  const legacyUserCapability = readCapabilityFlag(
    tenantPolicy?.user_capability_entitlements,
    legacyCapability,
  );
  if (legacyUserCapability !== null) {
    return legacyUserCapability;
  }
  return readCapabilityFlag(
    tenantPolicy?.capability_entitlements,
    legacyCapability,
  );
}

function isGovernanceRecord(
  value: unknown,
): value is MobileChatFirstGovernance {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAvailableCaseActions(
  governance: MobileChatFirstGovernance | null,
  aliases: Record<MobileChatFirstCapabilityAlias, boolean>,
  separateMesaRequired: boolean,
): string[] {
  if (Array.isArray(governance?.available_case_actions)) {
    return governance.available_case_actions
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  return Object.entries(aliases)
    .filter(([action, enabled]) => {
      if (!enabled) {
        return false;
      }
      return !(action === "case_self_review" && separateMesaRequired);
    })
    .map(([action]) => action);
}

function basePublicaPortalWeb(): string {
  const rawBase =
    readRuntimeEnv("EXPO_PUBLIC_AUTH_WEB_BASE_URL") ||
    readRuntimeEnv("EXPO_PUBLIC_API_BASE_URL") ||
    DEFAULT_API_BASE_URL;
  return normalizarApiBaseUrl(
    String(rawBase || "")
      .trim()
      .replace(/\/+$/, ""),
  );
}

function normalizarUrlPortalWeb(rawValue: string): string {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  return `${basePublicaPortalWeb()}${value.startsWith("/") ? "" : "/"}${value}`;
}

function extrairCaminhoDestinoPortal(rawValue: string): string {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("/")) {
    return value;
  }
  try {
    const parsed = new URL(value);
    return parsed.pathname || parsed.href;
  } catch {
    return value;
  }
}

function notificationUsesMesaSurface(
  item: MobileActivityNotification,
): boolean {
  return (
    item.targetThread === "mesa" ||
    item.kind === "mesa_nova" ||
    item.kind === "mesa_resolvida" ||
    item.kind === "mesa_reaberta"
  );
}

export function resolveMobileUserPortals(
  user: MobileUser | null | undefined,
): MobileUserPortal[] {
  const normalized: MobileUserPortal[] = [];
  const tenantPolicy = resolveTenantAccessPolicy(user);
  const rawPortals = Array.isArray(user?.allowed_portals)
    ? user.allowed_portals
    : Array.isArray(tenantPolicy?.allowed_portals)
      ? tenantPolicy.allowed_portals
      : [];
  rawPortals.forEach((item) => {
    if (isMobileUserPortal(item) && !normalized.includes(item)) {
      normalized.push(item);
    }
  });

  if (!normalized.length) {
    const fallbackPortal = ACCESS_LEVEL_BASE_PORTALS[user?.nivel_acesso ?? -1];
    if (fallbackPortal) {
      normalized.push(fallbackPortal);
    }
  }

  return normalized;
}

export function hasMobileUserPortal(
  user: MobileUser | null | undefined,
  portal: MobileUserPortal,
): boolean {
  return resolveMobileUserPortals(user).includes(portal);
}

export function hasMobileUserCapability(
  user: MobileUser | null | undefined,
  capability: string,
): boolean {
  const capabilityKey = String(capability || "").trim();
  if (!capabilityKey) {
    return false;
  }
  const tenantPolicy = resolveTenantAccessPolicy(user);
  return readCapabilityFromPolicy(tenantPolicy, capabilityKey) === true;
}

export function resolveMobileChatFirstGovernance(
  user: MobileUser | null | undefined,
): MobileChatFirstGovernance {
  const tenantPolicy = resolveTenantAccessPolicy(user);
  const explicitUserGovernance = isGovernanceRecord(
    tenantPolicy?.user_mobile_chat_first_governance,
  )
    ? tenantPolicy.user_mobile_chat_first_governance
    : null;
  const explicitTenantGovernance = isGovernanceRecord(
    tenantPolicy?.mobile_chat_first_governance,
  )
    ? tenantPolicy.mobile_chat_first_governance
    : null;
  const explicitGovernance = explicitUserGovernance || explicitTenantGovernance;
  const aliases = Object.fromEntries(
    Object.keys(MOBILE_CHAT_FIRST_CAPABILITY_ALIASES).map((alias) => [
      alias,
      hasMobileUserCapability(user, alias),
    ]),
  ) as Record<MobileChatFirstCapabilityAlias, boolean>;
  const rawReviewMode = String(explicitGovernance?.review_governance_mode || "")
    .trim()
    .toLowerCase();
  const separateMesaRequired =
    typeof explicitGovernance?.separate_mesa_required === "boolean"
      ? explicitGovernance.separate_mesa_required
      : rawReviewMode === "separate_mesa_required" ||
        aliases.case_send_to_separate_review;
  const selfReviewAllowed =
    typeof explicitGovernance?.self_review_allowed === "boolean"
      ? explicitGovernance.self_review_allowed
      : !separateMesaRequired && aliases.case_self_review;
  const officialIssueAllowed =
    typeof explicitGovernance?.official_issue_allowed === "boolean"
      ? explicitGovernance.official_issue_allowed
      : aliases.official_issue_create;
  const signatoryRequired =
    typeof explicitGovernance?.signatory_required === "boolean"
      ? explicitGovernance.signatory_required
      : officialIssueAllowed;
  const reviewGovernanceMode =
    explicitGovernance?.review_governance_mode ||
    (separateMesaRequired
      ? "separate_mesa_required"
      : selfReviewAllowed
        ? "self_review_allowed"
        : "review_not_configured");
  const issueGovernanceMode =
    explicitGovernance?.issue_governance_mode ||
    (!officialIssueAllowed
      ? "none"
      : signatoryRequired
        ? "signatory_required"
        : "official_issue_allowed");

  return {
    ...explicitGovernance,
    review_governance_mode: reviewGovernanceMode,
    approval_actor_scope:
      explicitGovernance?.approval_actor_scope ||
      (separateMesaRequired
        ? "separate_mesa"
        : selfReviewAllowed
          ? "inspector_self"
          : aliases.case_review_decide
            ? "tenant_reviewer"
            : "unassigned"),
    issue_governance_mode: issueGovernanceMode,
    separate_mesa_required: separateMesaRequired,
    self_review_allowed: selfReviewAllowed,
    official_issue_allowed: officialIssueAllowed,
    signatory_required: signatoryRequired,
    available_case_actions: normalizeAvailableCaseActions(
      explicitGovernance,
      aliases,
      separateMesaRequired,
    ),
    capability_alias_source:
      explicitGovernance?.capability_alias_source ||
      MOBILE_CHAT_FIRST_CAPABILITY_ALIASES,
  };
}

export function resolveMobileUserPortalLabels(
  user: MobileUser | null | undefined,
): string[] {
  const tenantPolicy = resolveTenantAccessPolicy(user);
  const rawLabels = Array.isArray(user?.allowed_portal_labels)
    ? user.allowed_portal_labels
    : Array.isArray(tenantPolicy?.allowed_portal_labels)
      ? tenantPolicy.allowed_portal_labels
      : [];
  const normalizedLabels = rawLabels
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (normalizedLabels.length) {
    return normalizedLabels;
  }
  return resolveMobileUserPortals(user).map(
    (portal) => MOBILE_USER_PORTAL_LABELS[portal],
  );
}

export function resolveMobileUserOperatingModelLabel(
  user: MobileUser | null | undefined,
): string {
  const explicitLabel = String(
    user?.commercial_operating_model_label || "",
  ).trim();
  if (explicitLabel) {
    return explicitLabel;
  }
  const model = user?.commercial_operating_model;
  if (isMobileOperatingModel(model)) {
    return MOBILE_OPERATING_MODEL_LABELS[model];
  }
  return "";
}

export function resolveMobileUserCommercialServicePackageLabel(
  user: MobileUser | null | undefined,
): string {
  const tenantPolicy = resolveTenantAccessPolicy(user);
  const explicitLabel = String(
    user?.commercial_service_package_label ||
      tenantPolicy?.commercial_service_package_label ||
      "",
  ).trim();
  if (explicitLabel) {
    return explicitLabel;
  }
  const packageKey =
    user?.commercial_service_package ||
    tenantPolicy?.commercial_service_package_effective ||
    tenantPolicy?.commercial_service_package;
  if (isMobileCommercialServicePackage(packageKey)) {
    return MOBILE_COMMERCIAL_SERVICE_PACKAGE_LABELS[packageKey];
  }
  return "";
}

export function buildMobileWorkspaceSummary(
  user: MobileUser | null | undefined,
): string {
  const companyName = String(user?.empresa_nome || "").trim() || "Pessoal";
  const packageLabel = resolveMobileUserCommercialServicePackageLabel(user);
  const operatingModelLabel = resolveMobileUserOperatingModelLabel(user);
  const workspaceLabel = packageLabel || operatingModelLabel;
  return workspaceLabel ? `${companyName} • ${workspaceLabel}` : companyName;
}

export function buildMobileAccessSummary(
  user: MobileUser | null | undefined,
): string {
  const parts: string[] = [];
  if (typeof user?.empresa_id === "number") {
    parts.push(`Empresa #${user.empresa_id}`);
  }

  const portalLabels = resolveMobileUserPortalLabels(user);
  if (portalLabels.length) {
    parts.push(portalLabels.join(" + "));
  }

  const packageLabel = resolveMobileUserCommercialServicePackageLabel(user);
  if (packageLabel) {
    parts.push(packageLabel);
  }

  const operatingModelLabel = resolveMobileUserOperatingModelLabel(user);
  if (operatingModelLabel) {
    parts.push(operatingModelLabel);
  } else if (typeof user?.nivel_acesso === "number") {
    parts.push(`Nível ${user.nivel_acesso}`);
  }

  return parts.join(" • ") || "Conta corporativa autenticada";
}

export function buildMobileSupportAccessLabel(
  user: MobileUser | null | undefined,
): string {
  const portalLabels = resolveMobileUserPortalLabels(user);
  if (portalLabels.length) {
    return portalLabels.join(" + ");
  }

  const operatingModelLabel = resolveMobileUserOperatingModelLabel(user);
  if (operatingModelLabel) {
    return operatingModelLabel;
  }

  if (typeof user?.nivel_acesso === "number") {
    return `Nível ${user.nivel_acesso}`;
  }

  return "Conta autenticada";
}

export function buildMobileIdentityRuntimeNote(
  user: MobileUser | null | undefined,
): string {
  return String(user?.identity_runtime_note || "").trim();
}

export function resolveMobilePortalSwitchLinks(
  user: MobileUser | null | undefined,
): MobileResolvedPortalSwitchLink[] {
  const rawLinks = Array.isArray(user?.portal_switch_links)
    ? user.portal_switch_links
    : [];
  const normalized: MobileResolvedPortalSwitchLink[] = [];
  rawLinks.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const raw = item as MobilePortalSwitchLink;
    const portal = isMobileUserPortal(raw.portal) ? raw.portal : null;
    const label = String(raw.label || "").trim();
    const destinationPath = extrairCaminhoDestinoPortal(raw.url);
    const resolvedUrl = normalizarUrlPortalWeb(String(raw.url || ""));
    if (!portal || !label || !destinationPath || !resolvedUrl) {
      return;
    }
    if (
      normalized.some(
        (existing) =>
          existing.portal === portal &&
          existing.destinationPath === destinationPath,
      )
    ) {
      return;
    }
    normalized.push({
      portal,
      label,
      url: resolvedUrl,
      destinationPath,
    });
  });
  if (normalized.length) {
    return normalized;
  }

  const fallbackLabels = resolveMobileUserPortalLabels(user);
  resolveMobileUserPortals(user).forEach((portal, index) => {
    const destinationPath = MOBILE_PORTAL_DEFAULT_PATHS[portal];
    const label =
      String(fallbackLabels[index] || "").trim() ||
      MOBILE_USER_PORTAL_LABELS[portal];
    const resolvedUrl = normalizarUrlPortalWeb(destinationPath);
    if (
      normalized.some(
        (existing) =>
          existing.portal === portal &&
          existing.destinationPath === destinationPath,
      )
    ) {
      return;
    }
    normalized.push({
      portal,
      label,
      url: resolvedUrl,
      destinationPath,
    });
  });
  return normalized;
}

export function buildMobilePortalSwitchSummary(
  user: MobileUser | null | undefined,
): string {
  const links = resolveMobilePortalSwitchLinks(user);
  if (!links.length) {
    return "";
  }
  return links
    .map((item) => `${item.label} (${item.destinationPath})`)
    .join(" • ");
}

export function buildMobileOperationalFootprintSummary(
  user: MobileUser | null | undefined,
): string {
  const surfaces: string[] = [];

  if (hasMobileUserPortal(user, "cliente")) {
    surfaces.push("Admin-Cliente da empresa");
  }
  if (hasMobileUserPortal(user, "inspetor")) {
    surfaces.push("chat do inspetor");
  }
  if (hasMobileUserPortal(user, "revisor")) {
    surfaces.push("mesa avaliadora");
  }

  surfaces.push("histórico", "fila offline", "configurações do app");

  return `${joinHumanReadableList(Array.from(new Set(surfaces)))}.`;
}

export function buildMobileHelpTopicsSummary(
  user: MobileUser | null | undefined,
): string {
  const topics: string[] = [];

  if (hasMobileUserPortal(user, "cliente")) {
    topics.push("acesso");
  }
  if (hasMobileUserPortal(user, "inspetor")) {
    topics.push("inspeção");
  }
  if (hasMobileUserPortal(user, "revisor")) {
    topics.push("mesa");
  }

  topics.push("offline", "segurança");

  return joinHumanReadableList(Array.from(new Set(topics)).slice(0, 4));
}

export function filterHelpArticlesByMobileAccess<T extends object>(
  items: readonly T[],
  user: MobileUser | null | undefined,
): T[] {
  return items.filter((item) => {
    const requiredPortals = Array.isArray(
      (
        item as T & {
          requiredPortals?: readonly MobileUserPortal[] | MobileUserPortal[];
        }
      ).requiredPortals,
    )
      ? (
          item as T & {
            requiredPortals?: readonly MobileUserPortal[] | MobileUserPortal[];
          }
        ).requiredPortals!.filter((portal): portal is MobileUserPortal =>
          isMobileUserPortal(portal),
        )
      : [];

    if (!requiredPortals.length) {
      return true;
    }

    return requiredPortals.every((portal) => hasMobileUserPortal(user, portal));
  });
}

export function filterOfflineQueueByMobileAccess(
  items: OfflinePendingMessage[],
  user: MobileUser | null | undefined,
): OfflinePendingMessage[] {
  if (hasMobileUserPortal(user, "revisor")) {
    return items;
  }
  return items.filter((item) => item.channel !== "mesa");
}

export function filterNotificationsByMobileAccess(
  items: MobileActivityNotification[],
  user: MobileUser | null | undefined,
): MobileActivityNotification[] {
  if (hasMobileUserPortal(user, "revisor")) {
    return items;
  }
  return items.filter((item) => !notificationUsesMesaSurface(item));
}

export function sanitizeReadCacheByMobileAccess(
  cache: MobileReadCache,
  user: MobileUser | null | undefined,
): MobileReadCache {
  if (hasMobileUserPortal(user, "revisor")) {
    return cache;
  }

  const hasMesaData =
    Object.keys(cache.mesaPorLaudo).length > 0 ||
    Object.keys(cache.mesaDrafts).length > 0 ||
    Object.keys(cache.mesaAttachmentDrafts).length > 0;

  if (!hasMesaData) {
    return cache;
  }

  return {
    ...cache,
    mesaPorLaudo: {},
    mesaDrafts: {},
    mesaAttachmentDrafts: {},
    updatedAt: new Date().toISOString(),
  };
}
