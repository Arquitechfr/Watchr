import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  isNew?: boolean;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UnwatchedEpisodeRow({
  title,
  posterPath,
  episode,
  isNew,
  onPress,
  onMarkWatched,
  isMarking,
}: UnwatchedEpisodeRowProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);

  const seasonEpisodeLabel = `S${String(episode.season).padStart(2, "0")} - E${String(episode.episode).padStart(2, "0")}`;

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
        <View className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5">
          <Text className="text-text text-xs font-medium" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text className="text-text font-bold text-base mb-0.5">
          {seasonEpisodeLabel}
        </Text>
        {episode.name ? (
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {episode.name}
          </Text>
        ) : null}
        {isNew ? (
          <View className="bg-primary rounded-full px-2 py-0.5 self-start mt-1.5">
            <Text className="text-background text-xs font-semibold">
              {t("common.newEpisode")}
            </Text>
          </View>
        ) : null}
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
