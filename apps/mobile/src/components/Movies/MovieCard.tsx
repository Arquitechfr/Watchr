import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { CachedImage as Image } from "../CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getPosterUrl } from "../../services/shows.service";
import { WatchStatus } from "../../services/tracking.service";
import type { UnwatchedMovie } from "../../services/unwatched.service";

export function getMovieStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
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

const statusColorMap: Record<WatchStatus, string> = {
  watching: "text-primary",
  completed: "text-success",
  plan_to_watch: "text-text-muted",
  dropped: "text-error",
};

interface MovieCardProps {
  movie: UnwatchedMovie;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function MovieCard({ movie, onPress, onMarkWatched, isMarking }: MovieCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, 200) : null;

  const genreNames = (movie.genres ?? []).filter((g) => g.name).slice(0, 2).map((g) => g.name!);

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
        <Text className={`text-xs font-semibold ${statusColorMap[movie.status]}`}>
          {getMovieStatusLabel(t, movie.status)}
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

export { statusColorMap };
