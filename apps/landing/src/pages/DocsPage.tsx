import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { DocsIntro } from "@/components/docs/DocsIntro";
import { DocsAuth } from "@/components/docs/DocsAuth";
import { DocsEndpoints } from "@/components/docs/DocsEndpoints";
import { DocsModels } from "@/components/docs/DocsModels";
import { DocsErrors } from "@/components/docs/DocsErrors";
import { DocsRateLimit } from "@/components/docs/DocsRateLimit";
import { DocsSdk } from "@/components/docs/DocsSdk";
import { DocsMcp } from "@/components/docs/DocsMcp";

export function DocsPage() {
  const { t } = useTranslation();

  const tocLinks = [
    { href: "#authentication", label: t("docs.auth.title") },
    { href: "#endpoints", label: t("docs.endpoints.title") },
    { href: "#models", label: t("docs.models.title") },
    { href: "#errors", label: t("docs.errors.title") },
    { href: "#rate-limiting", label: t("docs.rateLimit.title") },
    { href: "#sdk", label: t("docs.sdk.title") },
    { href: "#mcp", label: t("docs.mcp.title") },
  ];

  return (
    <>
      <Helmet>
        <title>{t("docs.metaTitle")}</title>
        <meta name="description" content={t("docs.metaDescription")} />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-12">
            {/* Table of contents */}
            <aside className="hidden w-56 shrink-0 lg:block">
              <nav className="sticky top-28 space-y-1">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t("docs.toc")}
                </p>
                {tocLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main content */}
            <div className="min-w-0 max-w-4xl">
              <DocsIntro />

              <div id="authentication" className="scroll-mt-20">
                <DocsAuth />
              </div>

              <div id="endpoints" className="scroll-mt-20">
                <DocsEndpoints />
              </div>

              <DocsModels />
              <DocsErrors />

              <div id="rate-limiting" className="scroll-mt-20">
                <DocsRateLimit />
              </div>

              <DocsSdk />

              <div id="mcp" className="scroll-mt-20">
                <DocsMcp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
