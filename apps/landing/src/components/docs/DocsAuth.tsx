import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";

const AUTH_CURL = `curl -H "Authorization: Bearer wtc_your_api_key" \\
  "https://api.watchr.me/api/public/v1/watchlist"`;

export function DocsAuth() {
  const { t } = useTranslation();

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.auth.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.auth.description")}
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text">
            {t("docs.auth.headerTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            {t("docs.auth.headerDescription")}
          </p>
          <CodeBlock
            className="mt-3"
            code={'Authorization: Bearer wtc_your_api_key'}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                read
              </span>
              <h3 className="text-sm font-semibold text-text">
                {t("docs.auth.scopeReadTitle")}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {t("docs.auth.scopeReadDescription")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                write
              </span>
              <h3 className="text-sm font-semibold text-text">
                {t("docs.auth.scopeWriteTitle")}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {t("docs.auth.scopeWriteDescription")}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">
            {t("docs.auth.exampleTitle")}
          </h3>
          <CodeBlock code={AUTH_CURL} language="bash" />
        </div>
      </div>
    </section>
  );
}
