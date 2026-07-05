import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { InfoBox } from "../components/InfoBox";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

export function HelpPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <ScreenContainer className="px-6 py-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto w-full mt-12">
        <button onClick={() => navigate("/dashboard")} className="text-primary mb-4 text-sm">
          ← {t("screens.help.backToDashboard")}
        </button>

        <h1 className="text-2xl font-bold text-text mb-2">{t("screens.help.title")}</h1>
        <p className="text-text-muted mb-6">{t("screens.help.subtitle")}</p>

        <InfoBox icon="📺" title={t("screens.help.importTvTime")}>
          {t("screens.help.importTvTimeDesc")}
        </InfoBox>

        <InfoBox icon="🎬" title={t("screens.help.importTrakt")}>
          {t("screens.help.importTraktDesc")}
        </InfoBox>

        <InfoBox icon="⭐" title={t("screens.help.importImdb")}>
          {t("screens.help.importImdbDesc")}
        </InfoBox>

        <InfoBox icon="🎞️" title={t("screens.help.importLetterboxd")}>
          {t("screens.help.importLetterboxdDesc")}
        </InfoBox>

        <InfoBox icon="📦" title={t("screens.help.exportFormats")}>
          {t("screens.help.exportFormatsDesc")}
        </InfoBox>

        <InfoBox icon="🔍" title={t("screens.help.reviewMatches")}>
          {t("screens.help.reviewMatchesDesc")}
        </InfoBox>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate("/import")}
            className="flex-1 bg-primary py-3 rounded-lg text-background font-semibold hover:bg-primary-dark transition-colors"
          >
            {t("screens.import.title")}
          </button>
          <button
            onClick={() => navigate("/export")}
            className="flex-1 bg-surface py-3 rounded-lg text-text font-semibold hover:bg-surface-light transition-colors"
          >
            {t("screens.export.title")}
          </button>
        </div>
      </div>
    </ScreenContainer>
  );
}
