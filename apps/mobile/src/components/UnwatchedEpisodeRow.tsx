import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { getPosterUrl } from "../services/shows.service";
import { UnwatchedEpisode } from "../services/unwatched.service";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

interface UnwatchedEpisodeRowProps {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UnwatchedEpisodeRow({
  title,
  posterPath,
  episode,
  onPress,
  onMarkWatched,
  isMarking,
}: UnwatchedEpisodeRowProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-lg p-3 mb-3 active:opacity-70"
      onPress={onPress}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-14 h-20 rounded-lg bg-surface-light"
          resizeMode="cover"
        />
      ) : (
        <View className="w-14 h-20 rounded-lg bg-surface-light items-center justify-center">
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-text font-semibold mb-1" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-text-muted text-sm" numberOfLines={1}>
          S{episode.season}E{episode.episode}
          {episode.name ? ` · ${episode.name}` : ""}
        </Text>
        {episode.airDate && (
          <Text className="text-primary text-xs mt-1">
            {format(new Date(episode.airDate), "EEE d MMM", { locale: dateFnsLocale })}
          </Text>
        )}
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
