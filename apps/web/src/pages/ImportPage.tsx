import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Info } from "lucide-react";
import {
  uploadImport,
  getImportJobErrors,
  getImportJobs,
  getTraktAuthUrl,
  getTraktStatus,
  syncTrakt,
  unlinkTrakt,
  toggleTraktAutoSync,
  type ImportSource,
  type ImportError,
  type ImportJobSummary,
  type TraktStatus,
} from "../services/import.service";
import { useImportPolling } from "../hooks/useImportPolling";
import { useImportStore } from "../store/importStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { ImportProgressBar } from "../components/ImportProgressBar";
import { InfoBox } from "../components/InfoBox";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

const SOURCE_ICONS: Record<string, string> = {
  tvtime: "📺",
  trakt: "🎬",
  imdb: "⭐",
  letterboxd: "🎞️",
  watchr: "📋",
  unknown: "📦",
};

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
  const { showSnackbar, showAlert } = useUIStore();
  const { t, dateFnsLocale } = useI18n();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const activeJobId = useImportStore((state) => state.activeJobId);
  const setActiveJobId = useImportStore((state) => state.setActiveJobId);
  const clearActiveJob = useImportStore((state) => state.clearActiveJob);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { data: job } = useImportPolling(activeJobId);

  const { data: traktStatus } = useQuery<TraktStatus>({
    queryKey: ["trakt-status"],
    queryFn: getTraktStatus,
  });

  const { data: importJobsData } = useQuery({
    queryKey: ["import-jobs"],
    queryFn: getImportJobs,
  });

  const handleFileSelect = useCallback(
    async (source: ImportSource, file: File) => {
      setIsUploading(true);
      setErrors([]);
      try {
        const { jobId: newJobId } = await uploadImport(file, source);
        setActiveJobId(newJobId);
        queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
        showSnackbar(t("screens.import.started"), "success");
      } catch (err) {
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
      }
    },
    [t, showSnackbar, getErrorMessage, setActiveJobId, queryClient],
  );

  async function viewErrors() {
    if (!activeJobId) return;
    try {
      const { errors: jobErrors } = await getImportJobErrors(activeJobId);
      setErrors(jobErrors.map((err: ImportError) => `${t("screens.import.line")} ${err.line}: ${err.reason}`));
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  async function handleTraktOAuth() {
    try {
      const url = await getTraktAuthUrl();
      window.open(url, "_blank");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  async function handleTraktSync() {
    setIsSyncingTrakt(true);
    try {
      const result = await syncTrakt();
      showSnackbar(t("screens.import.traktSyncStarted"), "success");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsSyncingTrakt(false);
    }
  }

  async function handleTraktUnlink() {
    showAlert({
      title: t("screens.import.traktUnlinkTitle"),
      message: t("screens.import.traktUnlinkMessage"),
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
      onConfirm: async () => {
        try {
          await unlinkTrakt();
          queryClient.invalidateQueries({ queryKey: ["trakt-status"] });
          showSnackbar(t("screens.import.traktUnlinked"), "success");
        } catch (err) {
          showSnackbar(getErrorMessage(err), "error");
        }
      },
      onCancel: () => {
        // Do nothing on cancel
      },
    });
  }

  async function handleToggleAutoSync(enabled: boolean) {
    try {
      await toggleTraktAutoSync(enabled);
      queryClient.invalidateQueries({ queryKey: ["trakt-status"] });
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  const isComplete = job?.status === "completed" || job?.status === "failed";
  const isFailed = job?.status === "failed";
  const isBusy = isUploading || Boolean(activeJobId && !isComplete);
  const isTraktLinked = traktStatus?.linked === true;
  const recentJobs = (importJobsData?.jobs ?? []).filter((j: ImportJobSummary) => j.id !== activeJobId);

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

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text font-semibold text-lg">{t("screens.import.choosePlatform")}</h2>
          <button
            onClick={() => setShowDisclaimer((v) => !v)}
            className="text-text-muted hover:text-text transition-colors"
          >
            <Info size={16} />
          </button>
        </div>
        {showDisclaimer && (
          <p className="text-text-muted text-xs mb-3">{t("screens.import.importDisclaimer")}</p>
        )}

        {PLATFORMS.map((platform) => (
          <div key={platform.source}>
            <button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = platform.accept;
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(platform.source, file);
                };
                input.click();
              }}
              disabled={isBusy}
              className="w-full flex items-center rounded-lg p-4 mb-2 bg-surface hover:bg-surface-light transition-colors disabled:opacity-50 text-left"
            >
              <span className="text-2xl mr-3">{platform.icon}</span>
              <div className="flex-1">
                <p className="text-text font-semibold text-base">{platform.name}</p>
                <p className="text-text-muted text-sm mt-0.5">{t(`screens.import.${platform.source}Desc`)}</p>
              </div>
            </button>
          </div>
        ))}

        {isTraktLinked && (
          <div className="bg-surface rounded-lg p-4 mb-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text font-semibold">{t("screens.import.traktConnected")}</p>
                <p className="text-text-muted text-sm">{traktStatus?.traktUsername}</p>
              </div>
              <button onClick={handleTraktUnlink} className="text-danger text-sm">
                {t("screens.import.unlink")}
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-text">{t("screens.import.autoSync")}</p>
              <button
                onClick={() => handleToggleAutoSync(!(traktStatus?.autoSync ?? false))}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  traktStatus?.autoSync ? "bg-primary" : "bg-surface-light"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    traktStatus?.autoSync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              className="w-full bg-primary py-3 rounded-lg text-background font-semibold"
              onClick={handleTraktSync}
              disabled={isSyncingTrakt}
            >
              {isSyncingTrakt ? t("screens.import.processing") : t("screens.import.syncNow")}
            </button>
          </div>
        )}

        {!isTraktLinked && (
          <button
            className="w-full bg-surface py-3 rounded-lg text-primary font-semibold mb-4 mt-2"
            onClick={handleTraktOAuth}
          >
            {t("screens.import.connectTrakt")}
          </button>
        )}

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

        {isComplete && job?.progress.failed > 0 && (
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

        {isComplete && job?.progress.pendingReview && job.progress.pendingReview > 0 && (
          <button
            onClick={() => navigate(`/import/${job.id}/review`)}
            className="w-full bg-primary py-4 rounded-lg text-center text-background font-semibold mb-4 hover:bg-primary-dark transition-colors"
          >
            {t("screens.import.reviewPending", { count: job.progress.pendingReview })}
          </button>
        )}

        {recentJobs.length > 0 && (
          <div className="mt-4">
            <h2 className="text-text font-semibold text-lg mb-3">{t("screens.import.recentImports")}</h2>
            {recentJobs.map((item: ImportJobSummary) => {
                const icon = SOURCE_ICONS[item.source ?? "unknown"] ?? "📦";
                const dateStr = format(new Date(item.createdAt), "PP", { locale: dateFnsLocale });
                const isCompleted = item.status === "completed";
                const isFailed = item.status === "failed";
                const hasPendingReview = isCompleted && (item.progress.pendingReview ?? 0) > 0;
                const statusColor = isFailed ? "text-danger" : isCompleted ? "text-primary" : "text-text-muted";
                return (
                  <button
                    key={item.id}
                    onClick={() => hasPendingReview && navigate(`/import/${item.id}/review`)}
                    disabled={!hasPendingReview}
                    className="w-full flex items-center rounded-lg p-3 mb-2 bg-surface hover:bg-surface-light transition-colors text-left disabled:opacity-60"
                  >
                    <span className="text-xl mr-3">{icon}</span>
                    <div className="flex-1">
                      <p className="text-text font-medium text-sm">{item.source ?? "unknown"}</p>
                      <p className="text-text-muted text-xs mt-0.5">{dateStr}</p>
                    </div>
                    <span className={`${statusColor} text-sm font-medium`}>
                      {item.status === "pending" && t("screens.import.pending")}
                      {item.status === "processing" && t("screens.import.processing")}
                      {item.status === "completed" && t("screens.import.completed")}
                      {item.status === "failed" && t("screens.import.failed")}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}
