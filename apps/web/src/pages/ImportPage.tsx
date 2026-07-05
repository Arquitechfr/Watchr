import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadImport,
  getImportJobErrors,
  type ImportSource,
  type ImportError,
} from "../services/import.service";
import { useImportJob } from "../hooks/useImportJob";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { ImportProgressBar } from "../components/ImportProgressBar";
import { InfoBox } from "../components/InfoBox";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

interface PlatformConfig {
  icon: string;
  name: string;
  source: ImportSource;
  accept: string;
  helpKey: string;
}

const PLATFORMS: PlatformConfig[] = [
  { icon: "📺", name: "TV Time", source: "tvtime", accept: ".zip", helpKey: "importTvTime" },
  { icon: "🎬", name: "Trakt", source: "trakt", accept: ".json", helpKey: "importTrakt" },
  { icon: "⭐", name: "IMDb", source: "imdb", accept: ".csv", helpKey: "importImdb" },
  { icon: "🎞️", name: "Letterboxd", source: "letterboxd", accept: ".csv", helpKey: "importLetterboxd" },
];

export function ImportPage() {
  const navigate = useNavigate();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [jobId, setJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { job } = useImportJob(jobId);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = useCallback(
    async (source: ImportSource, file: File) => {
      setIsUploading(true);
      setErrors([]);
      try {
        const { jobId: newJobId } = await uploadImport(file, source);
        setJobId(newJobId);
        showSnackbar(t("screens.import.started"), "success");
      } catch (err) {
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
      }
    },
    [t, showSnackbar, getErrorMessage],
  );

  async function viewErrors() {
    if (!jobId) return;
    try {
      const { errors: jobErrors } = await getImportJobErrors(jobId);
      setErrors(jobErrors.map((err: ImportError) => `${t("screens.import.line")} ${err.line}: ${err.reason}`));
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  const isComplete = job?.status === "completed" || job?.status === "failed";
  const isFailed = job?.status === "failed";
  const isBusy = isUploading || Boolean(jobId && !isComplete);

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

        <h1 className="text-2xl font-bold text-text mb-2">{t("screens.import.title")}</h1>
        <p className="text-text-muted mb-6">{t("screens.import.description")}</p>

        <h2 className="text-text font-semibold text-lg mb-3">{t("screens.import.choosePlatform")}</h2>

        {PLATFORMS.map((platform) => (
          <div key={platform.source}>
            <button
              onClick={() => fileInputRefs.current[platform.source]?.click()}
              disabled={isBusy}
              className="w-full flex items-center rounded-lg p-4 mb-2 bg-surface hover:bg-surface-light transition-colors disabled:opacity-50 text-left"
            >
              <span className="text-2xl mr-3">{platform.icon}</span>
              <div className="flex-1">
                <p className="text-text font-semibold text-base">{platform.name}</p>
                <p className="text-text-muted text-sm mt-0.5">{t(`screens.import.${platform.source}Desc`)}</p>
              </div>
            </button>
            <input
              ref={(el) => { fileInputRefs.current[platform.source] = el; }}
              type="file"
              accept={platform.accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(platform.source, file);
                e.target.value = "";
              }}
            />
            <InfoBox icon={platform.icon} title={t(`screens.help.${platform.helpKey}`)}>
              {t(`screens.help.${platform.helpKey}Desc`)}
            </InfoBox>
          </div>
        ))}

        {isUploading && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted mt-2">{t("screens.import.uploading")}</p>
          </div>
        )}

        {job && (
          <div className="bg-surface rounded-lg p-4 mb-4">
            <p className="text-text font-semibold mb-2">
              {t("screens.import.status")}{" "}
              <span className={isFailed ? "text-danger" : "text-primary"}>
                {job.status === "pending" && t("screens.import.pending")}
                {job.status === "processing" && t("screens.import.processing")}
                {job.status === "completed" && t("screens.import.completed")}
                {job.status === "failed" && t("screens.import.failed")}
              </span>
            </p>
            <ImportProgressBar progress={job.progress} />
          </div>
        )}

        {isComplete && job.progress.failed > 0 && (
          <button
            onClick={viewErrors}
            className="w-full bg-surface-light py-3 rounded-lg text-center text-text font-medium mb-4 hover:opacity-80 transition-opacity"
          >
            {t("screens.import.viewErrors", { count: job.progress.failed })}
          </button>
        )}

        {errors.length > 0 && (
          <div className="bg-surface rounded-lg p-4 mb-4">
            {errors.map((err, index) => (
              <p key={index} className="text-danger text-sm mb-1">{err}</p>
            ))}
          </div>
        )}

        {isComplete && job.progress.pendingReview && job.progress.pendingReview > 0 && (
          <button
            onClick={() => navigate(`/import/${job.id}/review`)}
            className="w-full bg-primary py-4 rounded-lg text-center text-background font-semibold mb-4 hover:bg-primary-dark transition-colors"
          >
            {t("screens.import.reviewPending", { count: job.progress.pendingReview })}
          </button>
        )}
      </div>
    </ScreenContainer>
  );
}
