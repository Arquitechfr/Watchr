import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

interface DetailHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}

export function DetailHeader({ title, onBack, rightElement }: DetailHeaderProps) {
  const colors = useThemeColors();
  return (
    <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} className="p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-text font-semibold text-lg flex-1 text-center mx-2" numberOfLines={2}>
        {title}
      </Text>
      {rightElement ?? <View className="w-8" />}
    </View>
  );
}
