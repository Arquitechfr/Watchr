import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "./CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Season, Episode } from "../services/shows.service";
import { getStillUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface EpisodeGridProps {
  seasons: Season[];
  watchedEpisodes: Array<{ season: number; episode: number }>;
  onToggleEpisode: (season: number, episode: number, watched: boolean) => void;
  onPressEpisode?: (season: number, episode: Episode) => void;
  onMarkSeasonAired?: (seasonNumber: number) => void;
  isPending?: boolean;
}

export function EpisodeGrid({
  seasons,
  watchedEpisodes,
  onToggleEpisode,
  onPressEpisode,
  onMarkSeasonAired,
  isPending,
}: EpisodeGridProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<number>>(
    () => new Set(seasons.map((s) => s.seasonNumber)),
  );

  const watchedKeys = new Set(
    watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`),
  );

  const getEpisodes = (season: Season) => season.episodes ?? [];

  const toggleSeason = (seasonNumber: number) => {
    setCollapsedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  function renderEpisode(seasonNumber: number, episode: Episode) {
    const key = `${seasonNumber}-${episode.episodeNumber}`;
    const isWatched = watchedKeys.has(key);
    const stillUrl = getStillUrl(episode.stillPath, 200);

    return (
      <TouchableOpacity
        key={key}
        className={`flex-row items-center bg-surface rounded-lg p-3 mb-2 ${
          isWatched ? "border border-primary" : "border border-border"
        }`}
        onPress={() => onPressEpisode?.(seasonNumber, episode)}
        onLongPress={() => onToggleEpisode(seasonNumber, episode.episodeNumber, !isWatched)}
        disabled={isPending}
        activeOpacity={0.7}
      >
        {stillUrl ? (
          <Image
            source={{ uri: stillUrl }}
            style={{ width: 80, height: 48, borderRadius: 8, backgroundColor: colors.surfaceLight, marginRight: 12 }}
          />
        ) : (
          <View className="w-20 h-12 rounded bg-surface-light items-center justify-center mr-3">
            <Ionicons name="image-outline" size={16} color={colors.textMuted} />
          </View>
        )}
        <Ionicons
          name={isWatched ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={isWatched ? colors.primary : colors.textMuted}
          style={{ marginRight: 12 }}
        />
        <View className="flex-1">
          <Text className="text-text font-medium">
            {episode.episodeNumber}. {episode.name ?? `${t("screens.showDetail.episode")} ${episode.episodeNumber}`}
          </Text>
          {episode.overview && (
            <Text className="text-text-muted text-xs mt-1" numberOfLines={2}>
              {episode.overview}
            </Text>
          )}
          {episode.airDate && (
            <Text className="text-text-muted text-xs mt-1">
              {format(new Date(episode.airDate), "d MMM yyyy", { locale: dateFnsLocale })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      {seasons.map((season) => {
        const isCollapsed = collapsedSeasons.has(season.seasonNumber);
        return (
          <View key={`season-${season.seasonNumber}`} className="mb-4">
            <TouchableOpacity
              className="flex-row items-center justify-between bg-surface rounded-lg px-3 py-3 mb-3"
              onPress={() => toggleSeason(season.seasonNumber)}
              activeOpacity={0.7}
            >
              <Text className="text-lg font-semibold text-primary">
                {t("screens.showDetail.season")} {season.seasonNumber}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-text-muted text-sm mr-2">
                  {getEpisodes(season).length} {t("screens.showDetail.episodes").toLowerCase()}
                </Text>
                {onMarkSeasonAired && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onMarkSeasonAired(season.seasonNumber);
                    }}
                    disabled={isPending}
                    activeOpacity={0.7}
                    className="mr-2"
                  >
                    <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <Ionicons
                  name={isCollapsed ? "chevron-down" : "chevron-up"}
                  size={20}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
            {!isCollapsed &&
              getEpisodes(season).map((episode) =>
                renderEpisode(season.seasonNumber, episode),
              )}
          </View>
        );
      })}
    </View>
  );
}
