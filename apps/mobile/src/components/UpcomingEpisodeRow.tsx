import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "./CachedImage";
import { differenceInCalendarDays, format } from "date-fns";
import { UpcomingEpisode } from "../services/upcoming.service";
import { getPosterUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { CelebrationCheckmark } from "./CelebrationCheckmark";

interface UpcomingEpisodeRowProps {
  episode: UpcomingEpisode;
  isNew?: boolean;
  onPress: () => void;
  onTitlePress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UpcomingEpisodeRow({ episode, isNew, onPress, onTitlePress, onMarkWatched, isMarking }: UpcomingEpisodeRowProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(episode.posterPath, 200);
  const airDate = new Date(episode.airDate);
  const now = new Date();
  const isAired = airDate <= now;
  const daysUntil = differenceInCalendarDays(airDate, now);

  const seasonEpisodeLabel = `S${String(episode.season).padStart(2, "0")} - E${String(episode.episode).padStart(2, "0")}`;

  const daysUntilLabel = isAired
    ? null
    : daysUntil === 0
      ? t("screens.upcoming.today")
      : daysUntil === 1
        ? t("screens.upcoming.tomorrow")
        : t("screens.upcoming.inDays", { count: daysUntil });

  const formattedDate = format(airDate, "d MMMM yyyy", { locale: dateFnsLocale });

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-lg p-3 mb-3 active:opacity-70"
      onPress={onPress}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-14 h-20 rounded-lg bg-surface-light"
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
              {episode.title}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5">
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {episode.title}
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
        {daysUntilLabel ? (
          <Text className="text-primary text-xs font-semibold mt-1">
            {daysUntilLabel}
          </Text>
        ) : null}
        <Text className="text-text-muted text-xs mt-0.5">
          {t("screens.upcoming.airingOn", { date: formattedDate })}
        </Text>
        {isNew ? (
          <View className="bg-primary rounded-full px-2 py-0.5 self-start mt-1.5">
            <Text className="text-background text-xs font-semibold">
              {t("common.newEpisode")}
            </Text>
          </View>
        ) : null}
        {(episode.isSeriesPremiere || episode.isSeasonPremiere || episode.isFinale) && (
          <Text className="text-primary text-xs font-semibold mt-1">
            {episode.isSeriesPremiere
              ? t("screens.upcoming.seriesPremiere")
              : episode.isSeasonPremiere
                ? t("screens.upcoming.seasonPremiere")
                : t("screens.upcoming.seasonFinale")}
          </Text>
        )}
        {episode.network ? (
          <Text className="text-text-muted text-xs mt-1" numberOfLines={1}>
            {t("common.platform")} {episode.network}
          </Text>
        ) : null}
      </View>
      {onMarkWatched && isAired && (
        <CelebrationCheckmark
          onPress={onMarkWatched}
          isMarking={isMarking}
          size={28}
          color={colors.primary}
          containerStyle={{ marginLeft: 8 }}
          buttonStyle={{ padding: 4 }}
        />
      )}
    </TouchableOpacity>
  );
}
