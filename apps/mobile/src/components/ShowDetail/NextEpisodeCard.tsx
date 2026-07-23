import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "../CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { differenceInCalendarDays, format } from "date-fns";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getPosterUrl } from "../../services/shows.service";

interface NextEpisodeCardProps {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  season: number;
  episode: number;
  airDate: string;
  onPress: () => void;
}

export function NextEpisodeCard({
  title,
  posterPath,
  season,
  episode,
  airDate,
  onPress,
}: NextEpisodeCardProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();

  const airDateObj = new Date(airDate);
  const now = new Date();
  const daysUntil = differenceInCalendarDays(airDateObj, now);
  const isAired = airDateObj <= now;

  const posterUrl = getPosterUrl(posterPath, 200);

  const countdownLabel = isAired
    ? t("screens.showDetail.nextEpisodeAired")
    : daysUntil === 0
      ? t("screens.upcoming.today")
      : daysUntil === 1
        ? t("screens.upcoming.tomorrow")
        : t("screens.upcoming.inDays", { count: daysUntil });

  const formattedDate = format(airDateObj, "d MMM yyyy", { locale: dateFnsLocale });

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl p-4 mb-6 flex-row items-center"
      style={{
        backgroundColor: colors.surface,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
      }}
      activeOpacity={0.7}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{ width: 56, height: 80, borderRadius: 8, backgroundColor: colors.surfaceLight }}
        />
      ) : (
        <View className="w-14 h-20 rounded-lg bg-surface-light items-center justify-center">
          <Ionicons name="tv-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center mb-1">
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text className="text-primary text-xs font-semibold ml-1">{countdownLabel}</Text>
        </View>
        <Text className="text-text font-semibold text-sm" numberOfLines={1}>{title}</Text>
        <Text className="text-text-muted text-xs mt-0.5">
          {`S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} · ${formattedDate}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
