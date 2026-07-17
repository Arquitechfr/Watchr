import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";

interface EpisodeActionsProps {
  onShare: () => void;
  onOpenComments: () => void;
  commentCount: number;
}

export function EpisodeActions({ onShare, onOpenComments, commentCount }: EpisodeActionsProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View className="flex-row flex-wrap mb-6">
      <TouchableOpacity
        onPress={onShare}
        className="flex-row items-center px-4 py-3 rounded-lg bg-surface border border-border mr-2 mb-2"
        activeOpacity={0.7}
      >
        <Ionicons name="share-outline" size={18} color={colors.primary} />
        <Text className="font-semibold ml-2 text-text">{t("common.share")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenComments}
        className="flex-row items-center px-4 py-3 rounded-lg bg-surface border border-border mb-2"
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
        <Text className="font-semibold ml-2 text-text">{t("screens.showDetail.comments")}</Text>
        {commentCount > 0 && (
          <View className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
            <Text className="text-primary text-xs font-semibold">{commentCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
