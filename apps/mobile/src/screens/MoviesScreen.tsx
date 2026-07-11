import { Text, FlatList, RefreshControl, TouchableOpacity, View, Image, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { PosterCard } from "../components/PosterCard";
import { SearchBar } from "../components/SearchBar";
import { MainHeader } from "../components/MainHeader";
import { FilterChips, FilterChipOption } from "../components/FilterChips";
import { useUnwatchedMovies } from "../hooks/useUnwatched";
import { useQuickMarkMovieWatched } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedMovie } from "../services/unwatched.service";
import { getPosterUrl, SearchResultItem } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { Seo } from "../components/Seo";
import { ImportProgressBanner } from "../components/ImportProgressBanner";
import { WatchStatus } from "../services/tracking.service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
  switch (status) {
    case "watching":
      return t("screens.showDetail.inProgress");
    case "completed":
      return t("screens.showDetail.completed");
    case "plan_to_watch":
      return t("screens.showDetail.planToWatch");
    case "dropped":
      return t("screens.showDetail.dropped");
  }
}

function MovieCard({ movie, onPress, onMarkWatched, isMarking }: { movie: UnwatchedMovie; onPress: () => void; onMarkWatched?: () => void; isMarking?: boolean }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, 200) : null;

  const genreNames = (movie.genres ?? []).filter((g) => g.name).slice(0, 2).map((g) => g.name!);

  const statusColor: Record<WatchStatus, string> = {
    watching: "text-primary",
    completed: "text-success",
    plan_to_watch: "text-text-muted",
    dropped: "text-error",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center bg-card rounded-lg p-3 mb-3"
      style={{ gap: 12 }}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-16 h-24 rounded"
          resizeMode="cover"
        />
      ) : (
        <View className="w-16 h-24 rounded bg-muted items-center justify-center">
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}
      <View className="flex-1 justify-center">
        <Text className="text-text font-semibold text-base mb-1" numberOfLines={2}>
          {movie.title}
        </Text>
        {movie.year ? (
          <Text className="text-text-muted text-xs mb-1">
            {movie.year} · {t("common.movie")}
          </Text>
        ) : (
          <Text className="text-text-muted text-xs mb-1">{t("common.movie")}</Text>
        )}
        {genreNames.length > 0 && (
          <Text className="text-text-muted text-xs mb-1" numberOfLines={1}>
            {genreNames.join(" · ")}
          </Text>
        )}
        <Text className={`text-xs font-semibold ${statusColor[movie.status]}`}>
          {getStatusLabel(t, movie.status)}
        </Text>
      </View>
      {onMarkWatched && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onMarkWatched();
          }}
          className="ml-2 p-1"
          disabled={isMarking}
        >
          {isMarking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.primary} />
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export function MoviesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const showSnackbar = useUIStore((state) => state.showSnackbar);
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const hydrateLibraryViewMode = useUIStore((state) => state.hydrateLibraryViewMode);
  const { width: windowWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);
  const { data, isLoading, isError, error, refetch } = useUnwatchedMovies();
  const quickMarkMovie = useQuickMarkMovieWatched();
  const throttledRefresh = useRefreshRateLimit();
  const movies: UnwatchedMovie[] = data?.movies ?? [];
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    hydrateLibraryViewMode();
  }, []);

  const genreOptions = useMemo<FilterChipOption[]>(() => {
    const genreMap = new Map<number, string>();
    for (const movie of movies) {
      for (const genre of movie.genres ?? []) {
        if (genre.id && genre.name) {
          genreMap.set(genre.id, genre.name);
        }
      }
    }
    return Array.from(genreMap.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [movies]);

  const yearOptions = useMemo<FilterChipOption[]>(() => {
    const yearSet = new Set<number>();
    for (const movie of movies) {
      if (movie.year) yearSet.add(movie.year);
    }
    return Array.from(yearSet).sort((a, b) => b - a).map((year) => ({ label: String(year), value: year }));
  }, [movies]);

  const filteredMovies = useMemo<UnwatchedMovie[]>(() => {
    let result = movies;
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    if (selectedGenre !== undefined) {
      result = result.filter((m) => m.genres?.some((g) => g.id === selectedGenre));
    }
    if (selectedYear !== undefined) {
      result = result.filter((m) => m.year === selectedYear);
    }
    return result;
  }, [movies, searchQuery, selectedGenre, selectedYear]);

  const isFiltering = searchQuery.trim().length >= 3 || selectedGenre !== undefined || selectedYear !== undefined;

  const gridNumColumns = 3;
  const gridGap = 12;
  const gridPadding = 16;
  const gridCardWidth = (windowWidth - gridPadding * 2 - gridGap * (gridNumColumns - 1)) / gridNumColumns;

  const markingMovieId = quickMarkMovie.isPending && quickMarkMovie.variables
    ? quickMarkMovie.variables.showId
    : undefined;

  function handleMarkMovieWatched(movie: UnwatchedMovie) {
    quickMarkMovie.mutate(
      { showId: movie.showId },
      {
        onSuccess: () => showSnackbar(t("screens.movies.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.movies.markError"), "error"),
      },
    );
  }

  function handleViewLibrary() {
    navigation.navigate("Library", { tab: "movie" });
  }

  if (isLoading) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <MainHeader />
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} width="100%" height={112} className="mb-2" borderRadius={8} />
        ))}
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <MainHeader />
        <NetworkError isOffline={!error || !("response" in error)} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  const toSearchResultItem = (movie: UnwatchedMovie): SearchResultItem => ({
    tmdbId: movie.tmdbId,
    type: "movie",
    title: movie.title,
    posterPath: movie.posterPath ?? undefined,
    firstAirDate: movie.year ? `${movie.year}-01-01` : undefined,
    source: "tmdb",
  });

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Seo title={t("seo.movies")} />
      <MainHeader
        rightElement={
          <>
            <TouchableOpacity onPress={() => setIsSearchVisible(!isSearchVisible)} className="p-1">
              <Ionicons name={isSearchVisible ? "search" : "search-outline"} size={24} color={colors.text} />
            </TouchableOpacity>
            <ViewModeToggle />
          </>
        }
      />

      <ImportProgressBanner />

      {isSearchVisible && (
        <>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("screens.movies.searchPlaceholder")}
            onClose={() => {
              setSearchQuery("");
              setSelectedGenre(undefined);
              setSelectedYear(undefined);
              setIsSearchVisible(false);
            }}
          />
          {genreOptions.length > 0 && (
            <FilterChips
              options={genreOptions}
              selectedValue={selectedGenre}
              onSelect={(v) => setSelectedGenre(v as number | undefined)}
              allLabel={t("screens.movies.filterAll")}
            />
          )}
          {yearOptions.length > 0 && (
            <FilterChips
              options={yearOptions}
              selectedValue={selectedYear}
              onSelect={(v) => setSelectedYear(v as number | undefined)}
              allLabel={t("screens.movies.filterAll")}
            />
          )}
        </>
      )}

      <View className="flex-1">
        {libraryViewMode === "grid" ? (
          <FlatList
            key="grid"
            ref={flatListRef}
            data={filteredMovies}
            keyExtractor={(item) => item.showId}
            numColumns={gridNumColumns}
            columnWrapperStyle={{ gap: gridGap }}
            renderItem={({ item }) => {
              const genreNames = (item.genres ?? []).filter((g: { id: number; name?: string }) => g.name).slice(0, 2).map((g: { id: number; name?: string }) => g.name!);
              const statusColorMap: Record<WatchStatus, string> = {
                watching: "text-primary",
                completed: "text-success",
                plan_to_watch: "text-text-muted",
                dropped: "text-error",
              };
              return (
              <View style={{ width: gridCardWidth, marginBottom: gridGap }}>
                <PosterCard
                  show={toSearchResultItem(item)}
                  onPress={() => {
                    if (!item.tmdbId) return;
                    navigation.navigate("ShowDetail", { tmdbId: item.tmdbId, title: item.title });
                  }}
                  width={gridCardWidth}
                  genres={genreNames}
                  statusLabel={getStatusLabel(t, item.status)}
                  statusColor={statusColorMap[item.status as WatchStatus]}
                />
              </View>
              );
            }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              isFiltering ? (
                <EmptyState
                  icon="search-outline"
                  title={t("screens.movies.noResults")}
                />
              ) : (
                <EmptyState
                  icon="film-outline"
                  title={t("screens.movies.empty")}
                  subtitle={t("screens.movies.addFromSearch")}
                />
              )
            }
          />
        ) : (
          <FlatList
            key="list"
            ref={flatListRef}
            data={filteredMovies}
            keyExtractor={(item) => item.showId}
            renderItem={({ item }) => (
              <MovieCard
                movie={item}
                onPress={() => {
                  if (!item.tmdbId) return;
                  navigation.navigate("ShowDetail", { tmdbId: item.tmdbId, title: item.title });
                }}
                onMarkWatched={() => handleMarkMovieWatched(item)}
                isMarking={markingMovieId === item.showId}
              />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              isFiltering ? (
                <EmptyState
                  icon="search-outline"
                  title={t("screens.movies.noResults")}
                />
              ) : (
                <EmptyState
                  icon="film-outline"
                  title={t("screens.movies.empty")}
                  subtitle={t("screens.movies.addFromSearch")}
                />
              )
            }
          />
        )}
      </View>

      <TouchableOpacity
        onPress={handleViewLibrary}
        className="bg-card rounded-lg p-4 mb-4 items-center"
      >
        <Text className="text-primary font-semibold">{t("screens.movies.viewAll")}</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
