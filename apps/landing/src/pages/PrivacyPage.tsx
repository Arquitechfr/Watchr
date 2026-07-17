import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export function PrivacyPage() {
  const { t } = useTranslation();

  const sections = ["dataCollection", "dataUse", "dataStorage", "dataSharing", "userRights", "cookies", "contact"] as const;

  return (
    <>
      <Helmet>
        <title>{t("privacy.metaTitle")}</title>
        <meta name="description" content={t("privacy.metaDescription")} />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            {t("privacy.title")}
          </h1>
          <p className="mt-4 text-sm text-text-muted">
            {t("privacy.lastUpdated")}
          </p>

          <div className="mt-8 space-y-4 text-text-muted">
            <p className="text-base leading-relaxed">{t("privacy.intro")}</p>

            {sections.map((key, index) => (
              <div key={key} className="pt-6">
                <h2 className="text-lg font-semibold text-text">
                  {index + 1}. {t(`privacy.sections.${key}.title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed">
                  {t(`privacy.sections.${key}.content`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
