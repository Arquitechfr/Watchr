import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import type { Network } from "../../services/shows.service";

interface EpisodeHeaderProps {
  season: number;
  episodeNumber: number;
  isWatched: boolean;
  airDate: Date | null;
  runtime?: number;
  networks?: Network[];
}

export function EpisodeHeader({ season, episodeNumber, isWatched, airDate, runtime, networks }: EpisodeHeaderProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();

  return (
    <>
      <View className="flex-row items-center mb-3">
        <View className="flex-row items-center rounded-xl bg-surface px-4 py-2">
          <View className="items-center">
            <Text className="text-text-muted text-[10px] font-medium uppercase tracking-wider">{t("screens.showDetail.season")}</Text>
            <Text className="text-text font-bold text-base">{season}</Text>
          </View>
          <View className="w-px h-8 bg-border mx-6" />
          <View className="items-center">
            <Text className="text-text-muted text-[10px] font-medium uppercase tracking-wider">{t("screens.showDetail.episode")}</Text>
            <Text className="text-text font-bold text-base">{episodeNumber}</Text>
          </View>
        </View>
        {isWatched && (
          <View className="ml-3 flex-row items-center px-3 py-2 rounded-xl bg-primary/20">
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text className="text-primary text-xs font-semibold ml-1">{t("screens.episode.watched")}</Text>
          </View>
        )}
      </View>
      <View className="flex-row flex-wrap items-center mb-4">
        {airDate && !Number.isNaN(airDate.getTime()) && (
          <Text className="text-text-muted text-sm mr-4">
            {t("screens.episode.airDate", {
              date: format(airDate, "EEEE d MMMM yyyy", { locale: dateFnsLocale }),
              network: networks?.[0]?.name ?? "",
            })}
          </Text>
        )}
        {runtime && (
          <Text className="text-text-muted text-sm">{runtime} {t("common.minutesShort")}</Text>
        )}
      </View>
    </>
  );
}
