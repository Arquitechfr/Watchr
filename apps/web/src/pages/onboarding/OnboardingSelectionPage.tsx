import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { NetworkError } from "../../components/NetworkError";
import { OnboardingPosterTile } from "../../components/OnboardingPosterTile";
import { OnboardingSkipButton } from "../../components/OnboardingSkipButton";
import { useI18n } from "../../i18n/useI18n";
import { useDiscoverSections } from "../../hooks/useDiscover";
import { useShowSearch } from "../../hooks/useShowSearch";
import { useOnboardingStore } from "../../store/onboardingStore";
import { SearchResultItem } from "../../services/shows.service";

export function OnboardingSelectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSkip = () => {
    navigate("/series");
  };

  const { data: discoverData, isLoading: discoverLoading, isError: discoverError, refetch: refetchDiscover } = useDiscoverSections();
  const searchResult = useShowSearch(searchQuery);

  const { selectedItems, toggleItem, isSelected } = useOnboardingStore();

  const isSearching = searchQuery.trim().length > 0;

  const items = useMemo<SearchResultItem[]>(() => {
    if (isSearching && searchResult.data) {
      return searchResult.data.results;
    }
    if (discoverData?.sections) {
      return discoverData.sections.flatMap((s: { items: SearchResultItem[] }) => s.items);
    }
    return [];
  }, [isSearching, searchResult.data, discoverData]);

  const isLoading = isSearching ? searchResult.isLoading : discoverLoading;
  const isError = isSearching ? searchResult.isError : discoverError;
  const refetch = isSearching ? () => searchResult.refetch() : refetchDiscover;

  const handleToggle = useCallback(
    (item: SearchResultItem) => {
      if (item.tmdbId !== undefined) {
        toggleItem({
          tmdbId: item.tmdbId,
          type: item.type,
          title: item.title,
          posterPath: item.posterPath,
        });
      }
    },
    [toggleItem],
  );

  if (isError) {
    return (
      <PageWrapper maxWidth="max-w-3xl">
        <NetworkError onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-text text-2xl font-bold mb-1">
          {t("screens.onboarding.selectionTitle")}
        </h1>
        <p className="text-text-muted text-sm mb-4">
          {t("screens.onboarding.selectionSubtitle")}
        </p>

        <div className="flex items-center rounded-lg px-3 py-2 mb-3 bg-surface">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("screens.onboarding.selectionSearchPlaceholder")}
            className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-sm"
          />
        </div>

        {selectedItems.length > 0 && (
          <p className="text-primary text-sm font-medium mb-2">
            {t("screens.onboarding.selectedCount", { count: selectedItems.length })}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">{t("screens.onboarding.selectionNoResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-24">
          {items.map((item) => {
            if (item.tmdbId === undefined) return null;
            return (
              <OnboardingPosterTile
                key={item.tmdbId}
                show={item}
                selected={isSelected(item.tmdbId)}
                onToggle={() => handleToggle(item)}
              />
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 pt-2 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-4 py-3">
          <OnboardingSkipButton onPress={handleSkip} />
          <button
            onClick={() => navigate("/onboarding/confirmation")}
            className="bg-primary text-background px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            {t("screens.onboarding.selectionContinue")}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
