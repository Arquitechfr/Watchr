import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface RecentSearchesProps {
  history: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

export function RecentSearches({ history, onSelect, onRemove, onClear }: RecentSearchesProps) {
  const colors = useThemeColors();
  const { t } = useI18n();

  if (history.length === 0) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text-muted text-xs font-medium uppercase tracking-wider">
          {t("screens.search.recentSearches")}
        </Text>
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-text-muted text-xs">{t("screens.search.clearRecent")}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {history.map((entry) => (
          <TouchableOpacity
            key={entry}
            onPress={() => onSelect(entry)}
            className="flex-row items-center rounded-full px-3 py-2"
            style={{ backgroundColor: colors.surface }}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text className="text-text text-sm ml-2" numberOfLines={1}>
              {entry}
            </Text>
            <TouchableOpacity
              onPress={() => onRemove(entry)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              className="ml-2"
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
