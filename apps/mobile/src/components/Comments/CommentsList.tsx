import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Comment } from "../../services/comments.service";
import { useThemeColors } from "../../theme/useThemeColors";
import { CommentItem } from "./CommentItem";
import { useI18n } from "../../i18n/useI18n";

interface CommentsListProps {
  comments: Comment[];
  showId?: string;
  title?: string;
  season?: number;
  episode?: number;
  isLoading?: boolean;
  isPending?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onReply?: (content: string, parentId: string) => void;
  onEdit?: (id: string, content: string, images?: string[], isSpoiler?: boolean) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
}

export function CommentsList({
  comments,
  showId,
  title,
  season,
  episode,
  isLoading,
  isPending,
  refreshing,
  onRefresh,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onAddReaction,
  onRemoveReaction,
}: CommentsListProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
        <Text className="text-text-muted mt-3 text-center font-medium">{t("screens.comments.empty")}</Text>
        <Text className="text-text-muted text-sm mt-1 text-center">{t("screens.comments.beFirst")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CommentItem
          comment={item}
          showId={showId}
          title={title}
          season={season}
          episode={episode}
          isPending={isPending}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onLike={onLike}
          onUnlike={onUnlike}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      )}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}
