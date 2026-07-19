import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";

const ERROR_RESPONSE = `{
  "error": {
    "code": "TOO_MANY_API_READ_REQUESTS",
    "message": "Too many API read requests. Try again later."
  }
}`;

export function DocsRateLimit() {
  const { t } = useTranslation();

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.rateLimit.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.rateLimit.description")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text">60</span>
            <span className="text-sm text-text-muted">
              {t("docs.rateLimit.readUnit")}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {t("docs.rateLimit.readDescription")}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text">20</span>
            <span className="text-sm text-text-muted">
              {t("docs.rateLimit.writeUnit")}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {t("docs.rateLimit.writeDescription")}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-text">
          {t("docs.rateLimit.errorTitle")}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-text-muted">
          {t("docs.rateLimit.errorDescription")}
        </p>
        <CodeBlock code={ERROR_RESPONSE} language="JSON" />
      </div>
    </section>
  );
}
