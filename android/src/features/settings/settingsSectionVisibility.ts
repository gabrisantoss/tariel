import type { SettingsSectionKey } from "./settingsNavigationMeta";

type SettingsSectionGroup =
  | "prioridades"
  | "acesso"
  | "experiencia"
  | "seguranca"
  | "sistema";
type SettingsDrawerFilter = "todos" | SettingsSectionGroup;

interface SettingsSectionCatalogEntry {
  key: SettingsSectionKey;
  group: SettingsSectionGroup;
  terms: string[];
}

interface BuildSettingsSectionVisibilityInput {
  buscaConfiguracoes: string;
  filtroConfiguracoes: SettingsDrawerFilter;
  perfilNomeCompleto: string;
  contaEmailLabel: string;
  modeloIa: string;
  estiloResposta: string;
  idiomaResposta: string;
  temaApp: string;
  tamanhoFonte: string;
  densidadeInterface: string;
  corDestaque: string;
  somNotificacao: string;
  provedorPrimario: string;
  resumoSessaoAtual: string;
  resumoBlindagemSessoes: string;
  resumo2FAStatus: string;
  lockTimeout: string;
  reautenticacaoStatus: string;
  totalEventosSeguranca: number;
  resumoDadosConversas: string;
  resumoPermissoes: string;
  resumoPrivacidadeNotificacoes: string;
  resumoExcluirConta: string;
  appVersionLabel: string;
  appBuildChannel: string;
  resumoFilaSuporteLocal: string;
  twoFactorEnabled: boolean;
  provedoresConectadosTotal: number;
  permissoesNegadasTotal: number;
  sessoesSuspeitasTotal: number;
}

interface BuildSettingsSectionVisibilityResult {
  buscaConfiguracoesNormalizada: string;
  mostrarSecaoConfiguracao: (key: SettingsSectionKey) => boolean;
  mostrarGrupoContaAcesso: boolean;
  mostrarGrupoExperiencia: boolean;
  mostrarGrupoSeguranca: boolean;
  mostrarGrupoSistema: boolean;
  totalSecoesConfiguracaoVisiveis: number;
  totalSecoesContaAcesso: number;
  totalSecoesExperiencia: number;
  totalSecoesSeguranca: number;
  totalSecoesSistema: number;
  totalPrioridadesAbertas: number;
  resumoBuscaConfiguracoes: string;
}

