import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadExport, type ExportFormat } from "../services/export.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { InfoBox } from "../components/InfoBox";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

interface ExportOptionConfig {
  icon: string;
  format: ExportFormat;
  labelKey: string;
  descKey: string;
}

const OPTIONS: ExportOptionConfig[] = [
  { icon: "📦", format: "json", labelKey: "screens.export.watchrJson", descKey: "screens.export.watchrJsonDesc" },
  { icon: "📄", format: "csv", labelKey: "screens.export.watchrCsv", descKey: "screens.export.watchrCsvDesc" },
  { icon: "🎬", format: "trakt", labelKey: "screens.export.traktFormat", descKey: "screens.export.traktFormatDesc" },
  { icon: "⭐", format: "imdb", labelKey: "screens.export.imdbFormat", descKey: "screens.export.imdbFormatDesc" },
  { icon: "🎞️", format: "letterboxd", labelKey: "screens.export.letterboxdFormat", descKey: "screens.export.letterboxdFormatDesc" },
];

export function ExportPage() {
  const navigate = useNavigate();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setIsExporting(format);
    try {
      await downloadExport(format);
      showSnackbar(t("screens.export.success"), "success");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsExporting(null);
    }
  }

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

        <h1 className="text-2xl font-bold text-text mb-2">{t("screens.export.title")}</h1>
        <p className="text-text-muted mb-6">{t("screens.export.description")}</p>

        {OPTIONS.map((option) => (
          <div key={option.format}>
            <button
              onClick={() => handleExport(option.format)}
              disabled={isExporting !== null}
              className="w-full flex items-center rounded-lg p-4 mb-2 bg-surface hover:bg-surface-light transition-colors disabled:opacity-50 text-left"
            >
              <span className="text-2xl mr-3">{option.icon}</span>
              <div className="flex-1">
                <p className="text-text font-semibold text-base">{t(option.labelKey)}</p>
                <p className="text-text-muted text-sm mt-0.5">{t(option.descKey)}</p>
              </div>
            </button>
          </div>
        ))}

        {isExporting && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted mt-2">{t("screens.export.exporting")}</p>
          </div>
        )}

        <InfoBox icon="ℹ️" title={t("screens.help.exportFormats")}>
          {t("screens.help.exportFormatsDesc")}
        </InfoBox>
      </div>
    </ScreenContainer>
  );
}
