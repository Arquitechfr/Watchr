import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { formatDistanceToNow } from "date-fns";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { Avatar } from "./Avatar";
import { RootStackParamList } from "../navigation/RootNavigator";
import type { ActivityFeedItem } from "../services/social.service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ActivityFeedItemProps {
  item: ActivityFeedItem;
}

export function ActivityFeedItemCard({ item }: ActivityFeedItemProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();

  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dateFnsLocale });

  function handleShowPress() {
    navigation.navigate("ShowDetail", { tmdbId: item.show.tmdbId, title: item.show.title });
  }

  function handleUserPress() {
    navigation.navigate("PublicProfile", { username: item.user.username });
  }

  function handleCommentPress() {
    if (item.comment?.commentId) {
      navigation.navigate("CommentThread", {
        commentId: item.comment.commentId,
        showId: "",
        title: item.show.title,
      });
    }
  }

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    rating: "star",
    watchlist_add: "add-circle-outline",
    comment: "chatbubble-outline",
  };

  const icon = iconMap[item.type] ?? "ellipse";

  let actionText: string;
  if (item.type === "rating") {
    actionText = t("screens.social.ratedShow", {
      title: item.show.title,
      value: item.rating?.value ?? 0,
    });
  } else if (item.type === "watchlist_add") {
    if (item.watchlistAdd && item.watchlistAdd.count > 1) {
      actionText = t("screens.social.addedToWatchlistMultiple", {
        count: item.watchlistAdd.count,
      });
    } else {
      actionText = t("screens.social.addedToWatchlist", { title: item.show.title });
    }
  } else {
    actionText = t("screens.social.commentedOn", { title: item.show.title });
  }

  const isPressable = item.type !== "watchlist_add" || (item.watchlistAdd?.count ?? 1) <= 1;

  return (
    <View
      className="rounded-lg p-4 mb-3"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center mb-2">
        <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
          <Avatar url={item.user.avatarUrl} size={32} />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
            <Text className="text-text font-semibold text-sm">{item.user.username}</Text>
          </TouchableOpacity>
          <Text className="text-text-muted text-xs">{timeAgo}</Text>
        </View>
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary + "20" }}
        >
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
      </View>

      <Text className="text-text text-sm mb-2">{actionText}</Text>

      {item.type === "watchlist_add" && item.watchlistAdd && item.watchlistAdd.count > 1 && (
        <View className="mt-1">
          {item.watchlistAdd.titles.map((title, index) => (
            <Text key={`title-${index}`} className="text-text-muted text-xs">
              {"\u2022"} {title}
            </Text>
          ))}
        </View>
      )}

      {isPressable && (
        <TouchableOpacity
          onPress={item.type === "comment" ? handleCommentPress : handleShowPress}
          activeOpacity={0.7}
          className="mt-1"
        >
          <Text className="text-primary text-xs font-medium">
            {item.type === "comment" ? t("screens.social.viewComment") : t("screens.social.viewShow")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
