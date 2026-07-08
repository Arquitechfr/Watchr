import { useState, useEffect } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { SearchBar } from "../components/SearchBar";
import { ShowCard } from "../components/ShowCard";
import { DiscoverSectionRow } from "../components/DiscoverSectionRow";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { ShowCardSkeleton } from "../components/Skeleton";
import { useShowSearch } from "../hooks/useShowSearch";
import { useDiscoverSections } from "../hooks/useDiscover";
import { useQuickAddToWatchlist, useTrackedTmdbIds } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import type { SearchResultItem, DiscoverSection } from "../services/shows.service";
import { useErrorMessage } from "../services/api";
import { log } from "../utils/logger";

export function SearchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: searchResult, isLoading: isLoadingSearch, isError: isErrorSearch, error: searchError, refetch: refetchSearch } = useShowSearch(debouncedQuery);
  const { data: discoverData, isLoading: isDiscoverLoading, isError: isDiscoverError, error: discoverError, refetch: refetchDiscover } = useDiscoverSections();
  const quickAdd = useQuickAddToWatchlist();
  const { data: trackedTmdbIdsData } = useTrackedTmdbIds();
  const trackedTmdbIds = new Set(trackedTmdbIdsData ?? []);
  const throttledRefresh = useRefreshRateLimit();
  const throttledRefreshDiscover = useRefreshRateLimit();

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) {
        log("Search", "debounced query", { query: trimmed });
      }
      setDebouncedQuery(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const allResults = searchResult ? searchResult.results : [];
  const hasResults = allResults.length > 0;
  const showEmpty = !isLoadingSearch && !isErrorSearch && debouncedQuery.length > 0 && !hasResults;
  const isSearching = debouncedQuery.length > 0;

  function handleShowPress(show: SearchResultItem) {
    if (!show.tmdbId) return;
    log("Search", "show selected", { tmdbId: show.tmdbId, title: show.title });
    navigate(`/show/${show.tmdbId}`);
  }

  function handleQuickAdd(show: SearchResultItem) {
    if (!show.tmdbId) return;
    quickAdd.mutate(
      { tmdbId: show.tmdbId, type: show.type },
      {
        onSuccess: () => showSnackbar(t("screens.showDetail.addToList"), "success"),
        onError: () => showSnackbar(t("screens.showDetail.addToList"), "error"),
      },
    );
  }

  function renderDiscoverSkeleton() {
    return (
      <div className="mt-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-6">
            <div className="w-3/5 h-6 rounded mb-3 bg-surface"></div>
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="w-32 h-48 rounded bg-surface"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <h1 className="text-text font-bold text-2xl mb-4">{t("navigation.search")}</h1>

      <div className="mb-6">
        <SearchBar value={query} onChange={setQuery} autoFocus />
      </div>

      {!isSearching && isDiscoverError && (
        <NetworkError onRetry={() => throttledRefreshDiscover(refetchDiscover)} />
      )}

      {!isSearching && !isDiscoverError && isDiscoverLoading && renderDiscoverSkeleton()}

      {!isSearching && !isDiscoverError && !isDiscoverLoading && discoverData && (
        <div className="space-y-4">
          {discoverData.sections.map((section: DiscoverSection) => (
            <DiscoverSectionRow
              key={section.id}
              section={section}
              onShowPress={handleShowPress}
              onQuickAdd={handleQuickAdd}
              isAdding={quickAdd.isPending}
              isTracked={(tmdbId) => trackedTmdbIds.has(tmdbId)}
            />
          ))}
        </div>
      )}

      {isSearching && isLoadingSearch && (
        <div className="mt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <ShowCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isSearching && isErrorSearch && (
        <NetworkError onRetry={() => throttledRefresh(refetchSearch)} />
      )}

      {isSearching && showEmpty && (
        <EmptyState
          icon={SearchIcon}
          title={t("errors.notFound")}
          subtitle={`${t("errors.notFound")} "${debouncedQuery}".`}
        />
      )}

      {isSearching && !isLoadingSearch && !isErrorSearch && (
        <div className="space-y-2">
          {allResults.map((item: SearchResultItem, index: number) => (
            <ShowCard
              key={`${item.title}-${index}`}
              show={item}
              onPress={() => handleShowPress(item)}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
