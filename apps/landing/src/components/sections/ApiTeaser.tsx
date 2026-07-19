import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Plug } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const SEARCH_CURL = `curl -H "Authorization: Bearer wtc_your_key" \\
  "https://api.watchr.me/api/public/v1/search?q=breaking+bad"`;

const MCP_CONFIG = `{
  "mcpServers": {
    "watchr": {
      "url": "https://api.watchr.me/mcp",
      "headers": {
        "Authorization": "Bearer wtc_your_key"
      }
    }
  }
}`;

export function ApiTeaser() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="api" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-text-muted">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            {t("apiTeaser.badge")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("apiTeaser.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("apiTeaser.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2",
            isVisible && "animate-fade-in-up",
          )}
        >
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text">
                  {t("apiTeaser.codeSearchTitle")}
                </h3>
                <p className="text-xs text-text-muted">{t("apiTeaser.codeSearchDesc")}</p>
              </div>
            </div>
            <CodeBlock code={SEARCH_CURL} language="bash" />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text">
                  {t("apiTeaser.codeMcpTitle")}
                </h3>
                <p className="text-xs text-text-muted">{t("apiTeaser.codeMcpDesc")}</p>
              </div>
            </div>
            <CodeBlock code={MCP_CONFIG} language="JSON" />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link to="/docs">
              {t("apiTeaser.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
