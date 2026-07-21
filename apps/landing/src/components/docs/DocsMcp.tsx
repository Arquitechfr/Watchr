import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wrench, ExternalLink, KeyRound, LogIn } from "lucide-react";
import { CodeBlock } from "@/components/shared/CodeBlock";

const MCP_CONFIG = `{
  "mcpServers": {
    "watchr": {
      "url": "https://api.watchr.me/mcp",
      "headers": {
        "Authorization": "Bearer wtc_your_api_key"
      }
    }
  }
}`;

const MCP_CONFIG_OAUTH = `{
  "mcpServers": {
    "watchr": {
      "url": "https://api.watchr.me/mcp/oauth"
    }
  }
}`;

type AuthTab = "apiKey" | "oauth";

interface McpToolParam {
  name: string;
  type: string;
  required: boolean;
  descKey: string;
}

interface McpTool {
  name: string;
  scope: "read" | "write";
  descKey: string;
  params?: McpToolParam[];
  responseExample?: string;
}

const MCP_TOOLS: McpTool[] = [
  {
    name: "search_show",
    scope: "read",
    descKey: "docs.mcp.tools.search_show",
    params: [
      { name: "query", type: "string", required: true, descKey: "docs.mcp.tools.search_show.params.query" },
    ],
    responseExample: `{
  "content": [
    { "type": "text", "text": "{\\"results\\":[{\\"tmdbId\\":1396,\\"type\\":\\"tv\\",\\"title\\":\\"Breaking Bad\\"}]}" }
  ]
}`,
  },
  {
    name: "list_watchlist",
    scope: "read",
    descKey: "docs.mcp.tools.list_watchlist",
    params: [
      { name: "page", type: "number", required: false, descKey: "docs.mcp.tools.list_watchlist.params.page" },
      { name: "limit", type: "number", required: false, descKey: "docs.mcp.tools.list_watchlist.params.limit" },
    ],
  },
  {
    name: "add_to_watchlist",
    scope: "write",
    descKey: "docs.mcp.tools.add_to_watchlist",
    params: [
      { name: "tmdbId", type: "number", required: true, descKey: "docs.mcp.tools.add_to_watchlist.params.tmdbId" },
      { name: "type", type: "\"tv\" | \"movie\"", required: true, descKey: "docs.mcp.tools.add_to_watchlist.params.type" },
    ],
  },
  {
    name: "update_watch_status",
    scope: "write",
    descKey: "docs.mcp.tools.update_watch_status",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.update_watch_status.params.showId" },
      { name: "status", type: "WatchStatus", required: true, descKey: "docs.mcp.tools.update_watch_status.params.status" },
    ],
  },
  {
    name: "remove_from_watchlist",
    scope: "write",
    descKey: "docs.mcp.tools.remove_from_watchlist",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.remove_from_watchlist.params.showId" },
    ],
  },
  {
    name: "toggle_episode",
    scope: "write",
    descKey: "docs.mcp.tools.toggle_episode",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.toggle_episode.params.showId" },
      { name: "season", type: "number", required: true, descKey: "docs.mcp.tools.toggle_episode.params.season" },
      { name: "episode", type: "number", required: true, descKey: "docs.mcp.tools.toggle_episode.params.episode" },
      { name: "watched", type: "boolean", required: true, descKey: "docs.mcp.tools.toggle_episode.params.watched" },
    ],
  },
  {
    name: "mark_episodes_up_to",
    scope: "write",
    descKey: "docs.mcp.tools.mark_episodes_up_to",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.mark_episodes_up_to.params.showId" },
      { name: "season", type: "number", required: true, descKey: "docs.mcp.tools.mark_episodes_up_to.params.season" },
      { name: "episode", type: "number", required: true, descKey: "docs.mcp.tools.mark_episodes_up_to.params.episode" },
      { name: "includePrevious", type: "boolean", required: false, descKey: "docs.mcp.tools.mark_episodes_up_to.params.includePrevious" },
    ],
  },
  {
    name: "get_show_details",
    scope: "read",
    descKey: "docs.mcp.tools.get_show_details",
    params: [
      { name: "tmdbId", type: "number", required: true, descKey: "docs.mcp.tools.get_show_details.params.tmdbId" },
    ],
  },
  {
    name: "rate_show",
    scope: "write",
    descKey: "docs.mcp.tools.rate_show",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.rate_show.params.showId" },
      { name: "value", type: "number", required: true, descKey: "docs.mcp.tools.rate_show.params.value" },
      { name: "season", type: "number", required: false, descKey: "docs.mcp.tools.rate_show.params.season" },
      { name: "episode", type: "number", required: false, descKey: "docs.mcp.tools.rate_show.params.episode" },
      { name: "review", type: "string", required: false, descKey: "docs.mcp.tools.rate_show.params.review" },
    ],
  },
  {
    name: "get_ratings",
    scope: "read",
    descKey: "docs.mcp.tools.get_ratings",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.get_ratings.params.showId" },
    ],
  },
  {
    name: "list_comments",
    scope: "read",
    descKey: "docs.mcp.tools.list_comments",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.list_comments.params.showId" },
      { name: "season", type: "number", required: false, descKey: "docs.mcp.tools.list_comments.params.season" },
      { name: "episode", type: "number", required: false, descKey: "docs.mcp.tools.list_comments.params.episode" },
      { name: "page", type: "number", required: false, descKey: "docs.mcp.tools.list_comments.params.page" },
      { name: "limit", type: "number", required: false, descKey: "docs.mcp.tools.list_comments.params.limit" },
      { name: "sort", type: "string", required: false, descKey: "docs.mcp.tools.list_comments.params.sort" },
    ],
  },
  {
    name: "add_comment",
    scope: "write",
    descKey: "docs.mcp.tools.add_comment",
    params: [
      { name: "showId", type: "string", required: true, descKey: "docs.mcp.tools.add_comment.params.showId" },
      { name: "content", type: "string", required: true, descKey: "docs.mcp.tools.add_comment.params.content" },
      { name: "season", type: "number", required: false, descKey: "docs.mcp.tools.add_comment.params.season" },
      { name: "episode", type: "number", required: false, descKey: "docs.mcp.tools.add_comment.params.episode" },
      { name: "isSpoiler", type: "boolean", required: false, descKey: "docs.mcp.tools.add_comment.params.isSpoiler" },
    ],
  },
  {
    name: "get_upcoming",
    scope: "read",
    descKey: "docs.mcp.tools.get_upcoming",
  },
  {
    name: "get_stats",
    scope: "read",
    descKey: "docs.mcp.tools.get_stats",
  },
  {
    name: "get_recommendations",
    scope: "read",
    descKey: "docs.mcp.tools.get_recommendations",
  },
];

