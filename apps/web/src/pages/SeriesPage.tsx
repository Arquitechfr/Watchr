import { useState } from "react";
import { CalendarClock, Inbox } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { TopTabs } from "../components/TopTabs";
import { SearchBar } from "../components/SearchBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { UnwatchedEpisodeRow } from "../components/UnwatchedEpisodeRow";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useTrackingRealtime } from "../hooks/useTrackingRealtime";
import { useUpcomingRealtime } from "../hooks/useUpcomingRealtime";
import { useToggleEpisode } from "../hooks/useTracking";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import type { UnwatchedShow } from "../services/unwatched.service";
import type { UpcomingEpisode } from "../services/upcoming.service";

export function SeriesPage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const [tab, setTab] = useState<"unwatched" | "upcoming">("unwatched");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: unwatchedData, isLoading: isLoadingUnwatched, isError: isErrorUnwatched, refetch: refetchUnwatched } = useUnwatchedShows();
  const { data: upcomingData, isLoading: isLoadingUpcoming, isError: isErrorUpcoming, refetch: refetchUpcoming } = useUpcomingEpisodes();

  useTrackingRealtime();
  useUpcomingRealtime();

  const toggleEpisode = useToggleEpisode("", 0);

  function handleMarkWatched(showId: string, episode: { season: number; episode: number }) {
    toggleEpisode.mutate(
      { season: episode.season, episode: episode.episode, watched: true },
      {
        onSuccess: () => showSnackbar(t("screens.series.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.series.markError"), "error"),
      },
    );
  }

  const filteredShows: UnwatchedShow[] = unwatchedData?.shows.filter((s: UnwatchedShow) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const todayEpisodes = upcomingData?.today ?? [];
  const thisWeekEpisodes = upcomingData?.thisWeek ?? [];
  const nextWeekEpisodes = upcomingData?.nextWeek ?? [];
  const laterEpisodes = upcomingData?.later ?? [];

  const tabs = [
    { key: "unwatched", label: t("navigation.unwatched") },
    { key: "upcoming", label: t("navigation.upcoming") },
  ];

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.series")}</h1>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <TopTabs tabs={tabs} activeTab={tab} onTabChange={(k) => setTab(k as "unwatched" | "upcoming")} />

      <div className="mt-4 mb-4">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {tab === "unwatched" && (
        <>
          {isLoadingUnwatched && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {isErrorUnwatched && <NetworkError onRetry={refetchUnwatched} />}
          {!isLoadingUnwatched && !isErrorUnwatched && filteredShows.length === 0 && (
            <EmptyState icon={Inbox} title={t("screens.home.noUnwatched")} subtitle={t("screens.home.noUnwatchedSubtitle")} />
          )}
          {!isLoadingUnwatched && !isErrorUnwatched && filteredShows.length > 0 && (
            <div className="space-y-2">
              {filteredShows.map((show: UnwatchedShow) => (
                <UnwatchedEpisodeRow
                  key={show.showId}
                  show={show}
                  onMarkWatched={handleMarkWatched}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "upcoming" && (
        <>
          {isLoadingUpcoming && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {isErrorUpcoming && <NetworkError onRetry={refetchUpcoming} />}
          {!isLoadingUpcoming && !isErrorUpcoming && (
            <>
              {todayEpisodes.length === 0 &&
                thisWeekEpisodes.length === 0 &&
                nextWeekEpisodes.length === 0 &&
                laterEpisodes.length === 0 && (
                  <EmptyState icon={CalendarClock} title={t("screens.home.noUpcoming")} />
                )}
              {todayEpisodes.length > 0 && (
                <div>
                  <WeekSectionHeader date={new Date()} />
                  <div className="space-y-2">
                    {todayEpisodes.map((ep: UpcomingEpisode, i: number) => (
                      <UpcomingEpisodeRow key={`${ep.showId}-${i}`} episode={ep} />
                    ))}
                  </div>
                </div>
              )}
              {thisWeekEpisodes.length > 0 && (
                <div className="mt-4">
                  <WeekSectionHeader date={new Date(Date.now() + 3 * 86400000)} />
                  <div className="space-y-2">
                    {thisWeekEpisodes.map((ep: UpcomingEpisode, i: number) => (
                      <UpcomingEpisodeRow key={`${ep.showId}-${i}`} episode={ep} />
                    ))}
                  </div>
                </div>
              )}
              {nextWeekEpisodes.length > 0 && (
                <div className="mt-4">
                  <WeekSectionHeader date={new Date(Date.now() + 10 * 86400000)} />
                  <div className="space-y-2">
                    {nextWeekEpisodes.map((ep: UpcomingEpisode, i: number) => (
                      <UpcomingEpisodeRow key={`${ep.showId}-${i}`} episode={ep} />
                    ))}
                  </div>
                </div>
              )}
              {laterEpisodes.length > 0 && (
                <div className="mt-4">
                  <WeekSectionHeader date={new Date(Date.now() + 20 * 86400000)} />
                  <div className="space-y-2">
                    {laterEpisodes.map((ep: UpcomingEpisode, i: number) => (
                      <UpcomingEpisodeRow key={`${ep.showId}-${i}`} episode={ep} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageWrapper>
  );
}
