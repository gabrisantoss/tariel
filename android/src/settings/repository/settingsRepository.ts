import * as FileSystem from "expo-file-system/legacy";

import { APP_PREFERENCES_FILE } from "../../features/InspectorMobileApp.constants";
import { createDefaultSettingsDocument } from "../schema/defaults";
import {
  SETTINGS_SCHEMA_VERSION,
  type AppSettings,
  type PersistedSettingsDocument,
} from "../schema/types";
import { migrateSettingsDocument } from "../migrations/migrateSettingsDocument";

export interface SettingsPersistenceScope {
  email?: string;
  userId?: number | null;
  empresaId?: number | null;
}

const SETTINGS_FILE_DIRECTORY =
  FileSystem.documentDirectory || FileSystem.cacheDirectory || "";

function normalizarSettingsPersistenceScope(
  scope?: SettingsPersistenceScope | null,
): SettingsPersistenceScope | null {
  if (!scope) {
    return null;
  }

  const email = String(scope.email || "")
    .trim()
    .toLowerCase();
  const userId =
    typeof scope.userId === "number" && Number.isFinite(scope.userId)
      ? scope.userId
      : null;
  const empresaId =
    typeof scope.empresaId === "number" && Number.isFinite(scope.empresaId)
      ? scope.empresaId
      : null;

  if (!email && userId == null && empresaId == null) {
    return null;
  }

  return {
    email: email || undefined,
    userId,
    empresaId,
  };
}

function slugScopeSegment(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sem-email"
  );
}

export function getSettingsPersistenceScopeKey(
  scope?: SettingsPersistenceScope | null,
): string {
  const normalizedScope = normalizarSettingsPersistenceScope(scope);
  if (!normalizedScope) {
    return "global";
  }

  const empresaSuffix =
    normalizedScope.empresaId != null
      ? `-empresa-${normalizedScope.empresaId}`
      : "";
  if (normalizedScope.userId != null) {
    return `user-${normalizedScope.userId}${empresaSuffix}`;
  }
  return `email-${slugScopeSegment(normalizedScope.email || "")}${empresaSuffix}`;
}

function getSettingsDocumentFile(scope?: SettingsPersistenceScope | null) {
  const scopeKey = getSettingsPersistenceScopeKey(scope);
  if (scopeKey === "global") {
    return APP_PREFERENCES_FILE;
  }
  return `${SETTINGS_FILE_DIRECTORY}tariel-app-preferences-${scopeKey}.json`;
}

async function writeDocument(
  document: PersistedSettingsDocument,
  scope?: SettingsPersistenceScope | null,
): Promise<void> {
  await FileSystem.writeAsStringAsync(
    getSettingsDocumentFile(scope),
    JSON.stringify(document),
  );
}

export async function loadSettingsDocument(
  scope?: SettingsPersistenceScope | null,
): Promise<PersistedSettingsDocument> {
  try {
    const raw = await FileSystem.readAsStringAsync(
      getSettingsDocumentFile(scope),
    );
    const document = migrateSettingsDocument(JSON.parse(raw));
    await writeDocument(document, scope);
    return document;
  } catch {
    const fallback = createDefaultSettingsDocument();
    await writeDocument(fallback, scope);
    return fallback;
  }
}

export async function saveSettingsDocument(
  settings: AppSettings,
  scope?: SettingsPersistenceScope | null,
): Promise<PersistedSettingsDocument> {
  const document: PersistedSettingsDocument = {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings,
  };
  await writeDocument(document, scope);
  return document;
}

export async function resetSettingsDocument(
  scope?: SettingsPersistenceScope | null,
): Promise<PersistedSettingsDocument> {
  const fallback = createDefaultSettingsDocument();
  await writeDocument(fallback, scope);
  return fallback;
}
