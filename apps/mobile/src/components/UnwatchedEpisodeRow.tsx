import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
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
  onTitlePress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UnwatchedEpisodeRow({
  title,
  posterPath,
  episode,
  isNew,
  onPress,
  onTitlePress,
  onMarkWatched,
  isMarking,
}: UnwatchedEpisodeRowProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);

  const seasonEpisodeLabel = `S${String(episode.season).padStart(2, "0")} - E${String(episode.episode).padStart(2, "0")}`;

  const airedLabel = episode.airDate
    ? t("screens.unwatched.airedAgo", {
        distance: formatDistanceToNow(new Date(episode.airDate), { addSuffix: true, locale: dateFnsLocale }),
      })
    : null;

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
        {onTitlePress ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onTitlePress();
            }}
            className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5"
            activeOpacity={0.7}
          >
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5">
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
        <Text className="text-text font-bold text-base mb-0.5">
          {seasonEpisodeLabel}
        </Text>
        {episode.name ? (
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {episode.name}
          </Text>
        ) : null}
        {airedLabel ? (
          <Text className="text-text-muted text-xs mt-0.5">
            {airedLabel}
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
