import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getImportReviews,
  resolveImportReview,
  type ImportReviewItem,
  type ImportReviewsResponse,
} from "../services/import.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { getPosterUrl } from "../services/shows.service";

export function ImportReviewPage() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [data, setData] = useState<ImportReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const result = await getImportReviews(jobId);
      setData(result);
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, showSnackbar, getErrorMessage]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleResolve = useCallback(
    async (reviewId: string, tmdbId: number | null, skip: boolean) => {
      setResolvingId(reviewId);
      try {
        await resolveImportReview(jobId, reviewId, tmdbId, skip);
        showSnackbar(skip ? t("screens.importReview.skipped") : t("screens.importReview.resolved"), "success");
        await fetchReviews();
      } catch (err) {
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setResolvingId(null);
      }
    },
    [jobId, t, showSnackbar, getErrorMessage, fetchReviews],
  );

  const reviews: ImportReviewItem[] = data?.reviews ?? [];
  const pendingCount = data?.total ?? 0;

  return (
    <ScreenContainer className="px-6 py-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto w-full mt-12">
        <button onClick={() => navigate("/import")} className="text-primary mb-4 text-sm">
          ← {t("screens.import.title")}
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text">{t("screens.importReview.title")}</h1>
          <span className="text-text-muted text-sm">
            {pendingCount} {t("screens.importReview.remaining")}
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted">{t("screens.importReview.allResolved")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((item) => {
              const isResolving = resolvingId === item._id;
              return (
                <div key={item._id} className="bg-surface rounded-lg p-4">
                  <div className="mb-3">
                    <p className="text-text font-semibold text-base">{item.sourceTitle}</p>
                    <p className="text-text-muted text-sm">
                      {item.sourceType === "series" ? t("common.tv") : t("common.movie")}
                      {item.sourceYear ? ` · ${item.sourceYear}` : ""}
                    </p>
                  </div>

                  {item.candidates.length === 0 ? (
                    <p className="text-text-muted text-sm mb-3">{t("screens.importReview.noCandidates")}</p>
                  ) : (
                    <div className="mb-3 space-y-2">
                      {item.candidates.map((candidate, index) => (
                        <button
                          key={`${candidate.tmdbId}-${index}`}
                          onClick={() => handleResolve(item._id, candidate.tmdbId, false)}
                          disabled={isResolving}
                          className="w-full flex items-center bg-surface-light rounded-lg p-3 hover:opacity-80 transition-opacity disabled:opacity-50 text-left"
                        >
                          {candidate.posterPath ? (
                            <img
                              src={getPosterUrl(candidate.posterPath, 200)}
                              alt={candidate.title}
                              className="w-12 h-18 rounded mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-18 rounded mr-3 flex items-center justify-center bg-surface">
                              <span className="text-text-muted text-xs">{t("common.noImage")}</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-text font-medium">{candidate.title}</p>
                            <p className="text-text-muted text-sm">{candidate.year ?? "—"}</p>
                            <p className="text-primary text-xs mt-1">
                              {t("screens.importReview.matchScore")}: {(candidate.confidenceScore * 100).toFixed(0)}%
                            </p>
                          </div>
                          <span className="px-3 py-2 rounded-lg bg-primary text-background font-semibold text-sm">
                            {t("screens.importReview.select")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleResolve(item._id, null, true)}
                    disabled={isResolving}
                    className="w-full py-2 text-center text-text-muted text-sm hover:opacity-70 transition-opacity"
                  >
                    {isResolving ? "..." : t("screens.importReview.skip")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}
