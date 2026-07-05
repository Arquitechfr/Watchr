import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name={icon} size={48} color={colors.textMuted} className="mb-4" />
      <Text className="text-text text-lg font-semibold text-center mb-2">{title}</Text>
      {subtitle && (
        <Text className="text-text-muted text-center mb-6">{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg" onPress={onAction}>
          <Text className="text-background font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
