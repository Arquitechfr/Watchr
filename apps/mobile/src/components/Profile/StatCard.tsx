import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  const colors = useThemeColors();

  return (
    <View
      className="rounded-lg p-3"
      style={{ backgroundColor: colors.surface, minHeight: 90 }}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text className="text-text text-xl font-bold">{value}</Text>
      <Text className="text-text-muted text-xs mt-1" numberOfLines={2}>{label}</Text>
    </View>
  );
}