function normalizarTextoBusca(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildSettingsSectionVisibility(
  input: BuildSettingsSectionVisibilityInput,
): BuildSettingsSectionVisibilityResult {
  const buscaConfiguracoesNormalizada = normalizarTextoBusca(
    input.buscaConfiguracoes,
  );
  const catalogoSecoesConfiguracao: readonly SettingsSectionCatalogEntry[] = [
    {
      key: "prioridades",
      group: "prioridades",
      terms: [
        "acoes prioritarias permissoes criticas atualizacoes dispositivo",
      ],
    },
    {
      key: "conta",
      group: "acesso",
      terms: [
        `conta perfil email telefone senha logout workspace empresa acesso ${input.perfilNomeCompleto} ${input.contaEmailLabel}`,
      ],
    },
    {
      key: "preferenciasIa",
      group: "experiencia",
      terms: [
        `preferencias ia modelo estilo resposta idioma memoria tom ${input.modeloIa} ${input.estiloResposta} ${input.idiomaResposta}`,
      ],
    },
    {
      key: "aparencia",
      group: "experiencia",
      terms: [
        `aparencia tema fonte densidade cor destaque animacoes economia dados bateria ${input.temaApp} ${input.tamanhoFonte} ${input.densidadeInterface} ${input.corDestaque}`,
      ],
    },
    {
      key: "notificacoes",
      group: "experiencia",
      terms: ["notificacoes push respostas chat mesa sistema alertas criticos"],
    },
    {
      key: "dadosConversas",
      group: "seguranca",
      terms: [
        `dados e conversas historico exportar apagar retencao backup sincronizacao compartilhar melhoria ia consentimento ${input.resumoDadosConversas}`,
      ],
    },
    {
      key: "permissoes",
      group: "seguranca",
      terms: [`permissoes microfone camera arquivos ${input.resumoPermissoes}`],
    },
    {
      key: "recursosAvancados",
      group: "experiencia",
      terms: [
        "voz acessibilidade fala transcricao leitura assistida microfone",
      ],
    },
    {
      key: "sistema",
      group: "sistema",
      terms: [
        `sistema permissoes sobre versao app informacoes ${input.appVersionLabel} ${input.appBuildChannel}`,
      ],
    },
    {
      key: "suporte",
      group: "sistema",
      terms: [
        `suporte ajuda feedback bug licencas termos privacidade sobre diagnostico whatsapp atualizacoes ${input.resumoFilaSuporteLocal}`,
      ],
    },
  ];

  const secoesConfiguracaoVisiveis = catalogoSecoesConfiguracao.filter(
    (section) => {
      if (
        input.filtroConfiguracoes !== "todos" &&
        input.filtroConfiguracoes !== section.group
      ) {
        return false;
      }
      if (!buscaConfiguracoesNormalizada) {
        return true;
      }
      const alvo = normalizarTextoBusca(section.terms.join(" "));
      return alvo.includes(buscaConfiguracoesNormalizada);
    },
  );
  const secoesConfiguracaoVisiveisSet = new Set(
    secoesConfiguracaoVisiveis.map((item) => item.key),
  );
  const mostrarSecaoConfiguracao = (key: SettingsSectionKey) =>
    secoesConfiguracaoVisiveisSet.has(key);
  const mostrarGrupoContaAcesso = mostrarSecaoConfiguracao("conta");
  const mostrarGrupoExperiencia =
    mostrarSecaoConfiguracao("preferenciasIa") ||
    mostrarSecaoConfiguracao("recursosAvancados") ||
    mostrarSecaoConfiguracao("aparencia") ||
    mostrarSecaoConfiguracao("notificacoes");
  const mostrarGrupoSeguranca =
    mostrarSecaoConfiguracao("dadosConversas") ||
    mostrarSecaoConfiguracao("permissoes");
  const mostrarGrupoSistema =
    mostrarSecaoConfiguracao("sistema") || mostrarSecaoConfiguracao("suporte");
  const totalSecoesConfiguracaoVisiveis = secoesConfiguracaoVisiveis.length;
  const totalSecoesContaAcesso = secoesConfiguracaoVisiveis.filter(
    (item) => item.group === "acesso",
  ).length;
  const totalSecoesExperiencia = secoesConfiguracaoVisiveis.filter(
    (item) => item.group === "experiencia",
  ).length;
  const totalSecoesSeguranca = secoesConfiguracaoVisiveis.filter(
    (item) => item.group === "seguranca",
  ).length;
  const totalSecoesSistema = secoesConfiguracaoVisiveis.filter(
    (item) => item.group === "sistema",
  ).length;
  const totalPrioridadesAbertas = input.permissoesNegadasTotal > 0 ? 1 : 0;
  const resumoBuscaConfiguracoes =
    !buscaConfiguracoesNormalizada && input.filtroConfiguracoes === "todos"
      ? ""
      : totalSecoesConfiguracaoVisiveis
        ? `${totalSecoesConfiguracaoVisiveis} bloco${totalSecoesConfiguracaoVisiveis > 1 ? "s" : ""} correspondente${totalSecoesConfiguracaoVisiveis > 1 ? "s" : ""}`
        : "Nenhum bloco encontrado";

  return {
    buscaConfiguracoesNormalizada,
    mostrarSecaoConfiguracao,
    mostrarGrupoContaAcesso,
    mostrarGrupoExperiencia,
    mostrarGrupoSeguranca,
    mostrarGrupoSistema,
    totalSecoesConfiguracaoVisiveis,
    totalSecoesContaAcesso,
    totalSecoesExperiencia,
    totalSecoesSeguranca,
    totalSecoesSistema,
    totalPrioridadesAbertas,
    resumoBuscaConfiguracoes,
  };
}
