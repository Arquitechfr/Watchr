import { View, Text } from "react-native";

interface WeekSectionHeaderProps {
  title: string;
}

export function WeekSectionHeader({ title }: WeekSectionHeaderProps) {
  return (
    <View className="py-3 border-b border-border mb-2">
      <Text className="text-primary font-bold text-lg uppercase tracking-wide">{title}</Text>
    </View>
  );
}
