import { View, Text, Image, TouchableOpacity } from "react-native";
import { format } from "date-fns";
import { UpcomingEpisode } from "../services/upcoming.service";
import { getPosterUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface UpcomingEpisodeRowProps {
  episode: UpcomingEpisode;
  onPress: () => void;
}

export function UpcomingEpisodeRow({ episode, onPress }: UpcomingEpisodeRowProps) {
  const { t, dateFnsLocale } = useI18n();
  const posterUrl = getPosterUrl(episode.posterPath, 200);

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
          {episode.title}
        </Text>
        <Text className="text-text-muted text-sm">
          S{episode.season}E{episode.episode}
          {episode.name ? ` · ${episode.name}` : ""}
        </Text>
        <Text className="text-primary text-xs mt-1">
          {format(new Date(episode.airDate), "EEE d MMM", { locale: dateFnsLocale })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
