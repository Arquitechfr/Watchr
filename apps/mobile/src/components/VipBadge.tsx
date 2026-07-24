import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

export function VipBadge() {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: colors.primary + "20" }}>
      <Ionicons name="star" size={12} color={colors.primary} />
      <Text className="ml-1 text-xs font-bold" style={{ color: colors.primary }}>
        {t("components.vipBadge")}
      </Text>
    </View>
  );
}
