import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Target, Heart, Zap, Users } from "lucide-react";

export function AboutPage() {
  const { t } = useTranslation();

  const values = [
    { icon: Target, key: "mission" },
    { icon: Heart, key: "passion" },
    { icon: Zap, key: "simplicity" },
    { icon: Users, key: "community" },
  ] as const;

  return (
    <>
      <Helmet>
        <title>{t("about.metaTitle")}</title>
        <meta name="description" content={t("about.metaDescription")} />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            {t("about.title")}
          </h1>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            {t("about.intro")}
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {values.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text">
                  {t(`about.values.${key}.title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {t(`about.values.${key}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-surface p-8">
            <h2 className="text-xl font-semibold text-text">
              {t("about.company.title")}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              {t("about.company.description")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
