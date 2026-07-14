import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

interface DetailHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  onTitlePress?: () => void;
}

export function DetailHeader({ title, onBack, rightElement, onTitlePress }: DetailHeaderProps) {
  const colors = useThemeColors();
  return (
    <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} className="p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      {onTitlePress ? (
        <TouchableOpacity
          onPress={onTitlePress}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center justify-center mx-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-primary font-semibold text-lg" numberOfLines={2}>
            {title}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} className="ml-0.5" />
        </TouchableOpacity>
      ) : (
        <Text className="text-text font-semibold text-lg flex-1 text-center mx-2" numberOfLines={2}>
          {title}
        </Text>
      )}
      {rightElement ?? <View className="w-8" />}
    </View>
  );
}
