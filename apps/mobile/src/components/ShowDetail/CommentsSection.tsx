import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";

interface CommentsSectionProps {
  commentCount: number;
  onPress: () => void;
}

export function CommentsSection({ commentCount, onPress }: CommentsSectionProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  if (commentCount > 0) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center justify-between bg-surface rounded-xl p-4 mb-6"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center mr-3">
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          </View>
          <Text className="text-text font-semibold">{t("screens.showDetail.comments")}</Text>
          <View className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
            <Text className="text-primary text-xs font-semibold">{commentCount}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className="py-12 items-center justify-center bg-surface rounded-xl mb-6"
      activeOpacity={0.7}
    >
      <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
      <Text className="text-text-muted mt-2 text-center">{t("screens.comments.empty")}</Text>
      <Text className="text-text-muted text-sm text-center">{t("screens.comments.beFirst")}</Text>
    </TouchableOpacity>
  );
}
