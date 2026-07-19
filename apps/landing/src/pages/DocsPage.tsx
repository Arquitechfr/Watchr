import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { DocsIntro } from "@/components/docs/DocsIntro";
import { DocsAuth } from "@/components/docs/DocsAuth";
import { DocsEndpoints } from "@/components/docs/DocsEndpoints";
import { DocsRateLimit } from "@/components/docs/DocsRateLimit";
import { DocsMcp } from "@/components/docs/DocsMcp";

export function DocsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("docs.metaTitle")}</title>
        <meta name="description" content={t("docs.metaDescription")} />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <DocsIntro />
          <DocsAuth />
          <DocsEndpoints />
          <DocsRateLimit />
          <DocsMcp />
        </div>
      </div>
    </>
  );
}
