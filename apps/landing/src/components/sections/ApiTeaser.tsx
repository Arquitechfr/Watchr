import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Terminal, Plug, Key } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ApiTeaser() {
  const { t } = useTranslation();

  const features = [
    { icon: Terminal, titleKey: "apiTeaser.features.rest", descKey: "apiTeaser.features.restDesc" },
    { icon: Plug, titleKey: "apiTeaser.features.mcp", descKey: "apiTeaser.features.mcpDesc" },
    { icon: Key, titleKey: "apiTeaser.features.apiKey", descKey: "apiTeaser.features.apiKeyDesc" },
  ];

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

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.titleKey}
              className="rounded-2xl border border-border bg-surface p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-text">
                {t(feature.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
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
