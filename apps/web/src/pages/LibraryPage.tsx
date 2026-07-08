import { useState } from "react";
import { Inbox } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { TopTabs } from "../components/TopTabs";
import { SearchBar } from "../components/SearchBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { FilterChips } from "../components/FilterChips";
import { PosterCard } from "../components/PosterCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useLibrary } from "../hooks/useLibrary";
import { useTrackingRealtime } from "../hooks/useTrackingRealtime";
import { useI18n } from "../i18n/useI18n";
import type { LibraryItem } from "../services/library.service";

export function LibraryPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"tv" | "movie">("tv");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [page] = useState(1);

  const { data, isLoading, isError, refetch } = useLibrary(tab, page, 50);
  useTrackingRealtime();

  const chips = [
    { key: "all", label: t("common.all") },
    { key: "watching", label: t("common.status.watching") },
    { key: "completed", label: t("common.status.completed") },
    { key: "plan_to_watch", label: t("common.status.plan_to_watch") },
    { key: "dropped", label: t("common.status.dropped") },
  ];

  const tabs = [
    { key: "tv", label: t("common.series") },
    { key: "movie", label: t("common.movies") },
  ];

  const filteredItems: LibraryItem[] = data?.data.filter((item: LibraryItem) => {
    const matchesSearch = item.show.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.status === filter;
    return matchesSearch && matchesFilter;
  }) ?? [];

  return (
    <PageWrapper maxWidth="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.library")}</h1>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <TopTabs tabs={tabs} activeTab={tab} onTabChange={(k) => setTab(k as "tv" | "movie")} />

      <div className="mt-4 mb-3">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <div className="mb-4">
        <FilterChips chips={chips} activeChip={filter} onChipChange={setFilter} />
      </div>

      {isLoading && (
        <div className={viewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" : "space-y-2"}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "aspect-[2/3] w-full" : "h-20 w-full"} />
          ))}
        </div>
      )}
      {isError && <NetworkError onRetry={refetch} />}
      {!isLoading && !isError && filteredItems.length === 0 && (
        <EmptyState icon={Inbox} title={t("screens.library.empty")} subtitle={t("screens.library.addFromSearch")} />
      )}
      {!isLoading && !isError && filteredItems.length > 0 && (
        <div className={viewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" : "space-y-2"}>
          {viewMode === "grid" ? (
            filteredItems.map((item: LibraryItem) => <PosterCard key={item.id} item={item} />)
          ) : (
            filteredItems.map((item: LibraryItem) => <PosterCard key={item.id} item={item} />)
          )}
        </div>
      )}
    </PageWrapper>
  );
}
