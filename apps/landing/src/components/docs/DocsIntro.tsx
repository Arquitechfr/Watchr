import { useTranslation } from "react-i18next";
import { ExternalLink, Key } from "lucide-react";

export function DocsIntro() {
  const { t } = useTranslation();

  return (
    <section className="mb-16">
      <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
        {t("docs.intro.title")}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-text-muted">
        {t("docs.intro.description")}
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">
              {t("docs.intro.getKeyTitle")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              {t("docs.intro.getKeyDescription")}
            </p>
            <a
              href="https://app.watchr.me"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
            >
              {t("docs.intro.getKeyCta")}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
