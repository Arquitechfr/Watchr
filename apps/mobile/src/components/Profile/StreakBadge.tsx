import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View
      className="flex-row items-center rounded-lg px-4 py-3"
      style={{ backgroundColor: colors.surface }}
    >
      <Ionicons name="flame" size={28} color={streak > 0 ? "#f59e0b" : colors.textMuted} />
      <View className="ml-3 flex-1">
        <Text className="text-text text-lg font-bold">
          {streak > 0 ? t("screens.profile.streakDays", { count: streak }) : t("screens.profile.streakEmpty")}
        </Text>
        <Text className="text-text-muted text-xs">{t("screens.profile.streakTitle")}</Text>
      </View>
    </View>
  );
}
