import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "./CachedImage";
import { differenceInCalendarDays, format } from "date-fns";
import { getPosterUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { CelebrationCheckmark } from "./CelebrationCheckmark";

interface EpisodeCardProps {
  posterPath?: string;
  title: string;
  season: number;
  episode: number;
  episodeName?: string;
  isNew?: boolean;
  network?: string;
  airDate?: string;
  onPress: () => void;
  onTitlePress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
  width?: number;
}

const DEFAULT_CARD_WIDTH = 128;
const DEFAULT_CARD_HEIGHT = 192;

export function EpisodeCard({
  posterPath,
  title,
  season,
  episode,
  episodeName,
  isNew,
  network,
  airDate,
  onPress,
  onTitlePress,
  onMarkWatched,
  isMarking,
  width,
}: EpisodeCardProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);

  const cardWidth = width ?? DEFAULT_CARD_WIDTH;
  const cardHeight = width ? Math.round(width * 1.5) : DEFAULT_CARD_HEIGHT;

  const seasonEpisodeLabel = `S${String(season).padStart(2, "0")} - E${String(episode).padStart(2, "0")}`;

  const airLabel = airDate
    ? (() => {
        const date = new Date(airDate);
        const now = new Date();
        const daysUntil = differenceInCalendarDays(date, now);
        if (daysUntil > 0) {
          return daysUntil === 1
            ? t("screens.upcoming.tomorrow")
            : t("screens.upcoming.inDays", { count: daysUntil });
        }
        return format(date, "d MMMM yyyy", { locale: dateFnsLocale });
      })()
    : null;

  return (
    <View style={{ width: cardWidth }}>
      <TouchableOpacity
        style={{
          width: cardWidth,
          height: cardHeight,
          borderRadius: 8,
          backgroundColor: colors.surfaceLight,
          overflow: "hidden",
        }}
        className="hover:opacity-80"
        onPress={onPress}
        activeOpacity={0.7}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width: cardWidth, height: cardHeight }}
          />
        ) : (
          <View style={{ width: cardWidth, height: cardHeight, alignItems: "center", justifyContent: "center" }}>
            <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
          </View>
        )}
      </TouchableOpacity>

      {onMarkWatched && (
        <CelebrationCheckmark
          onPress={onMarkWatched}
          isMarking={isMarking}
          size={20}
          color={colors.primary}
          containerStyle={{
            position: "absolute",
            top: 8,
            right: 8,
          }}
          buttonStyle={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      )}

      <View className="mt-2 px-1">
        {onTitlePress ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onTitlePress();
            }}
            className="bg-surface-light rounded-full px-2 py-0.5 self-start mb-1"
            activeOpacity={0.7}
          >
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-surface-light rounded-full px-2 py-0.5 self-start mb-1">
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
        <Text className="text-text font-bold text-sm" numberOfLines={1}>
          {seasonEpisodeLabel}
        </Text>
        {episodeName ? (
          <Text className="text-text-muted text-xs mt-0.5" numberOfLines={1}>
            {episodeName}
          </Text>
        ) : null}
        {isNew ? (
          <View className="bg-primary rounded-full px-1.5 py-0.5 self-start mt-1">
            <Text className="text-background text-xs font-semibold">
              {t("common.newEpisode")}
            </Text>
          </View>
        ) : null}
        {network ? (
          <Text className="text-text-muted text-xs mt-1" numberOfLines={1}>
            {t("common.platform")} {network}
          </Text>
        ) : null}
        {airLabel ? (
          <Text className="text-primary text-xs font-semibold mt-1" numberOfLines={1}>
            {airLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
