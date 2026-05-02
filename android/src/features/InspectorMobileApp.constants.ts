import * as FileSystem from "expo-file-system/legacy";
import { Dimensions } from "react-native";
export {
  ACCENT_OPTIONS,
  AI_MODEL_OPTIONS,
  APP_LANGUAGE_OPTIONS,
  BATTERY_OPTIONS,
  CONVERSATION_TONE_OPTIONS,
  DATA_RETENTION_OPTIONS,
  DENSITY_OPTIONS,
  FONT_SIZE_OPTIONS,
  LOCK_TIMEOUT_OPTIONS,
  MEDIA_COMPRESSION_OPTIONS,
  NOTIFICATION_SOUND_OPTIONS,
  REGION_OPTIONS,
  RESPONSE_LANGUAGE_OPTIONS,
  RESPONSE_STYLE_OPTIONS,
  SPEECH_LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from "../settings/schema/options";

const appConfig = require("../../app.json");
const expoConfig = appConfig?.expo || {};
const appVersion = String(expoConfig.version || "1.0.0");
const appBuild =
  typeof expoConfig.android?.versionCode === "number"
    ? String(expoConfig.android.versionCode)
    : String(expoConfig.ios?.buildNumber || "1");

export const TOKEN_KEY = "tariel_inspetor_access_token";
export const EMAIL_KEY = "tariel_inspetor_email";
export const OFFLINE_QUEUE_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ""}tariel-offline-queue.json`;
export const NOTIFICATIONS_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ""}tariel-activity-feed.json`;
export const READ_CACHE_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ""}tariel-read-cache.json`;
export const APP_PREFERENCES_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ""}tariel-app-preferences.json`;
export const HISTORY_UI_STATE_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ""}tariel-history-ui-state.json`;
export const MAX_NOTIFICATIONS = 40;
export const TARIEL_APP_MARK = require("../../assets/icon.png");
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const SIDE_PANEL_WIDTH = Math.min(
  372,
  Math.max(304, SCREEN_WIDTH * 0.88),
);
export const HISTORY_PANEL_CLOSED_X = -SIDE_PANEL_WIDTH - 24;
export const SETTINGS_PANEL_CLOSED_X = SIDE_PANEL_WIDTH + 24;
export const PANEL_ANIMATION_DURATION = 220;
export const PANEL_EDGE_GESTURE_WIDTH = 28;
export const PANEL_OPEN_SWIPE_THRESHOLD = 34;
export const PANEL_CLOSE_SWIPE_THRESHOLD = 40;
export const PANEL_EDGE_GESTURE_TOP_OFFSET = 78;
export const APP_VERSION_LABEL = appVersion;
export const APP_BUILD_LABEL = `build ${appBuild}`;
export const APP_BUILD_CHANNEL = "Prévia do inspetor";

export const PAYMENT_CARD_OPTIONS = [
  "Visa final 4242",
  "Mastercard final 1034",
  "Sem cartão",
] as const;
export const PLAN_OPTIONS = ["Free", "Pro", "Enterprise"] as const;
export const TEMPERATURE_STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1] as const;
export const TWO_FACTOR_METHOD_OPTIONS = ["App autenticador", "Email"] as const;
export const SECURITY_EVENT_FILTERS = ["todos", "críticos", "acessos"] as const;
export const SETTINGS_DRAWER_FILTERS = [
  { key: "todos", label: "Tudo" },
  { key: "prioridades", label: "Agora" },
  { key: "acesso", label: "Conta" },
  { key: "experiencia", label: "App" },
  { key: "seguranca", label: "Segurança" },
  { key: "sistema", label: "Ajuda" },
] as const;
export const HISTORY_DRAWER_FILTERS = [
  { key: "todos", label: "Tudo" },
  { key: "fixadas", label: "Fixadas" },
  { key: "recentes", label: "Recentes" },
] as const;
export const HELP_CENTER_ARTICLES = [
  {
    id: "help-primeiros-passos",
    title: "Primeiros passos no laudo",
    category: "Operação",
    summary:
      "Como abrir um registro limpo, conversar com o assistente e ganhar velocidade em campo.",
    body: "Comece descrevendo o local, o achado principal e o impacto observado. O assistente transforma isso em um registro técnico claro, sugere próximos passos e organiza o contexto do laudo para você continuar sem sobrecarregar a tela.",
    estimatedRead: "2 min",
  },
  {
    id: "help-mesa-avaliadora",
    title: "Quando usar a aba Mesa",
    category: "Mesa",
    requiredPortals: ["revisor"] as const,
    summary:
      "Entenda quando a mesa aparece e como responder de forma objetiva e útil.",
    body: "A aba Mesa é reservada para retornos da equipe avaliadora. Quando houver uma solicitação, responda de forma direta, com evidências e contexto. Se ainda não existir conversa da mesa, foque apenas no chat principal para não fragmentar a inspeção.",
    estimatedRead: "3 min",
  },
  {
    id: "help-fila-offline",
    title: "Fila offline e retomada",
    category: "Conectividade",
    summary:
      "Saiba como o app guarda mensagens, anexos e respostas quando a internet falha.",
    body: "Sempre que a conexão cair, o app guarda localmente as mensagens e anexos permitidos. Quando a rede voltar, você pode sincronizar tudo pela fila offline ou retomar manualmente uma pendência para revisar o texto antes do reenvio.",
    estimatedRead: "2 min",
  },
  {
    id: "help-seguranca-conta",
    title: "Segurança da conta do inspetor",
    category: "Segurança",
    summary:
      "Reautenticação, 2FA e permissões do dispositivo em linguagem simples.",
    body: "Use contas conectadas, verificação em duas etapas e proteção local do dispositivo para reduzir risco de acesso indevido. Ações críticas, como exportar dados ou excluir a conta, pedem confirmação extra para manter a operação segura.",
    estimatedRead: "4 min",
  },
] as const;
export const UPDATE_CHANGELOG = [
  {
    id: "update-1",
    title: "Interface mobile mais neutra",
    summary:
      "Login, shell do chat e estados de entrada ficaram mais limpos e discretos.",
  },
  {
    id: "update-2",
    title: "Drawer lateral de histórico e configurações",
    summary:
      "Os painéis agora abrem sobre o chat, com gesto lateral e foco melhor na conversa.",
  },
  {
    id: "update-3",
    title: "Engrenagem em evolução",
    summary:
      "Conta, segurança, permissões, privacidade e suporte ficaram mais vivos dentro do app.",
  },
] as const;

export const EXTERNAL_INTEGRATION_OPTIONS = [
  {
    id: "google_drive",
    label: "Google Drive",
    description:
      "Enviar evidências e anexos do laudo direto para pasta operacional.",
    icon: "google",
  },
  {
    id: "slack",
    label: "Slack",
    description:
      "Notificar equipe sobre retornos da mesa e pendências críticas.",
    icon: "slack",
  },
  {
    id: "notion",
    label: "Notion",
    description:
      "Sincronizar resumos técnicos do laudo para base de conhecimento.",
    icon: "notebook-outline",
  },
] as const;

export const TERMS_OF_USE_SECTIONS = [
  {
    id: "aceite",
    title: "1. Aceite dos termos",
    body: "Ao acessar ou usar o Tariel Inspetor, você confirma que leu e aceitou estes termos. Se estiver usando o app em nome de uma empresa, entende que também deve respeitar as regras internas dessa empresa e as permissões concedidas à sua conta.",
  },
  {
    id: "finalidade",
    title: "2. Finalidade do aplicativo",
    body: "O app foi criado para apoiar inspeções, registros técnicos, análise de evidências, conversas operacionais, fila offline, revisão humana e preparação de informações para laudos. Ele não substitui a responsabilidade profissional do usuário, da empresa, do responsável técnico ou da mesa avaliadora.",
  },
  {
    id: "conta",
    title: "3. Conta, acesso e permissões",
    body: "Cada usuário deve acessar o app com credenciais próprias e manter seus dados de contato atualizados. A conta pode ter permissões diferentes conforme perfil, empresa, plano, ambiente, função operacional e liberações feitas pelo administrador.",
  },
  {
    id: "uso-permitido",
    title: "4. Uso permitido",
    body: "Você pode usar o app para registrar informações de inspeção, anexar evidências permitidas, conversar com a IA, responder solicitações da mesa, consultar histórico autorizado, exportar dados disponíveis e acionar suporte quando necessário.",
  },
  {
    id: "responsabilidades",
    title: "5. Responsabilidades do usuário",
    body: "Você é responsável por informar dados verdadeiros, revisar respostas antes de usar em documentos, conferir evidências, evitar exposição indevida de terceiros e seguir normas técnicas, políticas internas, requisitos legais e orientações da sua empresa.",
  },
  {
    id: "ia",
    title: "6. Uso da IA e revisão humana",
    body: "As respostas geradas pela IA são apoio operacional. Elas podem conter erros, omissões ou interpretações incompletas. Antes de enviar, emitir, aprovar ou usar qualquer conteúdo em laudo, você deve revisar o resultado e validar com os responsáveis quando o processo exigir.",
  },
  {
    id: "evidencias",
    title: "7. Evidências, anexos e conversas",
    body: "Fotos, documentos, mensagens e demais anexos devem ter relação com a inspeção ou atendimento. Não envie conteúdo ilegal, ofensivo, sigiloso sem autorização, dados de terceiros sem necessidade ou arquivos que violem direitos de outra pessoa ou organização.",
  },
  {
    id: "restricoes",
    title: "8. Condutas proibidas",
    body: "É proibido tentar burlar autenticação, acessar dados sem permissão, interferir no funcionamento do app, enviar malware, manipular evidências, simular identidade, usar o app para fraude ou utilizar qualquer recurso para finalidade ilícita ou incompatível com a operação contratada.",
  },
  {
    id: "offline",
    title: "9. Modo offline e sincronização",
    body: "Quando houver falha de conexão, o app pode manter itens em fila local para tentar envio posterior. Cabe ao usuário conferir se mensagens, anexos e atualizações foram sincronizados antes de considerar uma atividade concluída.",
  },
  {
    id: "suporte",
    title: "10. Suporte, feedback e diagnóstico",
    body: "Ao informar bug, enviar feedback ou exportar diagnóstico, você autoriza o uso das informações enviadas para análise, correção, melhoria e atendimento. O diagnóstico pode conter dados técnicos do app, estado da fila, ambiente, versão e contexto necessário para investigação.",
  },
  {
    id: "propriedade",
    title: "11. Propriedade intelectual",
    body: "O app, sua interface, marca, fluxos, textos, componentes, integrações e recursos pertencem aos seus respectivos titulares. O uso do app não transfere propriedade intelectual ao usuário, apenas concede acesso conforme permissões e condições aplicáveis.",
  },
  {
    id: "disponibilidade",
    title: "12. Disponibilidade e alterações",
    body: "O app pode passar por manutenção, atualização, mudança de recurso, ajuste de segurança ou indisponibilidade temporária. Alguns recursos dependem de internet, backend, permissões do aparelho, plano contratado ou liberação do ambiente.",
  },
  {
    id: "encerramento",
    title: "13. Suspensão ou encerramento de acesso",
    body: "O acesso pode ser limitado, suspenso ou encerrado quando houver risco de segurança, violação destes termos, solicitação administrativa, fim de contrato, troca de perfil, comportamento indevido ou necessidade de proteger dados e operação.",
  },
  {
    id: "limitacao",
    title: "14. Limites de responsabilidade",
    body: "O app é uma ferramenta de apoio. Decisões técnicas, emissão de laudos, validações formais, cumprimento de normas, guarda documental e consequências operacionais dependem da análise humana, das regras da empresa e dos profissionais responsáveis.",
  },
  {
    id: "alteracoes",
    title: "15. Atualizações destes termos",
    body: "Estes termos podem ser atualizados para refletir mudanças no app, na operação, em exigências legais ou em políticas internas. Quando houver alteração relevante, a nova versão poderá ser disponibilizada no próprio aplicativo.",
  },
  {
    id: "contato",
    title: "16. Contato",
    body: "Dúvidas sobre estes termos devem ser encaminhadas pelo canal de suporte disponível no app ou pelo contato indicado pela empresa responsável pela conta.",
  },
] as const;

export const PRIVACY_POLICY_SECTIONS = [
  {
    id: "escopo",
    title: "1. Escopo da política",
    body: "Esta política explica, em linguagem simples, como o Tariel Inspetor trata dados pessoais e dados de uso dentro do aplicativo móvel, incluindo conta, conversas, anexos, histórico, preferências, fila offline, suporte e diagnóstico.",
  },
  {
    id: "dados-coletados",
    title: "2. Dados que podem ser tratados",
    body: "O app pode tratar dados de identificação e contato, como nome, e-mail, telefone, empresa, perfil de acesso e sessão; dados operacionais, como conversas, anexos, evidências, histórico, preferências, eventos de segurança e fila offline; e dados técnicos, como versão do app, ambiente, status de rede, permissões e registros de erro.",
  },
  {
    id: "finalidades",
    title: "3. Como usamos os dados",
    body: "Os dados são usados para permitir login, manter sessão, carregar a experiência do usuário, registrar inspeções, anexar evidências, responder conversas, sincronizar informações, acionar suporte, proteger a conta, investigar falhas, melhorar estabilidade e cumprir obrigações operacionais do serviço.",
  },
  {
    id: "conversas",
    title: "4. Conversas, IA e evidências",
    body: "Mensagens, fotos, documentos e respostas da IA podem ser usados para compor o histórico da inspeção, apoiar revisão humana, gerar contexto de atendimento e permitir retomada de trabalho. O usuário deve evitar inserir dados desnecessários, sensíveis ou de terceiros quando isso não for relevante para a inspeção.",
  },
  {
    id: "armazenamento-local",
    title: "5. Dados no dispositivo",
    body: "Algumas informações podem ficar armazenadas no próprio aparelho para manter sessão, preferências, histórico autorizado, fila offline, notificações locais e cache operacional. Esses dados ajudam o app a funcionar mesmo com internet instável, mas podem ser afetados por limpeza do sistema, troca de aparelho ou remoção do app.",
  },
  {
    id: "sincronizacao",
    title: "6. Sincronização e backup",
    body: "Quando a sincronização estiver ativa, dados necessários podem ser enviados ao backend para manter continuidade entre sessões, dispositivos e fluxos de revisão. Algumas opções permitem limitar sincronização, backup e upload automático conforme a configuração disponível no app.",
  },
  {
    id: "compartilhamento",
    title: "7. Compartilhamento de dados",
    body: "Dados podem ser compartilhados com sistemas internos, backend do serviço, equipe de suporte, mesa avaliadora, integrações autorizadas e prestadores necessários para operar o app. O compartilhamento deve respeitar permissões da conta, finalidade operacional e controles de segurança.",
  },
  {
    id: "diagnostico",
    title: "8. Diagnóstico e suporte",
    body: "Quando você informa um bug, envia feedback ou exporta diagnóstico, o app pode reunir informações técnicas e operacionais para investigação, como versão, ambiente, status de fila, permissões e descrição enviada. Esses dados são usados para atendimento, correção e melhoria do aplicativo.",
  },
  {
    id: "seguranca",
    title: "9. Segurança",
    body: "O app usa controles como sessão autenticada, permissões do dispositivo, reautenticação para ações sensíveis e registros de segurança. Nenhum sistema é totalmente livre de risco, por isso o usuário também deve proteger o aparelho, não compartilhar credenciais e manter o app atualizado.",
  },
  {
    id: "retencao",
    title: "10. Retenção e exclusão",
    body: "O tempo de guarda pode variar conforme configuração da conta, preferências locais, regras da empresa, necessidade operacional, obrigação legal ou segurança. Quando uma opção de exclusão estiver disponível, ela pode remover dados locais ou solicitar remoção conforme o tipo de dado e a permissão do usuário.",
  },
  {
    id: "direitos",
    title: "11. Direitos e solicitações",
    body: "Quando aplicável, o usuário pode solicitar informações sobre tratamento de dados, correção, acesso, exportação, revisão ou exclusão pelos canais disponíveis. Algumas solicitações podem depender de confirmação de identidade, permissão administrativa, regra contratual ou obrigação de retenção.",
  },
  {
    id: "minimizacao",
    title: "12. Boas práticas do usuário",
    body: "Envie apenas dados necessários para a finalidade da inspeção. Evite anexar documentos pessoais, dados sensíveis, imagens de terceiros ou informações sigilosas sem autorização. Revise mensagens e anexos antes de enviar.",
  },
  {
    id: "criancas",
    title: "13. Uso por menores",
    body: "O app é destinado a uso profissional e operacional. Ele não foi criado para uso por crianças ou adolescentes sem autorização e supervisão adequadas da organização responsável.",
  },
  {
    id: "alteracoes",
    title: "14. Alterações desta política",
    body: "Esta política pode ser atualizada quando houver mudança no aplicativo, no tratamento de dados, em integrações, em exigências legais ou em regras operacionais. A versão vigente pode ser consultada dentro do app.",
  },
  {
    id: "contato",
    title: "15. Contato sobre privacidade",
    body: "Dúvidas ou solicitações sobre privacidade devem ser encaminhadas pelo canal de suporte disponível no app ou pelo contato indicado pela empresa responsável pela conta.",
  },
] as const;

export const LICENSES_CATALOG = [
  {
    id: "react-native",
    name: "React Native",
    license: "MIT",
    source: "https://github.com/facebook/react-native",
  },
  {
    id: "expo",
    name: "Expo SDK",
    license: "MIT",
    source: "https://github.com/expo/expo",
  },
  {
    id: "mdi",
    name: "Material Design Icons",
    license: "Apache-2.0",
    source: "https://github.com/Templarian/MaterialDesign",
  },
] as const;
