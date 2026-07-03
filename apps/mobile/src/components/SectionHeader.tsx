import { View, Text } from "react-native";

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-2">
      <Text className="text-text text-lg font-bold">{title}</Text>
    </View>
  );
}
