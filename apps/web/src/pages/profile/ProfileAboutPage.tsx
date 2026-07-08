import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { useI18n } from "../../i18n/useI18n";

const VERSION = "0.1.0";

export function ProfileAboutPage() {
  const { t } = useI18n();

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.about")} />

      <div className="flex flex-col items-center mb-8 mt-4">
        <h1 className="text-3xl font-bold text-primary mb-2">Watchr</h1>
        <p className="text-text-muted text-sm">
          {t("screens.profile.aboutVersion")} {VERSION}
        </p>
      </div>

      <div className="bg-surface rounded-lg p-4 mb-4">
        <p className="text-text text-base leading-relaxed">
          {t("screens.profile.aboutDescription")}
        </p>
      </div>

      <div className="bg-surface rounded-lg p-4 mb-4">
        <p className="text-text-muted text-sm leading-relaxed">
          {t("screens.profile.aboutCredits")}
        </p>
      </div>

      <a
        href="https://github.com/norsecoder/watchr"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-surface rounded-lg p-4 text-center text-primary text-base hover:bg-surface-light transition-colors"
      >
        GitHub
      </a>
    </PageWrapper>
  );
}
