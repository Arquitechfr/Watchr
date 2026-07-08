import { View, Text } from "react-native";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import type { GenreStat } from "../../services/stats.service";

interface GenreBreakdownProps {
  genres: GenreStat[];
}

export function GenreBreakdown({ genres }: GenreBreakdownProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  if (genres.length === 0) return null;

  const maxCount = Math.max(...genres.map((g) => g.count));

  return (
    <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
      <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.genresTitle")}</Text>
      {genres.map((genre) => {
        const percentage = maxCount > 0 ? (genre.count / maxCount) * 100 : 0;
        return (
          <View key={genre.id} className="mb-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-text text-sm">{genre.name}</Text>
              <Text className="text-text-muted text-xs">{genre.count}</Text>
            </View>
            <View className="rounded-full h-2" style={{ backgroundColor: colors.border }}>
              <View
                className="rounded-full h-2"
                style={{ width: `${percentage}%`, backgroundColor: colors.primary }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
