import { Text, FlatList, RefreshControl, TouchableOpacity, View, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useUnwatchedMovies } from "../hooks/useUnwatched";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedMovie } from "../services/unwatched.service";
import { getPosterUrl } from "../services/shows.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";
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

function MovieCard({ movie, onPress }: { movie: UnwatchedMovie; onPress: () => void }) {
  const { t } = useI18n();
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, 200) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row bg-card rounded-lg p-3 mb-3"
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
          <Text className="text-text-muted text-xs">No poster</Text>
        </View>
      )}
      <View className="flex-1 justify-center">
        <Text className="text-text font-semibold text-base mb-1" numberOfLines={2}>
          {movie.title}
        </Text>
        <Text className="text-text-muted text-sm mb-1">
          {getStatusLabel(t, movie.status)}
        </Text>
        <Text className="text-text-muted text-xs">{t("common.movie")}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function MoviesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useUnwatchedMovies();
  const throttledRefresh = useRefreshRateLimit();
  const movies = data?.movies ?? [];

  function handleViewLibrary() {
    navigation.navigate("Library");
  }

  if (isLoading) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-3xl font-bold text-text mb-4">{t("navigation.movies")}</Text>
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} width="100%" height={112} className="mb-2" borderRadius={8} />
        ))}
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-3xl font-bold text-text mb-4">{t("navigation.movies")}</Text>
        <NetworkError isOffline={!error || !("response" in error)} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-text mb-4">{t("navigation.movies")}</Text>

      <View className="flex-1">
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
              title={t("screens.movies.empty")}
              subtitle={t("screens.movies.addFromSearch")}
            />
          }
        />
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
