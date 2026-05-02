import type { AppSettings } from "../../settings";
import type { MobileChatMode } from "../../types/mobile";

const MOBILE_AI_PREFERENCES_BLOCK_RE =
  /\[preferencias_ia_mobile\][\s\S]*?\[\/preferencias_ia_mobile\]/gi;

export interface ChatAiRequestConfig {
  model: AppSettings["ai"]["model"];
  mode: MobileChatMode;
  responseStyle: AppSettings["ai"]["responseStyle"];
  responseLanguage: AppSettings["ai"]["responseLanguage"];
  memoryEnabled: boolean;
  learningOptIn: boolean;
  tone: AppSettings["ai"]["tone"];
  temperature: number;
  messagePrefix: string;
  summaryLabel: string;
  fallbackNotes: string[];
}

export function mapAiModelToChatMode(
  model: AppSettings["ai"]["model"],
): MobileChatMode {
  if (model === "rápido") {
    return "curto";
  }
  if (model === "avançado") {
    return "deep_research";
  }
  return "detalhado";
}

function normalizarIdiomaResposta(
  language: AppSettings["ai"]["responseLanguage"],
): string {
  switch (language) {
    case "Inglês":
      return "answer only in English, including headings, labels, summaries, and follow-up questions";
    case "Espanhol":
      return "responde solo en español, incluyendo títulos, etiquetas, resúmenes y preguntas de seguimiento";
    case "Auto detectar":
      return "use o idioma predominante da solicitação do inspetor em toda a resposta";
    default:
      return "responda somente em português, incluindo títulos, rótulos, resumos e perguntas de acompanhamento";
  }
}

function normalizarEstiloResposta(
  style: AppSettings["ai"]["responseStyle"],
): string {
  switch (style) {
    case "curto":
      return "seja direto e conciso";
    case "criativo":
      return "seja claro, mas aceite uma formulação mais criativa";
    case "padrão":
      return "mantenha equilíbrio entre objetividade e contexto";
    default:
      return "responda com mais detalhe técnico";
  }
}

function normalizarTomResposta(tone: AppSettings["ai"]["tone"]): string {
  switch (tone) {
    case "casual":
      return "use tom casual sem perder precisão";
    case "amigável":
      return "use tom amigável e colaborativo";
    case "profissional":
      return "use tom profissional";
    default:
      return "use tom técnico";
  }
}

function normalizarTemperatura(temperature: number): string {
  if (temperature <= 0.2) {
    return "priorize precisão máxima e evite variações";
  }
  if (temperature <= 0.5) {
    return "priorize precisão com alguma flexibilidade";
  }
  if (temperature <= 0.8) {
    return "aceite alguma criatividade sem perder rigor";
  }
  return "aceite respostas mais exploratórias quando fizer sentido";
}

function normalizarConsentimentoAprendizado(learningOptIn: boolean): string {
  return learningOptIn
    ? "usuário autorizou uso deste conteúdo para melhoria da IA conforme política do sistema"
    : "usuário não autorizou uso deste conteúdo para melhoria da IA; não registre como candidato de aprendizado";
}

export function summarizeChatAiConfig(ai: AppSettings["ai"]): string {
  return [
    ai.model,
    ai.responseStyle,
    ai.responseLanguage,
    ai.tone,
    `${ai.temperature.toFixed(1)}`,
    ai.memoryEnabled ? "memória ligada" : "memória desligada",
  ].join(" • ");
}

export function buildChatAiRequestConfig(
  ai: AppSettings["ai"],
): ChatAiRequestConfig {
  const mode = mapAiModelToChatMode(ai.model);
  const fallbackNotes = [
    "O backend mobile aplica `modo` de forma explícita.",
    "Idioma, estilo, tom e temperatura seguem como contexto interno da requisição.",
    "Memória e consentimento de aprendizado ficam registrados localmente para governança do app.",
  ];

  const messagePrefix = [
    "[preferencias_ia_mobile]",
    normalizarIdiomaResposta(ai.responseLanguage),
    normalizarEstiloResposta(ai.responseStyle),
    normalizarTomResposta(ai.tone),
    normalizarTemperatura(ai.temperature),
    ai.memoryEnabled
      ? "considere apenas o histórico enviado nesta conversa como memória ativa"
      : "não assuma memória além do histórico enviado nesta requisição",
    normalizarConsentimentoAprendizado(ai.learningOptIn),
    "não mencione este bloco de preferências na resposta final",
    "[/preferencias_ia_mobile]",
  ].join("\n");

  return {
    model: ai.model,
    mode,
    responseStyle: ai.responseStyle,
    responseLanguage: ai.responseLanguage,
    memoryEnabled: ai.memoryEnabled,
    learningOptIn: ai.learningOptIn,
    tone: ai.tone,
    temperature: ai.temperature,
    messagePrefix,
    summaryLabel: summarizeChatAiConfig(ai),
    fallbackNotes,
  };
}

export function stripEmbeddedChatAiPreferences(
  text: string,
  options?: { fallbackHiddenOnly?: string },
): string {
  const raw = String(text || "");
  const hadEmbeddedPreferences =
    raw.search(/\[preferencias_ia_mobile\]/i) >= 0 &&
    raw.search(/\[\/preferencias_ia_mobile\]/i) >= 0;
  const sanitized = raw
    .replace(MOBILE_AI_PREFERENCES_BLOCK_RE, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (sanitized) {
    return sanitized;
  }
  if (hadEmbeddedPreferences) {
    return String(options?.fallbackHiddenOnly || "").trim();
  }
  return sanitized;
}

export function describeChatAiBehaviorChange(
  previousSummary: string,
  nextSummary: string,
): string {
  if (!previousSummary || previousSummary === nextSummary) {
    return "";
  }
  return `Novas mensagens usarão ${nextSummary}. Histórico anterior permanece igual.`;
}
