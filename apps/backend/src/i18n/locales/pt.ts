const pt = {
  errors: {
    UNAUTHORIZED: "Não autorizado.",
    MISSING_TOKEN: "Falta o símbolo.",
    INVALID_TOKEN: "Token inválido ou expirado.",
    SHOW_NOT_FOUND: "Mostrar ou filme não encontrado.",
    USER_NOT_FOUND: "Usuário não encontrado.",
    COMMENT_NOT_FOUND: "Comentário não encontrado.",
    PARENT_COMMENT_NOT_FOUND: "O comentário dos pais não foi encontrado.",
    NESTING_TOO_DEEP: "Não é possível responder a uma resposta.",
    SHOW_MISMATCH: "O comentário dos pais pertence a outro show.",
    RATING_NOT_FOUND: "Classificação não encontrada.",
    TRACKING_NOT_FOUND: "O registo não foi encontrado.",
    INVALID_SOURCE: "Fonte de notícias inválida.",
    NEWS_SOURCE_NOT_FOUND: "Fonte de notícias não encontrada.",
    NEWS_FETCH_ERROR: "Não foi possível obter as notícias.",
    IMAGE_FETCH_ERROR: "Não foi possível obter a imagem.",
    IMPORT_FAILED: "A importação falhou.",
    IMPORT_NO_CSV: "Nenhum arquivo CSV válido encontrado no arquivo enviado.",
    IMPORT_REVIEW_NOT_FOUND: "A revisão da importação não foi encontrada.",
    IMPORT_REVIEW_ALREADY_RESOLVED: "Esta revisão já foi resolvida.",
    IMPORT_REVIEW_INVALID_CHOICE: "Qualquer um TMDB ID ou skip deve ser fornecido.",
    VALIDATION_ERROR: "A validação falhou.",
    TOO_MANY_AUTH_ATTEMPTS: "Demasiadas tentativas de autorização. Tenta mais tarde.",
    NO_FILE_UPLOADED: "Nenhum ficheiro carregado.",
    INVALID_FILE_TYPE: "Tipo de ficheiro inválido.",
    IMPORT_TOO_LARGE: "Importar ficheiro demasiado grande.",
    TOO_MANY_IMPORT_REQUESTS: "Muitos pedidos de importação. Tenta mais tarde.",
    TOO_MANY_EXPORT_REQUESTS: "Muitos pedidos de exportação. Tenta mais tarde.",
    INVALID_EXPORT_FORMAT: "Formato de exportação inválido.",
    TRAKT_NOT_LINKED: "Trakt conta não ligada.",
    TRAKT_NOT_CONFIGURED: "Trakt OO Auth não está configurado.",
    TRAKT_SYNC_FAILED: "Trakt A sincronização falhou.",
    EPISODE_NOT_FOUND: "Episódio não encontrado.",
    SEASON_NOT_FOUND: "Temporada não encontrada.",
    UNAUTHORIZED_DELETE: "Você não tem permissão para excluir este recurso.",
    ALREADY_TRACKED: "Já o localizei.",
    GOOGLE_ALREADY_LINKED: "Isto Google a conta já está ligada a outro utilizador.",
    GOOGLE_EMAIL_MISMATCH: "A Google o e-mail da conta não corresponde ao e-mail da sua conta.",
    CANNOT_UNLINK_NO_PASSWORD:
      "Você não pode desvincular Google sem uma senha definida na sua conta.",
    ACCOUNT_BANNED: "Esta conta foi banida.",
    ACCOUNT_SUSPENDED: "Esta conta está suspensa.",
    UNKNOWN: "Algo correu mal.",
    ALREADY_REPORTED: "Você já relatou este comentário.",
    REPORT_NOT_FOUND: "Relatório não encontrado.",
    CANNOT_REPORT_OWN: "Não pode denunciar o seu próprio comentário.",
    AUTH_DISABLED: "A autenticação está temporariamente desactivada.",
    MAINTENANCE_MODE: "Watchr está sob manutenção. Por favor, tente mais tarde.",
    COMMENT_REJECTED_HATE: "Seu comentário contém conteúdo odioso. Por favor, seja respeitoso.",
    COMMENT_REJECTED_HARASSMENT: "O seu comentário contém assédio. Por favor, seja respeitoso.",
    COMMENT_REJECTED_SPAM:
      "O seu comentário parece spam. Por favor escreva conteúdo significativo.",
    COMMENT_REJECTED_SELF_HARM:
      "Se estás a lutar, por favor, pede ajuda. Este conteúdo não é permitido.",
    COMMENT_REJECTED_VIOLENCE:
      "Seu comentário contém conteúdo violento. Por favor, seja respeitoso.",
    COMMENT_REJECTED_OTHER:
      "O seu comentário foi apontado como inapropriado. Por favor, reveja nossas diretrizes comunitárias.",
    EMAIL_CODE_EXPIRED: "Código expirado ou não encontrado. Por favor, peça um novo.",
    INVALID_EMAIL_CODE: "Código inválido.",
    TOO_MANY_CODE_ATTEMPTS: "Demasiadas tentativas. Por favor, solicite um novo código.",
    TOO_MANY_CODE_REQUESTS: "Muitos pedidos de código. Tenta mais tarde.",
    CODE_COOLDOWN: "Por favor, aguarde antes de solicitar outro código.",
    INVALID_MAGIC_LINK: "Ligação mágica inválida ou expirada.",
    TOO_MANY_CONTACT_REQUESTS: "Muitos pedidos de contacto. Tenta mais tarde.",
    CONTACT_NOT_FOUND: "Mensagem de contacto não encontrada.",
    CONTACT_ALREADY_REPLIED: "Esta mensagem já foi respondida.",
    RATING_COOLDOWN: "Você pode classificar novamente em {{days}} dia(s).",
    TOO_MANY_RATING_REQUESTS: "Muitos pedidos de classificação. Tenta mais tarde.",
    TOO_MANY_COMMENT_REQUESTS: "Muitos pedidos de comentários. Tenta mais tarde.",
    TOO_MANY_LIKE_REQUESTS: "Demasiados pedidos. Tenta mais tarde.",
    TOO_MANY_REACTION_REQUESTS: "Muitos pedidos de reacção. Tenta mais tarde.",
    TOO_MANY_REPORT_REQUESTS: "Muitos pedidos de relatório. Tenta mais tarde.",
    TOO_MANY_UPLOAD_REQUESTS: "Muitos pedidos de envio. Tenta mais tarde.",
    TOO_MANY_TRAKT_SYNC_REQUESTS:
      "Demasiados. Trakt Solicitações de sincronização. Tenta mais tarde.",
    TOO_MANY_AI_REQUESTS: "Muitos pedidos de IA. Tenta mais tarde.",
    REPLIES_DISABLED: "As respostas não estão disponíveis em comentários importados.",
    EMAIL_DOMAIN_BLOCKED:
      "Este domínio de email não é permitido. Por favor, use um endereço de e- mail válido.",
  },
  notifications: {
    commentReplyTitle: "Nova resposta ao seu comentário",
    commentReplyBody: "{{author}} respondeu à sua observação sobre {{show}}",
    commentReactionTitle: "Nova reação ao seu comentário",
    commentReactionBody: "{{author}} reacção {{emoji}} ao seu comentário sobre {{show}}",
    commentLikeTitle: "Novo como no seu comentário",
    commentLikeBody: "{{author}} gostou do seu comentário sobre {{show}}",
    newEpisodeTitle: "Novo episódio disponível",
    newEpisodeBody: "{{show}} — S{{season}}E{{episode}} está agora disponível",
    newReleaseTitle: "Nova versão",
    newReleaseBody: "{{show}} está agora disponível",
    newNotification: "Nova notificação",
    newArticlesAvailable: "Novos artigos disponíveis",
    banTitle: "Aviso de suspensão da conta",
    banBody: "Sua conta foi {{action}}. Razão: {{reason}}",
    actionBan: "proibido",
    actionSuspend: "suspenso",
    commentDeletedTitle: "O seu comentário foi removido",
    commentDeletedBody:
      'O seu comentário sobre "{{show}}" foi removido após vários relatórios da comunidade.',
    commentHiddenTitle: "O seu comentário foi escondido",
    commentHiddenBody:
      'O seu comentário sobre "{{show}}" foi escondido seguindo relatórios da comunidade e não é mais visível para outros usuários.',
    commentAutoSpoilerTitle: "Seu comentário foi marcado como spoiler",
    commentAutoSpoilerBody:
      'O seu comentário sobre "{{show}}" foi automaticamente marcado como um spoiler após relatórios da comunidade.',
    commentAdminSpoilerTitle: "Seu comentário foi marcado como spoiler",
    commentAdminSpoilerBody:
      'Um moderador marcou o seu comentário sobre "{{show}}" como um spoiler.',
    activationNudgeTitle: "A sua lista de vigilância está à espera.",
    activationNudgeBody:
      "Adicione alguns shows ou filmes para começar a ser notificado sobre novos episódios.",
    directMessageTitle: "Nova mensagem",
    directMessageBody: "{{sender}}: {{preview}}",
  },
  emails: {
    welcomeSubject: "Bem- vindo a Watchr!",
    welcomeHeading: "Bem- vindo a Watchr!",
    welcomeBody:
      "Olá. {{username}}, sua conta foi criada com sucesso. Comece a rastrear seus programas e filmes favoritos agora!",
    welcomeTipUsername:
      'Seu nome de usuário "{{username}}" foi gerado automaticamente. Você pode alterá-lo a qualquer momento em suas configurações de perfil.',
    welcomeTipFeatures:
      "Aqui está o que você pode fazer: acompanhar programas e filmes, avaliar episódios, participar de discussões, importar seu TV Time História, e ser notificado quando novos episódios ar.",
    welcomeCta: "Começar na web",
    welcomeFooter:
      "Você está recebendo este email porque você criou um Watchr conta. Se não foi você, pode ignorar este e-mail com segurança.",
    resetPasswordSubject: "Reinicie sua senha",
    resetPasswordHeading: "Reinicie sua senha",
    resetPasswordBody:
      "Pediu uma nova senha. Clique no botão abaixo para escolher uma nova senha. Este link expira em 15 minutos.",
    resetPasswordTipSecurity:
      "Escolha uma senha forte e única. Não reutilize um de outro serviço. Nunca partilhe esta ligação com ninguém — Watchr O pessoal nunca o pedirá.",
    resetPasswordCta: "Reiniciar senha",
    resetPasswordFooter:
      "Se você não solicitou esse reset, ignore este e-mail — sua senha não vai mudar. Contacte o suporte se isto continuar a acontecer.",
    banSubject: "Sua Watchr conta foi suspensa",
    banHeading: "Aviso de suspensão da conta",
    banBody:
      "Olá. {{username}}, sua conta foi {{action}}. Razão: {{reason}}Esta acção produzirá efeitos sobre {{effectiveDate}}.",
    banSuspendedUntil: "Sua conta será reintegrada em {{date}}.",
    banTipAppeal:
      "Se você acredita que esta decisão está incorreta, você pode apelar contatando nossa equipe de suporte. Por favor, inclua seu nome de usuário e qualquer contexto relevante.",
    banFooter:
      "Revise nossas diretrizes comunitárias em https://watchr.me/community-guidelines. Se você acredita que isso é um erro, entre em contato com o suporte.",
    commentDeletedSubject: "O seu comentário sobre Watchr foi removido",
    commentDeletedHeading: "Comentário removido",
    commentDeletedBody:
      'Olá. {{username}}, o seu comentário sobre "{{show}}" foi removido após vários relatórios do Watchr comunidade. Nós encorajamos você a rever nossas diretrizes comunitárias antes de postar novamente.',
    commentDeletedTip:
      "Você pode postar um novo comentário, desde que siga nossas diretrizes comunitárias. Seja respeitoso e evite spoilers sem marcação adequada.",
    commentDeletedFooter:
      "Revise nossas diretrizes comunitárias em https://watchr.me/community-guidelines. Se você acredita que isso foi um erro, entre em contato com o suporte.",
    commentHiddenSubject: "O seu comentário sobre Watchr foi escondido",
    commentHiddenHeading: "Comentário oculto",
    commentHiddenBody:
      'Olá. {{username}}, o seu comentário sobre "{{show}}" foi escondido seguindo relatórios de outros usuários. Já não é visível para a comunidade. Violações repetidas podem levar a novas ações por sua conta.',
    commentHiddenTip:
      "Você pode editar seu comentário para se alinhar com nossas diretrizes. Uma vez atualizado, ele será revisto e pode ser tornado visível novamente.",
    commentHiddenFooter:
      "Revise nossas diretrizes comunitárias em https://watchr.me/community-guidelines. Se você acredita que isso foi um erro, entre em contato com o suporte.",
    commentSpoilerSubject: "Seu comentário foi marcado como spoiler",
    commentSpoilerHeading: "Marca de spoiler adicionada ao seu comentário",
    commentSpoilerBody:
      'Olá. {{username}}, o seu comentário sobre "{{show}}" foi marcado como um spoiler após relatórios da comunidade. Por favor, lembre-se de usar a etiqueta spoiler ao discutir detalhes do enredo.',
    commentSpoilerTip:
      "Para marcar um spoiler, use o botão spoiler ao escrever seu comentário ou envolver texto sensível com a tag spoiler. Isto mantém a experiência comunitária agradável para todos.",
    commentSpoilerFooter:
      "Revise nossas diretrizes comunitárias em https://watchr.me/community-guidelines. Se você acredita que isso foi um erro, entre em contato com o suporte.",
    emailCodeSubject: "Sua Watchr código de entrada",
    emailCodeHeading: "Iniciar sessão em Watchr",
    emailCodeBody:
      "Use o código abaixo para entrar na sua conta. Este código expira em 15 minutos.",
    emailCodeLabel: "O seu código de entrada:",
    emailCodeCta: "Iniciar sessão",
    emailCodeTipSecurity:
      "Nunca partilhe este código com ninguém. Watchr O pessoal nunca o pedirá.",
    emailCodeFooter:
      "Se você não solicitou este código, ignore este e-mail. A tua conta está segura.",
  },
  websocket: {
    reconnecting: "Reconectando...",
    connected: "Ligado",
    disconnected: "Desligado",
  },
  widgets: {
    upNext: {
      noEpisode: "Nenhum episódio",
      title: "SEGUINTE",
    },
  },
  discover: {
    trendingTv: "Programas de TV de tendências",
    trendingMovies: "Trending Filmes",
    popularTv: "Programas de TV populares",
    popularMovies: "Filmes populares",
  },
  welcomeMessage: {
    content:
      "Bem- vindo a Watchr!\n\nAcompanhe seus programas favoritos, descubra novos e se conecte com amigos. Aqui estão algumas coisas que você pode fazer:\n\n• Adicionar mostras à sua lista de observação\n• Taxa e comentário sobre episódios\n• Siga os amigos para ver sua atividade\n\nSe tiver alguma pergunta, basta responder a esta mensagem!",
  },
  recommendations: {
    fallbackReason: "Evolução actual",
  },
};

export default pt;
