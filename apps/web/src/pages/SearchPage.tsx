import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { SearchBar } from "../components/SearchBar";
import { ShowCard } from "../components/ShowCard";
import { DiscoverSectionRow } from "../components/DiscoverSectionRow";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { SectionHeader } from "../components/SectionHeader";
import { useShowSearch } from "../hooks/useShowSearch";
import { useDiscover } from "../hooks/useDiscover";
import { useQuickAddToWatchlist } from "../hooks/useTracking";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import type { SearchResultItem, DiscoverSection } from "../services/shows.service";

export function SearchPage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const [query, setQuery] = useState("");

  const { data: searchResult, isLoading: isLoadingSearch, isError: isErrorSearch } = useShowSearch(query);
  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover();

  const quickAdd = useQuickAddToWatchlist();

  function handleQuickAdd(item: { tmdbId: number; type: "tv" | "movie" }) {
    quickAdd.mutate(item, {
      onSuccess: () => showSnackbar(t("screens.search.addedToWatchlist"), "success"),
      onError: () => showSnackbar(t("errors.unknown"), "error"),
    });
  }

  const hasQuery = query.trim().length > 0;

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <h1 className="text-text font-bold text-2xl mb-4">{t("navigation.search")}</h1>

      <div className="mb-6">
        <SearchBar value={query} onChange={setQuery} autoFocus />
      </div>

      {hasQuery && (
        <>
          {isLoadingSearch && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}
          {isErrorSearch && <NetworkError />}
          {!isLoadingSearch && !isErrorSearch && searchResult?.results.length === 0 && (
            <EmptyState icon={SearchIcon} title={t("screens.search.noResults")} subtitle={query} />
          )}
          {!isLoadingSearch && !isErrorSearch && searchResult && searchResult.results.length > 0 && (
            <div className="space-y-2">
              {searchResult.results.map((item: SearchResultItem, i: number) => (
                <ShowCard
                  key={`${item.tmdbId ?? i}`}
                  item={item}
                  onQuickAdd={() => item.tmdbId && handleQuickAdd({ tmdbId: item.tmdbId, type: item.type })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!hasQuery && (
        <>
          {isLoadingDiscover && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}
          {discoverData && discoverData.sections.length > 0 && (
            <>
              <SectionHeader title={t("screens.search.discover")} />
              {discoverData.sections.map((section: DiscoverSection) => (
                <DiscoverSectionRow
                  key={section.id}
                  title={section.title}
                  items={section.items}
                  onCardClick={(item) => item.tmdbId && handleQuickAdd({ tmdbId: item.tmdbId, type: item.type })}
                />
              ))}
            </>
          )}
        </>
      )}
    </PageWrapper>
  );
}
