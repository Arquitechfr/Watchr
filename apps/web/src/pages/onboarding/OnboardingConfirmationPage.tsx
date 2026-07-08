import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { NetworkError } from "../../components/NetworkError";
import { EmptyState } from "../../components/EmptyState";
import { useI18n } from "../../i18n/useI18n";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useAddToWatchlistBatch } from "../../hooks/useTracking";
import { useCompleteOnboarding } from "../../hooks/useOnboarding";
import { getPosterUrl } from "../../services/shows.service";
import { Film } from "lucide-react";

export function OnboardingConfirmationPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate("/series");
  };

  const { selectedItems, reset } = useOnboardingStore();
  const batchMutation = useAddToWatchlistBatch();
  const completeOnboardingMutation = useCompleteOnboarding();

  const isPending = batchMutation.isPending || completeOnboardingMutation.isPending;
  const hasError = batchMutation.isError || completeOnboardingMutation.isError;

  const handleFinish = () => {
    if (selectedItems.length === 0) {
      completeOnboardingMutation.mutate(undefined, {
        onSuccess: () => {
          reset();
          handleComplete();
        },
      });
      return;
    }

    batchMutation.mutate(
      selectedItems.map((item) => ({ tmdbId: item.tmdbId, type: item.type })),
      {
        onSuccess: () => {
          completeOnboardingMutation.mutate(undefined, {
            onSuccess: () => {
              reset();
              handleComplete();
            },
          });
        },
      },
    );
  };

  const handleRetry = () => {
    batchMutation.reset();
    completeOnboardingMutation.reset();
    handleFinish();
  };

  if (hasError) {
    return (
      <PageWrapper maxWidth="max-w-3xl">
        <NetworkError onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  if (isPending) {
    return (
      <PageWrapper maxWidth="max-w-3xl">
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-text-muted mt-4">{t("common.loading")}</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-text text-2xl font-bold mb-1">
          {t("screens.onboarding.confirmationTitle")}
        </h1>
        <p className="text-text-muted text-sm mb-4">
          {t("screens.onboarding.confirmationSubtitle")}
        </p>
      </div>

      {selectedItems.length === 0 ? (
        <EmptyState
          icon={Film}
          title={t("screens.onboarding.confirmationEmpty")}
        />
      ) : (
        <div className="flex overflow-x-auto gap-2 px-4 pb-24">
          {selectedItems.map((item) => {
            const posterUrl = getPosterUrl(item.posterPath, 200);
            return (
              <div key={item.tmdbId} className="flex-shrink-0 w-[100px]">
                <div className="w-[100px] h-[150px] rounded-lg bg-surface overflow-hidden mb-1">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-text-muted text-xs">{t("common.noImage")}</span>
                    </div>
                  )}
                </div>
                <p className="text-text text-xs text-center truncate">{item.title}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-2 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            onClick={handleFinish}
            className="w-full bg-primary text-background py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors"
          >
            {t("screens.onboarding.confirmationFinish")}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
