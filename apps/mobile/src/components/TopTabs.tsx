import { View, Text, TouchableOpacity } from "react-native";
import { cn } from "../utils/cn";

export type TopTab = "unwatched" | "upcoming";

interface TopTabsProps {
  tabs: { key: TopTab; label: string }[];
  active: TopTab;
  onChange: (tab: TopTab) => void;
}

export function TopTabs({ tabs, active, onChange }: TopTabsProps) {
  return (
    <View className="flex-row bg-surface rounded-lg p-1 mb-4">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
            className={cn(
              "flex-1 py-2 rounded-md items-center justify-center",
              isActive ? "bg-primary" : "bg-transparent",
            )}
          >
            <Text
              className={cn(
                "font-semibold text-sm",
                isActive ? "text-background" : "text-text-muted",
              )}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
