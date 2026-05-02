import type { GuidedInspectionTemplateKey } from "../inspection/guidedInspection";
import type { IconName, ThreadTone } from "./ThreadContextCard";

export interface GuidedInspectionVisualIdentity {
  accentColor: string;
  familyLabel: string;
  focusLabel: string;
  icon: IconName;
  tone: ThreadTone;
}

const DEFAULT_GUIDED_IDENTITY: GuidedInspectionVisualIdentity = {
  accentColor: "#F47B20",
  familyLabel: "Inspeção",
  focusLabel: "Coleta técnica flexível",
  icon: "clipboard-text-outline",
  tone: "accent",
};

const GUIDED_INSPECTION_VISUAL_IDENTITIES: Record<
  GuidedInspectionTemplateKey,
  GuidedInspectionVisualIdentity
> = {
  padrao: DEFAULT_GUIDED_IDENTITY,
  avcb: {
    accentColor: "#D94E1F",
    familyLabel: "AVCB",
    focusLabel: "Rotas, combate e documentação",
    icon: "fire-alert",
    tone: "danger",
  },
  cbmgo: {
    accentColor: "#D94E1F",
    familyLabel: "CBM-GO",
    focusLabel: "Vistoria Bombeiro e segurança",
    icon: "fire-alert",
    tone: "danger",
  },
  loto: {
    accentColor: "#C78329",
    familyLabel: "NR10",
    focusLabel: "Bloqueio, energias e liberação",
    icon: "lock-outline",
    tone: "accent",
  },
  nr11_movimentacao: {
    accentColor: "#8A6F3D",
    familyLabel: "NR11",
    focusLabel: "Movimentação, armazenagem e operadores",
    icon: "crane",
    tone: "accent",
  },
  nr12maquinas: {
    accentColor: "#5E6B78",
    familyLabel: "NR12",
    focusLabel: "Máquinas, proteções e comandos",
    icon: "cog-outline",
    tone: "accent",
  },
  nr13: {
    accentColor: "#2F76D2",
    familyLabel: "NR13",
    focusLabel: "Pressão, integridade e documentação",
    icon: "gauge",
    tone: "accent",
  },
  nr13_calibracao: {
    accentColor: "#2F76D2",
    familyLabel: "NR13",
    focusLabel: "Calibração, instrumentos e rastreabilidade",
    icon: "tune",
    tone: "accent",
  },
  nr13_teste_hidrostatico: {
    accentColor: "#2F76D2",
    familyLabel: "NR13",
    focusLabel: "Teste hidrostático e estanqueidade",
    icon: "test-tube",
    tone: "accent",
  },
  nr13_ultrassom: {
    accentColor: "#2F76D2",
    familyLabel: "NR13",
    focusLabel: "Ultrassom, espessura e integridade",
    icon: "waveform",
    tone: "accent",
  },
  nr20_instalacoes: {
    accentColor: "#CB5A58",
    familyLabel: "NR20",
    focusLabel: "Inflamáveis, áreas e controle de risco",
    icon: "fire-circle",
    tone: "danger",
  },
  nr33_espaco_confinado: {
    accentColor: "#7C4DFF",
    familyLabel: "NR33",
    focusLabel: "Espaço confinado, PET e resgate",
    icon: "alert-octagon-outline",
    tone: "danger",
  },
  nr35_linha_vida: {
    accentColor: "#2B9467",
    familyLabel: "NR35",
    focusLabel: "Linha de vida, ancoragem e queda",
    icon: "ladder",
    tone: "success",
  },
  nr35_montagem: {
    accentColor: "#2B9467",
    familyLabel: "NR35",
    focusLabel: "Montagem, acesso e proteção coletiva",
    icon: "tools",
    tone: "success",
  },
  nr35_ponto_ancoragem: {
    accentColor: "#2B9467",
    familyLabel: "NR35",
    focusLabel: "Ancoragem, carga e rastreabilidade",
    icon: "anchor",
    tone: "success",
  },
  nr35_projeto: {
    accentColor: "#2B9467",
    familyLabel: "NR35",
    focusLabel: "Projeto, memorial e dimensionamento",
    icon: "file-document-outline",
    tone: "success",
  },
  pie: {
    accentColor: "#C78329",
    familyLabel: "NR10",
    focusLabel: "Prontuário elétrico e gestão",
    icon: "flash-outline",
    tone: "accent",
  },
  rti: {
    accentColor: "#C78329",
    familyLabel: "NR10",
    focusLabel: "Instalações elétricas e RTI",
    icon: "radio-tower",
    tone: "accent",
  },
  spda: {
    accentColor: "#4F8DF7",
    familyLabel: "SPDA",
    focusLabel: "Descargas atmosféricas e aterramento",
    icon: "weather-lightning",
    tone: "accent",
  },
};

export function resolveGuidedInspectionVisualIdentity(
  templateKey?: GuidedInspectionTemplateKey | null,
  templateLabel?: string | null,
): GuidedInspectionVisualIdentity {
  if (templateKey) {
    return GUIDED_INSPECTION_VISUAL_IDENTITIES[templateKey];
  }

  const nrMatch = templateLabel?.match(/\bNR\d+[A-Z]?\b/i)?.[0].toUpperCase();

  if (nrMatch) {
    return {
      ...DEFAULT_GUIDED_IDENTITY,
      familyLabel: nrMatch,
    };
  }

  return DEFAULT_GUIDED_IDENTITY;
}

export function guidedInspectionIconForTemplate(
  templateKey: GuidedInspectionTemplateKey,
) {
  return resolveGuidedInspectionVisualIdentity(templateKey).icon;
}

export function guidedInspectionAccentColorForTemplate(
  templateKey?: GuidedInspectionTemplateKey | null,
) {
  return templateKey
    ? resolveGuidedInspectionVisualIdentity(templateKey).accentColor
    : null;
}
