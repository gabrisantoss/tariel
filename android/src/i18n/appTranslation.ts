import { useMemo } from "react";

import { createDefaultAppSettings } from "../settings/schema/defaults";
import type { AppSettings } from "../settings/schema/types";
import { useOptionalSettingsStoreContext } from "../settings/store/SettingsStoreProvider";
import {
  LOCAL_LANGUAGE_PACKS,
  TABLES,
  type TranslationTable,
} from "./languagePacks";

export type AppLocale = "pt" | "en" | "es";

const DEFAULT_LANGUAGE = createDefaultAppSettings().system.language;

export function resolveAppLocale(
  language: AppSettings["system"]["language"] = DEFAULT_LANGUAGE,
): AppLocale {
  if (language === "Inglês") {
    return "en";
  }
  if (language === "Espanhol") {
    return "es";
  }
  return "pt";
}

function translateInterpolatedText(
  text: string,
  locale: Exclude<AppLocale, "pt">,
  table: TranslationTable,
) {
  const translatePart = (value: string) => translateText(value, locale);
  const translateJoinedParts = (value: string) =>
    value
      .split(" • ")
      .map((part) => translatePart(part))
      .join(" • ");

  const responseStylePrefix = "Estilo da resposta: ";
  if (text.startsWith(responseStylePrefix)) {
    return `${table["Estilo da resposta"] || "Estilo da resposta"}: ${translateText(
      text.slice(responseStylePrefix.length),
      locale,
    )}`;
  }

  const themePrefix = "Tema ";
  if (text.startsWith(themePrefix)) {
    return `${table.Tema || "Tema"} ${translateText(
      text.slice(themePrefix.length),
      locale,
    )}`;
  }

  const aiBehaviorNotice = text.match(
    /^Novas mensagens usarão (.+)\. Histórico anterior permanece igual\.$/,
  );
  if (aiBehaviorNotice) {
    return locale === "en"
      ? `New messages will use ${translateJoinedParts(aiBehaviorNotice[1])}. Previous history stays unchanged.`
      : `Los nuevos mensajes usarán ${translateJoinedParts(aiBehaviorNotice[1])}. El historial anterior no cambia.`;
  }

  const prefixedDynamic = [
    ["Laudo #", locale === "en" ? "Report #" : "Informe #"],
    ["Caso #", locale === "en" ? "Case #" : "Caso #"],
    ["Template ", locale === "en" ? "Template " : "Plantilla "],
    ["Responsável · ", locale === "en" ? "Owner · " : "Responsable · "],
    ["Rota · ", locale === "en" ? "Route · " : "Ruta · "],
    ["Operacao · ", locale === "en" ? "Operation · " : "Operación · "],
    ["Entrada · ", locale === "en" ? "Entry · " : "Entrada · "],
    ["Pacote · ", locale === "en" ? "Package · " : "Paquete · "],
    ["Governanca · ", locale === "en" ? "Governance · " : "Gobernanza · "],
    ["Contexto · ", locale === "en" ? "Context · " : "Contexto · "],
  ] as const;
  const dynamicPrefix = prefixedDynamic.find(([prefix]) =>
    text.startsWith(prefix),
  );
  if (dynamicPrefix) {
    return `${dynamicPrefix[1]}${translateJoinedParts(
      text.slice(dynamicPrefix[0].length),
    )}`;
  }

  const number = text.match(/^(\d+)$/);
  if (number) {
    return text;
  }

  const cases = text.match(/^(\d+) caso(s)?$/);
  if (cases) {
    const count = Number(cases[1]);
    return locale === "en"
      ? `${count} case${count === 1 ? "" : "s"}`
      : `${count} caso${count === 1 ? "" : "s"}`;
  }

  const foundCases = text.match(/^(\d+) caso(s)? encontrado(s)?\.$/);
  if (foundCases) {
    const count = Number(foundCases[1]);
    return locale === "en"
      ? `${count} case${count === 1 ? "" : "s"} found.`
      : `${count} caso${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}.`;
  }

  const foundCasesWithSignals = text.match(
    /^(\d+ caso(?:s)? encontrado(?:s)?\.) (.+)\.$/,
  );
  if (foundCasesWithSignals) {
    return `${translatePart(foundCasesWithSignals[1])} ${foundCasesWithSignals[2]
      .split(" · ")
      .map((part) => translatePart(part))
      .join(" · ")}.`;
  }

  const operationSummary = text.match(
    /^(\d+) em andamento · (\d+) na mesa · (\d+) concluidos$/,
  );
  if (operationSummary) {
    return locale === "en"
      ? `${operationSummary[1]} in progress · ${operationSummary[2]} at review desk · ${operationSummary[3]} completed`
      : `${operationSummary[1]} en curso · ${operationSummary[2]} en mesa · ${operationSummary[3]} concluidos`;
  }

  const guidedChatSummary = text.match(/^(\d+) guiados · (\d+) em chat livre$/);
  if (guidedChatSummary) {
    return locale === "en"
      ? `${guidedChatSummary[1]} guided · ${guidedChatSummary[2]} in free chat`
      : `${guidedChatSummary[1]} guiados · ${guidedChatSummary[2]} en chat libre`;
  }

  const countLabel = text.match(
    /^(\d+) (fixados|ocultos|guiados|offline|novas?|prontos? para validar|com reemissao|reemissão recomendadas?)$/,
  );
  if (countLabel) {
    const count = Number(countLabel[1]);
    const label = countLabel[2];
    if (label === "fixados") {
      return locale === "en" ? `${count} pinned` : `${count} fijados`;
    }
    if (label === "ocultos") {
      return locale === "en" ? `${count} hidden` : `${count} ocultos`;
    }
    if (label === "guiados") {
      return locale === "en" ? `${count} guided` : `${count} guiados`;
    }
    if (label === "offline") {
      return `${count} offline`;
    }
    if (label === "nova" || label === "novas") {
      return locale === "en"
        ? `${count} new`
        : `${count} nueva${count === 1 ? "" : "s"}`;
    }
    if (label === "pronto para validar" || label === "prontos para validar") {
      return locale === "en"
        ? `${count} ready to validate`
        : `${count} listo${count === 1 ? "" : "s"} para validar`;
    }
    if (label === "com reemissao") {
      return locale === "en"
        ? `${count} with reissue`
        : `${count} con reemisión`;
    }
    return locale === "en"
      ? `${count} reissue${count === 1 ? "" : "s"} recommended`
      : `${count} reemisión${count === 1 ? "" : "es"} recomendada${count === 1 ? "" : "s"}`;
  }

  const reviewReturns = text.match(
    /^(\d+) retorno(s)? novo(s)?( da mesa)?\.?$/,
  );
  if (reviewReturns) {
    const count = Number(reviewReturns[1]);
    const suffix = reviewReturns[4]
      ? locale === "en"
        ? " from review desk"
        : " de la mesa"
      : "";
    const period = text.endsWith(".") ? "." : "";
    return locale === "en"
      ? `${count} new return${count === 1 ? "" : "s"}${suffix}${period}`
      : `${count} retorno${count === 1 ? "" : "s"} nuevo${count === 1 ? "" : "s"}${suffix}${period}`;
  }

  const pendingOffline = text.match(/^(\d+) pendência(s)? na fila offline\.$/);
  if (pendingOffline) {
    const count = Number(pendingOffline[1]);
    return locale === "en"
      ? `${count} pending item${count === 1 ? "" : "s"} in offline queue.`
      : `${count} pendiente${count === 1 ? "" : "s"} en la cola sin conexión.`;
  }

  const pendingWarnings = text.match(/^(\d+) aviso(s)? pendente(s)?$/);
  if (pendingWarnings) {
    const count = Number(pendingWarnings[1]);
    return locale === "en"
      ? `${count} pending warning${count === 1 ? "" : "s"}`
      : `${count} aviso${count === 1 ? "" : "s"} pendiente${count === 1 ? "" : "s"}`;
  }

  const attachedRefs = text.match(/^(\d+) referência(s)? anexada$/);
  if (attachedRefs) {
    const count = Number(attachedRefs[1]);
    return locale === "en"
      ? `${count} reference${count === 1 ? "" : "s"} attached`
      : `${count} referencia${count === 1 ? "" : "s"} adjunta${count === 1 ? "" : "s"}`;
  }

  const hiddenSignals = text.match(
    /^\+(\d+) sinais? disponíveis na central de atividade\.$/,
  );
  if (hiddenSignals) {
    const count = Number(hiddenSignals[1]);
    return locale === "en"
      ? `+${count} signal${count === 1 ? "" : "s"} available in the activity center.`
      : `+${count} señal${count === 1 ? "" : "es"} disponible${count === 1 ? "" : "s"} en la central de actividad.`;
  }

  const requiredReason = text.match(
    /^Justificativa interna obrigatória com pelo menos (\d+) caracteres\.$/,
  );
  if (requiredReason) {
    return locale === "en"
      ? `Internal justification required with at least ${requiredReason[1]} characters.`
      : `Justificación interna obligatoria con al menos ${requiredReason[1]} caracteres.`;
  }

  return text;
}

export function translateText(text: string, locale: AppLocale): string {
  if (locale === "pt") {
    return text;
  }
  const table = TABLES[locale];
  return table[text] || translateInterpolatedText(text, locale, table);
}

export function useAppTranslation() {
  const settingsStore = useOptionalSettingsStoreContext();
  const locale = resolveAppLocale(
    settingsStore?.state.system.language || DEFAULT_LANGUAGE,
  );
  const languagePack = LOCAL_LANGUAGE_PACKS[locale];

  return useMemo(
    () => ({
      languagePack,
      locale,
      t: (text: string) => translateText(text, locale),
    }),
    [languagePack, locale],
  );
}
