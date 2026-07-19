import { useTranslation } from "react-i18next";
import { Wrench, ExternalLink } from "lucide-react";
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

interface McpTool {
  name: string;
  scope: "read" | "write";
  descKey: string;
}

const MCP_TOOLS: McpTool[] = [
  { name: "search_show", scope: "read", descKey: "docs.mcp.tools.search_show" },
  { name: "list_watchlist", scope: "read", descKey: "docs.mcp.tools.list_watchlist" },
  { name: "add_to_watchlist", scope: "write", descKey: "docs.mcp.tools.add_to_watchlist" },
  { name: "update_watch_status", scope: "write", descKey: "docs.mcp.tools.update_watch_status" },
  { name: "remove_from_watchlist", scope: "write", descKey: "docs.mcp.tools.remove_from_watchlist" },
];

export function DocsMcp() {
  const { t } = useTranslation();

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.mcp.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.mcp.description")}
      </p>

      <div className="mt-8 space-y-6">
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
                className="flex items-start gap-3 rounded-xl border border-border bg-surface-light/30 p-4"
              >
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
