import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";

interface ErrorEntry {
  code: string;
  status: number;
  descKey: string;
}

const ERRORS: ErrorEntry[] = [
  { code: "INVALID_API_KEY", status: 401, descKey: "docs.errors.codes.invalidApiKey" },
  { code: "INSUFFICIENT_SCOPE", status: 403, descKey: "docs.errors.codes.insufficientScope" },
  { code: "SHOW_NOT_FOUND", status: 404, descKey: "docs.errors.codes.showNotFound" },
  { code: "VALIDATION_ERROR", status: 400, descKey: "docs.errors.codes.validationError" },
  { code: "TOO_MANY_API_READ_REQUESTS", status: 429, descKey: "docs.errors.codes.tooManyRead" },
  { code: "TOO_MANY_API_WRITE_REQUESTS", status: 429, descKey: "docs.errors.codes.tooManyWrite" },
  { code: "INTERNAL_ERROR", status: 500, descKey: "docs.errors.codes.internalError" },
];

const ERROR_EXAMPLE = `{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "This API key does not have the 'write' scope"
  }
}`;

export function DocsErrors() {
  const { t } = useTranslation();

  return (
    <section id="errors" className="mb-16 scroll-mt-20">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.errors.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.errors.description")}
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-light/30">
            <tr>
              <th className="px-4 py-3 font-semibold text-text">
                {t("docs.errors.colCode")}
              </th>
              <th className="px-4 py-3 font-semibold text-text">
                {t("docs.errors.colStatus")}
              </th>
              <th className="px-4 py-3 font-semibold text-text">
                {t("docs.errors.colDescription")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ERRORS.map((err) => (
              <tr key={err.code} className="transition-colors hover:bg-surface-light/20">
                <td className="px-4 py-3">
                  <code className="font-mono text-xs font-medium text-primary">
                    {err.code}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-surface-light/50 px-2 py-0.5 text-xs font-medium text-text-muted">
                    {err.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {t(err.descKey)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-text">
          {t("docs.errors.exampleTitle")}
        </h3>
        <CodeBlock code={ERROR_EXAMPLE} language="JSON" />
      </div>
    </section>
  );
}
