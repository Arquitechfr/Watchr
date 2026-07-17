import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import type { EpisodeCommunityStats as Stats } from "../../services/shows.service";

interface EpisodeCommunityStatsProps {
  stats: Stats;
}

export function EpisodeCommunityStatsCard({ stats }: EpisodeCommunityStatsProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const hasData = stats.watchedCount > 0 || stats.ratingCount > 0;
  if (!hasData) return null;

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-text mb-3">
        {t("screens.episode.communityStats")}
      </Text>
      <View className="flex-row gap-3">
        {stats.watchedCount > 0 && (
          <View className="flex-1 bg-surface rounded-xl p-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text className="text-text-muted text-xs uppercase tracking-wider ml-1.5">
                {t("screens.episode.watchedBy")}
              </Text>
            </View>
            <Text className="text-text font-bold text-lg">
              {t("screens.episode.peopleCount", { count: stats.watchedCount })}
            </Text>
          </View>
        )}
        {stats.ratingAverage !== null && stats.ratingCount > 0 && (
          <View className="flex-1 bg-surface rounded-xl p-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text className="text-text-muted text-xs uppercase tracking-wider ml-1.5">
                {t("screens.episode.communityRating")}
              </Text>
            </View>
            <Text className="text-text font-bold text-lg">
              {stats.ratingAverage.toFixed(1)}
              <Text className="text-text-muted text-sm font-normal">
                {" "}
                · {t("screens.episode.votes", { count: stats.ratingCount })}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
