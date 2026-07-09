import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";
import type { CommentSort } from "../../services/comments.service";

interface CommentsSortBarProps {
  sort: CommentSort;
  onSortChange: (sort: CommentSort) => void;
}

export function CommentsSortBar({ sort, onSortChange }: CommentsSortBarProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const options: { value: CommentSort; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "recent", label: t("screens.comments.sortRecent"), icon: "time-outline" },
    { value: "relevant", label: t("screens.comments.sortRelevant"), icon: "star-outline" },
    { value: "liked", label: t("screens.comments.sortLiked"), icon: "heart-outline" },
    { value: "replied", label: t("screens.comments.sortReplied"), icon: "chatbubble-outline" },
  ];

  return (
    <View className="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
        <View className="flex-row items-center gap-2">
          {options.map((option) => {
            const isActive = sort === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onSortChange(option.value)}
                className={`shrink-0 flex-row items-center px-3 py-1.5 rounded-full ${isActive ? "bg-primary" : "bg-surface border border-border"}`}
                activeOpacity={0.7}
                style={isActive ? { shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 } : undefined}
              >
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={isActive ? "#fff" : colors.textMuted}
                />
                <Text className={`text-sm font-semibold ml-1.5 ${isActive ? "text-background" : "text-text-muted"}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
