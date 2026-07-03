import { Text, FlatList, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { ShowCard } from "../components/ShowCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useUnwatchedMovies } from "../hooks/useUnwatched";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedMovie } from "../services/unwatched.service";
import { SearchResultItem } from "../services/shows.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

function MovieCard({ movie, onPress }: { movie: UnwatchedMovie; onPress: () => void }) {
  const show: SearchResultItem = {
    tmdbId: movie.tmdbId,
    title: movie.title,
    posterPath: movie.posterPath,
    type: "movie",
    source: "tmdb",
  };

  return <ShowCard show={show} onPress={onPress} />;
}

export function MoviesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useUnwatchedMovies();
  const throttledRefresh = useRefreshRateLimit();
  const movies = data?.movies ?? [];

  if (isLoading) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-3xl font-bold text-text mb-4">{t("screens.list.title")}</Text>
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} width="100%" height={112} className="mb-2" borderRadius={8} />
        ))}
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-3xl font-bold text-text mb-4">{t("screens.list.title")}</Text>
        <NetworkError isOffline={!error || !("response" in error)} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-text mb-4">{t("screens.list.title")}</Text>

      <FlatList
        data={movies}
        keyExtractor={(item) => item.showId}
        renderItem={({ item }) => (
          <MovieCard
            movie={item}
            onPress={() => {
              if (!item.tmdbId) return;
              navigation.navigate("ShowDetail", { tmdbId: item.tmdbId, title: item.title });
            }}
          />
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <EmptyState
            icon="film-outline"
            title={t("screens.list.empty")}
            subtitle={t("screens.list.addFromSearch")}
          />
        }
      />
    </ScreenContainer>
  );
}
