import { View, Text } from "react-native";

interface WeekSectionHeaderProps {
  title: string;
  count?: number;
}

export function WeekSectionHeader({ title, count }: WeekSectionHeaderProps) {
  return (
    <View className="py-3 border-b border-border mb-2 flex-row items-baseline">
      <Text className="text-primary font-bold text-lg uppercase tracking-wide">{title}</Text>
      {count !== undefined && count > 0 && (
        <Text className="text-text-muted text-sm font-medium ml-2">{count}</Text>
      )}
    </View>
  );
}
