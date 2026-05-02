import type { ImageSourcePropType } from "react-native";

import type { GuidedInspectionTemplateKey } from "../inspection/guidedInspection";

const GUIDED_INSPECTION_EMPTY_STATE_IMAGES: Record<
  GuidedInspectionTemplateKey,
  ImageSourcePropType
> = {
  padrao: require("../../../assets/guided-inspection-icons/inspecao_geral.png"),
  avcb: require("../../../assets/guided-inspection-icons/avcb_bombeiro.png"),
  cbmgo: require("../../../assets/guided-inspection-icons/cbmgo_vistoria.png"),
  loto: require("../../../assets/guided-inspection-icons/nr10_loto.png"),
  nr11_movimentacao: require("../../../assets/guided-inspection-icons/nr11_movimentacao.png"),
  nr12maquinas: require("../../../assets/guided-inspection-icons/nr12_maquinas.png"),
  nr13: require("../../../assets/guided-inspection-icons/nr13_pressao.png"),
  nr13_calibracao: require("../../../assets/guided-inspection-icons/nr13_calibracao.png"),
  nr13_teste_hidrostatico: require("../../../assets/guided-inspection-icons/nr13_teste_hidrostatico.png"),
  nr13_ultrassom: require("../../../assets/guided-inspection-icons/nr13_ultrassom.png"),
  nr20_instalacoes: require("../../../assets/guided-inspection-icons/nr20_inflamaveis.png"),
  nr33_espaco_confinado: require("../../../assets/guided-inspection-icons/nr33_espaco_confinado.png"),
  nr35_linha_vida: require("../../../assets/guided-inspection-icons/nr35_linha_vida.png"),
  nr35_montagem: require("../../../assets/guided-inspection-icons/nr35_altura.png"),
  nr35_ponto_ancoragem: require("../../../assets/guided-inspection-icons/nr35_ancoragem.png"),
  nr35_projeto: require("../../../assets/guided-inspection-icons/nr35_projeto_queda.png"),
  pie: require("../../../assets/guided-inspection-icons/nr10_eletrica.png"),
  rti: require("../../../assets/guided-inspection-icons/nr10_eletrica.png"),
  spda: require("../../../assets/guided-inspection-icons/spda.png"),
};

export function guidedInspectionEmptyStateImageSource(
  templateKey?: GuidedInspectionTemplateKey | null,
): ImageSourcePropType | null {
  return templateKey ? GUIDED_INSPECTION_EMPTY_STATE_IMAGES[templateKey] : null;
}
