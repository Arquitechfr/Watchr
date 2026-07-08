import { View, Text, TouchableOpacity } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { RootStackParamList } from "../../navigation/RootNavigator";
import type { RecentActivityItem } from "../../services/stats.service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RecentActivityProps {
  items: RecentActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();

  if (items.length === 0) {
    return (
      <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
        <Text className="text-text font-semibold text-base mb-2">{t("screens.profile.activityTitle")}</Text>
        <Text className="text-text-muted text-sm">{t("screens.profile.activityEmpty")}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.activityTitle")}</Text>
      <View className="gap-2">
        {items.map((item) => (
          <TouchableOpacity
            key={item.commentId}
            onPress={() => navigation.navigate("CommentThread", {
              commentId: item.commentId,
              showId: item.showId,
              title: item.showTitle,
            })}
            activeOpacity={0.7}
            className="rounded-lg p-3"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-text-muted text-xs mb-1">
              {t("screens.profile.activityCommentedOn", { title: item.showTitle })}
            </Text>
            <Text className="text-text text-sm" numberOfLines={2}>{item.content}</Text>
            <Text className="text-text-muted text-xs mt-1">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dateFnsLocale })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
