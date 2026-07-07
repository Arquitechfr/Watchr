import { View, Text, TouchableOpacity, ScrollView } from "react-native";
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

  const options: { value: CommentSort; label: string }[] = [
    { value: "recent", label: t("screens.comments.sortRecent") },
    { value: "relevant", label: t("screens.comments.sortRelevant") },
    { value: "liked", label: t("screens.comments.sortLiked") },
    { value: "replied", label: t("screens.comments.sortReplied") },
  ];

  return (
    <View className="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
        <View className="flex-row items-center">
          <Text className="text-text-muted text-sm mr-2">{t("screens.comments.sortBy")}</Text>
          {options.map((option) => {
            const isActive = sort === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onSortChange(option.value)}
                className={`shrink-0 mr-2 px-3 py-1.5 rounded-full ${isActive ? "bg-primary" : "bg-surface border border-border"}`}
                activeOpacity={0.7}
              >
                <Text className={`text-sm font-semibold ${isActive ? "text-background" : "text-text-muted"}`}>
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
