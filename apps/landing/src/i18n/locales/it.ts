const it = {
  nav: {
    home: "Home",
    features: "Funzionalità",
    import: "Importa",
    showcase: "Screenshot",
    faq: "FAQ",
    docs: "Docs API",
    getStarted: "Inizia",
  },
  hero: {
    badge: "Novità — Import TV Time disponibile",
    title: "Traccia le tue serie TV e film",
    subtitle: "Watchr è un tracker moderno per serie TV e film. Traccia il tuo stato di visione, valuta gli episodi, scopri nuovi contenuti e importa i tuoi dati da TV Time.",
    ctaDownload: "Scarica dal Play Store",
    ctaWeb: "Prova la web app",
    statsShows: "Serie tracciate",
    statsUsers: "Utenti attivi",
    statsRatings: "Valutazioni",
  },
  features: {
    title: "Tutto ciò che serve per tracciare le tue serie",
    subtitle: "Un'esperienza di tracking completa con funzionalità potenti per appassionati di serie TV e film.",
    items: {
      tracking: {
        title: "Traccia lo stato",
        description: "Marca le serie come: in corso, completata, da guardare o abbandonata. Traccia il progresso episodio per episodio con un tocco.",
      },
      ratings: {
        title: "Valuta episodi e serie",
        description: "Dai valutazioni personali a serie ed episodi individuali. Vedi le medie della community e confronta i tuoi gusti.",
      },
      comments: {
        title: "Commenti e reazioni",
        description: "Discuti gli episodi con una community di fan. Reagisci con emoji, marca spoiler e rispondi ai thread.",
      },
      search: {
        title: "Ricerca intelligente",
        description: "Basata su TMDB, trova istantaneamente qualsiasi serie o film. Ottieni raccomandazioni personalizzate e titoli simili.",
      },
      news: {
        title: "Notizie e scoperta",
        description: "Resta aggiornato con le ultime notizie sulle tue serie preferite, prossime uscite e tendenze.",
      },
      social: {
        title: "Attività degli amici",
        description: "Vedi cosa guardano i tuoi amici, le loro valutazioni e scopri nuove serie attraverso la tua rete.",
      },
    },
  },
  importSection: {
    title: "Importa i tuoi dati in secondi",
    subtitle: "Arrivi da un'altra piattaforma? Watchr rende facile migrare tutta la tua libreria senza perdere lo storico.",
    platforms: {
      tvtime: {
        name: "TV Time",
        description: "Importa il tuo file zip di esportazione GDPR con completo storico e valutazioni.",
      },
      trakt: {
        name: "Trakt",
        description: "Collega il tuo account Trakt o importa il tuo export JSON con sincronizzazione automatica.",
      },
      imdb: {
        name: "IMDb",
        description: "Importa la tua watchlist e valutazioni dal tuo export CSV.",
      },
      letterboxd: {
        name: "Letterboxd",
        description: "Importa il tuo diario dei film e valutazioni dal tuo export CSV.",
      },
    },
    cta: "Importa ora",
    note: "I tuoi dati rimangono privati. Le importazioni sono elaborate localmente sul tuo dispositivo.",
  },
  showcase: {
    title: "Un'esperienza bellissima su ogni dispositivo",
    subtitle: "Progettato con cura per mobile e web. Modalità scura, animazioni fluide e navigazione intuitiva.",
    screens: {
      library: "La tua libreria",
      libraryDesc: "Tutte le tue serie organizzate per stato con tracciamento del progresso",
      detail: "Dettagli della serie",
      detailDesc: "Cast, troupe, episodi, valutazioni e serie simili in un'unica vista",
      comments: "Commenti",
      commentsDesc: "Discuti con i fan, reagisci con emoji, marca spoiler",
      search: "Ricerca intelligente",
      searchDesc: "Trova qualsiasi serie o film con la ricerca basata su TMDB",
    },
  },
  stats: {
    title: "Scelto da migliaia di spettatori",
    subtitle: "Unisciti a una community crescente di appassionati di serie TV e film.",
    items: {
      shows: { value: "50K+", label: "Serie e film" },
      users: { value: "12K+", label: "Utenti attivi" },
      ratings: { value: "250K+", label: "Valutazioni inviate" },
      languages: { value: "7", label: "Lingue supportate" },
    },
  },
  testimonials: {
    title: "Amato dai fan delle serie",
    subtitle: "Scopri cosa dice la nostra community di Watchr.",
    items: {
      one: {
        name: "Sarah K.",
        role: "Binge watcher",
        quote: "Finalmente un tracker che non sembra sovraccarico. L'importazione da TV Time è stata fluida e non ho perso nessuno storico.",
      },
      two: {
        name: "Marcus T.",
        role: "Appassionato di cinema",
        quote: "Il sistema di valutazione è esattamente ciò che volevo. Poter valutare singoli episodi e vedere le medie della community cambia tutto.",
      },
      three: {
        name: "Elena R.",
        role: "Dipendente da serie",
        quote: "Interfaccia bellissima, modalità scura di default, e la sezione commenti sembra una vera community. Meglio di qualsiasi altro tracker.",
      },
    },
  },
  faq: {
    title: "Domande frequenti",
    subtitle: "Tutto ciò che devi sapere su Watchr.",
    items: {
      free: {
        question: "Watchr è gratuito?",
        answer: "Sì, Watchr è completamente gratuito. Tutte le funzionalità principali inclusi tracking, valutazioni, commenti e importazioni sono disponibili senza costi.",
      },
      import: {
        question: "Posso importare i miei dati da TV Time?",
        answer: "Assolutamente. Watchr supporta l'importazione del tuo export GDPR da TV Time. Scarica semplicemente i tuoi dati da TV Time e carica il file zip nell'app. Il tuo storico completo e le valutazioni saranno importati automaticamente.",
      },
      platforms: {
        question: "Quali piattaforme sono supportate per l'importazione?",
        answer: "Attualmente supportiamo l'importazione da TV Time, Trakt, IMDb e Letterboxd. Stiamo costantemente lavorando per aggiungere altre piattaforme.",
      },
      privacy: {
        question: "I miei dati sono privati?",
        answer: "La tua privacy è la nostra priorità. I file di importazione sono elaborati in modo sicuro e non condividiamo mai i tuoi dati personali con terze parti. Puoi eliminare il tuo account e tutti i dati associati in qualsiasi momento.",
      },
      account: {
        question: "Ho bisogno di un account per usare Watchr?",
        answer: "Sì, è richiesto un account per sincronizzare i tuoi dati di tracking tra dispositivi. Puoi registrarti con email o Google. I tuoi dati sono sincronizzati in modo sicuro in tempo reale.",
      },
      web: {
        question: "C'è una versione web?",
        answer: "Sì! Watchr è disponibile come web app su app.watchr.me. Funziona su browser desktop e mobile, con piena parità di funzionalità con l'app mobile.",
      },
      languages: {
        question: "Quali lingue sono supportate?",
        answer: "Watchr è disponibile in 7 lingue: inglese, francese, arabo, tedesco, spagnolo, italiano e portoghese. L'app rileva automaticamente la lingua del tuo dispositivo.",
      },
    },
  },
  apiTeaser: {
    badge: "API pubblica e MCP",
    title: "Collega la tua watchlist a qualsiasi cosa",
    subtitle: "Watchr espone un'API REST pubblica e un server MCP. Cerca serie, gestisci la tua watchlist programmaticamente o connetti Claude direttamente ai tuoi dati Watchr.",
    codeSearchTitle: "Cerca serie tramite API",
    codeSearchDesc: "Una semplice richiesta curl per cercare serie",
    codeMcpTitle: "Connetti Claude tramite MCP",
    codeMcpDesc: "Aggiungi Watchr alla tua configurazione MCP",
    cta: "Vedi la documentazione completa",
  },
  cta: {
    title: "Pronto per iniziare a tracciare?",
    subtitle: "Unisciti a migliaia di spettatori che non perdono mai il filo delle loro serie.",
    button: "Inizia gratis",
    secondary: "Esplora le funzionalità",
  },
  footer: {
    tagline: "Traccia le tue serie e film con eleganza.",
    links: {
      product: "Prodotto",
      features: "Funzionalità",
      import: "Importa",
      docs: "Docs API",
      webApp: "Web App",
      company: "Azienda",
      about: "Chi siamo",
      privacy: "Informativa sulla privacy",
      terms: "Termini di servizio",
    },
    copyright: "© {{year}} Watchr. Tutti i diritti riservati.",
    madeWith: "Fatto con passione per fan di serie e film.",
  },
  theme: {
    light: "Modalità chiara",
    dark: "Modalità scura",
  },
  language: {
    label: "Lingua",
  },
  about: {
    metaTitle: "Su Watchr — La nostra missione e valori",
    metaDescription: "Scopri Watchr, il tracker moderno di serie TV e film sviluppato da ArquiTech.",
    title: "Su Watchr",
    intro: "Watchr è un tracker moderno per serie TV e film, progettato e sviluppato da ArquiTech. Nato dalla frustrazione verso le app di tracking esistenti — troppo cariche, troppo limitate o troppo disordinate — Watchr mira ad essere il perfetto equilibrio tra semplicità, potenza e design elegante.",
    values: {
      mission: {
        title: "La Nostra Missione",
        description: "Offrire la migliore esperienza di tracking per gli appassionati di serie TV e film — veloce, bella e rispettosa della tua privacy.",
      },
      passion: {
        title: "Guidato dalla Passione",
        description: "Watchr è creato da fan, per fan. Ogni funzionalità è pensata per le reali esigenze di binge-watcher e cinefili.",
      },
      simplicity: {
        title: "Semplicità Prima di Tutto",
        description: "Niente peso inutile, niente eccessi. Solo un'interfaccia pulita e intuitiva che ti permette di tracciare le tue serie senza intralci.",
      },
      community: {
        title: "Centrato sulla Community",
        description: "Commenti, reazioni e valutazioni condivise rendono Watchr un'esperienza sociale. Scopri nuove serie tramite i tuoi amici.",
      },
    },
    company: {
      title: "ArquiTech",
      description: "Watchr è un marchio di ArquiTech, un'azienda tecnologica focalizzata sulla creazione di applicazioni belle e centrate sull'utente. ArquiTech sviluppa e mantiene Watchr su piattaforme mobile, web e backend.",
    },
  },
  privacy: {
    metaTitle: "Informativa sulla Privacy — Watchr",
    metaDescription: "Scopri come Watchr raccoglie, utilizza e protegge i tuoi dati personali.",
    title: "Informativa sulla Privacy",
    lastUpdated: "Ultimo aggiornamento: Luglio 2026",
    intro: "Questa Informativa sulla Privacy spiega come ArquiTech (\"noi\") raccoglie, utilizza e protegge le tue informazioni personali quando utilizzi Watchr (il \"Servizio\"). Utilizzando il Servizio, accetti le pratiche descritte in questa informativa.",
    sections: {
      dataCollection: {
        title: "Dati che Raccogliamo",
        content: "Raccogliamo i seguenti dati: (1) Informazioni account — email e nome visualizzato. (2) Dati di tracking — stato di visione, valutazioni e commenti. (3) Dati di importazione — file caricati da TV Time, Trakt, IMDb o Letterboxd. (4) Dati di utilizzo — analitiche anonimizzate. Non raccogliamo informazioni di pagamento poiché il Servizio è gratuito.",
      },
      dataUse: {
        title: "Come Utilizziamo i Tuoi Dati",
        content: "I tuoi dati vengono utilizzati per: (1) Fornire e mantenere il Servizio. (2) Sincronizzare i dati di tracking tra dispositivi. (3) Mostrare valutazioni e commenti della community. (4) Migliorare e ottimizzare il Servizio. (5) Inviare notifiche importanti. Non vendiamo mai i tuoi dati personali a terzi.",
      },
      dataStorage: {
        title: "Archiviazione e Sicurezza",
        content: "I tuoi dati sono archiviati in database sicuri ospitati da provider affidabili. Le password sono hashate con algoritmi standard del settore. Tutte le comunicazioni tra l'app e i nostri server sono crittografate via HTTPS. L'accesso ai database di produzione è limitato al personale autorizzato di ArquiTech.",
      },
      dataSharing: {
        title: "Condivisione dei Dati",
        content: "Non condividiamo i tuoi dati personali con terzi tranne: (1) Quando richiesto dalla legge. (2) Con i nostri provider di hosting e analitica sotto rigidi accordi di riservatezza. (3) Dati aggregati e anonimizzati possono essere utilizzati per scopi statistici.",
      },
      userRights: {
        title: "I Tuoi Diritti (GDPR)",
        content: "Ai sensi del GDPR, hai diritto a: (1) Accedere ai tuoi dati personali. (2) Richiedere la correzione di dati inesatti. (3) Richiedere la cancellazione del tuo account e di tutti i dati associati. (4) Esportare i tuoi dati in un formato portabile. (5) Opporti a determinati trattamenti. Per esercitare questi diritti, contattaci su contact@arquitech.com.",
      },
      cookies: {
        title: "Cookie e Archiviazione Locale",
        content: "Watchr utilizza l'archiviazione locale per salvare le preferenze di lingua, tema e i token di autenticazione. Non utilizziamo cookie di tracciamento per scopi pubblicitari. Le analitiche sono raccolte in modo anonimo e aggregato.",
      },
      contact: {
        title: "Contattaci",
        content: "Per domande su questa Informativa sulla Privacy, contattaci su: ArquiTech — contact@arquitech.com.",
      },
    },
  },
  terms: {
    metaTitle: "Termini di Servizio — Watchr",
    metaDescription: "I termini e condizioni per l'utilizzo di Watchr.",
    title: "Termini di Servizio",
    lastUpdated: "Ultimo aggiornamento: Luglio 2026",
    intro: "Questi Termini di Servizio (\"Termini\") regolano l'utilizzo di Watchr (il \"Servizio\"), gestito da ArquiTech. Utilizzando il Servizio, accetti questi Termini. Se non sei d'accordo, ti preghiamo di non utilizzare il Servizio.",
    sections: {
      acceptance: {
        title: "Accettazione dei Termini",
        content: "Creando un account o utilizzando il Servizio, riconosci di aver letto, compreso e accettato di essere vincolato da questi Termini.",
      },
      useOfService: {
        title: "Uso del Servizio",
        content: "Watchr è un servizio gratuito per uso personale e non commerciale. Puoi utilizzare il Servizio per tracciare serie TV e film, valutare contenuti e interagire con la community. Accetti di non fare cattivo uso del Servizio né di utilizzarlo per scopi illegali.",
      },
      accounts: {
        title: "Account",
        content: "Devi fornire informazioni accurate e complete durante la creazione dell'account. Sei responsabile della sicurezza del tuo account e password. ArquiTech non è responsabile di perdite o danni derivanti da accesso non autorizzato al tuo account.",
      },
      intellectualProperty: {
        title: "Proprietà Intellettuale",
        content: "Il Servizio, inclusi design, codice e branding, è di proprietà intellettuale di ArquiTech. I metadati di serie e film provengono da TMDB secondo i loro termini di utilizzo. I contenuti generati dagli utenti rimangono di proprietà degli utenti, ma concedi ad ArquiTech una licenza per visualizzarli nel Servizio.",
      },
      prohibitedConduct: {
        title: "Condotta Vietata",
        content: "Accetti di non: (1) Pubblicare contenuti abusivi, d'odio o spam. (2) Impersonare un'altra persona. (3) Tentare di hackerare, interrompere o fare reverse engineering del Servizio. (4) Utilizzare bot o script automatizzati. (5) Condividere spoiler senza un'adeguata segnalazione.",
      },
      disclaimer: {
        title: "Esclusione di Garanzie",
        content: "Il Servizio è fornito \"così com'è\" senza garanzie di alcun tipo. Non garantiamo che il Servizio sarà ininterrotto, privo di errori o sicuro. L'utilizzo del Servizio è a tuo rischio.",
      },
      limitation: {
        title: "Limitazione di Responsabilità",
        content: "ArquiTech non sarà responsabile per danni indiretti, incidentali, speciali o consequenziali derivanti dall'utilizzo del Servizio, inclusi ma non limitati a perdita di dati, profitti o reputazione.",
      },
      termination: {
        title: "Risoluzione",
        content: "Ci riserviamo il diritto di sospendere o terminare il tuo account in qualsiasi momento per violazione di questi Termini. Puoi eliminare il tuo account in qualsiasi momento dalle impostazioni dell'app.",
      },
      governingLaw: {
        title: "Legge Applicabile",
        content: "Questi Termini sono regolati dalle leggi di Francia. Le controversie saranno risolte nei tribunali di Francia.",
      },
      contact: {
        title: "Contattaci",
        content: "Per domande su questi Termini, contattaci su: ArquiTech — contact@arquitech.com.",
      },
    },
  },
  docs: {
    metaTitle: "Documentazione API — Watchr",
    metaDescription: "Documentazione completa dell'API pubblica v1 di Watchr e dell'integrazione del server MCP.",
    intro: {
      title: "Documentazione API",
      description: "Watchr fornisce un'API REST pubblica (v1) e un server MCP che ti permettono di cercare serie, gestire la tua watchlist e integrare Watchr con strumenti esterni come Claude.",
      getKeyTitle: "Ottieni la tua chiave API",
      getKeyDescription: "Per usare l'API, hai bisogno di una chiave API. Generane una dal tuo profilo nell'app Watchr. La tua chiave supporta scope di lettura e/o scrittura a seconda di ciò che hai selezionato durante la creazione.",
      getKeyCta: "Apri l'app Watchr",
    },
    auth: {
      title: "Autenticazione",
      description: "Tutte le richieste API richiedono una chiave API passata nell'header Authorization. Le chiavi hanno il prefisso wtc_ e supportano due scope: read e write.",
      headerTitle: "Header Authorization",
      headerDescription: "Passa la tua chiave API come token Bearer in ogni richiesta:",
      scopeReadTitle: "scope read",
      scopeReadDescription: "Permette di cercare serie e elencare la tua watchlist. Gli endpoint di lettura sono limitati a 60 richieste al minuto.",
      scopeWriteTitle: "scope write",
      scopeWriteDescription: "Permette di aggiungere, aggiornare e rimuovere elementi dalla tua watchlist. Gli endpoint di scrittura sono limitati a 20 richieste al minuto.",
      exampleTitle: "Esempio di richiesta autenticata",
    },
    endpoints: {
      title: "Endpoint API pubblica v1",
      description: "Tutti gli endpoint sono disponibili su https://api.watchr.me/api/public/v1. Ogni endpoint richiede uno scope specifico.",
      requestLabel: "Richiesta",
      responseLabel: "Risposta",
      noContent: "Nessun contenuto restituito in caso di successo.",
      search: {
        title: "Cerca serie",
        description: "Cerca serie TV e film per titolo. Restituisce risultati da TMDB inclusi ID TMDB, titoli, percorsi dei poster e trame. Il parametro q è obbligatorio (1-200 caratteri).",
      },
      getWatchlist: {
        title: "Elenca watchlist",
        description: "Recupera la watchlist dell'utente autenticato con paginazione. Parametri opzionali: page (predefinito 1), limit (predefinito 20, max 100), status (watching, completed, plan_to_watch, dropped).",
      },
      postWatchlist: {
        title: "Aggiungi alla watchlist",
        description: "Aggiungi una serie o un film alla watchlist tramite ID TMDB. La serie viene sincronizzata automaticamente da TMDB se non è già in cache. Le nuove voci hanno lo stato predefinito plan_to_watch. Corpo della richiesta: { tmdbId: number, type: \"tv\" | \"movie\" }.",
      },
      patchWatchlist: {
        title: "Aggiorna stato di visione",
        description: "Aggiorna lo stato di visione di un elemento nella watchlist. Il parametro :id è l'ObjectId del Show. Il corpo della richiesta può includere: status, watchedEpisodes, currentSeason, currentEpisode.",
      },
      deleteWatchlist: {
        title: "Rimuovi dalla watchlist",
        description: "Rimuove permanentemente un elemento dalla watchlist. Il parametro :id è l'ObjectId del Show. Restituisce 204 No Content in caso di successo.",
      },
    },
    rateLimit: {
      title: "Limitazione di frequenza",
      description: "Le richieste API sono limitate per chiave API. I limiti sono applicati separatamente per operazioni di lettura e scrittura.",
      readUnit: "rich/min",
      readDescription: "Endpoint GET (ricerca, elenco watchlist)",
      writeUnit: "rich/min",
      writeDescription: "Endpoint POST, PATCH, DELETE (modifiche watchlist)",
      errorTitle: "Limite di frequenza superato",
      errorDescription: "Quando superi il limite, l'API risponde con HTTP 429 e un corpo di errore. Le intestazioni di limite (RateLimit-Limit, RateLimit-Remaining) sono incluse in tutte le risposte.",
    },
    mcp: {
      title: "Server MCP",
      description: "Watchr fornisce un server MCP (Model Context Protocol) che permette agli assistenti IA come Claude di interagire direttamente con la tua watchlist. L'endpoint MCP è disponibile su https://api.watchr.me/mcp.",
      setupTitle: "Configurazione",
      step1: "Genera una chiave API nel tuo",
      step1Link: "profilo Watchr",
      step2: "Aggiungi il server MCP Watchr al tuo file di configurazione di Claude (claude_desktop_config.json o equivalente).",
      step3: "Riavvia Claude. Gli strumenti Watchr appariranno nell'elenco degli strumenti disponibili.",
      configTitle: "Configurazione MCP",
      toolsTitle: "Strumenti disponibili",
      tools: {
        search_show: "Cerca serie TV e film per titolo. Restituisce risultati con ID TMDB, titoli e metadati.",
        list_watchlist: "Elenca la watchlist dell'utente con supporto alla paginazione. Restituisce voci di tracciamento con dettagli delle serie.",
        add_to_watchlist: "Aggiungi una serie o un film alla watchlist tramite ID TMDB e tipo (tv o movie).",
        update_watch_status: "Aggiorna lo stato di visione di un elemento nella watchlist tramite il suo ID. Lo stato può essere watching, completed, plan_to_watch o dropped.",
        remove_from_watchlist: "Rimuovi una serie dalla watchlist tramite il suo ID.",
      },
    },
  },
};

export default it;
