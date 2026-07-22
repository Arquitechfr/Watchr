import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

const MCP_TOOLS_TABLE = [
  { tool: "search_show", input: "search query", output: "show metadata (title, TMDB ID, type, poster)" },
  { tool: "list_watchlist", input: "page, limit", output: "paginated watchlist with show details" },
  { tool: "add_to_watchlist", input: "TMDB ID, type (tv/movie)", output: "confirmation with watchlist entry" },
  { tool: "update_watch_status", input: "show ID, status", output: "updated watchlist entry" },
  { tool: "remove_from_watchlist", input: "show ID", output: "deletion confirmation" },
  { tool: "toggle_episode", input: "show ID, season, episode, watched", output: "updated episode progress" },
  { tool: "mark_episodes_up_to", input: "show ID, season, episode, includePrevious", output: "updated episode progress" },
  { tool: "get_show_details", input: "TMDB ID", output: "detailed show metadata (seasons, episodes, genres)" },
  { tool: "rate_show", input: "show ID, rating (1-5), optional season/episode, optional review", output: "updated rating and community ratings" },
  { tool: "get_ratings", input: "show ID", output: "user and community ratings for the show" },
  { tool: "list_comments", input: "show ID, optional season/episode, pagination, sort", output: "paginated public comments" },
  { tool: "add_comment", input: "show ID, comment text, optional season/episode, spoiler flag", output: "created comment" },
  { tool: "get_upcoming", input: "none", output: "upcoming episodes from watchlist shows" },
  { tool: "get_stats", input: "none", output: "viewing statistics (episodes watched, hours, streak, genres)" },
  { tool: "get_recommendations", input: "none", output: "personalized show recommendations" },
];

export function PrivacyPage() {
  const { t } = useTranslation();

  const sections = [
    "dataCollection",
    "dataUse",
    "legalBasis",
    "dataSharing",
    "dataRetention",
    "aiIntegration",
    "mcpTools",
    "dataStorage",
    "userRights",
    "cookies",
    "childrenPrivacy",
    "internationalTransfers",
    "contact",
  ] as const;

  return (
    <>
      <Helmet>
        <title>{t("privacy.metaTitle")}</title>
        <meta name="description" content={t("privacy.metaDescription")} />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            {t("privacy.title")}
          </h1>
          <p className="mt-4 text-sm text-text-muted">
            {t("privacy.lastUpdated")}
          </p>

          <div className="mt-8 space-y-4 text-text-muted">
            <p className="text-base leading-relaxed">{t("privacy.intro")}</p>

            {sections.map((key, index) => (
              <div key={key} className="pt-6">
                <h2 className="text-lg font-semibold text-text">
                  {index + 1}. {t(`privacy.sections.${key}.title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed">
                  {t(`privacy.sections.${key}.content`)}
                </p>

                {key === "mcpTools" && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 pr-4 text-left font-semibold text-text">Tool</th>
                          <th className="py-2 pr-4 text-left font-semibold text-text">Data received (input)</th>
                          <th className="py-2 text-left font-semibold text-text">Data returned (output)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MCP_TOOLS_TABLE.map((row) => (
                          <tr key={row.tool} className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono text-xs text-text">{row.tool}</td>
                            <td className="py-2 pr-4 text-text-muted">{row.input}</td>
                            <td className="py-2 text-text-muted">{row.output}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
