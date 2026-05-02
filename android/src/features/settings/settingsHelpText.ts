const SETTINGS_HELP_TEXT: Record<string, string> = {
  "Ações prioritárias":
    "Esta área reúne o que precisa de atenção primeiro. Use como uma lista rápida para resolver pendências importantes do app sem precisar procurar em várias telas.",
  "Revisar permissões críticas":
    "Mostra permissões importantes para o app funcionar bem, como câmera, arquivos e avisos. Se alguma estiver bloqueada, alguns recursos podem não abrir ou podem pedir autorização na hora de usar.",
  "Verificar atualizações":
    "Confere se existe uma versão mais nova do app. Atualizações podem trazer correções, melhorias de segurança e ajustes de funcionamento.",
  "Tudo em dia":
    "Indica que o app não encontrou pendências importantes nesta área. Mesmo assim, você pode abrir para conferir os detalhes quando quiser.",

  Conta:
    "Aqui ficam os dados da sua conta, como nome, e-mail, telefone e senha. Use esta área para manter suas informações corretas e facilitar acesso, suporte e recuperação de conta.",
  "Conta e acesso":
    "Reúne dados de perfil e formas de entrar na conta. É o lugar certo para revisar nome, contato, e-mail e senha.",
  "Informações pessoais":
    "Permite editar seus dados básicos de perfil. Mantenha essas informações atualizadas para identificação dentro do app e para contato quando houver suporte.",
  "Alterar e-mail":
    "Troca o e-mail principal usado para entrar na conta e receber mensagens importantes. Confirme com atenção para não perder acesso.",
  "Alterar Senha":
    "Permite definir uma nova senha de acesso. Use uma senha forte e que você consiga lembrar, evitando repetir senhas de outros serviços.",
  "Nome do usuário":
    "É o nome principal salvo no seu perfil. Ele pode aparecer em áreas internas da conta e ajuda a identificar quem está usando o app.",
  "Nome de exibição":
    "É o nome mostrado em partes visíveis da interface. Pode ser um nome mais curto ou mais fácil de reconhecer.",
  "Número de telefone":
    "Telefone de contato da conta. Pode ser usado para suporte, confirmação de identidade ou informações importantes relacionadas ao perfil.",
  "Novo email":
    "Digite o novo e-mail que passará a ser usado na conta. Confira se não há erro de digitação antes de confirmar.",
  "Senha atual":
    "Digite a senha que você usa hoje. Isso confirma que é você mesmo antes de permitir uma alteração sensível.",
  "Nova senha":
    "Escolha a nova senha da conta. Prefira uma senha longa, difícil de adivinhar e diferente das que você usa em outros lugares.",
  "Confirmar senha":
    "Repita a nova senha para evitar erro de digitação. As duas senhas precisam ser iguais para salvar a alteração.",
  "Análise assistida de anexos":
    "Quando ligada, o app pode ajudar a interpretar anexos enviados nas conversas. Desligue se não quiser que anexos façam parte dessa análise.",

  Preferências:
    "Reúne ajustes de uso diário, como IA, aparência e notificações. Use para deixar o app mais confortável para sua rotina.",
  "Preferências da IA":
    "Controla como o assistente responde nas conversas. Você pode escolher velocidade, nível de detalhe, idioma e tom das respostas.",
  "Modelo de IA":
    "Define o tipo de assistente usado nas respostas. Modelos mais simples tendem a responder mais rápido; modelos mais avançados costumam analisar melhor pedidos difíceis.",
  "Estilo de resposta":
    "Escolhe o tamanho e a forma das respostas. Use respostas curtas para objetividade, ou respostas detalhadas quando quiser explicações com mais contexto.",
  "Idioma do app e da IA":
    "Define o idioma usado na interface e nas respostas do assistente. Escolha o idioma em que você prefere ler e escrever.",
  "Memória da IA":
    "Quando ligada, o app pode lembrar preferências entre conversas, como estilo de resposta e escolhas recorrentes. Desligue se preferir que cada conversa comece mais independente.",
  "Tom da conversa":
    "Define o jeito principal das respostas do assistente. Você pode deixar a conversa mais direta, técnica, explicativa ou criativa conforme sua preferência.",
  rápido:
    "Escolha esta opção quando quiser respostas mais rápidas e diretas. É boa para perguntas simples e tarefas em que velocidade importa mais que análise profunda.",
  equilibrado:
    "Escolha esta opção para um meio-termo entre rapidez e qualidade da resposta. É uma boa escolha para o uso diário.",
  avançado:
    "Escolha esta opção quando o assunto for mais difícil, longo ou exigir mais cuidado. Pode demorar um pouco mais, mas tende a analisar melhor o contexto.",
  curto:
    "As respostas ficam mais objetivas, com menos explicação. Use quando quiser apenas o essencial.",
  padrão:
    "Mantém uma resposta equilibrada, com contexto suficiente sem ficar longa demais. É a escolha recomendada para a maioria das conversas.",
  detalhado:
    "As respostas trazem mais explicações, passos e justificativas. Use quando quiser entender melhor o raciocínio ou revisar algo com cuidado.",
  criativo:
    "Permite respostas com mais variação de ideias e alternativas. Use para brainstorming, escrita, nomes, possibilidades e exploração de caminhos.",
  Português:
    "As respostas do assistente ficam em português. Use se esse for o idioma principal da sua rotina no app.",
  Inglês:
    "As respostas do assistente ficam em inglês. Use quando estiver trabalhando com conteúdo ou pessoas nesse idioma.",
  Espanhol:
    "As respostas do assistente ficam em espanhol. Use quando esse for o idioma mais adequado para suas conversas.",

  Aparência:
    "Controla como o app aparece na tela. Você pode ajustar tema, tamanho da letra, espaço entre elementos, cor de destaque e animações.",
  Tema: "Escolhe se o app usa visual claro, escuro ou acompanha o padrão do celular. O tema muda só a aparência, não altera seus dados.",
  "Tamanho da fonte":
    "Aumenta ou diminui o tamanho dos textos. Use maior para facilitar leitura, ou menor se quiser ver mais informações na tela.",
  "Densidade da interface":
    "Controla quanto espaço aparece entre botões, listas e campos. Uma interface mais compacta mostra mais itens; uma interface mais confortável deixa tudo mais espaçado.",
  "Cor de destaque":
    "Muda a cor usada para marcar seleções e botões importantes. O padrão mantém o visual preto e branco atual; as outras cores são apenas personalização.",
  Animações:
    "Liga ou desliga movimentos visuais da interface. Desligar pode deixar a navegação mais simples e confortável para quem prefere menos movimento.",

  Notificações:
    "Controla quais avisos o app pode mostrar. Use para receber alertas importantes sem deixar notificações desnecessárias ligadas.",
  "Notificações de respostas":
    "Avisa quando uma conversa receber resposta ou atualização. Desligue se preferir conferir as respostas manualmente ao abrir o app.",
  "Notificações push":
    "Permite avisos enviados pelo app mesmo quando ele não está aberto. Se desligar, alguns alertas podem aparecer somente quando você voltar ao aplicativo.",
  "Categoria Chat":
    "Controla avisos ligados às conversas. Desligue se não quiser receber alertas desse tipo.",
  "Categoria Mesa":
    "Controla avisos ligados à área Mesa, quando ela estiver disponível. Desligar não apaga nada, apenas reduz esse tipo de aviso.",
  "Categoria Sistema":
    "Controla avisos sobre funcionamento do app, sincronização e informações gerais. É útil manter ligado para saber quando algo precisa de atenção.",
  "Alertas críticos":
    "Controla avisos mais importantes, como falhas relevantes ou ações que precisam de cuidado. Recomenda-se manter ligado para não perder alertas essenciais.",

  "Proteção no dispositivo":
    "Reúne opções para proteger o app neste celular. Ajuda a evitar acesso indevido quando outra pessoa pega o aparelho.",
  "Desbloquear app com biometria":
    "Permite usar digital ou reconhecimento do celular para abrir o app. O app usa a proteção do próprio aparelho e não guarda sua biometria.",
  "Exigir autenticação ao abrir":
    "Pede confirmação de identidade ao abrir o app. É recomendado quando o celular é compartilhado ou quando há dados sensíveis nas conversas.",
  "Bloquear após inatividade":
    "Define depois de quanto tempo parado o app deve pedir desbloqueio novamente. Um tempo menor aumenta a proteção; um tempo maior dá mais praticidade.",
  "Verificação de identidade":
    "Mostra opções que pedem confirmação antes de ações sensíveis. Isso ajuda a proteger dados, exportações e mudanças importantes.",
  "Reautenticar agora":
    "Confirma sua identidade por um período curto para liberar ações sensíveis. Use antes de exportar dados, alterar proteção ou excluir informações.",
  "Ações protegidas":
    "Mostra quais ações pedem confirmação extra. Normalmente envolve exportar dados, apagar histórico, alterar segurança ou excluir informações.",
  "Atividade de segurança":
    "Mostra eventos importantes de acesso e proteção da conta. Use para conferir se tudo parece normal e reconhecer atividades estranhas.",
  Filtros:
    "Ajuda a escolher quais atividades aparecem na lista. Use para encontrar eventos específicos com mais facilidade.",
  "Reportar atividade suspeita":
    "Use quando notar algo que não reconhece, como acesso estranho ou ação inesperada. O app abre um caminho para registrar o problema.",

  "Contas conectadas":
    "Mostra formas de acesso vinculadas à sua conta. Manter mais de uma forma segura pode ajudar se você perder acesso a uma delas.",
  "Sessões e dispositivos":
    "Mostra onde sua conta está aberta. Use para encerrar acessos antigos, desconhecidos ou que você não usa mais.",
  "Encerrar esta sessão":
    "Sai da conta neste dispositivo atual. Use quando terminar de usar o app ou quando não quiser manter o acesso aberto neste celular.",
  "Encerrar sessões suspeitas":
    "Encerra acessos marcados como estranhos ou fora do esperado. Use se você não reconhecer alguma atividade.",
  "Encerrar todas as outras":
    "Mantém este aparelho conectado e encerra os outros acessos. É útil quando você quer garantir que só este dispositivo continue usando a conta.",
  "Logout total":
    "Sai da conta em todos os dispositivos. Use se perdeu um aparelho, compartilhou a senha ou quer recomeçar com segurança.",
  "Verificação em duas etapas":
    "Adiciona uma confirmação extra além da senha. Isso dificulta o acesso de outra pessoa mesmo que ela descubra sua senha.",
  Método:
    "Escolhe como a confirmação extra será feita. Use o método que você consegue acessar com segurança e facilidade.",
  "Códigos de recuperação":
    "São códigos reserva para entrar na conta se você perder o método principal de confirmação. Guarde em local seguro.",
  "Código de confirmação":
    "Digite o código recebido ou gerado pelo método escolhido. Ele confirma que você tem acesso ao segundo fator de segurança.",
  "Confirmar código":
    "Valida o código informado antes de ativar ou alterar a proteção. Confira se digitou todos os números corretamente.",
  "Gerar ou regenerar códigos":
    "Cria novos códigos de recuperação. Quando novos códigos são gerados, os anteriores podem deixar de servir.",
  "Compartilhar códigos de recuperação":
    "Exporta ou compartilha os códigos para você guardar em local seguro. Evite enviar por canais públicos ou para outras pessoas.",
  "Códigos gerados":
    "Mostra os códigos de recuperação recém-criados. Eles aparecem para você salvar com segurança antes de sair da tela.",

  "Segurança e privacidade":
    "Reúne controles sobre proteção, permissões, dados e ações sensíveis. Use esta área para revisar o que o app pode acessar e o que fica salvo.",
  "Controles de dados":
    "Controla o que o app salva, por quanto tempo guarda informações e como sincroniza dados. Use para equilibrar praticidade, histórico e privacidade.",
  "Salvar histórico de conversas":
    "Quando ligado, o app mantém suas conversas salvas para você consultar depois. Quando desligado, novas conversas podem não ficar disponíveis no histórico.",
  "Compartilhar dados para melhoria da IA":
    "Permite usar interações para melhorar a qualidade das respostas. Desligue se preferir que suas conversas não participem desse tipo de melhoria.",
  "Analytics do app":
    "Ajuda a entender se o app está funcionando bem, como telas usadas e possíveis dificuldades. Não é necessário para conversar, mas pode ajudar a melhorar o produto.",
  "Relatórios de falha":
    "Permite registrar erros do app para facilitar correções. Ajuda a equipe a encontrar problemas, principalmente quando algo fecha ou para de funcionar.",
  "Exportar dados para auditoria":
    "Gera um arquivo com dados do app, incluindo conversas, histórico local, configurações exportáveis e registros importantes. Use quando precisar revisar, guardar ou enviar informações para conferência.",
  "Retenção de dados":
    "Define por quanto tempo o histórico fica guardado. Um prazo menor limpa dados mais cedo; um prazo maior mantém mais contexto para consultas futuras.",
  "Sincronização e Wi-Fi":
    "Reúne opções de envio e atualização de dados entre dispositivos. Você pode limitar ao Wi-Fi para economizar internet móvel.",
  "Compressão de mídia":
    "Define se imagens e anexos serão reduzidos antes do envio. Menos compressão mantém mais qualidade; mais compressão ajuda a enviar arquivos menores.",
  "Nível de compressão":
    "Escolha como o app deve tratar imagens antes do envio. A opção equilibrada costuma ser a melhor para manter boa qualidade sem deixar o arquivo pesado.",
  Equilibrada:
    "Mantém um equilíbrio entre qualidade e tamanho do arquivo. É indicada para o uso normal, porque costuma preservar boa visualização sem deixar o envio pesado.",
  equilibrada:
    "Mantém um equilíbrio entre qualidade e tamanho do arquivo. É indicada para o uso normal, porque costuma preservar boa visualização sem deixar o envio pesado.",
  Leve: "Reduz pouco o arquivo e preserva mais qualidade. Use quando a imagem precisa continuar bem nítida.",
  Original:
    "Mantém o arquivo como foi escolhido, sem redução. Use quando a qualidade máxima for mais importante que velocidade de envio ou economia de espaço.",
  Forte:
    "Reduz mais o tamanho do arquivo para facilitar envio e economizar espaço. Pode diminuir a qualidade visual da imagem.",
  "Limpar cache local":
    "Remove arquivos temporários usados para acelerar o app. Isso não deve apagar sua conta, mas pode fazer algumas telas carregarem novamente.",
  "Apagar histórico":
    "Remove o histórico salvo no app. Esta ação pode dificultar consultar conversas antigas, então revise antes de confirmar.",
  "Excluir conversas":
    "Remove conversas deste perfil. É uma ação mais séria que limpar arquivos temporários, porque pode apagar conteúdo que você talvez queira consultar depois.",
  "30 dias":
    "Guarda o histórico por cerca de um mês. É bom para quem quer manter só informações recentes.",
  "90 dias":
    "Guarda o histórico por cerca de três meses. É uma escolha equilibrada para consulta sem acumular dados por muito tempo.",
  "1 ano":
    "Guarda o histórico por mais tempo. Use quando precisar consultar conversas antigas com frequência.",
  "Até excluir":
    "Mantém o histórico até você apagar manualmente. Use se quiser controle total sobre quando remover os dados.",
  "Sincronizar só no Wi-Fi":
    "Quando ligado, o app evita usar internet móvel para sincronizar dados. Isso ajuda a economizar pacote de dados, mas algumas atualizações podem esperar até ter Wi-Fi.",
  "Backup automático":
    "Quando ligado, o app tenta manter cópias de segurança atualizadas. Isso ajuda a reduzir risco de perda de informações importantes.",
  "Sincronização entre dispositivos":
    "Mantém informações atualizadas entre aparelhos da mesma conta. Use se você acessa o app em mais de um dispositivo.",
  "Upload automático de anexos":
    "Quando ligado, anexos podem ser enviados automaticamente quando estiver tudo pronto. Desligue se preferir escolher manualmente quando enviar.",

  Permissões:
    "Mostra o que o app pode acessar no celular, como microfone, câmera e arquivos. Se algo estiver bloqueado, o recurso correspondente pode não funcionar.",
  Microfone:
    "Permite usar áudio, fala ou gravação quando algum recurso pedir. Se estiver desligado, funções de voz podem não funcionar.",
  Câmera:
    "Permite tirar fotos ou capturar imagens dentro do app. Se estiver desligada, você ainda pode usar outras partes do app, mas recursos de câmera podem falhar.",
  Arquivos:
    "Permite escolher documentos, imagens e anexos do aparelho. Se estiver desligado, o envio de arquivos pode não funcionar.",
  Biometria:
    "Permite usar a proteção do celular, como digital ou reconhecimento facial, para desbloquear o app. O app não guarda seus dados biométricos.",
  "Abrir ajustes do sistema":
    "Abre a tela de configurações do Android para este app. Use quando precisar liberar ou bloquear permissões diretamente no sistema do celular.",

  "Segurança de arquivos enviados":
    "Explica como o app trata anexos enviados. Essas regras ajudam a reduzir problemas com arquivos incompatíveis, grandes demais ou sem autorização.",
  "Validação de tipo e tamanho":
    "Confere se o arquivo pode ser enviado e se não passa do limite permitido. Isso evita falhas e ajuda a manter o envio mais previsível.",
  "URLs protegidas":
    "Ajuda a garantir que arquivos enviados não fiquem abertos para qualquer pessoa. O acesso depende das permissões corretas da conta.",
  "Falhas e bloqueios":
    "Mostra por que um arquivo pode não ser aceito. Use para entender o problema e tentar enviar novamente com outro arquivo ou formato.",

  "Excluir conta":
    "Área para remover a conta de forma permanente. Revise com calma, porque essa ação pode apagar dados e encerrar seu acesso.",
  "Exportar dados antes de excluir":
    "Permite guardar uma cópia dos dados antes da exclusão. É recomendado fazer isso se você pode precisar consultar algo depois.",
  "Status da reautenticação":
    "Mostra se sua identidade já foi confirmada recentemente. Algumas ações perigosas só ficam disponíveis depois dessa confirmação.",
  "Excluir conta permanentemente":
    "Remove a conta de forma definitiva. Antes de confirmar, verifique se exportou os dados importantes e se realmente não precisará mais do acesso.",

  Fala: "Reúne ajustes de voz, leitura e ditado. Use se quiser falar com o app, transcrever áudio ou ouvir respostas em voz alta.",
  "Voz e acessibilidade":
    "Reúne ajustes de voz e leitura em voz alta. Use para escolher idioma de voz, velocidade da leitura e se o app deve ler respostas automaticamente.",
  "Ativar fala":
    "Liga os recursos de voz do app. Se desligar, opções relacionadas a fala e leitura podem ficar indisponíveis.",
  "Transcrever automaticamente":
    "Quando ligado, o app tenta transformar fala em texto quando o recurso de voz for usado. Isso facilita enviar mensagens sem digitar.",
  "Idioma de voz":
    "Escolhe o idioma principal usado para fala, leitura e ditado. Se o idioma estiver correto, a transcrição e a leitura tendem a funcionar melhor.",
  "Velocidade da fala":
    "Controla a velocidade da leitura em voz alta. Diminua se estiver rápido demais ou aumente se quiser ouvir com mais agilidade.",
  "Voz preferida":
    "Escolhe a voz usada na leitura em voz alta, quando o celular oferece essa opção. Se não houver opção disponível, o sistema usa a voz padrão.",
  "Ler respostas automaticamente":
    "Quando ligado, o app pode ler respostas em voz alta. Use se preferir ouvir o conteúdo em vez de ler.",
  "Ditado no composer":
    "Permite falar para preencher a mensagem. É útil quando você não quer digitar ou está usando o celular em movimento.",
  "Ajustes de voz do sistema":
    "Abre as configurações do celular relacionadas a voz e acessibilidade. Use quando precisar trocar idioma, voz ou permissões fora do app.",

  Sistema:
    "Reúne permissões e informações do app. Use quando precisar conferir acessos do celular, versão instalada ou documentos como termos, privacidade e licenças.",
  "Idioma do aplicativo":
    "Define o idioma usado na interface. Escolha o idioma em que você se sente mais confortável para navegar.",
  "Economia de dados":
    "Ajuda a reduzir uso de internet, principalmente fora do Wi-Fi. Algumas atualizações ou envios podem ficar mais controlados.",
  "Uso de bateria":
    "Mostra ou abre opções relacionadas ao consumo de bateria. Use se o app estiver gastando muita energia ou se o sistema estiver limitando funcionamento em segundo plano.",
  "Versão do aplicativo":
    "Mostra a versão instalada. Essa informação ajuda em suporte e na conferência de atualizações.",
  "Central de atividade":
    "Mostra acontecimentos recentes do app, como ações, avisos e mudanças relevantes. Use para entender o que aconteceu sem procurar em várias telas.",
  "Fila offline":
    "Mostra itens que aguardam internet para serem enviados ou atualizados. É útil quando você usou o app sem conexão ou com sinal instável.",
  "Sincronizar agora":
    "Força uma tentativa de atualização dos dados. Use quando quiser conferir se tudo foi enviado ou recebido corretamente.",
  "Limpar cache":
    "Remove arquivos temporários que o app usa para carregar mais rápido. Pode ajudar se algo estiver estranho ou ocupando espaço.",

  Suporte:
    "Reúne canais de atendimento, envio de problema, feedback e diagnóstico. Use quando precisar pedir suporte ou relatar uma falha.",
  "Falar com o suporte":
    "Reúne as formas de pedir ajuda. Use para informar um erro, conversar com suporte, mandar uma sugestão ou gerar um diagnóstico para análise.",
  "Documentos do app":
    "Reúne documentos importantes do aplicativo, como termos de uso, privacidade e licenças. Use para conferir regras e informações legais.",
  "Plano e liberação":
    "Mostra quais recursos estão disponíveis para sua conta. Alguns recursos podem depender do plano ou da liberação do ambiente.",
  "Central de ajuda":
    "Abre conteúdos de orientação para usar o app. Use quando tiver dúvida sobre uma função antes de chamar suporte.",
  "Falar com suporte":
    "Abre o canal para falar com a equipe de suporte. Use quando precisar de ajuda com conta, acesso, erro ou dúvida operacional.",
  "Reportar problema":
    "Use para informar algo que não funcionou como esperado. Quanto mais claro for o relato, mais fácil fica investigar.",
  "Enviar feedback":
    "Permite mandar opinião ou sugestão sobre o app. Use para pedir melhoria, apontar dificuldade ou comentar algo da experiência.",
  "Exportar diagnóstico":
    "Gera informações úteis para investigar problemas do app. Pode incluir dados técnicos de funcionamento, mas não substitui uma explicação sua sobre o que aconteceu.",
  "Sobre o app":
    "Mostra informações gerais da instalação, como versão e ambiente, e reúne os documentos do app: termos de uso, política de privacidade e licenças.",
  "Termos de uso":
    "Mostra as regras de uso do app. Leia para entender responsabilidades, limites e condições de utilização.",
  "Política de privacidade":
    "Explica de forma completa como dados podem ser usados, guardados, compartilhados, sincronizados e removidos dentro do app.",
  Licenças:
    "Mostra bibliotecas e componentes de terceiros usados no app. É uma informação legal e de transparência.",
  "Limpar fila local":
    "Remove itens pendentes guardados localmente. Use com cuidado, porque algo que ainda não foi enviado pode deixar de ser processado.",

  Seções:
    "Lista as áreas disponíveis nas configurações. Toque em uma seção para abrir os ajustes relacionados.",
  "Sistema e suporte":
    "Atalho para informações do app, suporte e manutenção. Use quando precisar de ajuda, atualização ou dados técnicos básicos para atendimento.",
  "Ajuda e informações":
    "Reúne suporte, documentos e informações do app. Use quando quiser relatar um problema, enviar feedback, ver permissões ou conferir dados da instalação.",
  "Informar bug":
    "Use para relatar algo que não funcionou como esperado. Descreva o que tentou fazer, o que aconteceu e, se souber, como repetir o problema.",
  Sobre:
    "Mostra informações gerais sobre o app, versão instalada e documentos importantes, como termos de uso, privacidade e licenças.",
  "Buscar na ajuda":
    "Digite uma palavra ou assunto para encontrar orientações. Use termos simples, como conta, senha, arquivo ou notificação.",
  "Email para retorno":
    "Informe um e-mail para o suporte responder. Confira se está correto para não perder o retorno.",
  Sair: "Encerra o acesso desta conta no app. Depois disso, será necessário entrar novamente para usar recursos protegidos.",
};

export function getSettingsHelpText(title: string): string | undefined {
  const normalizedTitle = title.trim();
  const lowerTitle = normalizedTitle.toLocaleLowerCase("pt-BR");
  return SETTINGS_HELP_TEXT[normalizedTitle] || SETTINGS_HELP_TEXT[lowerTitle];
}