export function DocsMcp() {
  const { t } = useTranslation();
  const [authTab, setAuthTab] = useState<AuthTab>("apiKey");

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.mcp.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.mcp.description")}
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex gap-2 rounded-xl border border-border bg-surface p-1.5">
          <button
            onClick={() => setAuthTab("apiKey")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              authTab === "apiKey"
                ? "bg-primary text-white"
                : "text-text-muted hover:text-text"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            {t("docs.mcp.tabApiKey")}
          </button>
          <button
            onClick={() => setAuthTab("oauth")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              authTab === "oauth"
                ? "bg-primary text-white"
                : "text-text-muted hover:text-text"
            }`}
          >
            <LogIn className="h-4 w-4" />
            {t("docs.mcp.tabOAuth")}
          </button>
        </div>

        {authTab === "apiKey" && (
          <>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-base font-semibold text-text">
                {t("docs.mcp.setupTitle")}
              </h3>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    1
                  </span>
                  <span className="text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.step1")}
                    <a
                      href="https://app.watchr.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary transition-colors hover:text-primary-dark"
                    >
                      {t("docs.mcp.step1Link")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    2
                  </span>
                  <span className="text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.step2")}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    3
                  </span>
                  <span className="text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.step3")}
                  </span>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">
                {t("docs.mcp.configTitle")}
              </h3>
              <CodeBlock code={MCP_CONFIG} language="JSON" />
            </div>
          </>
        )}

        {authTab === "oauth" && (
          <>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-base font-semibold text-text">
                {t("docs.mcp.oauthTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {t("docs.mcp.oauthDescription")}
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-surface-light/30 p-4">
                  <h4 className="text-sm font-semibold text-text">ChatGPT</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.oauthSetupChatGPT")}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-light/30 p-4">
                  <h4 className="text-sm font-semibold text-text">Claude</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.oauthSetupClaude")}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-light/30 p-4">
                  <h4 className="text-sm font-semibold text-text">{t("docs.mcp.oauthSetupGenericTitle")}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {t("docs.mcp.oauthSetupGeneric")}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm leading-relaxed text-text-muted">
                  {t("docs.mcp.oauthNote")}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">
                {t("docs.mcp.oauthConfigTitle")}
              </h3>
              <CodeBlock code={MCP_CONFIG_OAUTH} language="JSON" />
            </div>
          </>
        )}

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-text">
              {t("docs.mcp.toolsTitle")}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-border bg-surface-light/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-sm font-medium text-primary">
                    {tool.name}
                  </code>
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      tool.scope === "read"
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {tool.scope}
                  </span>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {t(tool.descKey)}
                  </p>
                </div>

                {tool.params && tool.params.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-light/20">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="px-3 py-1.5 font-semibold text-text">{t("docs.endpoints.colParam")}</th>
                          <th className="px-3 py-1.5 font-semibold text-text">{t("docs.endpoints.colType")}</th>
                          <th className="px-3 py-1.5 font-semibold text-text">{t("docs.endpoints.colRequired")}</th>
                          <th className="px-3 py-1.5 font-semibold text-text">{t("docs.endpoints.colDescription")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tool.params.map((p) => (
                          <tr key={p.name}>
                            <td className="px-3 py-1.5"><code className="font-mono text-primary">{p.name}</code></td>
                            <td className="px-3 py-1.5 text-text-muted">{p.type}</td>
                            <td className="px-3 py-1.5">
                              {p.required ? (
                                <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-xs font-medium text-danger">required</span>
                              ) : (
                                <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-text-muted">optional</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-text-muted">{t(p.descKey)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tool.responseExample && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium text-text-muted">
                      {t("docs.endpoints.responseLabel")}
                    </p>
                    <CodeBlock code={tool.responseExample} language="JSON" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
